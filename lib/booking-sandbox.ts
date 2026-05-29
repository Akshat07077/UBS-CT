import { db, bookingsTable, paymentsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatBooking } from "@/lib/booking-service";

/** Mark booking confirmed + record sandbox “payment” for testing without Stripe. */
export async function confirmBookingSandbox(bookingId: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) return null;

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "confirmed" })
    .where(eq(bookingsTable.id, bookingId))
    .returning();

  const [existingPayment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, bookingId))
    .limit(1);

  if (existingPayment) {
    await db
      .update(paymentsTable)
      .set({ paymentStatus: "paid", stripeSessionId: existingPayment.stripeSessionId || "sandbox" })
      .where(eq(paymentsTable.bookingId, bookingId));
  } else {
    await db.insert(paymentsTable).values({
      bookingId,
      amount: booking.totalPrice,
      paymentStatus: "paid",
      stripeSessionId: "sandbox",
    });
  }

  return formatBooking(updated);
}
