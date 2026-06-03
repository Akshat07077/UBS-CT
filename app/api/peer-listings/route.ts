import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, carsTable, usersTable } from "@/lib/db";
import { desc, eq, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { peerHostListingJson } from "@/lib/rental-listing";
import { formatAdminCar } from "@/lib/car-response";
import { getGalleryUrlsByCarIds, replaceCarGallery } from "@/lib/db/car-images";
import { createLead } from "@/lib/leads";

const createSchema = z.object({
  ownerName: z.string().trim().min(1).max(120),
  ownerEmail: z.string().trim().email().max(254),
  ownerPhone: z.string().trim().min(8).max(24),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1990).max(2030),
  pricePerDay: z.coerce.number().positive().max(500_000),
  pricePerHour: z.coerce.number().positive().max(50_000),
  transmission: z.enum(["manual", "automatic"]),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]),
  seats: z.coerce.number().int().min(2).max(12),
  location: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z
    .union([z.string().trim().url().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  images: z.array(z.string().trim().url().max(2000)).max(12).optional().default([]),
});

/** GET ?mine=1 — signed-in user: cars they host or submitted as guest (email match). POST — public guest listing request (pending admin approval). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mine = req.nextUrl.searchParams.get("mine");
    if (mine !== "1") {
      return NextResponse.json({ error: "Use ?mine=1 to list your vehicles" }, { status: 400 });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email.toLowerCase();
    const rows = await db
      .select()
      .from(carsTable)
      .where(or(eq(carsTable.hostUserId, user.id), eq(carsTable.ownerEmail, email))!)
      .orderBy(desc(carsTable.createdAt));

    const ids = rows.map((r) => r.id);
    const galleryMap = await getGalleryUrlsByCarIds(ids);
    return NextResponse.json(rows.map((c) => formatAdminCar(c, user, galleryMap.get(c.id) ?? null)));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      brand,
      model,
      year,
      pricePerDay,
      pricePerHour,
      transmission,
      fuelType,
      seats,
      location,
      description,
      imageUrl,
      images,
    } = parsed.data;

    const mergedImages = Array.from(
      new Set([...(images ?? []), ...(imageUrl ? [imageUrl] : [])].map((u) => u.trim()).filter(Boolean))
    );
    const coverImage = mergedImages[0] ?? null;

    const emailNorm = ownerEmail.toLowerCase();
    const baseListing = peerHostListingJson(ownerName.trim(), pricePerDay);
    const listing = {
      ...baseListing,
      promoTag: "Awaiting approval",
      availabilityNote: "Not visible in search until UBs admin approves your request.",
    };

    const [car] = await db
      .insert(carsTable)
      .values({
        brand,
        model,
        year,
        pricePerDay: String(pricePerDay),
        pricePerHour: String(pricePerHour),
        transmission,
        fuelType,
        seats,
        location,
        description: description || null,
        imageUrl: coverImage,
        listing,
        available: false,
        hostUserId: null,
        listingApprovalStatus: "pending",
        ownerName: ownerName.trim(),
        ownerEmail: emailNorm,
        ownerPhone: ownerPhone.trim(),
      })
      .returning();

    if (mergedImages.length > 0) {
      await replaceCarGallery(car.id, mergedImages);
    }

    await createLead({
      type: "list_car",
      name: ownerName.trim(),
      email: emailNorm,
      phone: ownerPhone.trim(),
      subject: `${brand} ${model} · ${location}`,
      message: description || null,
      relatedId: car.id,
      metadata: {
        year,
        pricePerDay,
        transmission,
        fuelType,
        seats,
        listingApprovalStatus: car.listingApprovalStatus,
      },
    });

    return NextResponse.json(
      {
        id: car.id,
        listingApprovalStatus: car.listingApprovalStatus,
        message: "Thanks. Your listing is pending admin approval. You will be contacted at the email or phone you provided.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
