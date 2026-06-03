import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Fuel, Settings2, MapPin, Sparkles } from "lucide-react";
import type { CarListingJson } from "@/lib/rental-listing";
import { carDetailHref, type BookingSearchParams } from "@/lib/booking-search-params";

export type { CarListingJson };

const defaultImage = "https://images.unsplash.com/photo-1503376760302-8fac2a800d02?w=800&q=80";

export interface CarData {
  id: number;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  pricePerHour: number;
  transmission: string;
  fuelType: string;
  seats: number;
  location: string;
  description?: string | null;
  imageUrl: string | null;
  /** Gallery URLs (ordered); from API when present. */
  images?: string[];
  available: boolean;
  listing?: CarListingJson | null;
  /** Set when listed by a logged-in user (legacy host path); null for fleet and guest submissions. */
  hostUserId?: number | null;
  /** True for logged-in host cars and guest-listed cars (approved); from API only. */
  isCommunityListing?: boolean;
  /** Present on car detail when the signed-in user owns this listing (host or guest email match). */
  isViewerOwner?: boolean;
  listingApprovalStatus?: "approved" | "pending" | "rejected";
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function CarCard({
  car,
  bookingSearch,
}: {
  car: CarData;
  /** Pickup/return (and optional city) from homepage or browse search — forwarded to detail page. */
  bookingSearch?: BookingSearchParams;
}) {
  const L = car.listing;
  const href = carDetailHref(car.id, bookingSearch);

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5",
        "hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={(car.images && car.images[0]) || car.imageUrl || defaultImage}
          alt={`${car.brand} ${car.model}`}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-background/90 text-foreground backdrop-blur-md border-none font-bold shadow-sm px-3 py-1">{car.year}</Badge>
        </div>
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start max-w-[70%]">
          <Badge className="bg-background/90 text-muted-foreground backdrop-blur-md border-none text-xs px-2 py-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {car.location}
          </Badge>
          {L?.promoTag && (
            <Badge className="bg-primary text-primary-foreground border-none text-[10px] uppercase tracking-wide px-2 py-0.5 shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {L.promoTag}
            </Badge>
          )}
          {car.isCommunityListing && (
            <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 text-[10px] px-2 py-0.5">
              Community host
            </Badge>
          )}
        </div>
        {!car.available && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px] z-20">
            <Badge variant="destructive" className="text-sm px-4 py-1.5 shadow-lg">Currently Unavailable</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold tracking-tight line-clamp-1">{car.brand} {car.model}</h3>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{car.fuelType} · {car.transmission}</p>
            {L?.supplierName && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">via {L.supplierName}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg sm:text-xl font-display font-bold text-primary leading-tight">
              {formatINR(car.pricePerDay)}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Per day</p>
            <p className="text-sm font-semibold text-foreground mt-1">{formatINR(car.pricePerHour)}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Per hour</p>
          </div>
        </div>

        {L?.availabilityNote && (
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-3">
            {L.availabilityNote}
          </p>
        )}

        {L && L.chauffeurPerKmMin != null && L.chauffeurPerKmMax != null && (
          <p className="text-[11px] text-muted-foreground mb-3">
            Chauffeur add-on: {formatINR(L.chauffeurPerKmMin)} – {formatINR(L.chauffeurPerKmMax)} / km
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 py-4 mb-4 border-y border-border/50">
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
            <Settings2 className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs font-medium capitalize">{car.transmission}</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
            <Fuel className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs font-medium capitalize">{car.fuelType}</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs font-medium">{car.seats} Seats</span>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <span
            className={cn(
              buttonVariants({ size: "lg", variant: car.available ? "default" : "secondary" }),
              "w-full font-semibold rounded-xl pointer-events-none"
            )}
          >
            {car.available ? "View Details" : "View Specs"}
          </span>
        </div>
      </div>
    </Link>
  );
}
