import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isPricingOfferActive,
  pricingOfferSummary,
  type PricingOfferSettings,
} from "@/lib/pricing-offer-settings";

type PricingOfferBannerProps = {
  offer: PricingOfferSettings;
  className?: string;
  compact?: boolean;
};

export function PricingOfferBanner({ offer, className, compact }: PricingOfferBannerProps) {
  if (!isPricingOfferActive(offer)) return null;

  const badge = pricingOfferSummary(offer);
  const isDiscount = offer.direction === "discount";

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3",
        isDiscount
          ? "border-green-500/30 bg-green-500/10"
          : "border-amber-500/30 bg-amber-500/10",
        className
      )}
      role="status"
    >
      <div
        className={cn(
          "shrink-0 rounded-xl p-2",
          isDiscount ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        )}
      >
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {offer.title ? (
            <p className="font-display font-bold text-foreground">{offer.title}</p>
          ) : null}
          {badge ? (
            <Badge
              className={cn(
                "border-none text-[10px] uppercase tracking-wide font-bold",
                isDiscount ? "bg-green-600 text-white" : "bg-amber-600 text-white"
              )}
            >
              {badge}
            </Badge>
          ) : null}
        </div>
        {!compact && offer.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
        ) : null}
        {!compact && offer.applyToBookings ? (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {isDiscount
              ? `${offer.percent}% discount applied to listed rates and booking totals.`
              : `${offer.percent}% price adjustment applied to listed rates and booking totals.`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PricingOfferBadge({ offer, className }: { offer: PricingOfferSettings; className?: string }) {
  if (!isPricingOfferActive(offer)) return null;
  const badge = pricingOfferSummary(offer);
  if (!badge) return null;
  const isDiscount = offer.direction === "discount";
  return (
    <Badge
      className={cn(
        "border-none text-[10px] uppercase tracking-wide font-bold shadow-md",
        isDiscount ? "bg-green-600 text-white" : "bg-amber-600 text-white",
        className
      )}
    >
      {badge}
    </Badge>
  );
}
