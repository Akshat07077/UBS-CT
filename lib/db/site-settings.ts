import { db, siteSettingsTable } from "./index";
import { eq } from "drizzle-orm";
import {
  DEFAULT_BOOKING_PAYMENT_SETTINGS,
  normalizeBookingPaymentSettings,
  type BookingPaymentSettings,
} from "@/lib/booking-payment-settings";

export const BOOKING_PAYMENTS_KEY = "booking_payments";

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
