import { NextRequest, NextResponse } from "next/server";
import { db, paymentsTable, bookingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  try {
    const stripe = new Stripe(stripeKey);
    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const stripeSession = event.data.object as Stripe.Checkout.Session;
      const bookingId = Number(stripeSession.metadata?.bookingId);
      if (bookingId) {
        await db.update(paymentsTable).set({ paymentStatus: "paid" }).where(eq(paymentsTable.stripeSessionId, stripeSession.id));
        await db.update(bookingsTable).set({ status: "confirmed" }).where(eq(bookingsTable.id, bookingId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
