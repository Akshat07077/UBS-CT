import { NextResponse } from "next/server";
import { isPaymentsEnabled } from "@/lib/config/features";
import {
  getBookingPaymentSettings,
  getPaymentQrSettings,
  getPricingOfferSettings,
  getPricingUpliftSettings,
} from "@/lib/db/site-settings";
import { isQrPaymentConfigured } from "@/lib/payment-qr-settings";

export async function GET() {
  const [bookingPayments, pricingUplift, pricingOffer, paymentQr] = await Promise.all([
    getBookingPaymentSettings(),
    getPricingUpliftSettings(),
    getPricingOfferSettings(),
    getPaymentQrSettings(),
  ]);
  return NextResponse.json({
    paymentsEnabled: isPaymentsEnabled(),
    qrPaymentEnabled: isQrPaymentConfigured(paymentQr),
    paymentQr,
    bookingPayments,
    pricingUplift,
    pricingOffer,
  });
}
