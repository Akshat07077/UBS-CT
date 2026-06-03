export type PricingUpliftSettings = {
  weekendUpliftEnabled: boolean;
  /** Extra % on Sat/Sun (e.g. 15 = +15% vs weekday base). */
  weekendUpliftPercent: number;
  peakSeasonEnabled: boolean;
  /** Extra % during peak months (e.g. 32 = +32%). */
  peakSeasonUpliftPercent: number;
  /** Inclusive month numbers 1–12; supports wrap (e.g. Oct=10 through Mar=3). */
  peakSeasonStartMonth: number;
  peakSeasonEndMonth: number;
  /** Max combined uplift vs base (e.g. 45 = multiplier capped at 1.45). */
  combinedMaxUpliftPercent: number;
};

export const DEFAULT_PRICING_UPLIFT_SETTINGS: PricingUpliftSettings = {
  weekendUpliftEnabled: true,
  weekendUpliftPercent: 15,
  peakSeasonEnabled: true,
  peakSeasonUpliftPercent: 32,
  peakSeasonStartMonth: 10,
  peakSeasonEndMonth: 3,
  combinedMaxUpliftPercent: 45,
};

export function normalizePricingUpliftSettings(raw: unknown): PricingUpliftSettings {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const clampMonth = (n: unknown, fallback: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(12, Math.max(1, Math.round(v)));
  };
  const clampPercent = (n: unknown, fallback: number, max = 200) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(0, Math.round(v)));
  };

  return {
    weekendUpliftEnabled: d.weekendUpliftEnabled !== false,
    weekendUpliftPercent: clampPercent(d.weekendUpliftPercent, DEFAULT_PRICING_UPLIFT_SETTINGS.weekendUpliftPercent),
    peakSeasonEnabled: d.peakSeasonEnabled !== false,
    peakSeasonUpliftPercent: clampPercent(
      d.peakSeasonUpliftPercent,
      DEFAULT_PRICING_UPLIFT_SETTINGS.peakSeasonUpliftPercent
    ),
    peakSeasonStartMonth: clampMonth(d.peakSeasonStartMonth, DEFAULT_PRICING_UPLIFT_SETTINGS.peakSeasonStartMonth),
    peakSeasonEndMonth: clampMonth(d.peakSeasonEndMonth, DEFAULT_PRICING_UPLIFT_SETTINGS.peakSeasonEndMonth),
    combinedMaxUpliftPercent: clampPercent(
      d.combinedMaxUpliftPercent,
      DEFAULT_PRICING_UPLIFT_SETTINGS.combinedMaxUpliftPercent,
      100
    ),
  };
}

/** Month 1–12 falls in peak window (supports Dec→Mar style wrap). */
export function isPeakSeasonMonth(month: number, start: number, end: number): boolean {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "short" });
}

export function peakSeasonRangeLabel(start: number, end: number): string {
  if (start === end) return monthName(start);
  return `${monthName(start)} – ${monthName(end)}`;
}
