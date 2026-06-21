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
import { formatBookingDateTime, validateBookingSchedule } from "@/lib/constants/booking-times";
import { computeRentalTotal, formatRentalDuration, rentalDurationHours, driverDailyMidpoint } from "@/lib/rental-listing";
import { normalizePricingUpliftSettings, DEFAULT_PRICING_UPLIFT_SETTINGS } from "@/lib/pricing-uplift-settings";
import {
  applyPricingOffer,
  normalizePricingOfferSettings,
  DEFAULT_PRICING_OFFER_SETTINGS,
  pricingOfferCheckoutLine,
} from "@/lib/pricing-offer-settings";
import {
  computeBookingPaymentQuote,
  normalizeBookingPaymentSettings,
  type BookingPaymentSettings,
} from "@/lib/booking-payment-settings";
import {
  normalizePaymentQrSettings,
  type PaymentQrSettings,
} from "@/lib/payment-qr-settings";
import { BookingPaymentSummary, CollateralChoiceForm } from "@/components/booking-payment-summary";
import type { CollateralType } from "@/lib/constants/collateral";
import { differenceInDays } from "date-fns";
import { CreditCard, MessageCircle, UserCheck, CheckCircle2, Upload, IdCard, FileText, QrCode } from "lucide-react";
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
      apiFetch<{
        paymentsEnabled: boolean;
        qrPaymentEnabled: boolean;
        paymentQr: PaymentQrSettings;
        bookingPayments: BookingPaymentSettings;
        pricingUplift?: unknown;
        pricingOffer?: unknown;
      }>("/api/config/public"),
    staleTime: 60_000,
  });
  const paymentsEnabled = appConfig?.paymentsEnabled ?? false;
  const qrPaymentEnabled = appConfig?.qrPaymentEnabled ?? false;
  const paymentQr = normalizePaymentQrSettings(appConfig?.paymentQr);
  const paymentSettings = normalizeBookingPaymentSettings(appConfig?.bookingPayments);
  const pricingUplift = normalizePricingUpliftSettings(
    appConfig?.pricingUplift ?? DEFAULT_PRICING_UPLIFT_SETTINGS
  );
  const pricingOffer = normalizePricingOfferSettings(
    appConfig?.pricingOffer ?? DEFAULT_PRICING_OFFER_SETTINGS
  );

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [withDriver, setWithDriver] = useState(false);
  const [aadharUrl, setAadharUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState<"aadhar" | "license" | "payment" | null>(null);
  const [busy, setBusy] = useState<"pay" | "whatsapp" | null>(null);
  const [collateralType, setCollateralType] = useState<CollateralType | "">("");
  const [collateralDetail, setCollateralDetail] = useState("");

  const rentalHours = rentalDurationHours(pickupDate, pickupTime, returnDate, returnTime);
  const rentalLabel = formatRentalDuration(rentalHours);
  const days = differenceInDays(new Date(returnDate), new Date(pickupDate));
  const driverPerDay = driverDailyMidpoint(car.listing);
  const showChauffeur = driverPerDay > 0;
  const carSubtotal = computeRentalTotal(
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    car.pricePerDay,
    car.pricePerHour,
    pricingUplift
  );
  const carTotal = applyPricingOffer(carSubtotal, pricingOffer);
  const offerLine = pricingOfferCheckoutLine(carSubtotal, carTotal, pricingOffer);
  const driverTotal = withDriver && showChauffeur ? days * driverPerDay : 0;
  const grandTotal = carTotal + driverTotal;
  const paymentQuote = computeBookingPaymentQuote(paymentSettings, car.listing, carTotal, driverTotal);
  const payNowAmount =
    paymentQuote.advanceEnabled && paymentQuote.advanceAmount > 0
      ? paymentQuote.advanceAmount
      : grandTotal;
  const carLabel = `${car.brand} ${car.model}`;

  const handleDocUpload = async (kind: "aadhar" | "license" | "payment", file: File) => {
    try {
      setUploadingDoc(kind);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast({ title: "Preparing document…", description: "Compressing photo for upload." });
      }
      const url = await uploadBookingDocToApi(file);
      if (kind === "aadhar") setAadharUrl(url);
      else if (kind === "license") setLicenseUrl(url);
      else setPaymentScreenshotUrl(url);
      toast({
        title:
          kind === "aadhar"
            ? "Aadhar uploaded"
            : kind === "license"
              ? "Licence uploaded"
              : "Payment proof uploaded",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const validateForm = () => {
    const scheduleError = validateBookingSchedule(pickupDate, pickupTime, returnDate, returnTime);
    if (scheduleError) {
      toast({ title: "Invalid schedule", description: scheduleError, variant: "destructive" });
      return false;
    }
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
      paymentScreenshotUrl: paymentScreenshotUrl || undefined,
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
    if (paymentsEnabled) {
      try {
        setBusy("pay");
        const booking = await createBooking();
        const token = booking.guestAccessToken;

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
        toast({ title: "Payment failed", description: msg, variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["availability", String(car.id)] });
        setBusy(null);
      }
      return;
    }

    if (!qrPaymentEnabled) {
      toast({
        title: "Online payment unavailable",
        description: "Use Book on WhatsApp to complete your reservation.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentScreenshotUrl) {
      toast({
        title: "Payment proof required",
        description: "Scan the QR code, pay the amount, then upload a screenshot of the payment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBusy("pay");
      const booking = await createBooking();
      const token = booking.guestAccessToken;
      onOpenChange(false);
      const qs = new URLSearchParams();
      if (token) qs.set("token", token);
      qs.set("qr", "1");
      router.push(`/booking/confirmation/${booking.id}?${qs.toString()}`);
      toast({
        title: "Booking submitted",
        description: "We will verify your payment and confirm your booking shortly.",
      });
      setBusy(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not complete booking";
      toast({ title: "Booking failed", description: msg, variant: "destructive" });
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
            No account needed. Upload ID proofs, share your details, then pay or WhatsApp.
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
          {offerLine && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rental (before offer)</span>
                <span className="text-muted-foreground line-through">{formatINR(carSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{offerLine.label}</span>
                <span className={`font-medium ${offerLine.delta < 0 ? "text-green-600" : "text-amber-600"}`}>
                  {offerLine.delta < 0 ? "−" : "+"}
                  {formatINR(Math.abs(offerLine.delta))}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Rental{rentalLabel ? ` (${rentalLabel})` : ""}
            </span>
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

        {qrPaymentEnabled && !paymentsEnabled && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-semibold">{paymentQr.label}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{paymentQr.helpText}</p>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentQr.qrCodeUrl}
                  alt="Payment QR code"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-sm font-bold text-center">
                Pay {formatINR(payNowAmount)}
                {payNowAmount < grandTotal ? ` (advance · balance ${formatINR(grandTotal - payNowAmount)} at pickup)` : ""}
              </p>
            </div>
            <DocUploadSlot
              label="Payment screenshot"
              hint="Upload a clear screenshot of your successful UPI / bank payment"
              url={paymentScreenshotUrl}
              uploading={uploadingDoc === "payment"}
              onUpload={(f) => handleDocUpload("payment", f)}
              icon={CreditCard}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-bold"
            onClick={handlePay}
            disabled={!!busy || !!uploadingDoc || (!paymentsEnabled && !qrPaymentEnabled)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {busy === "pay"
              ? paymentsEnabled
                ? "Redirecting to payment…"
                : "Submitting booking…"
              : paymentsEnabled
                ? payNowAmount < grandTotal
                  ? `Pay ${formatINR(payNowAmount)} now`
                  : `Pay ${formatINR(payNowAmount)}`
                : qrPaymentEnabled
                  ? `Submit booking · ${formatINR(payNowAmount)}`
                  : "Pay online unavailable"}
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
