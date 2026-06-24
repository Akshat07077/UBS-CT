"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { CheckCircle2, ArrowRight, Calendar, Car as CarIcon, MapPin, UserCheck, Home, Phone, Mail, MessageCircle, Navigation } from "lucide-react";
import { formatINR } from "@/components/car-card";
import { formatBookingDateTime } from "@/lib/constants/booking-times";
import { useAuth } from "@/hooks/use-auth";
import {
  formatPhoneForDisplay,
  phoneTelHref,
  phoneWhatsAppHref,
} from "@/lib/booking-reservation-details";

interface BookingDetail {
  id: number;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice: number;
  withDriver: boolean;
  driverPrice: number;
  status: string;
  guestName?: string | null;
  guestPhone?: string | null;
  paymentScreenshotUrl?: string | null;
  car?: {
    brand: string;
    model: string;
    location: string;
    pickupLocation?: string | null;
    dropLocation?: string | null;
    contactName?: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    contactRole?: "owner" | "rental";
  };
}

interface Payment {
  paymentStatus: string;
}

function ConfirmationContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const qrSubmitted = searchParams.get("qr") === "1";
  const { user } = useAuth();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  const { data: booking, isLoading: bookingLoading } = useQuery<BookingDetail>({
    queryKey: ["booking", bookingId, token],
    queryFn: () => apiFetch<BookingDetail>(`/api/bookings/${bookingId}${tokenQuery}`),
  });

  const { data: payment, isLoading: paymentLoading } = useQuery<Payment>({
    queryKey: ["payment", bookingId, token],
    queryFn: () => apiFetch<Payment>(`/api/payments/${bookingId}${tokenQuery}`),
    retry: false,
  });

  if (bookingLoading || paymentLoading) {
    return <div className="min-h-screen flex justify-center items-center"><Skeleton className="w-8 h-8 rounded-full" /></div>;
  }

  if (!booking) {
    return <div className="min-h-screen flex justify-center items-center">Booking not found.</div>;
  }

  const isConfirmed = booking.status === "confirmed" || payment?.paymentStatus === "paid";
  const awaitingReview = !!(qrSubmitted || booking.paymentScreenshotUrl) && !isConfirmed;
  const isGuest = !user;
  const car = booking.car;
  const contactWhatsApp = car?.contactPhone
    ? phoneWhatsAppHref(
        car.contactPhone,
        `Hi, I have booking #${booking.id} for ${car.brand} ${car.model}.`
      )
    : null;

  return (
    <div className="bg-muted/20 min-h-screen py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg ${isConfirmed ? "bg-green-100 text-green-600 shadow-green-500/20" : "bg-yellow-100 text-yellow-600"}`}>
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
          {isConfirmed
            ? "Booking confirmed!"
            : awaitingReview
              ? "Payment proof received!"
              : "Booking received!"}
        </h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto">
          {isConfirmed
            ? "Your reservation is confirmed. We'll reach you on the phone number you provided."
            : awaitingReview
              ? "We received your payment screenshot. Our team will verify it and confirm your booking shortly."
              : "Your booking is pending. Complete payment or contact us on WhatsApp."}
        </p>

        <div className="bg-card text-left p-8 rounded-3xl border border-border shadow-xl mb-10">
          <h3 className="font-bold font-display text-xl mb-6 border-b border-border/50 pb-4">Reservation Details</h3>
          <p className="text-xs text-muted-foreground mb-4 font-mono">Ref #{booking.id}</p>
          {booking.guestName && (
            <p className="text-sm mb-4">
              <span className="text-muted-foreground">Guest: </span>
              <span className="font-medium">{booking.guestName}</span>
              {booking.guestPhone && <span className="text-muted-foreground"> · {booking.guestPhone}</span>}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><CarIcon className="w-4 h-4" /> Vehicle</p>
              <p className="text-lg font-medium">{booking.car?.brand} {booking.car?.model}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> City</p>
              <p className="text-lg font-medium">{car?.location}</p>
            </div>
            {car?.pickupLocation && (
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Pickup location
                </p>
                <p className="text-lg font-medium leading-snug">{car.pickupLocation}</p>
              </div>
            )}
            {car?.dropLocation && car.dropLocation !== car.pickupLocation && (
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Drop location
                </p>
                <p className="text-lg font-medium leading-snug">{car.dropLocation}</p>
              </div>
            )}
            {car?.dropLocation && car.dropLocation === car.pickupLocation && car.pickupLocation && (
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Drop location
                </p>
                <p className="text-lg font-medium leading-snug">Same as pickup</p>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Pickup</p>
              <p className="text-lg font-medium">
                {formatBookingDateTime(booking.pickupDate, booking.pickupTime ?? "10:00")}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Return</p>
              <p className="text-lg font-medium">
                {formatBookingDateTime(booking.returnDate, booking.returnTime ?? "10:00")}
              </p>
            </div>
            {booking.withDriver && (
              <div className="sm:col-span-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Chauffeur</p>
                <p className="text-lg font-medium text-primary flex items-center gap-2">
                  <UserCheck className="w-5 h-5" /> Professional Driver Included
                  <span className="text-sm text-muted-foreground font-normal">(+{formatINR(booking.driverPrice)})</span>
                </p>
              </div>
            )}
          </div>

          {car?.contactName && (car.contactPhone || car.contactEmail) && (
            <div className="mt-8 pt-6 border-t border-border/50 space-y-3">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {car.contactRole === "owner" ? "Contact car owner" : "Contact UBS Car Rental"}
              </p>
              <p className="text-lg font-semibold">{car.contactName}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {car.contactPhone && (
                  <>
                    <a
                      href={phoneTelHref(car.contactPhone)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-primary" />
                      {formatPhoneForDisplay(car.contactPhone)}
                    </a>
                    {contactWhatsApp && (
                      <a
                        href={contactWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-600/40 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400 px-4 py-2.5 text-sm font-medium hover:bg-green-100/80 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                  </>
                )}
                {car.contactEmail && (
                  <a
                    href={`mailto:${car.contactEmail}?subject=${encodeURIComponent(`Booking #${booking.id} — ${car.brand} ${car.model}`)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    {car.contactEmail}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border/50 flex justify-between items-center bg-muted/30 -mx-8 -mb-8 px-8 py-6 rounded-b-3xl">
            <span className="font-bold text-muted-foreground">Total</span>
            <span className="font-bold text-2xl font-display">{formatINR(booking.totalPrice)}</span>
          </div>
        </div>

        {isGuest ? (
          <Link href="/">
            <Button size="lg" className="rounded-xl h-14 px-8 font-bold shadow-lg shadow-primary/20">
              <Home className="mr-2 w-5 h-5" /> Back to home
            </Button>
          </Link>
        ) : (
          <Link href="/dashboard">
            <Button size="lg" className="rounded-xl h-14 px-8 font-bold shadow-lg shadow-primary/20">
              Go to My Bookings <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><Skeleton className="w-8 h-8 rounded-full" /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
