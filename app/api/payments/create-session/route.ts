import { NextRequest, NextResponse } from "next/server";
import { db, bookingsTable, paymentsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { guestTokenMatches } from "@/lib/booking-service";
import Stripe from "stripe";
import { isPaymentsEnabled } from "@/lib/config/features";

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentsEnabled()) {
      return NextResponse.json({ error: "Online payments are not enabled" }, { status: 503 });
    }

    const { bookingId, guestAccessToken } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, Number(bookingId))).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const session = await getSession();
    let allowed = guestTokenMatches(booking, guestAccessToken);

    if (!allowed && session.userId) {
      const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (currentUser) {
        allowed =
          currentUser.role === "admin" ||
          (booking.userId != null && booking.userId === currentUser.id);
      }
    }

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const baseUrl = process.env.NEXT_PUBLIC_URL || `https://${process.env.VERCEL_URL}`;
    const tokenQuery = booking.guestAccessToken ? `&token=${booking.guestAccessToken}` : "";

    const chargeAmount =
      Number(booking.advanceAmount) > 0 ? Number(booking.advanceAmount) : Number(booking.totalPrice);

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name:
                chargeAmount < Number(booking.totalPrice)
                  ? `Booking advance #${booking.id}`
                  : `Rental booking #${booking.id}`,
            },
            unit_amount: Math.round(chargeAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/booking/confirmation/${booking.id}?session_id={CHECKOUT_SESSION_ID}${tokenQuery}`,
      cancel_url: `${baseUrl}/cars/${booking.carId}`,
      metadata: { bookingId: String(booking.id) },
    });

    await db.insert(paymentsTable).values({
      bookingId: booking.id,
      amount: String(chargeAmount),
      paymentStatus: "pending",
      stripeSessionId: stripeSession.id,
    });

    return NextResponse.json({ sessionUrl: stripeSession.url, sessionId: stripeSession.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
