import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Percent, Sparkles, TrendingUp } from "lucide-react";
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
  showBrowseLink?: boolean;
};

export function PricingOfferBanner({
  offer,
  className,
  compact,
  showBrowseLink = true,
}: PricingOfferBannerProps) {
  if (!isPricingOfferActive(offer)) return null;

  const badge = pricingOfferSummary(offer);
  const isDiscount = offer.direction === "discount";
  const detailLine =
    offer.description ||
    (offer.applyToBookings
      ? isDiscount
        ? `${offer.percent}% off listed rates and booking totals.`
        : `${offer.percent}% adjustment on listed rates and booking totals.`
      : "");

  if (compact) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-primary/25",
          "bg-gradient-to-r from-primary/10 via-card to-card",
          "px-4 py-3 flex items-center gap-3",
          className
        )}
        role="status"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.12),transparent_55%)] pointer-events-none" />
        <div className="relative shrink-0 w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-md shadow-primary/20">
          {isDiscount ? <Percent className="w-4 h-4 text-primary-foreground" /> : <TrendingUp className="w-4 h-4 text-primary-foreground" />}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {offer.title ? <span className="font-semibold text-sm text-foreground">{offer.title}</span> : null}
            {badge ? (
              <Badge className="border-none bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold px-2 py-0">
                {badge}
              </Badge>
            ) : null}
          </div>
          {detailLine ? <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{detailLine}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 shadow-lg shadow-primary/5",
        className
      )}
      role="status"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,hsl(var(--primary)/0.18),transparent_45%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 sm:p-6">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-primary/20">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Limited offer</span>
              {badge ? (
                <Badge className="border-none bg-gradient-gold text-primary-foreground text-xs uppercase tracking-wider font-bold px-3 py-1 shadow-md">
                  {badge}
                </Badge>
              ) : null}
            </div>

            {offer.title ? (
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight">
                {offer.title}
              </h3>
            ) : null}

            {detailLine ? (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{detailLine}</p>
            ) : null}

            {offer.applyToBookings && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/90">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Applied automatically at checkout
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0 sm:pl-2">
          <div
            className={cn(
              "text-center sm:text-right px-4 py-2 rounded-xl border",
              isDiscount ? "border-green-500/30 bg-green-500/10" : "border-amber-500/30 bg-amber-500/10"
            )}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isDiscount ? "You save" : "Rate change"}
            </p>
            <p className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tabular-nums">
              {isDiscount ? "−" : "+"}
              {offer.percent}%
            </p>
          </div>

          {showBrowseLink ? (
            <Button
              asChild
              size="lg"
              className="rounded-xl h-11 px-6 font-semibold bg-gradient-gold hover:bg-gradient-gold-hover text-primary-foreground shadow-lg shadow-primary/20 gap-2 w-full sm:w-auto"
            >
              <Link href="/cars">
                Browse cars
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PricingOfferBadge({ offer, className }: { offer: PricingOfferSettings; className?: string }) {
  if (!isPricingOfferActive(offer)) return null;
  const badge = pricingOfferSummary(offer);
  if (!badge) return null;
  return (
    <Badge
      className={cn(
        "border-none text-[10px] uppercase tracking-wide font-bold shadow-md bg-gradient-gold text-primary-foreground",
        className
      )}
    >
      {badge}
    </Badge>
  );
}
