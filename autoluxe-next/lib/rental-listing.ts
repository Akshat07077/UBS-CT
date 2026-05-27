/** Extended marketplace-style fields for Indian mid-tier city rentals (POC). */

import { brand } from "@/lib/brand/config";

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

export function isWeekendIndia(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Oct–Mar: weddings + north / Rajasthan tourist season (POC rule). */
export function isTouristOrWeddingSeason(d: Date): boolean {
  const m = d.getMonth() + 1;
  return m >= 10 || m <= 3;
}

/** Weekends +10–15%, peak season +~32%, combined capped at +45% vs weekday base. */
export function priceMultiplierForDate(d: Date): number {
  let m = 1;
  if (isTouristOrWeddingSeason(d)) m *= 1.32;
  if (isWeekendIndia(d)) m *= 1.15;
  return Math.min(m, 1.45);
}

export function pricingContextLabel(d: Date): string {
  const peak = isTouristOrWeddingSeason(d);
  const wknd = isWeekendIndia(d);
  if (peak && wknd) return "Peak season · Weekend";
  if (peak) return "Peak / wedding season";
  if (wknd) return "Weekend";
  return "Weekday";
}

export function scaledDayBand(priceMin: number, priceMax: number, d: Date): { from: number; to: number } {
  const mul = priceMultiplierForDate(d);
  return { from: Math.round(priceMin * mul), to: Math.round(priceMax * mul) };
}

function parseYmd(ymd: string): Date | null {
  const p = ymd.split("-").map(Number);
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null;
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
}

/** Sum each calendar rental day [pickup, return) with weekday base × daily multiplier. */
export function sumDailyRates(pickupDateStr: string, returnDateStr: string, weekdayPricePerDay: number): number {
  const start = parseYmd(pickupDateStr);
  const end = parseYmd(returnDateStr);
  if (!start || !end || end <= start) return 0;
  let total = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    total += weekdayPricePerDay * priceMultiplierForDate(new Date(d));
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
