import { db, siteSettingsTable } from "./index";
import { eq } from "drizzle-orm";
import {
  DEFAULT_BOOKING_PAYMENT_SETTINGS,
  normalizeBookingPaymentSettings,
  type BookingPaymentSettings,
} from "@/lib/booking-payment-settings";
import {
  DEFAULT_PRICING_UPLIFT_SETTINGS,
  normalizePricingUpliftSettings,
  type PricingUpliftSettings,
} from "@/lib/pricing-uplift-settings";

export const BOOKING_PAYMENTS_KEY = "booking_payments";
export const PRICING_UPLIFT_KEY = "pricing_uplift";

export async function getBookingPaymentSettings(): Promise<BookingPaymentSettings> {
  const [row] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, BOOKING_PAYMENTS_KEY))
    .limit(1);

  if (!row?.value) return DEFAULT_BOOKING_PAYMENT_SETTINGS;
  return normalizeBookingPaymentSettings(row.value);
}

export async function setBookingPaymentSettings(settings: BookingPaymentSettings) {
  const normalized = normalizeBookingPaymentSettings(settings);
  const [existing] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, BOOKING_PAYMENTS_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(siteSettingsTable)
      .set({ value: normalized, updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, BOOKING_PAYMENTS_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: BOOKING_PAYMENTS_KEY,
      value: normalized,
    });
  }
  return normalized;
}

export async function getPricingUpliftSettings(): Promise<PricingUpliftSettings> {
  const [row] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, PRICING_UPLIFT_KEY))
    .limit(1);

  if (!row?.value) return DEFAULT_PRICING_UPLIFT_SETTINGS;
  return normalizePricingUpliftSettings(row.value);
}

export async function setPricingUpliftSettings(settings: PricingUpliftSettings) {
  const normalized = normalizePricingUpliftSettings(settings);
  const [existing] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, PRICING_UPLIFT_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(siteSettingsTable)
      .set({ value: normalized, updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, PRICING_UPLIFT_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: PRICING_UPLIFT_KEY,
      value: normalized,
    });
  }
  return normalized;
}
