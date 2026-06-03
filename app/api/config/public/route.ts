import { NextResponse } from "next/server";
import { isBookingSandbox, isPaymentsEnabled } from "@/lib/config/features";
import { getBookingPaymentSettings, getPricingUpliftSettings } from "@/lib/db/site-settings";

export async function GET() {
  const [bookingPayments, pricingUplift] = await Promise.all([
    getBookingPaymentSettings(),
    getPricingUpliftSettings(),
  ]);
  return NextResponse.json({
    bookingSandbox: isBookingSandbox(),
    paymentsEnabled: isPaymentsEnabled(),
    bookingPayments,
    pricingUplift,
  });
}
