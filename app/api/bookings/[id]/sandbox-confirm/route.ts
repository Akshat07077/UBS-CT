import { NextRequest, NextResponse } from "next/server";
import { db, bookingsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { guestTokenMatches } from "@/lib/booking-service";
import { confirmBookingSandbox } from "@/lib/booking-sandbox";
import { isBookingSandbox } from "@/lib/config/features";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isBookingSandbox()) {
      return NextResponse.json({ error: "Sandbox booking is disabled" }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = Number(id);
    if (!Number.isFinite(bookingId)) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const guestAccessToken = typeof body.guestAccessToken === "string" ? body.guestAccessToken : null;

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const session = await getSession();
    let allowed = guestTokenMatches(booking, guestAccessToken);

    if (!allowed && session.userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (user) {
        allowed =
          user.role === "admin" ||
          (booking.userId != null && booking.userId === user.id);
      }
    }

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const confirmed = await confirmBookingSandbox(bookingId);
    if (!confirmed) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    return NextResponse.json({
      ...confirmed,
      sandbox: true,
      message: "Booking confirmed (test mode — no payment charged).",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
