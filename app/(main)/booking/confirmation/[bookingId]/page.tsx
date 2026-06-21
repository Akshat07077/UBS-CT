"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { CheckCircle2, ArrowRight, Calendar, Car as CarIcon, MapPin, UserCheck, Home } from "lucide-react";
import { formatINR } from "@/components/car-card";
import { formatBookingDateTime } from "@/lib/constants/booking-times";
import { useAuth } from "@/hooks/use-auth";

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
  car?: { brand: string; model: string; location: string };
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

  const isPaid = payment?.paymentStatus === "paid" || booking.status === "confirmed";
  const isGuest = !user;

  return (
    <div className="bg-muted/20 min-h-screen py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg ${isPaid ? "bg-green-100 text-green-600 shadow-green-500/20" : "bg-yellow-100 text-yellow-600"}`}>
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
          {qrSubmitted || booking.paymentScreenshotUrl
            ? "Payment proof received!"
            : isPaid
              ? "Payment successful!"
              : "Booking received!"}
        </h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto">
          {qrSubmitted || booking.paymentScreenshotUrl
            ? "We received your payment screenshot. Our team will verify it and confirm your booking shortly."
            : isPaid
              ? "Your reservation is confirmed. We'll reach you on the phone number you provided."
              : "Your booking is pending. Complete payment or wait for our team to confirm on WhatsApp."}
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
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</p>
              <p className="text-lg font-medium">{booking.car?.location}</p>
            </div>
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
