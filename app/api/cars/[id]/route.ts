import { NextRequest, NextResponse } from "next/server";
import { db, carsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { peerHostListingJson } from "@/lib/rental-listing";
import { formatAdminCar, formatPublicCar, viewerOwnsCar } from "@/lib/car-response";
import { getGalleryUrlsForCar, replaceCarGallery } from "@/lib/db/car-images";
import { normalizeHandoverForSave } from "@/lib/handover-location";

async function getActor(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const carId = Number(id);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
    if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

    const actor = await getActor(req);
    const isAdmin = actor?.role === "admin";
    const ownerCanViewPending =
      !!actor && car.listingApprovalStatus === "pending" && viewerOwnsCar(car, actor);

    if (!isAdmin && car.listingApprovalStatus !== "approved" && !ownerCanViewPending) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    const gallery = await getGalleryUrlsForCar(carId);
    const galleryArg = gallery.length > 0 ? gallery : null;

    if (isAdmin || ownerCanViewPending) return NextResponse.json(formatAdminCar(car, actor ?? null, galleryArg));
    return NextResponse.json(formatPublicCar(car, actor ?? null, galleryArg));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const HOST_FIELDS = ["brand", "model", "year", "pricePerDay", "pricePerHour", "transmission", "fuelType", "seats", "location", "description", "imageUrl", "available"] as const;
const ADMIN_FIELDS = [...HOST_FIELDS, "listing"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const carId = Number(id);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
    if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

    const isAdmin = actor.role === "admin";
    const isHostOwner = car.hostUserId != null && car.hostUserId === actor.id;
    const isGuestPendingOwner =
      car.listingApprovalStatus === "pending" &&
      car.hostUserId == null &&
      viewerOwnsCar(car, actor);
    if (!isAdmin && !isHostOwner && !isGuestPendingOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    const fields = isAdmin ? ADMIN_FIELDS : HOST_FIELDS;
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (f === "year" || f === "seats") updates[f] = Number(body[f]);
        else if (f === "pricePerDay" || f === "pricePerHour") updates[f] = String(body[f]);
        else updates[f] = body[f];
      }
    }

    const handoverTouched = ["handoverLocation", "pickupLocation", "dropLocation", "handoverLat", "handoverLng"].some(
      (k) => body[k] !== undefined
    );
    if (handoverTouched) {
      const h = normalizeHandoverForSave(body);
      updates.pickupLocation = h.pickupLocation;
      updates.dropLocation = h.dropLocation;
      updates.handoverLat = h.handoverLat;
      updates.handoverLng = h.handoverLng;
    }

    if (isAdmin && Array.isArray(body.images)) {
      const urls = body.images
        .filter((u: unknown) => typeof u === "string")
        .map((u: string) => u.trim())
        .filter(Boolean);
      await replaceCarGallery(carId, urls);
      updates.imageUrl = urls.length > 0 ? urls[0] : null;
    }

    if (isHostOwner && !isAdmin && updates.pricePerDay !== undefined) {
      const display = actor.name?.trim() || actor.email.split("@")[0] || "Host";
      updates.listing = peerHostListingJson(display, Number(updates.pricePerDay));
    } else if (isGuestPendingOwner && !isAdmin && updates.pricePerDay !== undefined) {
      const display = car.ownerName?.trim() || actor.email.split("@")[0] || "Host";
      const base = peerHostListingJson(display, Number(updates.pricePerDay));
      updates.listing = {
        ...base,
        promoTag: "Awaiting approval",
        availabilityNote: "Not visible in search until UBs admin approves your request.",
      };
    }

    const [updated] = await db.update(carsTable).set(updates).where(eq(carsTable.id, carId)).returning();
    if (!updated) return NextResponse.json({ error: "Car not found" }, { status: 404 });
    const gallery = await getGalleryUrlsForCar(carId);
    const galleryArg = gallery.length > 0 ? gallery : null;
    return NextResponse.json(isAdmin ? formatAdminCar(updated, actor, galleryArg) : formatPublicCar(updated, actor, galleryArg));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const carId = Number(id);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
    if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

    const isAdmin = actor.role === "admin";
    const isHostOwner = car.hostUserId != null && car.hostUserId === actor.id;
    const isGuestPendingOwner =
      car.listingApprovalStatus === "pending" &&
      car.hostUserId == null &&
      viewerOwnsCar(car, actor);
    if (!isAdmin && !isHostOwner && !isGuestPendingOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [deleted] = await db.delete(carsTable).where(eq(carsTable.id, carId)).returning();
    if (!deleted) return NextResponse.json({ error: "Car not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
