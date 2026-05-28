"use client";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Car as CarIcon, Clock, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { formatINR, type CarData } from "@/components/car-card";
import { INDIA_CITY_OPTIONS, OTHER_CITY_OPTION, PAN_INDIA_CITY } from "@/lib/constants/india-cities";

export default function AdminCarsPage() {
  const queryClient = useQueryClient();
  const { data: cars, isLoading } = useQuery<CarData[]>({
    queryKey: ["cars", "admin", "moderation"],
    queryFn: () => apiFetch<CarData[]>("/api/cars?moderation=all"),
  });

  const handleModerate = async (id: number, action: "approve" | "reject") => {
    try {
      await apiFetch(`/api/cars/${id}/moderate`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars", "admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["peer-listings-mine"] });
      toast({ title: action === "approve" ? "Approved" : "Rejected", description: "Listing updated." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarData | null>(null);
  const [viewFilter, setViewFilter] = useState<"all" | "pending">("all");

  const pendingCars = useMemo(
    () => cars?.filter((c) => c.listingApprovalStatus === "pending") ?? [],
    [cars]
  );
  const displayedCars = useMemo(() => {
    if (!cars) return [];
    if (viewFilter === "pending") return pendingCars;
    return cars;
  }, [cars, viewFilter, pendingCars]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      await apiFetch(`/api/cars/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars", "admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["peer-listings-mine"] });
      toast({ title: "Deleted", description: "Vehicle removed." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (car: CarData) => { setEditingCar(car); setFormOpen(true); };
  const openCreate = () => { setEditingCar(null); setFormOpen(true); };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Manage Fleet</h1>
          <p className="text-muted-foreground mt-1">
            Approve guest listings in the <strong className="text-foreground">Approval</strong> column (Approve / Reject), or use the pending filter below.
          </p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="rounded-xl shadow-md shadow-primary/20 gap-2 w-full sm:w-auto shrink-0">
              <Plus className="w-4 h-4" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{editingCar ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
            </DialogHeader>
            <CarForm
              key={editingCar?.id ?? "create"}
              car={editingCar}
              onSuccess={() => {
                setFormOpen(false);
                queryClient.invalidateQueries({ queryKey: ["cars"] });
                queryClient.invalidateQueries({ queryKey: ["cars", "admin", "moderation"] });
                queryClient.invalidateQueries({ queryKey: ["peer-listings-mine"] });
                queryClient.invalidateQueries({ queryKey: ["car"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {pendingCars.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                {pendingCars.length} listing{pendingCars.length === 1 ? "" : "s"} awaiting approval
              </p>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                Guest submissions from &quot;List your car&quot; stay hidden from Browse Cars until you approve them.
              </p>
            </div>
          </div>
          <Button
            className="rounded-xl shrink-0"
            variant={viewFilter === "pending" ? "default" : "outline"}
            onClick={() => setViewFilter(viewFilter === "pending" ? "all" : "pending")}
          >
            {viewFilter === "pending" ? "Show all vehicles" : "Review pending only"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={viewFilter === "all" ? "default" : "outline"}
          className="rounded-lg"
          onClick={() => setViewFilter("all")}
        >
          All ({cars?.length ?? 0})
        </Button>
        <Button
          size="sm"
          variant={viewFilter === "pending" ? "default" : "outline"}
          className="rounded-lg"
          onClick={() => setViewFilter("pending")}
        >
          Pending ({pendingCars.length})
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Approval</th>
                <th className="px-6 py-4">Specs</th>
                <th className="px-6 py-4">Price/Day</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Skeleton className="h-8 w-full" /></td></tr>
              ) : displayedCars.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                  {viewFilter === "pending" ? "No pending listings." : "No vehicles found. Add one above."}
                </td></tr>
              ) : displayedCars.map((car) => (
                <tr key={car.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-muted rounded-lg overflow-hidden shrink-0 relative">
                        {(car.images?.[0] ?? car.imageUrl) ? (
                          <Image src={car.images?.[0] ?? car.imageUrl!} fill className="object-cover" alt="" />
                        ) : (
                          <CarIcon className="w-full h-full p-2 text-muted-foreground/50" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{car.brand} {car.model}</div>
                        <div className="text-xs text-muted-foreground">{car.year} • {car.location}</div>
                        {car.ownerEmail && (
                          <div className="text-[11px] text-muted-foreground mt-1 max-w-[14rem] truncate" title={car.ownerEmail}>
                            {car.ownerName ?? "Owner"} · {car.ownerEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {car.hostUserId != null ? (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30">Host</Badge>
                    ) : car.ownerEmail ? (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-800 border-sky-500/30">Guest request</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">Fleet</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {car.listingApprovalStatus === "pending" && (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-900">Pending</Badge>
                    )}
                    {car.listingApprovalStatus === "approved" && (
                      <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-800">Approved</Badge>
                    )}
                    {car.listingApprovalStatus === "rejected" && (
                      <Badge variant="destructive" className="shadow-none">Rejected</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="capitalize">{car.transmission}</div>
                    <div className="capitalize">{car.fuelType} • {car.seats} seats</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">{formatINR(car.pricePerDay)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={car.available ? "default" : "secondary"} className={car.available ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none" : ""}>
                      {car.available ? "Available" : "Unavailable"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                    {car.listingApprovalStatus === "pending" && (
                      <>
                        <Button size="sm" className="rounded-lg h-8" onClick={() => handleModerate(car.id, "approve")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => handleModerate(car.id, "reject")}>
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(car)} className="hover:bg-primary/10 hover:text-primary rounded-lg">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(car.id)} className="hover:bg-destructive/10 hover:text-destructive rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CarForm({ car, onSuccess }: { car: CarData | null; onSuccess: () => void }) {
  const initialGallery =
    car?.images && car.images.length > 0
      ? [...car.images]
      : car?.imageUrl
        ? [car.imageUrl]
        : [""];
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>(
    car?.location && INDIA_CITY_OPTIONS.includes(car.location as (typeof INDIA_CITY_OPTIONS)[number])
      ? car.location
      : car?.location
        ? OTHER_CITY_OPTION
        : PAN_INDIA_CITY
  );
  const [customCity, setCustomCity] = useState<string>(
    car?.location && !INDIA_CITY_OPTIONS.includes(car.location as (typeof INDIA_CITY_OPTIONS)[number])
      ? car.location
      : ""
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadingIndex(index);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGallery((g) => {
        const next = [...g];
        next[index] = data.url;
        return next;
      });
      toast({ title: "Image uploaded" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const onSubmit = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
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
    if (urls.length === 0) {
      toast({ title: "Photos required", description: "Add at least one image URL or upload a photo.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const data = {
      brand: fd.get("brand"),
      model: fd.get("model"),
      year: parseInt(fd.get("year") as string),
      pricePerDay: parseFloat(fd.get("pricePerDay") as string),
      transmission: fd.get("transmission"),
      fuelType: fd.get("fuelType"),
      seats: parseInt(fd.get("seats") as string),
      location: resolvedCity,
      description: fd.get("description"),
      available: fd.get("available") === "true",
      imageUrl: urls[0] ?? null,
      images: urls,
    };
    try {
      if (car) {
        await apiFetch(`/api/cars/${car.id}`, { method: "PUT", body: JSON.stringify(data) });
        toast({ title: "Vehicle updated" });
      } else {
        await apiFetch("/api/cars", { method: "POST", body: JSON.stringify(data) });
        toast({ title: "Vehicle created" });
      }
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= gallery.length) return;
    setGallery((g) => {
      const next = [...g];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-4">
      <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-base">Photo gallery</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              First image is the cover (cards + slider). Upload or paste image URLs. Order = slider order.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-lg shrink-0" onClick={() => setGallery((g) => [...g, ""])}>
            <Plus className="w-4 h-4 mr-1" /> Add slot
          </Button>
        </div>
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {gallery.map((url, index) => (
            <div key={index} className="flex gap-3 items-start p-3 rounded-xl border border-border/60 bg-card">
              <div className="flex flex-col gap-1 shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === gallery.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="w-24 h-20 bg-muted rounded-lg border border-border overflow-hidden shrink-0 relative group">
                {url?.trim() ? (
                  <Image src={url.trim()} fill className="object-cover" alt="" sizes="96px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GripVertical className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(ev) => handleImageUpload(ev, index)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                  aria-label={`Upload image ${index + 1}`}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  placeholder="https://… or upload via thumbnail"
                  value={url}
                  onChange={(ev) =>
                    setGallery((g) => {
                      const next = [...g];
                      next[index] = ev.target.value;
                      return next;
                    })
                  }
                  className="rounded-lg text-sm"
                />
                <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                  {index === 0 && <Badge variant="secondary" className="text-[10px]">Cover</Badge>}
                  {uploadingIndex === index && isUploading && <span className="text-primary">Uploading…</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive hover:text-destructive"
                    onClick={() => setGallery((g) => g.filter((_, i) => i !== index))}
                    disabled={gallery.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Brand</Label><Input name="brand" defaultValue={car?.brand} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Model</Label><Input name="model" defaultValue={car?.model} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Year</Label><Input name="year" type="number" defaultValue={car?.year} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Price Per Day (₹)</Label><Input name="pricePerDay" type="number" step="1" defaultValue={car?.pricePerDay} required className="rounded-lg" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Transmission</Label>
          <select name="transmission" defaultValue={car?.transmission || "automatic"} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Fuel Type</Label>
          <select name="fuelType" defaultValue={car?.fuelType || "petrol"} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="space-y-2"><Label>Seats</Label><Input name="seats" type="number" defaultValue={car?.seats || 5} required className="rounded-lg" /></div>
        <div className="space-y-2">
          <Label>Location (City)</Label>
          <select
            name="location"
            required
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Type city"
              className="rounded-lg"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Availability</Label>
        <select name="available" defaultValue={car?.available === false ? "false" : "true"} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="true">Available for Rent</option>
          <option value="false">Unavailable</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={car?.description ?? ""} rows={4} className="rounded-lg resize-none" />
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button type="submit" disabled={isSubmitting || isUploading} className="rounded-xl px-8 shadow-lg shadow-primary/20">
          {isSubmitting ? "Saving..." : car ? "Save Changes" : "Create Vehicle"}
        </Button>
      </div>
    </form>
  );
}
