"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExternalLink, Filter, Inbox, MessageSquare, Search } from "lucide-react";

type LeadType = "contact" | "list_car" | "booking";
type LeadStatus = "new" | "contacted" | "closed";

interface LeadRow {
  id: string;
  source: "stored" | "legacy";
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  relatedId: number | null;
  metadata: Record<string, unknown> | null;
  adminNotes: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<LeadType, string> = {
  contact: "Contact us",
  list_car: "List your car",
  booking: "Booking",
};

const TABS: { id: LeadType | "all"; label: string }[] = [
  { id: "contact", label: "Contact" },
  { id: "list_car", label: "List car" },
  { id: "booking", label: "Bookings" },
  { id: "all", label: "All" },
];

function typeBadgeClass(type: LeadType) {
  switch (type) {
    case "contact":
      return "bg-blue-500/10 text-blue-600 border-none";
    case "list_car":
      return "bg-amber-500/10 text-amber-700 border-none";
    case "booking":
      return "bg-primary/10 text-primary border-none";
  }
}

function statusBadgeClass(status: LeadStatus) {
  switch (status) {
    case "new":
      return "bg-yellow-500/10 text-yellow-600 border-none";
    case "contacted":
      return "bg-blue-500/10 text-blue-600 border-none";
    case "closed":
      return "bg-green-500/10 text-green-600 border-none";
  }
}

function relatedLink(lead: LeadRow) {
  if (!lead.relatedId) return null;
  if (lead.type === "list_car") return `/admin/cars`;
  if (lead.type === "booking") return `/admin/bookings`;
  return null;
}

function LeadCard({
  lead,
  onStatusChange,
}: {
  lead: LeadRow;
  onStatusChange: (lead: LeadRow, status: LeadStatus) => void;
}) {
  const href = relatedLink(lead);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold truncate">{lead.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(lead.createdAt), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 capitalize text-[10px]", typeBadgeClass(lead.type))}>
          {TYPE_LABELS[lead.type]}
        </Badge>
      </div>
      {(lead.phone || lead.email) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {lead.phone && (
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="text-primary font-medium">
              {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="text-muted-foreground hover:text-primary truncate max-w-full">
              {lead.email}
            </a>
          )}
        </div>
      )}
      {lead.subject && <p className="text-sm font-semibold">{lead.subject}</p>}
      {lead.message && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{lead.message}</p>
      )}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <Badge variant="outline" className={cn("capitalize text-[10px]", statusBadgeClass(lead.status))}>
          {lead.status}
        </Badge>
        {lead.source === "stored" ? (
          <select
            className="text-xs p-1.5 rounded-lg border border-border bg-background"
            value={lead.status}
            onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        ) : href && lead.relatedId ? (
          <Link href={href} className="text-xs text-primary font-medium inline-flex items-center gap-1">
            View #{lead.relatedId} <ExternalLink className="w-3 h-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AdminInboxPanel({
  defaultTab = "contact",
  title = "Contact & Forms",
  subtitle = "Contact page messages, list-your-car requests, and booking enquiries.",
}: {
  defaultTab?: LeadType | "all";
  title?: string;
  subtitle?: string;
}) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<LeadType | "all">(defaultTab);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setTypeFilter(defaultTab);
  }, [defaultTab]);

  const queryKey = ["admin-leads", typeFilter, statusFilter, searchDebounced, dateFrom, dateTo];

  const { data: leads, isLoading } = useQuery<LeadRow[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchDebounced) params.set("q", searchDebounced);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      return apiFetch<LeadRow[]>(`/api/admin/leads${qs ? `?${qs}` : ""}`);
    },
  });

  const counts = useMemo(() => {
    const all = leads ?? [];
    return {
      total: all.length,
      new: all.filter((l) => l.status === "new").length,
      contact: all.filter((l) => l.type === "contact").length,
      listCar: all.filter((l) => l.type === "list_car").length,
      booking: all.filter((l) => l.type === "booking").length,
    };
  }, [leads]);

  const applySearch = () => setSearchDebounced(search.trim());

  const handleStatusChange = async (lead: LeadRow, status: LeadStatus) => {
    if (lead.source !== "stored") {
      toast({
        title: "Read-only entry",
        description: "Older submissions are for reference. New contact forms can be updated.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiFetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Updated" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={typeFilter === tab.id ? "default" : "outline"}
            className="rounded-full h-9 px-4 text-xs sm:text-sm"
            onClick={() => setTypeFilter(tab.id)}
          >
            {tab.label}
            {tab.id === "contact" && counts.contact > 0 && typeFilter !== "contact" && (
              <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {counts.contact}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Showing", value: counts.total },
          { label: "New", value: counts.new },
          { label: "Contact", value: counts.contact },
          { label: "List car", value: counts.listCar },
          { label: "Bookings", value: counts.booking },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-display font-bold">{isLoading ? "..." : value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="flex flex-col gap-3">
          <select
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          >
            <option value="all">All statuses</option>
            <option value="new">New only</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="h-10 rounded-xl flex-1"
            />
            <Button type="button" variant="outline" className="h-10 rounded-xl shrink-0 px-3" onClick={applySearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !leads?.length ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No submissions yet for this filter.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Contact form entries from the website appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
            ))}
          </div>

          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto luxury-scroll">
              <table className="w-full min-w-[720px] text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Date / Type</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Contact</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 min-w-[200px]">Subject &amp; message</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {leads.map((lead) => {
                    const href = relatedLink(lead);
                    return (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors align-top">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(lead.createdAt), "MMM d, yyyy · h:mm a")}
                          </div>
                          <Badge variant="outline" className={cn("mt-2 capitalize", typeBadgeClass(lead.type))}>
                            {TYPE_LABELS[lead.type]}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="font-bold">{lead.name}</div>
                          {lead.phone && (
                            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="text-xs text-primary hover:underline block mt-0.5">
                              {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="text-xs text-muted-foreground hover:text-primary block mt-0.5">
                              {lead.email}
                            </a>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 max-w-md">
                          {lead.subject && <p className="font-semibold text-sm">{lead.subject}</p>}
                          {lead.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{lead.message}</p>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <Badge variant="outline" className={cn("capitalize mb-2", statusBadgeClass(lead.status))}>
                            {lead.status}
                          </Badge>
                          {lead.source === "stored" ? (
                            <select
                              className="block text-xs p-1.5 rounded border border-border bg-background"
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </select>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Imported record</p>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          {href && lead.relatedId ? (
                            <Link href={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                              #{lead.relatedId} <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">·</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
