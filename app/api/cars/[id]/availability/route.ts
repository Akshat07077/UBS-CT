import { NextRequest, NextResponse } from "next/server";
import { db, carsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { countWebsiteBookingConflicts } from "@/lib/booking-availability";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const carId = Number(id);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);

    if (!car || car.listingApprovalStatus !== "approved" || !car.available) {
      return NextResponse.json({ available: false, conflictingBookings: 0 });
    }

    const { searchParams } = new URL(req.url);
    const pickup_date = searchParams.get("pickup_date");
    const return_date = searchParams.get("return_date");

    if (!pickup_date || !return_date) {
      return NextResponse.json({ error: "pickup_date and return_date required" }, { status: 400 });
    }

    const conflictCount = await countWebsiteBookingConflicts(db, carId, pickup_date, return_date);

    return NextResponse.json({
      available: conflictCount === 0,
      conflictingBookings: conflictCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
