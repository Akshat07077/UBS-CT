"use client";
import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { formatPhonesDisplay } from "@/lib/utils/phone";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { Users, Fuel, Settings2, MapPin, CheckCircle2, AlertCircle, Shield, Zap, Star, Phone, Building2, CalendarRange } from "lucide-react";
import { formatINR, type CarData } from "@/components/car-card";
import { sumDailyRates, pricingContextLabel, scaledDayBand } from "@/lib/rental-listing";
import { BookingDialog } from "@/components/booking-dialog";
import { CarImageSlider } from "@/components/car-image-slider";
import {
  DEFAULT_PICKUP_TIME,
  DEFAULT_RETURN_TIME,
  formatBookingDateTime,
  formatTime12h,
} from "@/lib/constants/booking-times";

const INCLUSIONS = [
  "Comprehensive insurance included",
  "24/7 roadside assistance",
  "GST included in quoted rental",
  "Free cancellation up to 24 hrs",
];

function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: car, isLoading, error } = useQuery<CarData>({
    queryKey: ["car", id],
    queryFn: () => apiFetch<CarData>(`/api/cars/${id}`),
  });

  const [pickupDate, setPickupDate] = useState(searchParams.get("pickup") ?? "");
  const [returnDate, setReturnDate] = useState(searchParams.get("return") ?? "");
  const [pickupTime, setPickupTime] = useState(searchParams.get("pickupTime") ?? DEFAULT_PICKUP_TIME);
  const [returnTime, setReturnTime] = useState(searchParams.get("returnTime") ?? DEFAULT_RETURN_TIME);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("book") === "1" && pickupDate && returnDate) {
      setBookingOpen(true);
    }
  }, [searchParams, pickupDate, returnDate]);

  useEffect(() => {
    const pt = searchParams.get("pickupTime");
    const rt = searchParams.get("returnTime");
    if (pt) setPickupTime(pt);
    if (rt) setReturnTime(rt);
  }, [searchParams]);

  const { data: availability, isLoading: isChecking } = useQuery<{ available: boolean }>({
    queryKey: ["availability", id, pickupDate, returnDate],
    queryFn: () => apiFetch<{ available: boolean }>(`/api/cars/${id}/availability?pickup_date=${pickupDate}&return_date=${returnDate}`),
    enabled: !!pickupDate && !!returnDate,
  });

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Skeleton className="h-[500px] w-full rounded-3xl mb-8" />
      <Skeleton className="h-12 w-1/3 mb-4" />
    </div>
  );

  if (error || !car) return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center">
      <h2 className="text-3xl font-bold font-display">Car Not Found</h2>
      <Button className="mt-8" onClick={() => router.push("/cars")}>Back to Fleet</Button>
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const days = pickupDate && returnDate ? differenceInDays(new Date(returnDate), new Date(pickupDate)) : 0;
  const L = car.listing;
  const rentalTotal = pickupDate && returnDate && days > 0 ? sumDailyRates(pickupDate, returnDate, car.pricePerDay) : 0;
  const total = rentalTotal;
  const isAvailable = isChecking ? undefined : (availability?.available ?? false);
  const now = new Date();
  const todayBand = L ? scaledDayBand(car.pricePerDay, L.pricePerDayMax, now) : null;
  const isOwnListing = car.isViewerOwner === true;
  const galleryImages =
    car.images && car.images.length > 0 ? car.images : car.imageUrl ? [car.imageUrl] : [];

  const handleBookNow = () => {
    if (!pickupDate || !returnDate) {
      toast({ title: "Dates Required", description: "Please select both pickup and return dates.", variant: "destructive" });
      return;
    }
    if (days <= 0) {
      toast({ title: "Invalid Dates", description: "Return date must be after pickup date.", variant: "destructive" });
      return;
    }
    if (isOwnListing) {
      toast({ title: "Your listing", description: "You cannot book your own vehicle.", variant: "destructive" });
      return;
    }
    setBookingOpen(true);
  };

  return (
    <div className="bg-background pb-16 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
          {/* 1. Gallery — top on mobile */}
          {galleryImages.length > 0 && (
            <div className="order-1 lg:col-span-2">
              <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg">
                <CarImageSlider
                  images={galleryImages}
                  alt={`${car.brand} ${car.model}`}
                  heightClass="h-[min(52vh,440px)] sm:h-[min(56vh,480px)] lg:h-[min(50vh,520px)]"
                />
              </div>
            </div>
          )}

          {/* 2. Title + specs */}
          <div className="order-2 lg:col-span-2">
            <div className="bg-card p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-border/50">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1">{car.year}</Badge>
                <Badge variant="outline" className="capitalize border-border/50">{car.fuelType}</Badge>
                {!car.available && <Badge variant="destructive">Currently Unavailable</Badge>}
                {car.listingApprovalStatus === "pending" && (
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100">
                    Pending admin approval
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-2 break-words pr-1">
                {car.brand} {car.model}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 text-lg mb-4">
                <MapPin className="w-5 h-5 text-primary" /> {car.location}
              </p>
              {car.isCommunityListing && (
                <div className="rounded-xl border border-violet-500/40 bg-violet-950/40 text-violet-50 px-4 py-3 text-sm backdrop-blur-md mb-4">
                  <span className="font-semibold">Community host listing</span>
                  <span className="text-violet-200"> · Same booking flow as fleet cars; host payouts are not wired in this demo.</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-border/50 pt-6">
                {[
                  { icon: Settings2, label: "Gearbox", value: car.transmission },
                  { icon: Fuel, label: "Fuel", value: car.fuelType },
                  { icon: Users, label: "Seats", value: `${car.seats}` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col gap-1.5 sm:gap-2 bg-muted/40 rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden">
                    <span className="text-muted-foreground text-[10px] sm:text-xs font-semibold leading-tight truncate">
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-semibold capitalize min-w-0">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm truncate">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Booking — after gallery + title on mobile; sticky sidebar on desktop */}
          <div className="order-3 lg:col-span-1 lg:row-start-1 lg:row-span-4 lg:self-start">
            <div className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl border border-border/50 lg:sticky lg:top-28">
              <div className="flex items-center justify-between mb-6 gap-3">
                <div className="min-w-0">
                  {L ? (
                    <>
                      <p className="text-2xl md:text-3xl font-display font-bold text-primary leading-tight">
                        {formatINR(car.pricePerDay)} – {formatINR(L.pricePerDayMax)}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Weekday band / day · GST incl.</p>
                      {todayBand && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                          Today: ~{formatINR(todayBand.from)} – {formatINR(todayBand.to)} ({pricingContextLabel(now)})
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-display font-bold text-primary">{formatINR(car.pricePerDay)}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Per day · GST incl.</p>
                    </>
                  )}
                </div>
                {car.available ? (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1 shrink-0">
                    <Zap className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full shrink-0">Unavailable</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Pickup Date</Label>
                    <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} min={today} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Pickup Time</Label>
                    <Input
                      type="time"
                      step={1800}
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">Selected: {formatTime12h(pickupTime)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Return Date</Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={pickupDate || today} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Return Time</Label>
                    <Input
                      type="time"
                      step={1800}
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">Selected: {formatTime12h(returnTime)}</p>
                  </div>
                </div>

                {pickupDate && returnDate && (
                  <p className="text-xs text-muted-foreground rounded-xl bg-muted/40 border border-border/50 px-3 py-2">
                    <span className="font-semibold text-foreground">Schedule: </span>
                    {formatBookingDateTime(pickupDate, pickupTime)} → {formatBookingDateTime(returnDate, returnTime)}
                  </p>
                )}

                {pickupDate && returnDate && (
                  <div className="bg-muted/50 rounded-2xl p-5 border border-border/50">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-muted-foreground">Rental ({days} {days === 1 ? "day" : "days"})</span>
                      <span className="font-medium">{formatINR(rentalTotal)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Nightly rates include weekend &amp; Oct–Mar season uplift when applicable (capped).
                    </p>
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-muted-foreground">GST & Taxes</span>
                      <span className="font-medium text-green-600">Included</span>
                    </div>
                    <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                      <span className="font-bold">Estimated total</span>
                      <span className="font-bold text-xl text-primary">{formatINR(total)}</span>
                    </div>
                    {isChecking ? (
                      <p className="text-xs text-muted-foreground mt-3 text-center">Checking availability...</p>
                    ) : isAvailable ? (
                      <p className="text-xs text-green-600 mt-3 flex items-center justify-center gap-1.5 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Available for these dates</p>
                    ) : (
                      <p className="text-xs text-destructive mt-3 flex items-center justify-center gap-1.5 font-medium"><AlertCircle className="w-3.5 h-3.5" /> Not available for selected dates</p>
                    )}
                  </div>
                )}

                {isOwnListing && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2 mb-2">
                    This is your listing. Other renters can book it; use the dashboard to manage it.
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
                  onClick={handleBookNow}
                  disabled={!car.available || isOwnListing || isChecking || (!!pickupDate && !!returnDate && !isAvailable)}
                >
                  {!car.available ? "Unavailable" : isOwnListing ? "Your listing" : "Book Now"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">No login required · Pay online or WhatsApp</p>
              </div>
            </div>
          </div>

          {/* 4. Extra details — below booking on mobile */}
          <div className="order-4 lg:col-span-2 space-y-6">
            {L && (
              <div className="bg-card p-5 md:p-8 rounded-2xl md:rounded-3xl border border-border/50 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-display mb-2 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" /> Marketplace partner
                    </h2>
                    <p className="text-lg font-semibold">{L.supplierName}</p>
                    <p className="text-sm text-muted-foreground mt-1">Listed on {brand.name} alongside verified local fleets (POC).</p>
                  </div>
                  <div className="flex flex-col gap-2 items-start">
                    {L.promoTag && <Badge className="bg-primary text-primary-foreground">{L.promoTag}</Badge>}
                    {L.availabilityNote && (
                      <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200 font-normal max-w-xs whitespace-normal text-left">
                        {L.availabilityNote}
                      </Badge>
                    )}
                  </div>
                </div>

                {(L.tripLocalInr != null || L.tripFullDayInr != null || L.tripOutstationPerKm != null) && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" /> Trip slabs (India)
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Detail</th>
                            <th className="px-4 py-2 text-right">From</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {L.tripLocalInr != null && (
                            <tr>
                              <td className="px-4 py-3 font-medium">Local</td>
                              <td className="px-4 py-3 text-muted-foreground">{L.tripLocalNote ?? "8 hrs / 80 km"}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatINR(L.tripLocalInr)}</td>
                            </tr>
                          )}
                          {L.tripFullDayInr != null && (
                            <tr>
                              <td className="px-4 py-3 font-medium">Full day</td>
                              <td className="px-4 py-3 text-muted-foreground">Self-drive daily cap</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatINR(L.tripFullDayInr)}</td>
                            </tr>
                          )}
                          {L.tripOutstationPerKm != null && (
                            <tr>
                              <td className="px-4 py-3 font-medium">Outstation</td>
                              <td className="px-4 py-3 text-muted-foreground">With chauffeur · per km</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatINR(L.tripOutstationPerKm)}/km</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {L.driverPerDayMax > 0 && (
                    <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Driver charges</p>
                      <p className="font-semibold">{formatINR(L.driverPerDayMin)} – {formatINR(L.driverPerDayMax)} / day</p>
                      <p className="text-xs text-muted-foreground mt-1">Add-on when you book with chauffeur.</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Security deposit (self-drive)</p>
                    <p className="font-semibold">{formatINR(L.securityDepositMin)} – {formatINR(L.securityDepositMax)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Refundable after vehicle inspection.</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 border border-border/50 sm:col-span-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Fuel policy</p>
                    <p className="font-medium">{L.fuelPolicy}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-foreground mb-1">Pricing logic (realistic)</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Weekdays use the published low–high band.</li>
                    <li>Weekends add about 10–15% on top of weekday base.</li>
                    <li>Tourist / wedding season (Oct–Mar) adds roughly 25–35%; combined uplifts are capped.</li>
                  </ul>
                  {todayBand && (
                    <p className="mt-3 text-xs font-medium text-primary">
                      Today ({pricingContextLabel(now)}): about {formatINR(todayBand.from)} – {formatINR(todayBand.to)} / day for this vehicle.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {car.description && (
              <div className="bg-card p-5 md:p-8 rounded-2xl md:rounded-3xl border border-border/50">
                <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" /> About this Car
                </h2>
                <p className="text-muted-foreground leading-relaxed">{car.description}</p>
              </div>
            )}

            {/* What's Included */}
            <div className="bg-card p-5 md:p-8 rounded-2xl md:rounded-3xl border border-border/50">
              <h2 className="text-xl font-bold font-display mb-5 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> What&apos;s Included
              </h2>
              <ul className="space-y-3">
                {INCLUSIONS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Need Help */}
            <div className="bg-primary/5 border border-primary/20 p-5 md:p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Need help choosing?</p>
                <p className="text-sm text-muted-foreground">
                  Call us at{" "}
                  <span className="font-semibold text-foreground">{formatPhonesDisplay([...brand.contact.phones])}</span>
                  {" "}— available 24/7 · {brand.contact.supportNote}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        car={car}
        pickupDate={pickupDate}
        returnDate={returnDate}
        pickupTime={pickupTime}
        returnTime={returnTime}
      />
    </div>
  );
}

export default function CarDetailPageWithSuspense() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><Skeleton className="h-[500px] w-full rounded-3xl" /></div>}>
      <CarDetailPage />
    </Suspense>
  );
}
