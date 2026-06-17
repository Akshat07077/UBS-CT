import { NextRequest, NextResponse } from "next/server";
import { db, carsTable, usersTable } from "@/lib/db";
import { eq, gte, lte, and, ilike, isNull, isNotNull, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { formatAdminCar, formatPublicCar } from "@/lib/car-response";
import { getGalleryUrlsByCarIds, replaceCarGallery, getGalleryUrlsForCar } from "@/lib/db/car-images";
import { normalizeHandoverForSave } from "@/lib/handover-location";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    let adminUser: { id: number; role: string } | null = null;
    if (session.userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (u?.role === "admin") adminUser = u;
    }

    const { searchParams } = new URL(req.url);
    const moderationAll = searchParams.get("moderation") === "all" && adminUser != null;

    const transmission = searchParams.get("transmission");
    const fuel_type = searchParams.get("fuel_type");
    const seats = searchParams.get("seats");
    const location = searchParams.get("location");
    const min_price = searchParams.get("min_price");
    const max_price = searchParams.get("max_price");
    const available = searchParams.get("available");

    const peer_only = searchParams.get("peer_only");
    const platform_only = searchParams.get("platform_only");
    const conditions = [];
    if (!moderationAll) conditions.push(eq(carsTable.listingApprovalStatus, "approved"));
    if (transmission) conditions.push(eq(carsTable.transmission, transmission as "manual" | "automatic"));
    if (fuel_type) conditions.push(eq(carsTable.fuelType, fuel_type as "petrol" | "diesel" | "electric" | "hybrid"));
    if (seats) conditions.push(eq(carsTable.seats, Number(seats)));
    if (location) conditions.push(ilike(carsTable.location, `%${location}%`));
    if (min_price) conditions.push(gte(carsTable.pricePerDay, min_price));
    if (max_price) conditions.push(lte(carsTable.pricePerDay, max_price));
    if (available !== null && available !== "") conditions.push(eq(carsTable.available, available === "true"));
    if (peer_only === "true") {
      conditions.push(or(isNotNull(carsTable.hostUserId), isNotNull(carsTable.ownerEmail))!);
    }
    if (platform_only === "true") {
      conditions.push(and(isNull(carsTable.hostUserId), isNull(carsTable.ownerEmail))!);
    }
    const baseQuery = db.select().from(carsTable);
    const cars =
      conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;

    const ids = cars.map((c) => c.id);
    let galleryMap = new Map<number, string[]>();
    try {
      galleryMap = await getGalleryUrlsByCarIds(ids);
    } catch (galleryErr) {
      console.error("Car gallery load failed (car_images table missing or DB error):", galleryErr);
    }

    if (moderationAll) {
      return NextResponse.json(cars.map((c) => formatAdminCar(c, undefined, galleryMap.get(c.id) ?? null)));
    }

    let viewer: (typeof usersTable.$inferSelect) | null = null;
    if (session.userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      viewer = u ?? null;
    }
    return NextResponse.json(cars.map((c) => formatPublicCar(c, viewer, galleryMap.get(c.id) ?? null)));
  } catch (e) {
    console.error("GET /api/cars failed:", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    const hint =
      message.includes("DATABASE_URL") || message.includes("connect")
        ? "Check DATABASE_URL on Vercel and run npm run db:push"
        : message.includes("car_images") || message.includes("relation") || message.includes("does not exist")
          ? "Database schema out of date. Run npm run db:push then npm run db:seed"
          : undefined;
    return NextResponse.json({ error: hint ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
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
      available,
      listing,
    } = body;
    const handover = normalizeHandoverForSave(body);

    const [car] = await db
      .insert(carsTable)
      .values({
        brand,
        model,
        year: Number(year),
        pricePerDay: String(pricePerDay),
        pricePerHour: String(pricePerHour ?? Math.max(1, Math.round(Number(pricePerDay) / 24))),
        transmission,
        fuelType,
        seats: Number(seats),
        location,
        pickupLocation: handover.pickupLocation,
        dropLocation: handover.dropLocation,
        handoverLat: handover.handoverLat,
        handoverLng: handover.handoverLng,
        description: description || null,
        imageUrl: imageUrl || null,
        listing: listing ?? null,
        available: available !== false,
        hostUserId: null,
        listingApprovalStatus: "approved",
        ownerName: null,
        ownerEmail: null,
        ownerPhone: null,
      })
      .returning();

    const galleryUrls: string[] = Array.isArray(body.images)
      ? body.images.filter((u: unknown) => typeof u === "string").map((u: string) => u.trim()).filter(Boolean)
      : [];
    if (galleryUrls.length > 0) {
      await replaceCarGallery(car.id, galleryUrls);
      await db.update(carsTable).set({ imageUrl: galleryUrls[0] }).where(eq(carsTable.id, car.id));
    } else if (car.imageUrl) {
      await replaceCarGallery(car.id, [car.imageUrl]);
    }

    const [fresh] = await db.select().from(carsTable).where(eq(carsTable.id, car.id)).limit(1);
    const gallery = await getGalleryUrlsForCar(car.id);
    return NextResponse.json(formatAdminCar(fresh!, user, gallery.length ? gallery : null), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
