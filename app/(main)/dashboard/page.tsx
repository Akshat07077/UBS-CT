"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Car,
  Calendar,
  ExternalLink,
  UserCheck,
  Trash2,
  PlusCircle,
  ListOrdered,
  LayoutList,
  Phone,
  LogIn,
} from "lucide-react";
import { formatINR, type CarData } from "@/components/car-card";
import type { MyBookingRow } from "@/lib/my-account";
import { isValidLookupPhone } from "@/lib/phone-match";

const PHONE_STORAGE_KEY = "ubs_lookup_phone";

type Tab = "bookings" | "listings";

function getStatusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "completed":
      return "bg-primary/10 text-primary border-primary/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function BookingCard({ booking, showRenter }: { booking: MyBookingRow; showRenter?: boolean }) {
  const tokenQ = booking.guestAccessToken ? `?token=${booking.guestAccessToken}` : "";
  return (
    <div className="flex flex-col sm:flex-row bg-muted/30 border border-border/50 rounded-2xl overflow-hidden hover:border-border transition-all">
      <div className="w-full sm:w-40 bg-muted shrink-0 relative min-h-[120px] sm:min-h-[140px]">
        {booking.car?.imageUrl ? (
          <Image src={booking.car.imageUrl} alt={booking.car.model || ""} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold font-display truncate">
              {booking.car?.brand} {booking.car?.model}
            </h3>
            <Badge variant="outline" className={`capitalize shrink-0 ${getStatusClass(booking.status)}`}>
              {booking.status}
            </Badge>
            {booking.withDriver && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                <UserCheck className="w-3 h-3 mr-1" /> Chauffeur
              </Badge>
            )}
          </div>
          {showRenter && (booking.guestName || booking.guestPhone) && (
            <p className="text-xs text-muted-foreground mb-2">
              Renter: <span className="text-foreground font-medium">{booking.guestName || "Guest"}</span>
              {booking.guestPhone && <> · {booking.guestPhone}</>}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(booking.pickupDate), "MMM d, yyyy")} → {format(new Date(booking.returnDate), "MMM d, yyyy")}
            </span>
            <span className="font-bold text-foreground">{formatINR(booking.totalPrice)}</span>
          </div>
        </div>
        <Link href={`/booking/confirmation/${booking.id}${tokenQ}`} className="shrink-0 self-end sm:self-center">
          <Button variant="outline" size="sm" className="rounded-lg w-full sm:w-auto">
            View details <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(tabParam === "listings" ? "listings" : "bookings");
  const [phoneInput, setPhoneInput] = useState("");
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(PHONE_STORAGE_KEY) : null;
    if (saved) {
      setPhoneInput(saved);
      setLookupPhone(saved);
    }
  }, []);

  useEffect(() => {
    setTab(tabParam === "listings" ? "listings" : "bookings");
  }, [tabParam]);

  const setTabAndUrl = (t: Tab) => {
    setTab(t);
    router.replace(`/dashboard?tab=${t}`, { scroll: false });
  };

  const phoneQuery = !user && lookupPhone ? `?phone=${encodeURIComponent(lookupPhone)}` : user && lookupPhone ? `?phone=${encodeURIComponent(lookupPhone)}` : "";

  const canFetch = !!user || !!lookupPhone;

  const { data: bookings, isLoading: bookingsLoading } = useQuery<MyBookingRow[]>({
    queryKey: ["my-bookings", user?.id, lookupPhone],
    queryFn: () => apiFetch<MyBookingRow[]>(`/api/my/bookings${phoneQuery}`),
    enabled: canFetch,
  });

  const { data: myListings, isLoading: listingsLoading } = useQuery<CarData[]>({
    queryKey: ["my-listings", user?.id, lookupPhone],
    queryFn: () => apiFetch<CarData[]>(`/api/my/listings${phoneQuery}`),
    enabled: canFetch,
  });

  const { data: hostBookings, isLoading: hostBookingsLoading } = useQuery<MyBookingRow[]>({
    queryKey: ["my-host-bookings", user?.id, lookupPhone],
    queryFn: () => apiFetch<MyBookingRow[]>(`/api/my/host-bookings${phoneQuery}`),
    enabled: canFetch,
  });

  const handlePhoneLookup = () => {
    const trimmed = phoneInput.replace(/\D/g, "");
    if (!isValidLookupPhone(phoneInput)) {
      toast({ title: "Invalid number", description: "Enter your 10-digit mobile number.", variant: "destructive" });
      return;
    }
    const last10 = trimmed.slice(-10);
    sessionStorage.setItem(PHONE_STORAGE_KEY, last10);
    setLookupPhone(last10);
    toast({ title: "Loaded", description: "Showing records for your mobile number." });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    queryClient.invalidateQueries({ queryKey: ["my-host-bookings"] });
  };

  const removeListing = async (id: number) => {
    if (!user) {
      toast({ title: "Log in required", description: "Sign in to remove a listing.", variant: "destructive" });
      return;
    }
    if (!confirm("Remove this listing from the marketplace?")) return;
    try {
      await apiFetch(`/api/cars/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({ title: "Listing removed" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not remove listing";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {user ? `Hi, ${user.name || "there"}` : "My account"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Your rentals and cars you&apos;ve listed — in one place.
          </p>
        </div>
        <Link href="/list-your-car">
          <Button className="rounded-xl gap-2 w-full sm:w-auto shadow-md shadow-primary/20">
            <PlusCircle className="w-4 h-4" /> List a car
          </Button>
        </Link>
      </div>

      {!user && (
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">Look up with mobile number</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                No login needed. Use the same number you gave when booking or listing a car.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="lookup-phone" className="text-xs">
                Mobile number
              </Label>
              <Input
                id="lookup-phone"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button type="button" className="h-11 rounded-xl sm:self-end shrink-0" onClick={handlePhoneLookup}>
              Show my records
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <LogIn className="w-3.5 h-3.5" />
            <Link href="/login?redirect=/dashboard" className="text-primary hover:underline font-medium">
              Log in
            </Link>{" "}
            for faster access next time.
          </p>
        </div>
      )}

      {user && (
        <div className="bg-muted/30 border border-border/50 rounded-xl px-4 py-3 mb-6 flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="link-phone" className="text-xs text-muted-foreground">
              Also match guest bookings with this mobile (optional)
            </Label>
            <Input
              id="link-phone"
              type="tel"
              placeholder="10-digit mobile"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="h-10 rounded-lg bg-background"
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-lg h-10 shrink-0" onClick={handlePhoneLookup}>
            Apply
          </Button>
        </div>
      )}

      <div className="flex gap-2 mb-6 p-1 bg-muted/40 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setTabAndUrl("bookings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors",
            tab === "bookings" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListOrdered className="w-4 h-4 shrink-0" />
          My bookings
        </button>
        <button
          type="button"
          onClick={() => setTabAndUrl("listings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors",
            tab === "listings" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutList className="w-4 h-4 shrink-0" />
          My listings
        </button>
      </div>

      {!canFetch ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <Phone className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Enter your mobile number above to see your bookings and listings.</p>
        </div>
      ) : tab === "bookings" ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display">Cars you booked</h2>
          {bookingsLoading ? (
            <Skeleton className="h-36 rounded-2xl" />
          ) : bookings && bookings.length > 0 ? (
            bookings.map((b) => <BookingCard key={b.id} booking={b} />)
          ) : (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
              <Car className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No bookings found for this account or number.</p>
              <Link href="/cars">
                <Button className="rounded-xl">Browse cars</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-bold font-display">Your listed cars</h2>
            {listingsLoading ? (
              <Skeleton className="h-24 rounded-2xl" />
            ) : myListings && myListings.length > 0 ? (
              <ul className="space-y-3">
                {myListings.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {c.brand} {c.model}
                        <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                          {c.listingApprovalStatus === "pending" && "Pending review"}
                          {c.listingApprovalStatus === "rejected" && "Rejected"}
                          {c.listingApprovalStatus === "approved" && (c.available ? "Live" : "Paused")}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c.location} · {formatINR(c.pricePerDay)}/day
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/cars/${c.id}`}>
                        <Button variant="outline" size="sm" className="rounded-lg">
                          View
                        </Button>
                      </Link>
                      {user && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => removeListing(c.id)}
                          aria-label="Remove listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 bg-card border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground text-sm mb-4">No listings for this number yet.</p>
                <Link href="/list-your-car">
                  <Button variant="outline" className="rounded-xl">
                    List your first car
                  </Button>
                </Link>
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-border/50 pt-8">
            <h2 className="text-lg font-bold font-display">Bookings on your cars</h2>
            <p className="text-sm text-muted-foreground -mt-2">
              When someone rents a vehicle you listed, it appears here.
            </p>
            {hostBookingsLoading ? (
              <Skeleton className="h-36 rounded-2xl" />
            ) : hostBookings && hostBookings.length > 0 ? (
              hostBookings.map((b) => <BookingCard key={`host-${b.id}`} booking={b} showRenter />)
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center bg-muted/20 rounded-xl">
                No renter bookings on your listings yet.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Skeleton className="h-12 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
