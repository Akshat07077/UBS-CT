import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, carsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { peerHostListingJson } from "@/lib/rental-listing";
import { formatAdminCar } from "@/lib/car-response";
import { getGalleryUrlsForCar } from "@/lib/db/car-images";

const moderateSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!actor || actor.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const carId = Number(id);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
    if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });
    if (car.listingApprovalStatus !== "pending") {
      return NextResponse.json({ error: "Only pending listing requests can be moderated" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    if (parsed.data.action === "approve") {
      const display = car.ownerName?.trim() || car.ownerEmail?.split("@")[0] || "Host";
      const listing = peerHostListingJson(display, Number(car.pricePerDay));

      const [updated] = await db
        .update(carsTable)
        .set({
          listingApprovalStatus: "approved",
          available: true,
          listing,
        })
        .where(eq(carsTable.id, carId))
        .returning();
      if (!updated) return NextResponse.json({ error: "Car not found" }, { status: 404 });
      const gallery = await getGalleryUrlsForCar(carId);
      return NextResponse.json(formatAdminCar(updated, actor, gallery.length ? gallery : null));
    }

    const [updated] = await db
      .update(carsTable)
      .set({
        listingApprovalStatus: "rejected",
        available: false,
      })
      .where(eq(carsTable.id, carId))
      .returning();
    if (!updated) return NextResponse.json({ error: "Car not found" }, { status: 404 });
    const galleryReject = await getGalleryUrlsForCar(carId);
    return NextResponse.json(formatAdminCar(updated, actor, galleryReject.length ? galleryReject : null));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
