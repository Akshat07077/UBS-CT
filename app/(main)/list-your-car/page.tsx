"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { brand } from "@/lib/brand/config";
import { INDIA_CITY_OPTIONS, OTHER_CITY_OPTION, PAN_INDIA_CITY } from "@/lib/constants/india-cities";
import { Car as CarIcon, CheckCircle2, Upload, Plus, X } from "lucide-react";
import { canPreviewImageUrl, uploadImageToApi } from "@/lib/upload-client";

type SubmitResponse = {
  id: number;
  listingApprovalStatus: string;
  message: string;
};

export default function ListYourCarPage() {
  const [done, setDone] = useState(false);
  const [refId, setRefId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gallery, setGallery] = useState<string[]>([""]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState(PAN_INDIA_CITY);
  const [customCity, setCustomCity] = useState("");
  const [cloudinaryReady, setCloudinaryReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/upload/status")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setCloudinaryReady(Boolean(d.configured)))
      .catch(() => setCloudinaryReady(null));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadingIndex(index);
      const data = await uploadImageToApi("/api/upload/listing-photo", file);
      setGallery((prev) => {
        const next = [...prev];
        next[index] = data.url;
        return next;
      });
      toast({
        title: data.placeholder ? "Placeholder image used" : "Photo uploaded",
        description: data.placeholder
          ? "Add CLOUDINARY_* keys in Vercel (remove placeholder CLOUDINARY_URL)."
          : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const resolvedCity =
      selectedCity === OTHER_CITY_OPTION ? customCity.trim() : selectedCity;
    if (!resolvedCity) {
      toast({ title: "City required", description: "Please choose a city or type one.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const urls = gallery.map((u) => u.trim()).filter(Boolean);
    const finalImage = urls[0] ?? null;
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
      location: resolvedCity,
      description: String(fd.get("description") || "").trim() || null,
      imageUrl: finalImage,
      images: urls,
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

      {cloudinaryReady === false && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong className="text-amber-50">Cloudinary not configured.</strong> Photos will use placeholders until you add{" "}
          <code className="text-xs bg-black/30 px-1 rounded">CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code className="text-xs bg-black/30 px-1 rounded">CLOUDINARY_API_KEY</code>, and{" "}
          <code className="text-xs bg-black/30 px-1 rounded">CLOUDINARY_API_SECRET</code> to{" "}
          <code className="text-xs bg-black/30 px-1 rounded">.env</code>. See <code className="text-xs">docs/CLOUDINARY.md</code>.
        </div>
      )}

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
          <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-base">Photos</Label>
                <p className="text-sm text-muted-foreground mt-0.5">Upload multiple images. First image is the cover.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setGallery((g) => [...g, ""])}>
                <Plus className="w-4 h-4 mr-1" /> Add slot
              </Button>
            </div>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {gallery.map((url, index) => (
                <div key={index} className="flex gap-3 items-start p-3 rounded-xl border border-border/60 bg-card">
                  <div className="w-24 h-20 bg-muted rounded-lg border border-border overflow-hidden shrink-0 relative group">
                    {url?.trim() && canPreviewImageUrl(url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url.trim()} alt="Listing preview" className="absolute inset-0 w-full h-full object-cover" />
                    ) : url?.trim() ? (
                      <div className="absolute inset-0 flex items-center justify-center p-1 text-[9px] text-center text-muted-foreground">
                        Paste full https:// URL or upload
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CarIcon className="w-6 h-6 text-muted-foreground/35" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploading}
                      aria-label={`Upload image ${index + 1}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      type="url"
                      className="rounded-xl"
                      placeholder="https://… or upload from thumbnail"
                      value={url}
                      onChange={(ev) =>
                        setGallery((g) => {
                          const next = [...g];
                          next[index] = ev.target.value.trim();
                          return next;
                        })
                      }
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {index === 0 && <Badge variant="secondary" className="text-[10px]">Cover</Badge>}
                      {uploadingIndex === index && isUploading && <span className="text-primary">Uploading…</span>}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => setGallery((g) => g.filter((_, i) => i !== index))}
                        disabled={gallery.length <= 1}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
              <Label htmlFor="location">City</Label>
              <select
                id="location"
                name="location"
                required
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {INDIA_CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                <option value={OTHER_CITY_OPTION}>Other city (type manually)</option>
              </select>
              {selectedCity === OTHER_CITY_OPTION && (
                <Input
                  name="customCity"
                  required
                  className="rounded-xl"
                  placeholder="Type your city"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                />
              )}
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
