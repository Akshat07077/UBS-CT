/** Refundable collateral when renting a car (not a separate rental). */

export const COLLATERAL_TYPES = ["bike_scooty", "cash_refundable"] as const;
export type CollateralType = (typeof COLLATERAL_TYPES)[number];

export const COLLATERAL_LABELS: Record<CollateralType, string> = {
  bike_scooty: "Bike / scooty deposit",
  cash_refundable: "₹20,000 refundable deposit",
};

export function collateralTypeLabel(type: CollateralType, cashAmountInr: number): string {
  if (type === "cash_refundable") {
    return `₹${cashAmountInr.toLocaleString("en-IN")} refundable deposit`;
  }
  return COLLATERAL_LABELS.bike_scooty;
}
