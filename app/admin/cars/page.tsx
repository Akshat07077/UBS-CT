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
import { Plus, Edit, Trash2, Car as CarIcon, Clock, ChevronUp, ChevronDown, GripVertical, Upload, AlertTriangle } from "lucide-react";
import { formatINR, type CarData } from "@/components/car-card";
import { peerHostListingJson } from "@/lib/rental-listing";
import { canPreviewImageUrl, uploadImageToApi } from "@/lib/upload-client";
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
  const [deleteTarget, setDeleteTarget] = useState<CarData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingCars = useMemo(
    () => cars?.filter((c) => c.listingApprovalStatus === "pending") ?? [],
    [cars]
  );
  const displayedCars = useMemo(() => {
    if (!cars) return [];
    if (viewFilter === "pending") return pendingCars;
    return cars;
  }, [cars, viewFilter, pendingCars]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/cars/${deleteTarget.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars", "admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["peer-listings-mine"] });
      queryClient.invalidateQueries({ queryKey: ["car"] });
      toast({
        title: "Vehicle deleted",
        description: `${deleteTarget.brand} ${deleteTarget.model} has been removed from the fleet.`,
      });
      setDeleteTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not delete vehicle";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
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

      <p className="text-xs text-muted-foreground lg:hidden -mt-4 mb-1">Swipe left on the table to see Edit &amp; Delete →</p>

      <div className="bg-card rounded-2xl border border-border shadow-sm min-w-0">
        <div className="admin-table-scroll overflow-x-auto overflow-y-visible rounded-2xl">
          <table className="w-max min-w-full text-sm text-left table-auto border-collapse">
            <thead className="bg-muted/50 text-muted-foreground font-medium uppercase tracking-wide text-[10px] sm:text-xs">
              <tr>
                <th className="px-3 py-2.5 text-left whitespace-nowrap min-w-[200px] max-w-[280px]">Vehicle</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Source</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Approval</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[100px]">Specs</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Price</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap sticky right-0 z-20 bg-muted/95 backdrop-blur-sm border-l border-border/60 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)] min-w-[120px]">
                  Actions
                </th>
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
                <tr key={car.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-9 bg-muted rounded-md overflow-hidden shrink-0 relative">
                        {(car.images?.[0] ?? car.imageUrl) ? (
                          <Image src={car.images?.[0] ?? car.imageUrl!} fill className="object-cover" alt="" />
                        ) : (
                          <CarIcon className="w-full h-full p-2 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">{car.brand} {car.model}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {car.year} · {car.location}
                        </div>
                        {car.ownerEmail && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[12rem] truncate" title={car.ownerEmail}>
                            {car.ownerName ?? "Owner"} · {car.ownerEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                    {car.hostUserId != null ? (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30">Host</Badge>
                    ) : car.ownerEmail ? (
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-800 border-sky-500/30">Guest request</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">Fleet</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
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
                  <td className="px-3 py-2.5 align-middle text-muted-foreground whitespace-nowrap text-xs">
                    <div className="capitalize">{car.transmission}</div>
                    <div className="capitalize">{car.fuelType} · {car.seats} seats</div>
                  </td>
                  <td className="px-3 py-2.5 align-middle font-bold text-primary whitespace-nowrap">
                    <div>{formatINR(car.pricePerDay)}<span className="text-[10px] font-normal text-muted-foreground"> /day</span></div>
                    <div className="text-sm">{formatINR(car.pricePerHour)}<span className="text-[10px] font-normal text-muted-foreground"> /hr</span></div>
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                    <Badge variant={car.available ? "default" : "secondary"} className={car.available ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none" : ""}>
                      {car.available ? "Available" : "Unavailable"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 align-middle text-right sticky right-0 z-10 bg-card group-hover:bg-muted/30 border-l border-border/40 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)] whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                    {car.listingApprovalStatus === "pending" && (
                      <>
                        <Button size="sm" className="rounded-md h-7 px-2 text-xs" onClick={() => handleModerate(car.id, "approve")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-md h-7 px-2 text-xs" onClick={() => handleModerate(car.id, "reject")}>
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(car)}
                      className="h-8 px-2 rounded-md gap-1 border-primary/30 hover:bg-primary/10 hover:text-primary"
                      title="Edit vehicle"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="text-xs hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(car)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-md shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-destructive/25 p-0 gap-0 overflow-hidden [&>button]:hidden">
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogHeader className="text-left space-y-2 p-0">
                  <DialogTitle className="text-xl font-display font-bold tracking-tight">
                    Delete this vehicle?
                  </DialogTitle>
                </DialogHeader>
                {deleteTarget ? (
                  <>
                    <p className="text-sm text-foreground mt-3 font-semibold">
                      {deleteTarget.brand} {deleteTarget.model}
                      <span className="text-muted-foreground font-normal">
                        {" "}· {deleteTarget.year} · {deleteTarget.location}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      This removes the listing from the website and admin fleet. Past bookings linked to this car are
                      kept in records, but the vehicle will no longer be bookable.
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-muted/40 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-11"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-xl h-11 gap-2 shadow-md shadow-destructive/20"
              disabled={deleting}
              onClick={confirmDelete}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting…" : "Delete vehicle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
      toast({ title: "Preparing photo…", description: "Compressing for mobile upload." });
      const data = await uploadImageToApi("/api/upload/listing-photo", file);
      setGallery((g) => {
        const next = [...g];
        next[index] = data.url;
        return next;
      });
      toast({
        title: data.placeholder ? "Placeholder used" : "Image uploaded",
        description: data.placeholder
          ? "Add real CLOUDINARY_* keys in Vercel env (and remove placeholder CLOUDINARY_URL)."
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
    const pricePerDay = parseFloat(fd.get("pricePerDay") as string);
    const pricePerHour = parseFloat(fd.get("pricePerHour") as string);
    const listingBase =
      car?.listing ??
      peerHostListingJson(car?.ownerName ?? "Fleet", pricePerDay);
    const advanceOverrideRaw = String(fd.get("advancePaymentOverrideInr") || "").trim();
    const advancePercentRaw = String(fd.get("advancePaymentOverridePercent") || "").trim();

    const listing = {
      ...listingBase,
      advancePaymentDisabled: fd.get("advancePaymentDisabled") === "true",
      advancePaymentOverrideInr: advanceOverrideRaw ? parseFloat(advanceOverrideRaw) : null,
      advancePaymentOverridePercent: advancePercentRaw ? parseFloat(advancePercentRaw) : null,
    };

    const data = {
      brand: fd.get("brand"),
      model: fd.get("model"),
      year: parseInt(fd.get("year") as string),
      pricePerDay,
      pricePerHour,
      transmission: fd.get("transmission"),
      fuelType: fd.get("fuelType"),
      seats: parseInt(fd.get("seats") as string),
      location: resolvedCity,
      description: fd.get("description"),
      available: fd.get("available") === "true",
      imageUrl: urls[0] ?? null,
      images: urls,
      listing,
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
              <div className="w-24 h-20 bg-muted rounded-lg border border-border overflow-hidden shrink-0 relative">
                {url?.trim() && canPreviewImageUrl(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url.trim()} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : url?.trim() ? (
                  <div className="absolute inset-0 flex items-center justify-center p-1 text-[9px] text-center text-muted-foreground">
                    Invalid URL
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GripVertical className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg w-full h-9 text-xs"
                  disabled={isUploading && uploadingIndex !== index}
                  asChild
                >
                  <label className="cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploading && uploadingIndex === index ? "Uploading…" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(ev) => handleImageUpload(ev, index)}
                    />
                  </label>
                </Button>
                <Input
                  placeholder="Or paste https://…"
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

      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-4">
        <div>
          <Label className="text-base">Booking advance (this car)</Label>
          <p className="text-xs text-muted-foreground mt-1">Pickup security (bike/scooty vs ₹20k) is set in Admin → Settings.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Advance override (₹)</Label>
            <Input
              name="advancePaymentOverrideInr"
              type="number"
              min={0}
              placeholder="Use global"
              defaultValue={car?.listing?.advancePaymentOverrideInr ?? ""}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Advance override (%)</Label>
            <Input
              name="advancePaymentOverridePercent"
              type="number"
              min={0}
              max={100}
              placeholder="Use global"
              defaultValue={car?.listing?.advancePaymentOverridePercent ?? ""}
              className="rounded-lg"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="advancePaymentDisabled"
            value="true"
            defaultChecked={car?.listing?.advancePaymentDisabled === true}
            className="accent-primary"
          />
          Disable booking advance for this car
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Brand</Label><Input name="brand" defaultValue={car?.brand} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Model</Label><Input name="model" defaultValue={car?.model} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Year</Label><Input name="year" type="number" defaultValue={car?.year} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Price Per Day (₹)</Label><Input name="pricePerDay" type="number" step="1" defaultValue={car?.pricePerDay} required className="rounded-lg" /></div>
        <div className="space-y-2"><Label>Price Per Hour (₹)</Label><Input name="pricePerHour" type="number" step="1" defaultValue={car?.pricePerHour ?? (car?.pricePerDay ? Math.max(1, Math.round(car.pricePerDay / 24)) : undefined)} required className="rounded-lg" /></div>
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
