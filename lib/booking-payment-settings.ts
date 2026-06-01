import type { CarListingJson } from "@/lib/rental-listing";

export type AdvanceMode = "percent" | "fixed" | "full";

export type BookingPaymentSettings = {
  advanceEnabled: boolean;
  advanceMode: AdvanceMode;
  advancePercent: number;
  advanceFixedInr: number;
  advanceLabel: string;
  advanceHelpText: string;
  /** Mandatory collateral choice at pickup (bike/scooty left vs cash). */
  collateralRequired: boolean;
  cashRefundableAmountInr: number;
  bikeScootyOptionLabel: string;
  bikeScootyOptionHelp: string;
  cashOptionLabel: string;
  cashOptionHelp: string;
  collateralSectionTitle: string;
  collateralSectionHelp: string;
};

export const DEFAULT_BOOKING_PAYMENT_SETTINGS: BookingPaymentSettings = {
  advanceEnabled: true,
  advanceMode: "percent",
  advancePercent: 30,
  advanceFixedInr: 2000,
  advanceLabel: "Booking advance",
  advanceHelpText: "Pay now to confirm your booking. Balance due at pickup.",
  collateralRequired: true,
  cashRefundableAmountInr: 20000,
  bikeScootyOptionLabel: "Leave your bike or scooty",
  bikeScootyOptionHelp: "Hand over your two-wheeler at pickup. Returned when you drop the car back.",
  cashOptionLabel: "₹20,000 refundable cash deposit",
  cashOptionHelp: "Paid at pickup and refunded after the car is returned in agreed condition.",
  collateralSectionTitle: "Security at pickup (required)",
  collateralSectionHelp: "Choose one option. You get your bike/scooty or cash back when you return the rental car.",
};

export type BookingPaymentQuote = {
  rentalSubtotal: number;
  driverTotal: number;
  totalPrice: number;
  advanceAmount: number;
  balanceDue: number;
  advanceLabel: string;
  advanceHelpText: string;
  advanceEnabled: boolean;
  collateralRequired: boolean;
  cashRefundableAmountInr: number;
  bikeScootyOptionLabel: string;
  bikeScootyOptionHelp: string;
  cashOptionLabel: string;
  cashOptionHelp: string;
  collateralSectionTitle: string;
  collateralSectionHelp: string;
};

export type CarPaymentOverrides = Pick<
  CarListingJson,
  "advancePaymentDisabled" | "advancePaymentOverrideInr" | "advancePaymentOverridePercent"
>;

export function normalizeBookingPaymentSettings(raw: unknown): BookingPaymentSettings {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const mode = d.advanceMode === "fixed" || d.advanceMode === "full" ? d.advanceMode : "percent";

  const cashDefault =
    Number(d.cashRefundableAmountInr) ||
    Number(d.securityDepositFixedInr) ||
    DEFAULT_BOOKING_PAYMENT_SETTINGS.cashRefundableAmountInr;

  return {
    advanceEnabled: d.advanceEnabled !== false,
    advanceMode: mode,
    advancePercent: Math.min(100, Math.max(0, Number(d.advancePercent) || DEFAULT_BOOKING_PAYMENT_SETTINGS.advancePercent)),
    advanceFixedInr: Math.max(0, Number(d.advanceFixedInr) || DEFAULT_BOOKING_PAYMENT_SETTINGS.advanceFixedInr),
    advanceLabel:
      typeof d.advanceLabel === "string" && d.advanceLabel.trim()
        ? d.advanceLabel.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.advanceLabel,
    advanceHelpText:
      typeof d.advanceHelpText === "string" && d.advanceHelpText.trim()
        ? d.advanceHelpText.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.advanceHelpText,
    collateralRequired: d.collateralRequired !== false,
    cashRefundableAmountInr: Math.max(0, cashDefault),
    bikeScootyOptionLabel:
      typeof d.bikeScootyOptionLabel === "string" && d.bikeScootyOptionLabel.trim()
        ? d.bikeScootyOptionLabel.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.bikeScootyOptionLabel,
    bikeScootyOptionHelp:
      typeof d.bikeScootyOptionHelp === "string" && d.bikeScootyOptionHelp.trim()
        ? d.bikeScootyOptionHelp.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.bikeScootyOptionHelp,
    cashOptionLabel:
      typeof d.cashOptionLabel === "string" && d.cashOptionLabel.trim()
        ? d.cashOptionLabel.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.cashOptionLabel,
    cashOptionHelp:
      typeof d.cashOptionHelp === "string" && d.cashOptionHelp.trim()
        ? d.cashOptionHelp.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.cashOptionHelp,
    collateralSectionTitle:
      typeof d.collateralSectionTitle === "string" && d.collateralSectionTitle.trim()
        ? d.collateralSectionTitle.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.collateralSectionTitle,
    collateralSectionHelp:
      typeof d.collateralSectionHelp === "string" && d.collateralSectionHelp.trim()
        ? d.collateralSectionHelp.trim()
        : DEFAULT_BOOKING_PAYMENT_SETTINGS.collateralSectionHelp,
  };
}

export function computeBookingPaymentQuote(
  settings: BookingPaymentSettings,
  listing: CarListingJson | null | undefined,
  rentalSubtotal: number,
  driverTotal: number
): BookingPaymentQuote {
  const totalPrice = rentalSubtotal + driverTotal;
  const overrides = listing as CarPaymentOverrides | null | undefined;

  let advanceAmount = 0;
  let advanceEnabled = false;

  if (!overrides?.advancePaymentDisabled) {
    if (overrides?.advancePaymentOverrideInr != null && Number.isFinite(overrides.advancePaymentOverrideInr)) {
      advanceAmount = Math.max(0, overrides.advancePaymentOverrideInr);
      advanceEnabled = advanceAmount > 0;
    } else if (overrides?.advancePaymentOverridePercent != null && Number.isFinite(overrides.advancePaymentOverridePercent)) {
      advanceAmount = Math.round((totalPrice * Math.max(0, overrides.advancePaymentOverridePercent)) / 100);
      advanceEnabled = advanceAmount > 0;
    } else if (settings.advanceEnabled) {
      advanceEnabled = true;
      if (settings.advanceMode === "full") {
        advanceAmount = totalPrice;
      } else if (settings.advanceMode === "fixed") {
        advanceAmount = settings.advanceFixedInr;
      } else {
        advanceAmount = Math.round((totalPrice * settings.advancePercent) / 100);
      }
    }
  }

  advanceAmount = Math.min(Math.max(0, advanceAmount), totalPrice);
  if (advanceAmount <= 0) advanceEnabled = false;

  return {
    rentalSubtotal,
    driverTotal,
    totalPrice,
    advanceAmount,
    balanceDue: totalPrice - advanceAmount,
    advanceLabel: settings.advanceLabel,
    advanceHelpText: settings.advanceHelpText,
    advanceEnabled,
    collateralRequired: settings.collateralRequired,
    cashRefundableAmountInr: settings.cashRefundableAmountInr,
    bikeScootyOptionLabel: settings.bikeScootyOptionLabel,
    bikeScootyOptionHelp: settings.bikeScootyOptionHelp,
    cashOptionLabel: settings.cashOptionLabel,
    cashOptionHelp: settings.cashOptionHelp,
    collateralSectionTitle: settings.collateralSectionTitle,
    collateralSectionHelp: settings.collateralSectionHelp,
  };
}

export function securityDepositForCollateral(
  collateralType: "bike_scooty" | "cash_refundable",
  cashAmountInr: number
): number {
  return collateralType === "cash_refundable" ? cashAmountInr : 0;
}
