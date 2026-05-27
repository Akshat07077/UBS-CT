import { NextRequest, NextResponse } from "next/server";
import { db, paymentsTable, bookingsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { guestTokenMatches } from "@/lib/booking-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { bookingId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, Number(bookingId))).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const session = await getSession();
    let allowed = guestTokenMatches(booking, token);
    if (!allowed && session.userId) {
      const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (currentUser) {
        allowed =
          currentUser.role === "admin" ||
          (booking.userId != null && booking.userId === currentUser.id);
      }
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.bookingId, Number(bookingId)))
      .limit(1);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    return NextResponse.json({ ...payment, amount: Number(payment.amount) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
