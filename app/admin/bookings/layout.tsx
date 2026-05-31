"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, ListOrdered } from "lucide-react";

export default function AdminBookingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCalendar = pathname.startsWith("/admin/bookings/calendar");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 p-1 bg-muted/40 rounded-xl border border-border/50 w-full sm:w-fit">
        <Link
          href="/admin/bookings"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            !isCalendar ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListOrdered className="w-4 h-4" /> List
        </Link>
        <Link
          href="/admin/bookings/calendar"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            isCalendar ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="w-4 h-4" /> Calendar
        </Link>
      </div>
      {children}
    </div>
  );
}
