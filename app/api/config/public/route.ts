import { NextResponse } from "next/server";
import { isBookingSandbox, isPaymentsEnabled } from "@/lib/config/features";
import { getBookingPaymentSettings, getPricingOfferSettings, getPricingUpliftSettings } from "@/lib/db/site-settings";

export async function GET() {
  const [bookingPayments, pricingUplift, pricingOffer] = await Promise.all([
    getBookingPaymentSettings(),
    getPricingUpliftSettings(),
    getPricingOfferSettings(),
  ]);
  return NextResponse.json({
    bookingSandbox: isBookingSandbox(),
    paymentsEnabled: isPaymentsEnabled(),
    bookingPayments,
    pricingUplift,
    pricingOffer,
  });
}
