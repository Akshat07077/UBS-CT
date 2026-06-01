"use client";

import { formatINR } from "@/components/car-card";
import type { BookingPaymentQuote } from "@/lib/booking-payment-settings";
import type { CollateralType } from "@/lib/constants/collateral";
import { Wallet } from "lucide-react";

export function BookingPaymentSummary({
  quote,
  collateralType,
  collateralDetail,
  compact = false,
}: {
  quote: BookingPaymentQuote;
  collateralType?: CollateralType | null;
  collateralDetail?: string | null;
  compact?: boolean;
}) {
  const showAdvance = quote.advanceEnabled && quote.advanceAmount > 0 && quote.balanceDue > 0;

  return (
    <div className={`space-y-3 ${compact ? "text-sm" : ""}`}>
      {quote.driverTotal > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Chauffeur add-on</span>
          <span className="font-medium text-foreground">{formatINR(quote.driverTotal)}</span>
        </div>
      )}

      <div className="flex justify-between items-center border-t border-border/50 pt-2">
        <span className="font-semibold text-foreground">Rental total</span>
        <span className="font-bold text-lg text-primary">{formatINR(quote.totalPrice)}</span>
      </div>

      {showAdvance && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <Wallet className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-sm">{quote.advanceLabel}</span>
                <span className="font-bold text-primary shrink-0">{formatINR(quote.advanceAmount)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{quote.advanceHelpText}</p>
              {quote.balanceDue > 0 && (
                <p className="text-xs mt-2 flex justify-between">
                  <span className="text-muted-foreground">Balance at pickup</span>
                  <span className="font-semibold">{formatINR(quote.balanceDue)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {quote.collateralRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="font-semibold text-sm">{quote.collateralSectionTitle}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{quote.collateralSectionHelp}</p>
          {collateralType === "bike_scooty" && (
            <p className="text-xs font-medium text-foreground">
              ✓ {quote.bikeScootyOptionLabel}
              {collateralDetail?.trim() ? ` · ${collateralDetail.trim()}` : ""}
            </p>
          )}
          {collateralType === "cash_refundable" && (
            <p className="text-xs font-medium text-foreground">
              ✓ {formatINR(quote.cashRefundableAmountInr)} refundable at pickup
            </p>
          )}
          {!collateralType && (
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>• {quote.bikeScootyOptionLabel}</li>
              <li>• {quote.cashOptionLabel.replace("₹20,000", formatINR(quote.cashRefundableAmountInr))}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CollateralChoiceForm({
  quote,
  value,
  onChange,
  detail,
  onDetailChange,
}: {
  quote: BookingPaymentQuote;
  value: CollateralType | "";
  onChange: (v: CollateralType) => void;
  detail: string;
  onDetailChange: (v: string) => void;
}) {
  if (!quote.collateralRequired) return null;

  const cashLabel = quote.cashOptionLabel.includes("20,000")
    ? quote.cashOptionLabel.replace("₹20,000", formatINR(quote.cashRefundableAmountInr))
    : `${formatINR(quote.cashRefundableAmountInr)} refundable deposit`;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm">{quote.collateralSectionTitle}</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{quote.collateralSectionHelp}</p>
      </div>

      <div className="space-y-2">
        <label
          className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
            value === "bike_scooty" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          <input
            type="radio"
            name="collateral"
            className="mt-1 accent-primary"
            checked={value === "bike_scooty"}
            onChange={() => onChange("bike_scooty")}
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm">{quote.bikeScootyOptionLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{quote.bikeScootyOptionHelp}</p>
          </div>
        </label>

        <label
          className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
            value === "cash_refundable" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          <input
            type="radio"
            name="collateral"
            className="mt-1 accent-primary"
            checked={value === "cash_refundable"}
            onChange={() => onChange("cash_refundable")}
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm">{cashLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{quote.cashOptionHelp}</p>
          </div>
        </label>
      </div>

      {value === "bike_scooty" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Your bike / scooty (model &amp; reg.)</label>
          <input
            type="text"
            value={detail}
            onChange={(e) => onDetailChange(e.target.value)}
            placeholder="e.g. Honda Activa · MP09 AB 1234"
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            required
          />
        </div>
      )}
    </div>
  );
}
