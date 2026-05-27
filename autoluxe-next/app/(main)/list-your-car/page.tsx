"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { brand } from "@/lib/brand/config";
import { CITY_OPTIONS, SERVICE_CITY } from "@/lib/constants/locations";
import { Car as CarIcon, CheckCircle2, Upload } from "lucide-react";

const CITIES = [...CITY_OPTIONS];

type SubmitResponse = {
  id: number;
  listingApprovalStatus: string;
  message: string;
};

export default function ListYourCarPage() {
  const [done, setDone] = useState(false);
  const [refId, setRefId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/listing-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
      toast({ title: "Photo uploaded" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const finalImage = imageUrl.trim() || null;
    const payload = {
      ownerName: String(fd.get("ownerName") || "").trim(),
      ownerEmail: String(fd.get("ownerEmail") || "").trim(),
      ownerPhone: String(fd.get("ownerPhone") || "").trim(),
      brand: String(fd.get("brand") || "").trim(),
      model: String(fd.get("model") || "").trim(),
      year: parseInt(String(fd.get("year")), 10),
      pricePerDay: parseFloat(String(fd.get("pricePerDay"))),
      transmission: fd.get("transmission"),
      fuelType: fd.get("fuelType"),
      seats: parseInt(String(fd.get("seats")), 10),
      location: String(fd.get("location") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      imageUrl: finalImage,
    };
    try {
      const res = await apiFetch<SubmitResponse>("/api/peer-listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRefId(res.id);
      setDone(true);
      toast({ title: "Request received", description: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not submit listing";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done && refId != null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-3">You&apos;re on the list</h1>
        <p className="text-muted-foreground mb-2">
          Reference <span className="font-mono font-semibold text-foreground">#{refId}</span>. Our team will review your vehicle and contact you at the email or phone you provided.
        </p>
        <p className="text-sm text-muted-foreground mb-8">No account was required. After approval, your car will appear in Browse Cars like any other listing.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cars">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto">
              Back to fleet
            </Button>
          </Link>
          <Button className="rounded-xl w-full sm:w-auto" onClick={() => { setDone(false); setRefId(null); }}>
            Submit another vehicle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
      <div className="mb-10">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">List with {brand.name}</p>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">List your car</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Tell us who you are, then your vehicle details. You do <strong className="text-foreground font-semibold">not</strong> need an account. Submissions stay hidden until an admin approves them.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-10 bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm">
        <div>
          <h2 className="text-lg font-display font-bold mb-4">Owner details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ownerName">Full name</Label>
              <Input id="ownerName" name="ownerName" required autoComplete="name" className="rounded-xl" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" required autoComplete="email" className="rounded-xl" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Phone (India)</Label>
              <Input id="ownerPhone" name="ownerPhone" type="tel" required autoComplete="tel" className="rounded-xl" placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-display font-bold mb-4">Vehicle</h2>
          <div className="flex gap-6 items-start p-4 bg-muted/30 rounded-2xl border border-border/50 mb-6">
            <div className="w-32 h-24 bg-muted rounded-xl border border-border flex items-center justify-center overflow-hidden shrink-0 relative group">
              {imageUrl ? (
                <Image src={imageUrl} fill className="object-cover" alt="Preview" />
              ) : (
                <CarIcon className="w-8 h-8 text-muted-foreground/30" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label>Photo (optional)</Label>
              <p className="text-sm text-muted-foreground">Click the box to upload from your device (max 5 MB).</p>
              {isUploading && <p className="text-sm text-primary">Uploading…</p>}
              <Label htmlFor="imageUrl" className="text-xs text-muted-foreground font-normal pt-2 block">
                Or paste an image link
              </Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                className="rounded-xl"
                placeholder="https://…"
                value={imageUrl}
                onChange={(ev) => setImageUrl(ev.target.value.trim())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" required className="rounded-xl" placeholder="Maruti" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" required className="rounded-xl" placeholder="Swift" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" name="year" type="number" min={1990} max={2030} defaultValue={2022} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerDay">Price per day (₹)</Label>
              <Input id="pricePerDay" name="pricePerDay" type="number" step="1" min={1} required className="rounded-xl" placeholder="1200" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Transmission</Label>
              <select name="transmission" defaultValue="manual" className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fuel</Label>
              <select name="fuelType" defaultValue="petrol" className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Input id="seats" name="seats" type="number" min={2} max={12} defaultValue={5} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <select name="location" required defaultValue={CITIES[0]} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} className="rounded-xl resize-none" placeholder="Condition, rules, pickup notes…" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground order-2 sm:order-1 max-w-sm">
            By submitting, you agree that {brand.name} may contact you about this listing. This demo does not run payouts or insurance — approval is manual.
          </p>
          <Button type="submit" disabled={isSubmitting || isUploading} className="rounded-xl shadow-lg shadow-primary/20 order-1 sm:order-2">
            {isSubmitting ? "Sending…" : "Submit for review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
