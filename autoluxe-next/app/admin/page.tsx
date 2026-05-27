"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { formatINR, type CarData } from "@/components/car-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Car, ListOrdered, IndianRupee, Users, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

interface BookingRow {
  id: number;
  pickupDate: string;
  returnDate: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  car?: { brand: string; model: string };
  user?: { name: string | null; email: string };
}

interface UserRow {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-3xl font-display font-extrabold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "confirmed": return "bg-green-500/10 text-green-600 border-none";
    case "pending": return "bg-yellow-500/10 text-yellow-600 border-none";
    case "completed": return "bg-primary/10 text-primary border-none";
    case "cancelled": return "bg-destructive/10 text-destructive border-none";
    default: return "bg-muted text-muted-foreground border-none";
  }
}

export default function AdminOverviewPage() {
  const { data: bookings, isLoading: bLoading } = useQuery<BookingRow[]>({
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch<BookingRow[]>("/api/bookings"),
  });
  const { data: cars, isLoading: cLoading } = useQuery<CarData[]>({
    queryKey: ["cars", "admin", "moderation"],
    queryFn: () => apiFetch<CarData[]>("/api/cars?moderation=all"),
  });
  const { data: users, isLoading: uLoading } = useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<UserRow[]>("/api/users"),
  });

  const totalRevenue = bookings?.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.totalPrice), 0) ?? 0;
  const confirmed = bookings?.filter(b => b.status === "confirmed").length ?? 0;
  const pending = bookings?.filter(b => b.status === "pending").length ?? 0;
  const available = cars?.filter((c) => c.available && c.listingApprovalStatus === "approved").length ?? 0;
  const pendingListings = cars?.filter((c) => c.listingApprovalStatus === "pending").length ?? 0;
  const recentBookings = bookings?.slice(0, 6) ?? [];

  const bookingsByStatus = [
    { label: "Confirmed", count: confirmed, icon: CheckCircle2, color: "text-green-600 bg-green-500/10" },
    { label: "Pending", count: pending, icon: Clock, color: "text-yellow-600 bg-yellow-500/10" },
    { label: "Completed", count: bookings?.filter(b => b.status === "completed").length ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10" },
    { label: "Cancelled", count: bookings?.filter(b => b.status === "cancelled").length ?? 0, icon: XCircle, color: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-3xl font-display font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here&apos;s what&apos;s happening at {brand.name}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {bLoading || cLoading || uLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(totalRevenue)} sub="Excluding cancelled" color="bg-primary/10 text-primary" />
            <StatCard icon={ListOrdered} label="Total Bookings" value={bookings?.length ?? 0} sub={`${pending} pending`} color="bg-yellow-500/10 text-yellow-600" />
            <StatCard icon={Car} label="Vehicles in system" value={cars?.length ?? 0} sub={`${available} bookable · ${pendingListings} listing review${pendingListings === 1 ? "" : "s"}`} color="bg-green-500/10 text-green-600" />
            <StatCard icon={Users} label="Registered Users" value={users?.length ?? 0} sub="All time" color="bg-blue-500/10 text-blue-600" />
          </>
        )}
      </div>

      {/* Booking status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {bookingsByStatus.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold text-lg">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {bLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                </div>
              ))
            ) : recentBookings.length === 0 ? (
              <p className="px-6 py-8 text-center text-muted-foreground text-sm">No bookings yet.</p>
            ) : recentBookings.map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                  #{b.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.car?.brand} {b.car?.model}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.user?.name || b.user?.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-primary">{formatINR(b.totalPrice)}</p>
                  <Badge variant="outline" className={`text-xs capitalize mt-1 ${getStatusClass(b.status)}`}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet availability */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold text-lg">Fleet Status</h2>
            <Link href="/admin/cars" className="text-sm text-primary hover:underline font-medium">Manage</Link>
          </div>
          <div className="p-6 space-y-4">
            {cLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-bold text-green-600">{available}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: cars?.length ? `${(available / cars.length) * 100}%` : "0%" }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unavailable</span>
                  <span className="font-bold text-muted-foreground">{(cars?.length ?? 0) - available}</span>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  {cars?.slice(0, 5).map((car) => (
                    <div key={car.id} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{car.brand} {car.model}</span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${car.available ? "bg-green-500/10 text-green-600 border-none" : "bg-muted text-muted-foreground border-none"}`}>
                        {car.available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))}
                  {(cars?.length ?? 0) > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{(cars?.length ?? 0) - 5} more</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
