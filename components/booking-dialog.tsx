"use client";

import { useState } from "react";
import Image from "next/image";
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
import { differenceInDays } from "date-fns";
import { CreditCard, MessageCircle, UserCheck, CheckCircle2, Upload, IdCard, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: CarData;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
}

async function uploadBookingDoc(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/booking-document", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
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
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <Label className="text-sm font-semibold">{label}</Label>
        {url && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <div className="flex gap-3 items-center">
        <div className="relative w-20 h-16 rounded-lg border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
          {url && !isPdf ? (
            <Image src={url} alt="" fill className="object-cover" sizes="80px" />
          ) : url && isPdf ? (
            <FileText className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground/40" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Button type="button" variant="outline" size="sm" className="rounded-lg w-full" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? "Uploading…" : url ? "Replace file" : "Upload photo / PDF"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline mt-1 inline-block">
              View uploaded file
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingDialog({ open, onOpenChange, car, pickupDate, returnDate, pickupTime, returnTime }: BookingDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [withDriver, setWithDriver] = useState(false);
  const [aadharUrl, setAadharUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState<"aadhar" | "license" | null>(null);
  const [busy, setBusy] = useState<"pay" | "whatsapp" | null>(null);

  const days = differenceInDays(new Date(returnDate), new Date(pickupDate));
  const driverPerDay = driverDailyMidpoint(car.listing);
  const showChauffeur = driverPerDay > 0;
  const carTotal = sumDailyRates(pickupDate, returnDate, car.pricePerDay);
  const driverTotal = withDriver && showChauffeur ? days * driverPerDay : 0;
  const grandTotal = carTotal + driverTotal;
  const carLabel = `${car.brand} ${car.model}`;

  const handleDocUpload = async (kind: "aadhar" | "license", file: File) => {
    try {
      setUploadingDoc(kind);
      const url = await uploadBookingDoc(file);
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
      const session = await apiFetch<{ sessionUrl: string }>("/api/payments/create-session", {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.id,
          guestAccessToken: token,
        }),
      });
      window.location.href = session.sessionUrl;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start payment";
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
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
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
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
          {withDriver && showChauffeur && (
            <div className="flex justify-between text-primary">
              <span>Chauffeur</span>
              <span className="font-medium">+{formatINR(driverTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-2 border-t border-border/50">
            <span>Total</span>
            <span className="text-primary">{formatINR(grandTotal)}</span>
          </div>
        </div>

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

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-bold"
            onClick={handlePay}
            disabled={!!busy || !!uploadingDoc}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {busy === "pay" ? "Redirecting to payment…" : "Pay now"}
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
