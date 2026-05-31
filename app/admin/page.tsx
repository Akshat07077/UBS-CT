"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { formatINR, type CarData } from "@/components/car-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Car, ListOrdered, IndianRupee, Users, TrendingUp, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
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

interface LeadRow {
  id: string;
  type: string;
  status: string;
  name: string;
  subject: string | null;
  createdAt: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-start gap-3 min-w-0 overflow-hidden">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-display font-extrabold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{sub}</p>}
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
  const { data: contactLeads, isLoading: lLoading } = useQuery<LeadRow[]>({
    queryKey: ["admin-leads", "contact", "all", "", "", ""],
    queryFn: () => apiFetch<LeadRow[]>("/api/admin/leads?type=contact"),
  });

  const totalRevenue = bookings?.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.totalPrice), 0) ?? 0;
  const confirmed = bookings?.filter(b => b.status === "confirmed").length ?? 0;
  const pending = bookings?.filter(b => b.status === "pending").length ?? 0;
  const available = cars?.filter((c) => c.available && c.listingApprovalStatus === "approved").length ?? 0;
  const pendingListings = cars?.filter((c) => c.listingApprovalStatus === "pending").length ?? 0;
  const recentBookings = bookings?.slice(0, 6) ?? [];
  const newContactCount = contactLeads?.filter((l) => l.status === "new").length ?? 0;
  const recentContact = contactLeads?.slice(0, 5) ?? [];

  const bookingsByStatus = [
    { label: "Confirmed", count: confirmed, icon: CheckCircle2, color: "text-green-600 bg-green-500/10" },
    { label: "Pending", count: pending, icon: Clock, color: "text-yellow-600 bg-yellow-500/10" },
    { label: "Completed", count: bookings?.filter(b => b.status === "completed").length ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10" },
    { label: "Cancelled", count: bookings?.filter(b => b.status === "cancelled").length ?? 0, icon: XCircle, color: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 min-w-0 max-w-full">
      {/* Header */}
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm min-w-0">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Welcome back. Here&apos;s what&apos;s happening at {brand.name}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {bLoading || cLoading || uLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(totalRevenue)} sub="Excluding cancelled" color="bg-primary/10 text-primary" />
            <StatCard icon={ListOrdered} label="Total Bookings" value={bookings?.length ?? 0} sub={`${pending} pending`} color="bg-yellow-500/10 text-yellow-600" />
            <StatCard icon={Car} label="Vehicles in system" value={cars?.length ?? 0} sub={`${available} bookable · ${pendingListings} pending review`} color="bg-green-500/10 text-green-600" />
            <StatCard icon={Users} label="Registered Users" value={users?.length ?? 0} sub="All time" color="bg-blue-500/10 text-blue-600" />
          </>
        )}
      </div>

      {/* Booking status breakdown */}
      <div className="grid grid-cols-2 min-[1280px]:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {bookingsByStatus.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-display font-bold">{count}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[1280px]:grid-cols-2 min-[1536px]:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Contact messages */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              <h2 className="font-display font-bold text-base sm:text-lg truncate">Contact messages</h2>
              {newContactCount > 0 && (
                <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-600 px-2 py-0.5 rounded-full shrink-0">
                  {newContactCount} new
                </span>
              )}
            </div>
            <Link href="/admin/contact" className="text-sm text-primary hover:underline font-medium shrink-0">
              Open inbox
            </Link>
          </div>
          <div className="divide-y divide-border/50 max-h-[320px] overflow-y-auto">
            {lLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-6 py-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : recentContact.length === 0 ? (
              <p className="px-4 sm:px-6 py-8 text-center text-muted-foreground text-sm">
                No contact form messages yet.
              </p>
            ) : (
              recentContact.map((lead) => (
                <Link
                  key={lead.id}
                  href="/admin/contact"
                  className="block px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <p className="font-semibold text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lead.subject || "Contact enquiry"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(lead.createdAt), "MMM d, h:mm a")}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="min-[1280px]:col-span-2 min-[1536px]:col-span-1 min-[1536px]:order-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm min-w-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold text-base sm:text-lg">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline font-medium shrink-0">
              View all
            </Link>
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
              <div key={b.id} className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/30 transition-colors min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 font-mono text-[10px] sm:text-xs font-bold">
                  #{b.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.car?.brand} {b.car?.model}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.user?.name || b.user?.email}</p>
                </div>
                <div className="text-right shrink-0 max-w-[40%]">
                  <p className="font-bold text-xs sm:text-sm text-primary truncate">{formatINR(b.totalPrice)}</p>
                  <Badge variant="outline" className={`text-[10px] capitalize mt-1 ${getStatusClass(b.status)}`}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet availability */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm min-w-0 min-[1536px]:order-3">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border gap-2">
            <h2 className="font-display font-bold text-base sm:text-lg truncate">Fleet Status</h2>
            <Link href="/admin/cars" className="text-sm text-primary hover:underline font-medium">Manage</Link>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
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
