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
import { Wallet, Shield, Save } from "lucide-react";

export default function AdminBookingPaymentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<BookingPaymentSettings>({
    queryKey: ["admin-booking-payments"],
    queryFn: () => apiFetch<BookingPaymentSettings>("/api/admin/settings/booking-payments"),
  });

  const [form, setForm] = useState<BookingPaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const settings = form ?? data;

  const update = <K extends keyof BookingPaymentSettings>(key: K, value: BookingPaymentSettings[K]) => {
    setForm((prev) => ({ ...(prev ?? data!), [key]: value }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings/booking-payments", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      toast({ title: "Payment settings saved" });
      queryClient.invalidateQueries({ queryKey: ["admin-booking-payments"] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      setForm(null);
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
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Booking payments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure booking advance and security deposit shown to customers when renting.
        </p>
      </div>

      {isLoading || !settings ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <form onSubmit={onSave} className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-8 shadow-sm">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Booking advance</h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={settings.advanceEnabled}
                onChange={(e) => update("advanceEnabled", e.target.checked)}
                className="accent-primary"
              />
              Enable booking advance (pay now online)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calculation</Label>
                <select
                  value={settings.advanceMode}
                  onChange={(e) => update("advanceMode", e.target.value as BookingPaymentSettings["advanceMode"])}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  disabled={!settings.advanceEnabled}
                >
                  <option value="percent">Percent of rental total</option>
                  <option value="fixed">Fixed amount (₹)</option>
                  <option value="full">Full rental amount</option>
                </select>
              </div>
              {settings.advanceMode === "percent" && (
                <div className="space-y-2">
                  <Label>Percent (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.advancePercent}
                    onChange={(e) => update("advancePercent", parseInt(e.target.value, 10) || 0)}
                    disabled={!settings.advanceEnabled}
                    className="rounded-xl h-11"
                  />
                </div>
              )}
              {settings.advanceMode === "fixed" && (
                <div className="space-y-2">
                  <Label>Fixed amount (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.advanceFixedInr}
                    onChange={(e) => update("advanceFixedInr", parseInt(e.target.value, 10) || 0)}
                    disabled={!settings.advanceEnabled}
                    className="rounded-xl h-11"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Label on website</Label>
              <Input
                value={settings.advanceLabel}
                onChange={(e) => update("advanceLabel", e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Help text</Label>
              <Textarea
                value={settings.advanceHelpText}
                onChange={(e) => update("advanceHelpText", e.target.value)}
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
              Renters must choose one option when booking a car. Not a separate rental — collateral only.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={settings.collateralRequired}
                onChange={(e) => update("collateralRequired", e.target.checked)}
                className="accent-primary"
              />
              Require security choice at booking
            </label>
            <div className="space-y-2">
              <Label>Cash refundable amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={settings.cashRefundableAmountInr}
                onChange={(e) => update("cashRefundableAmountInr", parseInt(e.target.value, 10) || 0)}
                disabled={!settings.collateralRequired}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Section title (booking form)</Label>
              <Input
                value={settings.collateralSectionTitle}
                onChange={(e) => update("collateralSectionTitle", e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Section help text</Label>
              <Textarea
                value={settings.collateralSectionHelp}
                onChange={(e) => update("collateralSectionHelp", e.target.value)}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2 p-3 rounded-xl border border-border/60">
                <Label>Bike / scooty option label</Label>
                <Input
                  value={settings.bikeScootyOptionLabel}
                  onChange={(e) => update("bikeScootyOptionLabel", e.target.value)}
                  className="rounded-xl h-11"
                />
                <Textarea
                  value={settings.bikeScootyOptionHelp}
                  onChange={(e) => update("bikeScootyOptionHelp", e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none mt-2"
                />
              </div>
              <div className="space-y-2 p-3 rounded-xl border border-border/60">
                <Label>Cash deposit option label</Label>
                <Input
                  value={settings.cashOptionLabel}
                  onChange={(e) => update("cashOptionLabel", e.target.value)}
                  className="rounded-xl h-11"
                />
                <Textarea
                  value={settings.cashOptionHelp}
                  onChange={(e) => update("cashOptionHelp", e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none mt-2"
                />
              </div>
            </div>
          </section>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto rounded-xl h-11 gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </form>
      )}
    </div>
  );
}
