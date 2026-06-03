export type PricingOfferDirection = "discount" | "increment";

export type PricingOfferSettings = {
  /** Master switch. When off, nothing shows and prices are unchanged. */
  enabled: boolean;
  /** discount = lower prices; increment = higher prices. */
  direction: PricingOfferDirection;
  /** Percent change (e.g. 10 = 10% off or +10%). */
  percent: number;
  /** Short badge on cards / banner (e.g. "10% OFF"). */
  badgeText: string;
  /** Headline on the offer banner. */
  title: string;
  /** Optional extra line under the title. */
  description: string;
  /** Apply percent to rental totals at checkout. */
  applyToBookings: boolean;
};

export const DEFAULT_PRICING_OFFER_SETTINGS: PricingOfferSettings = {
  enabled: false,
  direction: "discount",
  percent: 0,
  badgeText: "",
  title: "",
  description: "",
  applyToBookings: true,
};

export function normalizePricingOfferSettings(raw: unknown): PricingOfferSettings {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const clampPercent = (n: unknown, max = 100) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.min(max, Math.max(0, Math.round(v)));
  };

  return {
    enabled: d.enabled === true,
    direction: d.direction === "increment" ? "increment" : "discount",
    percent: clampPercent(d.percent),
    badgeText: typeof d.badgeText === "string" ? d.badgeText.trim().slice(0, 80) : "",
    title: typeof d.title === "string" ? d.title.trim().slice(0, 120) : "",
    description: typeof d.description === "string" ? d.description.trim().slice(0, 400) : "",
    applyToBookings: d.applyToBookings !== false,
  };
}

/** Offer is visible only when enabled with a percent and some label text. */
export function isPricingOfferActive(settings: PricingOfferSettings): boolean {
  return (
    settings.enabled &&
    settings.percent > 0 &&
    (settings.title.length > 0 || settings.badgeText.length > 0)
  );
}

export function pricingOfferSummary(settings: PricingOfferSettings): string {
  if (!isPricingOfferActive(settings)) return "";
  const sign = settings.direction === "discount" ? "−" : "+";
  const label = settings.badgeText || `${sign}${settings.percent}%`;
  return label;
}

export function applyPricingOffer(amount: number, settings: PricingOfferSettings): number {
  if (!settings.enabled || !settings.applyToBookings || settings.percent <= 0) return amount;
  const factor =
    settings.direction === "discount"
      ? 1 - settings.percent / 100
      : 1 + settings.percent / 100;
  return Math.max(0, Math.round(amount * factor));
}

export function adjustedListingPrice(
  basePrice: number,
  settings: PricingOfferSettings
): { price: number; original: number | null } {
  if (!isPricingOfferActive(settings) || !settings.applyToBookings) {
    return { price: basePrice, original: null };
  }
  const price = applyPricingOffer(basePrice, settings);
  if (settings.direction === "discount" && price < basePrice) {
    return { price, original: basePrice };
  }
  return { price, original: null };
}
