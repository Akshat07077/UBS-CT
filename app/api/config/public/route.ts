import { NextResponse } from "next/server";
import { isBookingSandbox, isPaymentsEnabled } from "@/lib/config/features";
import { getBookingPaymentSettings } from "@/lib/db/site-settings";

export async function GET() {
  const bookingPayments = await getBookingPaymentSettings();
  return NextResponse.json({
    bookingSandbox: isBookingSandbox(),
    paymentsEnabled: isPaymentsEnabled(),
    bookingPayments,
  });
}
