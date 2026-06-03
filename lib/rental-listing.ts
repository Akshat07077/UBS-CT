/** Extended marketplace-style fields for Indian mid-tier city rentals (POC). */

import { brand } from "@/lib/brand/config";
import {
  DEFAULT_PRICING_UPLIFT_SETTINGS,
  isPeakSeasonMonth,
  type PricingUpliftSettings,
} from "@/lib/pricing-uplift-settings";
import { parseTime24 } from "@/lib/constants/booking-times";

export type CarSegment = "budget" | "mid" | "premium" | "luxury" | "addon";

export type CarListingJson = {
  supplierName: string;
  segment: CarSegment;
  promoTag: string | null;
  availabilityNote: string;
  pricePerDayMax: number;
  chauffeurPerKmMin?: number;
  chauffeurPerKmMax?: number;
  tripLocalInr?: number;
  tripLocalNote?: string;
  tripFullDayInr?: number;
  tripOutstationPerKm?: number;
  driverPerDayMin: number;
  driverPerDayMax: number;
  securityDepositMin: number;
  securityDepositMax: number;
  fuelPolicy: string;
  /** Per-vehicle overrides — null/omit uses admin global settings. */
  advancePaymentDisabled?: boolean;
  advancePaymentOverrideInr?: number | null;
  advancePaymentOverridePercent?: number | null;
  securityDepositOverrideInr?: number | null;
};

export const DEFAULT_FUEL_POLICY = "Fuel not included · Same-to-same return";

/** Listing metadata for user-hosted cars (Zoomcar-style peer listing). */
export function peerHostListingJson(hostDisplayName: string, pricePerDay: number): CarListingJson {
  const max = Math.round(Number(pricePerDay) * 1.15);
  return {
    supplierName: `${hostDisplayName || "Host"} · Community host`,
    segment: "budget",
    promoTag: "Host listing",
    availabilityNote: `Listed by an individual host · Book like any fleet vehicle on ${brand.name}.`,
    pricePerDayMax: max,
    driverPerDayMin: 300,
    driverPerDayMax: 500,
    securityDepositMin: 2000,
    securityDepositMax: 8000,
    fuelPolicy: DEFAULT_FUEL_POLICY,
  };
}

export function defaultHourlyFromDaily(pricePerDay: number): number {
  return Math.max(1, Math.round(Number(pricePerDay) / 24));
}

export function parseBookingDateTime(dateYmd: string, time24: string): Date {
  const parts = dateYmd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date(NaN);
  const parsed = parseTime24(time24);
  const h = parsed?.h ?? 10;
  const m = parsed?.m ?? 0;
  return new Date(parts[0], parts[1] - 1, parts[2], h, m, 0, 0);
}

/** Total rental length in hours (pickup datetime → return datetime). */
export function rentalDurationHours(
  pickupDate: string,
  pickupTime: string,
  returnDate: string,
  returnTime: string
): number {
  const start = parseBookingDateTime(pickupDate, pickupTime);
  const end = parseBookingDateTime(returnDate, returnTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function formatRentalDuration(hours: number): string {
  if (hours <= 0) return "";
  if (hours < 24) {
    const h = Math.ceil(hours);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const fullDays = Math.floor(hours / 24);
  const remainder = hours - fullDays * 24;
  if (remainder === 0) {
    return `${fullDays} ${fullDays === 1 ? "day" : "days"}`;
  }
  const extra = Math.ceil(remainder);
  return `${fullDays} ${fullDays === 1 ? "day" : "days"} + ${extra} ${extra === 1 ? "hour" : "hours"}`;
}

/**
 * Rental pricing:
 * - under 24h → hourly rate × billable hours
 * - exactly 24h → one daily rate
 * - over 24h → full 24h blocks at daily rate + remainder at hourly rate
 */
export function computeRentalTotal(
  pickupDate: string,
  pickupTime: string,
  returnDate: string,
  returnTime: string,
  pricePerDay: number,
  pricePerHour: number,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): number {
  const hours = rentalDurationHours(pickupDate, pickupTime, returnDate, returnTime);
  if (hours <= 0) return 0;

  const pickupStart = parseBookingDateTime(pickupDate, pickupTime);
  const dayRate = Number(pricePerDay);
  const hourRate = Number(pricePerHour);

  if (hours < 24) {
    const billableHours = Math.max(1, Math.ceil(hours));
    const mul = priceMultiplierForDate(pickupStart, settings);
    return Math.round(billableHours * hourRate * mul);
  }

  const fullDays = Math.floor(hours / 24);
  const remainderHours = hours - fullDays * 24;

  let total = 0;
  for (let i = 0; i < fullDays; i++) {
    const blockStart = new Date(pickupStart.getTime() + i * 24 * 60 * 60 * 1000);
    total += dayRate * priceMultiplierForDate(blockStart, settings);
  }

  if (remainderHours > 0) {
    const remainderStart = new Date(pickupStart.getTime() + fullDays * 24 * 60 * 60 * 1000);
    const billableExtra = Math.ceil(remainderHours);
    total += billableExtra * hourRate * priceMultiplierForDate(remainderStart, settings);
  }

  return Math.round(total);
}

export function isWeekendIndia(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Peak / wedding season — uses admin-configured months when settings passed. */
export function isTouristOrWeddingSeason(
  d: Date,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): boolean {
  if (!settings.peakSeasonEnabled) return false;
  const m = d.getMonth() + 1;
  return isPeakSeasonMonth(m, settings.peakSeasonStartMonth, settings.peakSeasonEndMonth);
}

/** Weekend + peak uplifts from admin settings; combined capped vs weekday base. */
export function priceMultiplierForDate(
  d: Date,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): number {
  let m = 1;
  if (settings.peakSeasonEnabled && isTouristOrWeddingSeason(d, settings)) {
    m *= 1 + settings.peakSeasonUpliftPercent / 100;
  }
  if (settings.weekendUpliftEnabled && isWeekendIndia(d)) {
    m *= 1 + settings.weekendUpliftPercent / 100;
  }
  const cap = 1 + settings.combinedMaxUpliftPercent / 100;
  return Math.min(m, cap);
}

export function pricingContextLabel(
  d: Date,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): string {
  const peak = isTouristOrWeddingSeason(d, settings);
  const wknd = settings.weekendUpliftEnabled && isWeekendIndia(d);
  if (peak && wknd) return "Peak season · Weekend";
  if (peak) return "Peak / wedding season";
  if (wknd) return "Weekend";
  return "Weekday";
}

export function scaledDayBand(
  priceMin: number,
  priceMax: number,
  d: Date,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): { from: number; to: number } {
  const mul = priceMultiplierForDate(d, settings);
  return { from: Math.round(priceMin * mul), to: Math.round(priceMax * mul) };
}

function parseYmd(ymd: string): Date | null {
  const p = ymd.split("-").map(Number);
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null;
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
}

/** Sum each calendar rental day [pickup, return) with weekday base × daily multiplier. */
export function sumDailyRates(
  pickupDateStr: string,
  returnDateStr: string,
  weekdayPricePerDay: number,
  settings: PricingUpliftSettings = DEFAULT_PRICING_UPLIFT_SETTINGS
): number {
  const start = parseYmd(pickupDateStr);
  const end = parseYmd(returnDateStr);
  if (!start || !end || end <= start) return 0;
  let total = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    total += weekdayPricePerDay * priceMultiplierForDate(new Date(d), settings);
  }
  return Math.round(total);
}

/** 0 = chauffeur not offered (e.g. two-wheeler). */
export function driverDailyMidpoint(listing: CarListingJson | null | undefined): number {
  if (!listing || listing.driverPerDayMax <= 0) return 0;
  return Math.round((listing.driverPerDayMin + listing.driverPerDayMax) / 2);
}

export function parseListing(raw: unknown): CarListingJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.supplierName !== "string" || typeof o.pricePerDayMax !== "number") return null;
  return raw as CarListingJson;
}
