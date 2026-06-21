"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import type { BookingPaymentSettings } from "@/lib/booking-payment-settings";
import type { PricingUpliftSettings } from "@/lib/pricing-uplift-settings";
import type { PricingOfferSettings } from "@/lib/pricing-offer-settings";
import type { PaymentQrSettings } from "@/lib/payment-qr-settings";
import { peakSeasonRangeLabel } from "@/lib/pricing-uplift-settings";
import { canPreviewImageUrl, uploadImageToApi } from "@/lib/upload-client";
import { Wallet, Shield, Save, TrendingUp, Tag, QrCode, Upload } from "lucide-react";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: paymentData, isLoading: paymentsLoading } = useQuery<BookingPaymentSettings>({
    queryKey: ["admin-booking-payments"],
    queryFn: () => apiFetch<BookingPaymentSettings>("/api/admin/settings/booking-payments"),
  });
  const { data: pricingData, isLoading: pricingLoading } = useQuery<PricingUpliftSettings>({
    queryKey: ["admin-pricing-uplift"],
    queryFn: () => apiFetch<PricingUpliftSettings>("/api/admin/settings/pricing-uplift"),
  });
  const { data: offerData, isLoading: offerLoading } = useQuery<PricingOfferSettings>({
    queryKey: ["admin-pricing-offer"],
    queryFn: () => apiFetch<PricingOfferSettings>("/api/admin/settings/pricing-offer"),
  });
  const { data: qrData, isLoading: qrLoading } = useQuery<PaymentQrSettings>({
    queryKey: ["admin-payment-qr"],
    queryFn: () => apiFetch<PaymentQrSettings>("/api/admin/settings/payment-qr"),
  });

  const [paymentForm, setPaymentForm] = useState<BookingPaymentSettings | null>(null);
  const [pricingForm, setPricingForm] = useState<PricingUpliftSettings | null>(null);
  const [offerForm, setOfferForm] = useState<PricingOfferSettings | null>(null);
  const [qrForm, setQrForm] = useState<PaymentQrSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const paymentSettings = paymentForm ?? paymentData;
  const pricingSettings = pricingForm ?? pricingData;
  const offerSettings = offerForm ?? offerData;
  const qrSettings = qrForm ?? qrData;
  const loading = paymentsLoading || pricingLoading || offerLoading || qrLoading;

  const updatePayment = <K extends keyof BookingPaymentSettings>(
    key: K,
    value: BookingPaymentSettings[K]
  ) => {
    setPaymentForm((prev) => ({ ...(prev ?? paymentData!), [key]: value }));
  };

  const updatePricing = <K extends keyof PricingUpliftSettings>(key: K, value: PricingUpliftSettings[K]) => {
    setPricingForm((prev) => ({ ...(prev ?? pricingData!), [key]: value }));
  };

  const updateOffer = <K extends keyof PricingOfferSettings>(key: K, value: PricingOfferSettings[K]) => {
    setOfferForm((prev) => ({ ...(prev ?? offerData!), [key]: value }));
  };

  const updateQr = <K extends keyof PaymentQrSettings>(key: K, value: PaymentQrSettings[K]) => {
    setQrForm((prev) => ({ ...(prev ?? qrData!), [key]: value }));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingQr(true);
      toast({ title: "Uploading QR code…" });
      const data = await uploadImageToApi("/api/upload/image", file);
      updateQr("qrCodeUrl", data.url);
      updateQr("enabled", true);
      toast({
        title: data.placeholder ? "Placeholder used" : "QR code uploaded",
        description: data.placeholder ? "Add Cloudinary keys for production uploads." : undefined,
      });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload QR code",
        variant: "destructive",
      });
    } finally {
      setUploadingQr(false);
      e.target.value = "";
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSettings || !pricingSettings || !offerSettings || !qrSettings) return;
    setSaving(true);
    try {
      await Promise.all([
        apiFetch("/api/admin/settings/booking-payments", {
          method: "PUT",
          body: JSON.stringify(paymentSettings),
        }),
        apiFetch("/api/admin/settings/pricing-uplift", {
          method: "PUT",
          body: JSON.stringify(pricingSettings),
        }),
        apiFetch("/api/admin/settings/pricing-offer", {
          method: "PUT",
          body: JSON.stringify(offerSettings),
        }),
        apiFetch("/api/admin/settings/payment-qr", {
          method: "PUT",
          body: JSON.stringify(qrSettings),
        }),
      ]);
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["admin-booking-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-uplift"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-offer"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payment-qr"] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      setPaymentForm(null);
      setPricingForm(null);
      setOfferForm(null);
      setQrForm(null);
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0 max-w-3xl animate-in fade-in duration-500">
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Site settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Booking payments, security deposit, promotional offers, and weekend / peak-season price uplifts.
        </p>
      </div>

      {loading || !paymentSettings || !pricingSettings || !offerSettings || !qrSettings ? (
        <Skeleton className="h-[32rem] rounded-2xl" />
      ) : (
        <form onSubmit={onSave} className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-8 shadow-sm">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Promotional offer</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled with a percent and title or badge, an offer banner appears on the homepage and car pages.
              Nothing shows until you turn this on and fill in the details below.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={offerSettings.enabled}
                onChange={(e) => updateOffer("enabled", e.target.checked)}
                className="accent-primary"
              />
              Show offer on website
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Offer type</Label>
                <select
                  value={offerSettings.direction}
                  onChange={(e) =>
                    updateOffer("direction", e.target.value as PricingOfferSettings["direction"])
                  }
                  disabled={!offerSettings.enabled}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="discount">Discount (lower prices)</option>
                  <option value="increment">Increment (higher prices)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Percent (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={offerSettings.percent}
                  onChange={(e) => updateOffer("percent", parseInt(e.target.value, 10) || 0)}
                  disabled={!offerSettings.enabled}
                  className="rounded-xl h-11"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Badge text (short)</Label>
              <Input
                value={offerSettings.badgeText}
                onChange={(e) => updateOffer("badgeText", e.target.value)}
                disabled={!offerSettings.enabled}
                className="rounded-xl h-11"
                placeholder="10% OFF"
              />
            </div>
            <div className="space-y-2">
              <Label>Offer title</Label>
              <Input
                value={offerSettings.title}
                onChange={(e) => updateOffer("title", e.target.value)}
                disabled={!offerSettings.enabled}
                className="rounded-xl h-11"
                placeholder="Festive season offer"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={offerSettings.description}
                onChange={(e) => updateOffer("description", e.target.value)}
                disabled={!offerSettings.enabled}
                rows={2}
                className="rounded-xl resize-none"
                placeholder="Valid on all cars booked this month."
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={offerSettings.applyToBookings}
                onChange={(e) => updateOffer("applyToBookings", e.target.checked)}
                disabled={!offerSettings.enabled}
                className="accent-primary"
              />
              Apply percent to listed rates and booking totals
            </label>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Weekend &amp; peak-season pricing</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied per calendar day when calculating rental totals. Weekday base is the car&apos;s daily rate.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={pricingSettings.weekendUpliftEnabled}
                onChange={(e) => updatePricing("weekendUpliftEnabled", e.target.checked)}
                className="accent-primary"
              />
              Weekend uplift (Saturday &amp; Sunday)
            </label>
            <div className="space-y-2 max-w-xs">
              <Label>Weekend extra (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={pricingSettings.weekendUpliftPercent}
                onChange={(e) => updatePricing("weekendUpliftPercent", parseInt(e.target.value, 10) || 0)}
                disabled={!pricingSettings.weekendUpliftEnabled}
                className="rounded-xl h-11"
              />
              <p className="text-[11px] text-muted-foreground">e.g. 15 = +15% on Sat/Sun</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={pricingSettings.peakSeasonEnabled}
                onChange={(e) => updatePricing("peakSeasonEnabled", e.target.checked)}
                className="accent-primary"
              />
              Peak / wedding season uplift
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Start month</Label>
                <select
                  value={pricingSettings.peakSeasonStartMonth}
                  onChange={(e) => updatePricing("peakSeasonStartMonth", parseInt(e.target.value, 10))}
                  disabled={!pricingSettings.peakSeasonEnabled}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "short" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>End month</Label>
                <select
                  value={pricingSettings.peakSeasonEndMonth}
                  onChange={(e) => updatePricing("peakSeasonEndMonth", parseInt(e.target.value, 10))}
                  disabled={!pricingSettings.peakSeasonEnabled}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "short" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Peak extra (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={pricingSettings.peakSeasonUpliftPercent}
                  onChange={(e) => updatePricing("peakSeasonUpliftPercent", parseInt(e.target.value, 10) || 0)}
                  disabled={!pricingSettings.peakSeasonEnabled}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            {pricingSettings.peakSeasonEnabled && (
              <p className="text-xs text-muted-foreground">
                Current window:{" "}
                {peakSeasonRangeLabel(
                  pricingSettings.peakSeasonStartMonth,
                  pricingSettings.peakSeasonEndMonth
                )}
              </p>
            )}

            <div className="space-y-2 max-w-xs pt-2">
              <Label>Max combined uplift (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={pricingSettings.combinedMaxUpliftPercent}
                onChange={(e) => updatePricing("combinedMaxUpliftPercent", parseInt(e.target.value, 10) || 0)}
                className="rounded-xl h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                Caps weekend + peak combined (e.g. 45 = never more than +45% vs weekday base).
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Booking advance</h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={paymentSettings.advanceEnabled}
                onChange={(e) => updatePayment("advanceEnabled", e.target.checked)}
                className="accent-primary"
              />
              Enable booking advance (pay now online)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calculation</Label>
                <select
                  value={paymentSettings.advanceMode}
                  onChange={(e) => updatePayment("advanceMode", e.target.value as BookingPaymentSettings["advanceMode"])}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  disabled={!paymentSettings.advanceEnabled}
                >
                  <option value="percent">Percent of rental total</option>
                  <option value="fixed">Fixed amount (₹)</option>
                  <option value="full">Full rental amount</option>
                </select>
              </div>
              {paymentSettings.advanceMode === "percent" && (
                <div className="space-y-2">
                  <Label>Percent (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={paymentSettings.advancePercent}
                    onChange={(e) => updatePayment("advancePercent", parseInt(e.target.value, 10) || 0)}
                    disabled={!paymentSettings.advanceEnabled}
                    className="rounded-xl h-11"
                  />
                </div>
              )}
              {paymentSettings.advanceMode === "fixed" && (
                <div className="space-y-2">
                  <Label>Fixed amount (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={paymentSettings.advanceFixedInr}
                    onChange={(e) => updatePayment("advanceFixedInr", parseInt(e.target.value, 10) || 0)}
                    disabled={!paymentSettings.advanceEnabled}
                    className="rounded-xl h-11"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Label on website</Label>
              <Input
                value={paymentSettings.advanceLabel}
                onChange={(e) => updatePayment("advanceLabel", e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Help text</Label>
              <Textarea
                value={paymentSettings.advanceHelpText}
                onChange={(e) => updatePayment("advanceHelpText", e.target.value)}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Pickup security (bike/scooty or cash)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Renters must choose one option when booking a car. This is collateral only, not a separate rental.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={paymentSettings.collateralRequired}
                onChange={(e) => updatePayment("collateralRequired", e.target.checked)}
                className="accent-primary"
              />
              Require security choice at booking
            </label>
            <div className="space-y-2">
              <Label>Cash refundable amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={paymentSettings.cashRefundableAmountInr}
                onChange={(e) => updatePayment("cashRefundableAmountInr", parseInt(e.target.value, 10) || 0)}
                disabled={!paymentSettings.collateralRequired}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Section title (booking form)</Label>
              <Input
                value={paymentSettings.collateralSectionTitle}
                onChange={(e) => updatePayment("collateralSectionTitle", e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Section help text</Label>
              <Textarea
                value={paymentSettings.collateralSectionHelp}
                onChange={(e) => updatePayment("collateralSectionHelp", e.target.value)}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2 p-3 rounded-xl border border-border/60">
                <Label>Bike / scooty option label</Label>
                <Input
                  value={paymentSettings.bikeScootyOptionLabel}
                  onChange={(e) => updatePayment("bikeScootyOptionLabel", e.target.value)}
                  className="rounded-xl h-11"
                />
                <Textarea
                  value={paymentSettings.bikeScootyOptionHelp}
                  onChange={(e) => updatePayment("bikeScootyOptionHelp", e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none mt-2"
                />
              </div>
              <div className="space-y-2 p-3 rounded-xl border border-border/60">
                <Label>Cash deposit option label</Label>
                <Input
                  value={paymentSettings.cashOptionLabel}
                  onChange={(e) => updatePayment("cashOptionLabel", e.target.value)}
                  className="rounded-xl h-11"
                />
                <Textarea
                  value={paymentSettings.cashOptionHelp}
                  onChange={(e) => updatePayment("cashOptionHelp", e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none mt-2"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">QR payment</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your UPI or bank QR code. Customers scan it during booking, pay, then upload a payment screenshot for verification.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={qrSettings.enabled}
                onChange={(e) => updateQr("enabled", e.target.checked)}
                className="accent-primary"
              />
              Show QR payment on booking form
            </label>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-36 h-36 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
                  {qrSettings.qrCodeUrl && canPreviewImageUrl(qrSettings.qrCodeUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrSettings.qrCodeUrl} alt="Payment QR" className="w-full h-full object-contain p-2" />
                  ) : (
                    <QrCode className="w-12 h-12 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <Label htmlFor="qr-upload">QR code image</Label>
                  <label
                    htmlFor="qr-upload"
                    className={`flex items-center justify-center gap-2 w-full min-h-[44px] px-4 rounded-xl border border-input bg-background text-sm font-medium cursor-pointer ${
                      uploadingQr ? "opacity-60 pointer-events-none" : "hover:bg-muted/50"
                    }`}
                  >
                    <Upload className="w-4 h-4 text-primary" />
                    {uploadingQr ? "Uploading…" : qrSettings.qrCodeUrl ? "Replace QR image" : "Upload QR image"}
                  </label>
                  <input
                    id="qr-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    className="sr-only"
                    disabled={uploadingQr}
                    onChange={handleQrUpload}
                  />
                  {qrSettings.qrCodeUrl && (
                    <p className="text-[11px] text-muted-foreground break-all">{qrSettings.qrCodeUrl}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label on booking form</Label>
              <Input
                value={qrSettings.label}
                onChange={(e) => updateQr("label", e.target.value)}
                className="rounded-xl h-11"
                placeholder="Scan to pay"
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions for customers</Label>
              <Textarea
                value={qrSettings.helpText}
                onChange={(e) => updateQr("helpText", e.target.value)}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </section>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto rounded-xl h-11 gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save all settings"}
          </Button>
        </form>
      )}
    </div>
  );
}
