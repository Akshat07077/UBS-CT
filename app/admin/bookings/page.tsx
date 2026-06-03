"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatINR } from "@/components/car-card";
import { formatBookingDateTime } from "@/lib/constants/booking-times";
import { UserCheck } from "lucide-react";

interface BookingRow {
  id: number;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice: number;
  advanceAmount?: number;
  securityDepositAmount?: number;
  collateralType?: "bike_scooty" | "cash_refundable" | null;
  collateralDetail?: string | null;
  withDriver: boolean;
  driverPrice: number;
  status: string;
  source?: "website" | "manual";
  adminNotes?: string | null;
  createdAt: string;
  car?: { brand: string; model: string };
  user?: { name: string | null; email: string };
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  aadharUrl?: string | null;
  drivingLicenseUrl?: string | null;
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

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useQuery<BookingRow[]>({
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch<BookingRow[]>("/api/bookings"),
  });

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: "Status Updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Manage Bookings</h1>
        <p className="text-muted-foreground mt-1">View and update customer reservations.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">ID / Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Vehicle & Dates</th>
                <th className="px-6 py-4">Add-ons</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-8 w-full" /></td></tr>
              ) : bookings?.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No bookings found.</td></tr>
              ) : bookings?.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-muted-foreground mb-1">#{booking.id}</div>
                    <div className="text-xs">{format(new Date(booking.createdAt), "MMM d, yyyy")}</div>
                    {booking.source === "manual" && (
                      <Badge variant="outline" className="mt-1 text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                        Offline
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">
                      {booking.user?.name || booking.guestName || "Guest"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {booking.user?.email || booking.guestPhone || booking.guestEmail || "N/A"}
                    </div>
                    {(booking.aadharUrl || booking.drivingLicenseUrl) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {booking.aadharUrl && (
                          <a href={booking.aadharUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                            Aadhar
                          </a>
                        )}
                        {booking.drivingLicenseUrl && (
                          <a href={booking.drivingLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                            Licence
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-primary">{booking.car?.brand} {booking.car?.model}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>
                        Pickup:{" "}
                        {formatBookingDateTime(booking.pickupDate, booking.pickupTime ?? "10:00")}
                      </div>
                      <div>
                        Return:{" "}
                        {formatBookingDateTime(booking.returnDate, booking.returnTime ?? "10:00")}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {booking.withDriver ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        <UserCheck className="w-3.5 h-3.5" /> Chauffeur
                        <span className="text-muted-foreground font-normal">+{formatINR(booking.driverPrice)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Self-drive</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{formatINR(booking.totalPrice)}</div>
                    {booking.advanceAmount != null && booking.advanceAmount > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Advance: {formatINR(booking.advanceAmount)}
                      </div>
                    )}
                    {booking.collateralType && (
                      <div className="text-[10px] text-primary mt-1 capitalize">
                        {booking.collateralType === "bike_scooty"
                          ? `Bike/scooty${booking.collateralDetail ? `: ${booking.collateralDetail}` : ""}`
                          : `Cash deposit ${formatINR(booking.securityDepositAmount ?? 20000)}`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <Badge variant="outline" className={`capitalize ${getStatusClass(booking.status)}`}>
                        {booking.status}
                      </Badge>
                      <select
                        className="text-xs p-1 rounded border border-border bg-background focus:outline-none focus:border-primary"
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                      >
                        <option value="pending">Set Pending</option>
                        <option value="confirmed">Set Confirmed</option>
                        <option value="completed">Set Completed</option>
                        <option value="cancelled">Set Cancelled</option>
                      </select>
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
