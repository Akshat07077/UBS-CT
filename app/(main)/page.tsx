"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CarCard, type CarData } from "@/components/car-card";
import { BookingTimeSelect } from "@/components/booking-time-select";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { SERVICE_CITY } from "@/lib/constants/locations";
import {
  Shield,
  Clock,
  Star,
  MapPin,
  IndianRupee,
  Headphones,
  Search,
  Car,
  Users,
  Headset,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  defaultPickupTimeForDate,
  localDateYmd,
  validateBookingSchedule,
  clampPickupTime,
  minRentalHoursError,
} from "@/lib/constants/booking-times";
import { toast } from "@/hooks/use-toast";
import { PricingOfferBanner } from "@/components/pricing-offer-banner";
import {
  normalizePricingOfferSettings,
  DEFAULT_PRICING_OFFER_SETTINGS,
} from "@/lib/pricing-offer-settings";

const HOME_VIDEO_EMBED =
  typeof process.env.NEXT_PUBLIC_HOME_VIDEO_EMBED === "string"
    ? process.env.NEXT_PUBLIC_HOME_VIDEO_EMBED.trim()
    : "";

/** MP4 for muted hero loop when no iframe embed is set (override with NEXT_PUBLIC_HOME_VIDEO_MP4). */
const HOME_VIDEO_MP4 =
  typeof process.env.NEXT_PUBLIC_HOME_VIDEO_MP4 === "string" &&
  process.env.NEXT_PUBLIC_HOME_VIDEO_MP4.trim()
    ? process.env.NEXT_PUBLIC_HOME_VIDEO_MP4.trim()
    : "https://assets.mixkit.co/videos/1599/1599-720.mp4";

const HERO_VIDEO_POSTER =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80";

function withAutoplayEmbedUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("mute", "1");
      u.searchParams.set("playsinline", "1");
      const id = u.pathname.match(/\/embed\/([^/?]+)/)?.[1];
      if (id) {
        u.searchParams.set("loop", "1");
        u.searchParams.set("playlist", id);
      }
      return u.toString();
    }
    if (host.includes("vimeo.com") || host === "player.vimeo.com") {
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("muted", "1");
      return u.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export default function Home() {
  const router = useRouter();
  const { data: cars, isLoading } = useQuery<CarData[]>({
    queryKey: ["cars", { available: true }],
    queryFn: () => apiFetch<CarData[]>("/api/cars?available=true"),
  });
  const { data: appConfig } = useQuery({
    queryKey: ["app-config"],
    queryFn: () => apiFetch<{ pricingOffer?: unknown }>("/api/config/public"),
    staleTime: 60_000,
  });
  const pricingOffer = normalizePricingOfferSettings(
    appConfig?.pricingOffer ?? DEFAULT_PRICING_OFFER_SETTINGS
  );

  const featuredCars = useMemo(() => {
    if (!cars?.length) return [];
    const preferred = cars.filter((c) => c.listing?.promoTag === "Most Booked");
    const rest = cars.filter((c) => !preferred.some((p) => p.id === c.id));
    return [...preferred, ...rest].slice(0, 3);
  }, [cars]);

  const mostBookedCars = useMemo(
    () => cars?.filter((c) => c.listing?.promoTag === "Most Booked") ?? [],
    [cars]
  );

  // Search widget state
  const today = localDateYmd();
  const tomorrow = localDateYmd(new Date(Date.now() + 86400000));
  const [location, setLocation] = useState("");
  const [pickupDate, setPickupDate] = useState(today);
  const [pickupTime, setPickupTime] = useState(() => defaultPickupTimeForDate(today));
  const [returnDate, setReturnDate] = useState(tomorrow);
  const [returnTime, setReturnTime] = useState("10:00");

  const minHoursError =
    pickupDate && returnDate && pickupTime && returnTime
      ? minRentalHoursError(pickupDate, pickupTime, returnDate, returnTime)
      : null;

  useEffect(() => {
    setPickupTime((t) => clampPickupTime(pickupDate, t));
  }, [pickupDate]);

  const handlePickupDateChange = (next: string) => {
    setPickupDate(next);
    setPickupTime((t) => clampPickupTime(next, t));
    if (returnDate < next) setReturnDate(next);
  };

  const handleReturnDateChange = (next: string) => {
    setReturnDate(next);
  };

  const handlePickupTimeChange = (next: string) => {
    setPickupTime(next);
  };

  const handleReturnTimeChange = (next: string) => {
    setReturnTime(next);
  };

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const scheduleError = validateBookingSchedule(pickupDate, pickupTime, returnDate, returnTime);
    if (scheduleError) {
      toast({ title: "Invalid schedule", description: scheduleError, variant: "destructive" });
      return;
    }
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (pickupDate) params.set("pickup", pickupDate);
    if (returnDate) params.set("return", returnDate);
    if (pickupTime) params.set("pickupTime", pickupTime);
    if (returnTime) params.set("returnTime", returnTime);
    router.push(`/cars?${params.toString()}`);
  }

  return (
    <div className="w-full">
      {/* Hero — centered with search widget */}
      <div className="relative w-full bg-background overflow-hidden">
        {/* subtle grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        {/* Intro: copy + video — above main hero */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-4 md:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 lg:items-center text-left">
            <div className="space-y-5">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold uppercase tracking-widest border border-primary/15">
                How it works
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-[2.5rem] font-display font-extrabold text-foreground leading-tight tracking-tight">
                Book a premium car{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                  without the hassle
                </span>
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
                Pick your dates, compare verified vehicles with clear INR pricing, and confirm in a few taps.
                Whether it&apos;s an airport pickup, a weekend drive, or a chauffeur-backed trip, we keep the process
                simple from search to handover.
              </p>
              <ul className="space-y-3 pt-1">
                {[
                  "Search live inventory from listed cities",
                  "Transparent pricing with taxes and rental terms upfront",
                  "Flexible pickup & return windows that fit your schedule",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm md:text-base text-foreground/90">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="rounded-xl font-semibold shadow-md shadow-primary/15">
                  <Link href="/cars">Browse fleet</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl font-semibold border-primary/25">
                  <a href="#hero-search">Plan a trip</a>
                </Button>
              </div>
            </div>

            <div>
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-muted shadow-xl shadow-black/[0.07] ring-1 ring-black/[0.04]">
                {HOME_VIDEO_EMBED ? (
                  <iframe
                    title={`${brand.name}: book your ride`}
                    src={withAutoplayEmbedUrl(HOME_VIDEO_EMBED)}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={HERO_VIDEO_POSTER}
                      preload="auto"
                      aria-label={`Cars on the road, ${brand.name} preview`}
                    >
                      <source src={HOME_VIDEO_MP4} type="video/mp4" />
                    </video>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
                    <a
                      href="#hero-search"
                      className="absolute bottom-3 right-3 z-10 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-primary hover:text-primary-foreground"
                    >
                      Search and book
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold mb-6 border border-primary/20">
            🇮🇳 {brand.name} · Pan-India
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-foreground leading-[1.05] tracking-tight mb-4">
            Find Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Perfect Ride
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Search and book your ideal car across India. Choose your dates and hit the road.
          </p>

          {/* Search card */}
          <form
            id="hero-search"
            onSubmit={handleSearch}
            className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 p-5 md:p-6 text-left scroll-mt-24"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* Pickup Location */}
              <div className="lg:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Pickup Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter city (optional)"
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Pickup Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Pickup Date
                </label>
                <div className="datetime-field">
                  <input
                    type="date"
                    value={pickupDate}
                    min={today}
                    onChange={(e) => handlePickupDateChange(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Calendar className="datetime-field-icon" aria-hidden />
                </div>
              </div>

              {/* Pickup Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Pickup Time
                </label>
                <BookingTimeSelect
                  value={pickupTime}
                  onChange={handlePickupTimeChange}
                  className="h-11"
                />
              </div>

              {/* Return Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Return Date
                </label>
                <div className="datetime-field">
                  <input
                    type="date"
                    value={returnDate}
                    min={pickupDate || today}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Calendar className="datetime-field-icon" aria-hidden />
                </div>
              </div>

              {/* Return Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Return Time
                </label>
                <BookingTimeSelect
                  value={returnTime}
                  onChange={handleReturnTimeChange}
                  hintMessage={minHoursError}
                  className="h-11"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
              <Button type="submit" size="lg" className="w-full sm:w-auto rounded-xl px-10 h-12 font-semibold shadow-lg shadow-primary/20 gap-2">
                <Search className="w-4 h-4" /> Search Cars
              </Button>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Car className="w-4 h-4 text-primary" /> Live vendor inventory</span>
                <span className="flex items-center gap-1.5"><Headset className="w-4 h-4 text-primary" /> 24/7 Support</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> 50K+ Customers</span>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-2">
        <PricingOfferBanner offer={pricingOffer} />
      </div>

      {/* Features */}
      <div className="py-14 md:py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            {[
              { icon: CheckCircle2, title: "Verified Listings", desc: "Cars from trusted fleet partners and approved community hosts. Book with confidence." },
              { icon: Headphones, title: "24/7 Support", desc: "Hindi & English support available round the clock. Call us anytime." },
              { icon: Star, title: "Pan-India Listings", desc: "Cities and cars expand as verified vendors list vehicles on the platform." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-display">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service area */}
      <div className="py-14 md:py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3 tracking-tight">Serving {SERVICE_CITY}</h2>
            <p className="text-muted-foreground text-lg">
              New cities appear automatically when vendors add cars there.
            </p>
          </div>
          <div className="flex justify-center">
            <Link href="/cars">
              <div className="group flex items-center gap-4 p-6 bg-card border border-border/50 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer min-w-[260px]">
                <span className="text-3xl">🇮🇳</span>
                <div>
                  <p className="font-semibold text-lg group-hover:text-primary transition-colors">Browse all listed cities</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> City filters auto-generated from listings
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Most Booked — budget volume */}
      {!isLoading && mostBookedCars.length > 0 && (
        <div className="py-14 md:py-20 bg-muted/25 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 md:mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-2 tracking-tight">Most Booked</h2>
              <p className="text-muted-foreground text-lg">
                Budget favourites with clear INR pricing and well-maintained vehicles from {brand.name}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {mostBookedCars.map((car) => (
                <CarCard key={car.id} car={car} pricingOffer={pricingOffer} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Cars */}
      <div className="py-14 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8 md:mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-2 tracking-tight">Featured Vehicles</h2>
              <p className="text-muted-foreground text-lg">Curated picks that prioritise high-trust &ldquo;Most Booked&rdquo; listings when available.</p>
            </div>
            <Link href="/cars">
              <Button variant="outline" className="hidden sm:flex rounded-xl font-semibold">View All Cars</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCars.map((car) => (
                <CarCard key={car.id} car={car} pricingOffer={pricingOffer} />
              ))}
            </div>
          )}

          <div className="mt-10 sm:hidden">
            <Link href="/cars"><Button variant="outline" className="w-full rounded-xl">View All Cars</Button></Link>
          </div>
        </div>
      </div>

      {/* Why {brand.name} */}
      <div className="py-14 md:py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold mt-3 mb-6 tracking-tight text-gradient-silver">
                {brand.slogan}
              </h2>
              <div className="space-y-5">
                {[
                  { icon: IndianRupee, title: "Transparent INR Pricing", desc: "No hidden charges. What you see is what you pay, with all prices in Indian Rupees including GST." },
                  { icon: Shield, title: "Pickup Security", desc: "Leave your bike or scooty at pickup, or pay a refundable ₹20,000 cash deposit. Returned when you drop the car back." },
                  { icon: MapPin, title: "Doorstep Delivery", desc: "We deliver the car to your home, hotel, or office across all major Indian cities." },
                  { icon: Clock, title: "Flexible Rentals", desc: "Hourly, daily, or weekly rentals on your terms, with free cancellation up to 24 hours before pickup." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{title}</h4>
                      <p className="text-muted-foreground text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "8+", label: "Cities" },
                { value: "500+", label: "Premium Cars" },
                { value: "50K+", label: "Happy Customers" },
                { value: "4.9★", label: "Average Rating" },
              ].map(({ value, label }) => (
                <div key={label} className="bg-background border border-border rounded-2xl p-6 text-center">
                  <p className="text-4xl font-display font-extrabold text-primary mb-2">{value}</p>
                  <p className="text-muted-foreground font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
