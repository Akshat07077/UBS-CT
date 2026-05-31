"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatINR, type CarData } from "@/components/car-card";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Phone } from "lucide-react";

interface BookingRow {
  id: number;
  carId: number;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice: number;
  status: string;
  source?: "website" | "manual";
  adminNotes?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  car?: { brand: string; model: string; id?: number };
}

function dayInBooking(day: string, pickupDate: string, returnDate: string) {
  return day >= pickupDate && day <= returnDate;
}

function statusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-500";
    case "pending":
      return "bg-yellow-500";
    case "completed":
      return "bg-primary";
    case "cancelled":
      return "bg-muted-foreground";
    default:
      return "bg-zinc-500";
  }
}

function ManualBookingForm({ cars, onSuccess }: { cars: CarData[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/admin/bookings/manual", {
        method: "POST",
        body: JSON.stringify({
          carId: Number(fd.get("carId")),
          guestName: String(fd.get("guestName") || "").trim(),
          guestPhone: String(fd.get("guestPhone") || "").trim() || undefined,
          guestEmail: String(fd.get("guestEmail") || "").trim() || undefined,
          pickupDate: fd.get("pickupDate"),
          returnDate: fd.get("returnDate"),
          pickupTime: fd.get("pickupTime") || "10:00",
          returnTime: fd.get("returnTime") || "10:00",
          totalPrice: fd.get("totalPrice") ? parseFloat(String(fd.get("totalPrice"))) : undefined,
          status: fd.get("status") || "confirmed",
          adminNotes: String(fd.get("adminNotes") || "").trim() || undefined,
        }),
      });
      toast({
        title: "Manual booking added",
        description: "Shown on calendar only — website availability unchanged.",
      });
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add manual booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add offline booking</DialogTitle>
          <p className="text-sm text-muted-foreground text-left">
            Phone / walk-in bookings. These appear on the calendar but do not block dates on the website.
          </p>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Vehicle *</Label>
            <select name="carId" required className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Select car</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} · {c.location}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer name *</Label>
              <Input name="guestName" required className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input name="guestPhone" type="tel" className="rounded-xl h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="guestEmail" type="email" className="rounded-xl h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pickup date *</Label>
              <Input name="pickupDate" type="date" required className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Return date *</Label>
              <Input name="returnDate" type="date" required className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Pickup time</Label>
              <Input name="pickupTime" type="time" defaultValue="10:00" className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Return time</Label>
              <Input name="returnTime" type="time" defaultValue="10:00" className="rounded-xl h-11" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Total (₹) optional</Label>
              <Input name="totalPrice" type="number" min={0} step={1} placeholder="Auto from daily rate" className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select name="status" defaultValue="confirmed" className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (payment ref, source, etc.)</Label>
            <Textarea name="adminNotes" rows={2} className="rounded-xl resize-none" placeholder="Paid cash · booked on phone…" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl">
            {submitting ? "Saving…" : "Save to calendar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBookingsCalendarPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [carFilter, setCarFilter] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: bookings, isLoading: bLoading } = useQuery<BookingRow[]>({
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch<BookingRow[]>("/api/bookings"),
  });

  const { data: cars, isLoading: cLoading } = useQuery<CarData[]>({
    queryKey: ["cars", "admin", "moderation"],
    queryFn: () => apiFetch<CarData[]>("/api/cars?moderation=all"),
  });

  const filtered = useMemo(() => {
    const list = bookings?.filter((b) => b.status !== "cancelled") ?? [];
    if (carFilter === "all") return list;
    return list.filter((b) => String(b.carId) === carFilter);
  }, [bookings, carFilter]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayBookings = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const day of calendarDays) {
      const key = format(day, "yyyy-MM-dd");
      map.set(
        key,
        filtered.filter((b) => dayInBooking(key, b.pickupDate, b.returnDate))
      );
    }
    return map;
  }, [calendarDays, filtered]);

  const selectedList = selectedDay ? dayBookings.get(selectedDay) ?? [] : [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Booking calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Website bookings block public dates. Manual (offline) entries are calendar-only.
          </p>
        </div>
        {!cLoading && cars && <ManualBookingForm cars={cars} onSuccess={refresh} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-3 text-sm font-bold min-w-[140px] text-center">{format(month, "MMMM yyyy")}</span>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg ml-1" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
        </div>
        <select
          value={carFilter}
          onChange={(e) => setCarFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm min-w-[160px]"
        >
          <option value="all">All vehicles</option>
          {cars?.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.brand} {c.model}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" /> Website
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-500/30" /> Manual / offline
        </span>
      </div>

      {bLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2 sm:p-3 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr min-h-[420px]">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = dayBookings.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const selected = selectedDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    "min-h-[72px] sm:min-h-[88px] p-1 sm:p-2 border-b border-r border-border/40 text-left transition-colors hover:bg-muted/30",
                    !inMonth && "bg-muted/20 text-muted-foreground/50",
                    selected && "ring-2 ring-inset ring-primary bg-primary/5",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <span className={cn("text-xs sm:text-sm font-semibold", isToday(day) && "text-primary")}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        className={cn(
                          "text-[9px] sm:text-[10px] truncate rounded px-1 py-0.5 text-white",
                          b.source === "manual" ? "bg-amber-600" : statusColor(b.status)
                        )}
                        title={`#${b.id} ${b.guestName || "Guest"}`}
                      >
                        {b.car?.brand} {b.car?.model?.[0]}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[9px] text-muted-foreground px-1">+{items.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
          <h2 className="font-display font-bold text-lg mb-4">
            {format(new Date(selectedDay + "T12:00:00"), "EEEE, d MMMM yyyy")}
          </h2>
          {selectedList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings on this day.</p>
          ) : (
            <ul className="space-y-3">
              {selectedList.map((b) => (
                <li key={b.id} className="rounded-xl border border-border/60 p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm">
                        {b.car?.brand} {b.car?.model}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {b.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          b.source === "manual" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-green-500/10 text-green-700"
                        )}
                      >
                        {b.source === "manual" ? "Offline" : "Website"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{b.guestName || "Guest"}</p>
                    {b.guestPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {b.guestPhone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.pickupDate} → {b.returnDate}
                    </p>
                    {b.adminNotes && <p className="text-xs text-muted-foreground mt-2 italic">{b.adminNotes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{formatINR(b.totalPrice)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">#{b.id}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
