"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatINR, type CarData } from "@/components/car-card";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";
import { formatBookingDateTime } from "@/lib/constants/booking-times";
import { sumDailyRates, driverDailyMidpoint } from "@/lib/rental-listing";
import {
  computeBookingPaymentQuote,
  normalizeBookingPaymentSettings,
  type BookingPaymentSettings,
} from "@/lib/booking-payment-settings";
import { BookingPaymentSummary, CollateralChoiceForm } from "@/components/booking-payment-summary";
import type { CollateralType } from "@/lib/constants/collateral";
import { differenceInDays } from "date-fns";
import { CreditCard, MessageCircle, UserCheck, CheckCircle2, Upload, IdCard, FileText, FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canPreviewImageUrl, uploadBookingDocToApi } from "@/lib/upload-client";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: CarData;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
}

function DocUploadSlot({
  label,
  hint,
  url,
  uploading,
  onUpload,
  icon: Icon,
}: {
  label: string;
  hint: string;
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  icon: typeof IdCard;
}) {
  const isPdf = url.toLowerCase().includes(".pdf");
  const inputId = `doc-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <Label htmlFor={inputId} className="text-sm font-semibold cursor-pointer">
          {label}
        </Label>
        {url && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" aria-hidden />}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative w-full sm:w-24 h-20 rounded-lg border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center mx-auto sm:mx-0">
          {url && !isPdf && canPreviewImageUrl(url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : url && isPdf ? (
            <FileText className="w-8 h-8 text-primary" />
          ) : url && !isPdf ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="relative">
            <label
              htmlFor={inputId}
              className={`flex items-center justify-center gap-2 w-full min-h-[44px] px-4 rounded-xl border border-input bg-background text-sm font-medium cursor-pointer touch-manipulation select-none transition-colors ${
                uploading ? "opacity-60 pointer-events-none" : "hover:bg-muted/50 active:bg-muted"
              }`}
            >
              <Upload className="w-4 h-4 shrink-0 text-primary" />
              <span>{uploading ? "Uploading…" : url ? "Replace file" : "Choose photo or PDF"}</span>
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*,application/pdf,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline inline-block break-all"
            >
              View uploaded file
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingDialog({ open, onOpenChange, car, pickupDate, returnDate, pickupTime, returnTime }: BookingDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: appConfig } = useQuery({
    queryKey: ["app-config"],
    queryFn: () =>
      apiFetch<{ bookingSandbox: boolean; paymentsEnabled: boolean; bookingPayments: BookingPaymentSettings }>(
        "/api/config/public"
      ),
    staleTime: 60_000,
  });
  const bookingSandbox = appConfig?.bookingSandbox ?? true;
  const paymentSettings = normalizeBookingPaymentSettings(appConfig?.bookingPayments);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [withDriver, setWithDriver] = useState(false);
  const [aadharUrl, setAadharUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState<"aadhar" | "license" | null>(null);
  const [busy, setBusy] = useState<"pay" | "whatsapp" | null>(null);
  const [collateralType, setCollateralType] = useState<CollateralType | "">("");
  const [collateralDetail, setCollateralDetail] = useState("");

  const days = differenceInDays(new Date(returnDate), new Date(pickupDate));
  const driverPerDay = driverDailyMidpoint(car.listing);
  const showChauffeur = driverPerDay > 0;
  const carTotal = sumDailyRates(pickupDate, returnDate, car.pricePerDay);
  const driverTotal = withDriver && showChauffeur ? days * driverPerDay : 0;
  const grandTotal = carTotal + driverTotal;
  const paymentQuote = computeBookingPaymentQuote(paymentSettings, car.listing, carTotal, driverTotal);
  const payNowAmount =
    paymentQuote.advanceEnabled && paymentQuote.advanceAmount > 0
      ? paymentQuote.advanceAmount
      : grandTotal;
  const carLabel = `${car.brand} ${car.model}`;

  const handleDocUpload = async (kind: "aadhar" | "license", file: File) => {
    try {
      setUploadingDoc(kind);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast({ title: "Preparing document…", description: "Compressing photo for upload." });
      }
      const url = await uploadBookingDocToApi(file);
      if (kind === "aadhar") setAadharUrl(url);
      else setLicenseUrl(url);
      toast({ title: kind === "aadhar" ? "Aadhar uploaded" : "Licence uploaded" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return false;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Phone required", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return false;
    }
    if (!aadharUrl) {
      toast({ title: "Aadhar required", description: "Please upload your Aadhar card.", variant: "destructive" });
      return false;
    }
    if (!licenseUrl) {
      toast({ title: "Licence required", description: "Please upload your driving licence.", variant: "destructive" });
      return false;
    }
    if (paymentQuote.collateralRequired) {
      if (collateralType !== "bike_scooty" && collateralType !== "cash_refundable") {
        toast({
          title: "Security choice required",
          description: "Select bike/scooty deposit or refundable cash deposit.",
          variant: "destructive",
        });
        return false;
      }
      if (collateralType === "bike_scooty" && !collateralDetail.trim()) {
        toast({
          title: "Bike / scooty details required",
          description: "Enter model and registration number.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const createBooking = async () => {
    const payload: Record<string, unknown> = {
      carId: car.id,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      withDriver,
      guestName: name.trim(),
      guestPhone: phone.trim(),
      guestEmail: email.trim() || undefined,
      aadharUrl,
      drivingLicenseUrl: licenseUrl,
      collateralType: collateralType || undefined,
      collateralDetail: collateralType === "bike_scooty" ? collateralDetail.trim() : undefined,
    };
    return apiFetch<{
      id: number;
      guestAccessToken?: string;
      totalPrice: number;
    }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  const handlePay = async () => {
    if (!validateForm()) return;
    try {
      setBusy("pay");
      const booking = await createBooking();
      const token = booking.guestAccessToken;

      if (bookingSandbox) {
        await apiFetch(`/api/bookings/${booking.id}/sandbox-confirm`, {
          method: "POST",
          body: JSON.stringify({ guestAccessToken: token }),
        });
        onOpenChange(false);
        const qs = new URLSearchParams();
        if (token) qs.set("token", token);
        qs.set("sandbox", "1");
        router.push(`/booking/confirmation/${booking.id}?${qs.toString()}`);
        toast({
          title: "Booking confirmed (test)",
          description: "No payment charged — sandbox mode for testing.",
        });
        setBusy(null);
        return;
      }

      const session = await apiFetch<{ sessionUrl: string }>("/api/payments/create-session", {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.id,
          guestAccessToken: token,
        }),
      });
      window.location.href = session.sessionUrl;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not complete booking";
      toast({ title: bookingSandbox ? "Booking failed" : "Payment failed", description: msg, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["availability", String(car.id)] });
      setBusy(null);
    }
  };

  const handleWhatsApp = async () => {
    if (!validateForm()) return;
    try {
      setBusy("whatsapp");
      const booking = await createBooking();
      const url = buildBookingWhatsAppUrl({
        carLabel,
        location: car.location,
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        totalInr: booking.totalPrice,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim() || undefined,
        withDriver,
        bookingId: booking.id,
      });
      onOpenChange(false);
      window.open(url, "_blank", "noopener,noreferrer");
      toast({
        title: "Request sent",
        description: "Complete your booking on WhatsApp. Our team will confirm shortly.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save your request";
      toast({ title: "Something went wrong", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl max-h-[min(92vh,900px)] overflow-y-auto overscroll-contain p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Book {carLabel}</DialogTitle>
          <p className="text-sm text-muted-foreground text-left">
            No account needed — upload ID proofs, share your details, then pay or WhatsApp.
          </p>
        </DialogHeader>

        <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2 border border-border/50">
          <div className="text-xs text-muted-foreground pb-2 border-b border-border/40 space-y-0.5">
            <p>
              <span className="font-semibold text-foreground">Pickup: </span>
              {formatBookingDateTime(pickupDate, pickupTime)}
            </p>
            <p>
              <span className="font-semibold text-foreground">Return: </span>
              {formatBookingDateTime(returnDate, returnTime)}
            </p>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rental ({days} {days === 1 ? "day" : "days"})</span>
            <span className="font-medium">{formatINR(carTotal)}</span>
          </div>
          <BookingPaymentSummary
            quote={paymentQuote}
            collateralType={collateralType || null}
            collateralDetail={collateralDetail}
            compact
          />
        </div>

        <CollateralChoiceForm
          quote={paymentQuote}
          value={collateralType}
          onChange={setCollateralType}
          detail={collateralDetail}
          onDetailChange={setCollateralDetail}
        />

        {showChauffeur && (
          <button
            type="button"
            onClick={() => setWithDriver(!withDriver)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
              withDriver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserCheck className={`w-5 h-5 ${withDriver ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-semibold text-sm">Add chauffeur</p>
                  <p className="text-xs text-muted-foreground">+{formatINR(driverPerDay)}/day avg</p>
                </div>
              </div>
              {withDriver && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
          </button>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-name">Full name *</Label>
            <Input
              id="book-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-phone">Mobile number *</Label>
            <Input
              id="book-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-email">Email (optional)</Label>
            <Input
              id="book-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-3 pt-1 border-t border-border/50">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ID verification *</p>
            <DocUploadSlot
              label="Aadhar card"
              hint="Clear photo or PDF · max 5 MB"
              url={aadharUrl}
              uploading={uploadingDoc === "aadhar"}
              onUpload={(f) => handleDocUpload("aadhar", f)}
              icon={IdCard}
            />
            <DocUploadSlot
              label="Driving licence"
              hint="Front side · photo or PDF · max 5 MB"
              url={licenseUrl}
              uploading={uploadingDoc === "license"}
              onUpload={(f) => handleDocUpload("license", f)}
              icon={FileText}
            />
          </div>
        </div>

        {bookingSandbox && (
          <p className="text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            <FlaskConical className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            Test mode — bookings confirm without payment. Set ENABLE_PAYMENTS=true + Stripe keys for live checkout.
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-bold"
            onClick={handlePay}
            disabled={!!busy || !!uploadingDoc}
          >
            {bookingSandbox ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            {busy === "pay"
              ? bookingSandbox
                ? "Confirming…"
                : "Redirecting to payment…"
              : bookingSandbox
                ? "Confirm booking (test)"
                : payNowAmount < grandTotal
                  ? `Pay ${formatINR(payNowAmount)} now`
                  : `Pay ${formatINR(payNowAmount)}`}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 rounded-xl font-bold border-green-600/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
            onClick={handleWhatsApp}
            disabled={!!busy || !!uploadingDoc}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {busy === "whatsapp" ? "Opening WhatsApp…" : "Book on WhatsApp"}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Documents are stored securely for verification before handover.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
