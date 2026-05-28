import { db, leadsTable, carsTable, bookingsTable } from "@/lib/db";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { LeadStatus, LeadType } from "@/lib/db/schema";

export type LeadRow = {
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
};

function formatLead(l: typeof leadsTable.$inferSelect): LeadRow {
  return {
    id: `lead-${l.id}`,
    source: "stored",
    type: l.type,
    status: l.status,
    name: l.name,
    email: l.email,
    phone: l.phone,
    subject: l.subject,
    message: l.message,
    relatedId: l.relatedId,
    metadata: l.metadata,
    adminNotes: l.adminNotes,
    createdAt: l.createdAt.toISOString(),
  };
}

export async function createLead(input: {
  type: LeadType;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  relatedId?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [row] = await db
    .insert(leadsTable)
    .values({
      type: input.type,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      subject: input.subject?.trim() || null,
      message: input.message?.trim() || null,
      relatedId: input.relatedId ?? null,
      metadata: input.metadata ?? null,
    })
    .returning();
  return row;
}

function listingStatusToLeadStatus(approval: string): LeadStatus {
  if (approval === "pending") return "new";
  if (approval === "approved") return "closed";
  return "contacted";
}

function bookingStatusToLeadStatus(status: string): LeadStatus {
  if (status === "pending") return "new";
  if (status === "confirmed" || status === "completed") return "closed";
  return "contacted";
}

export async function listLeadsForAdmin(filters: {
  type?: LeadType | "all";
  status?: LeadStatus | "all";
  q?: string;
  from?: string;
  to?: string;
}): Promise<LeadRow[]> {
  const conditions = [];

  if (filters.type && filters.type !== "all") {
    conditions.push(eq(leadsTable.type, filters.type));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(leadsTable.status, filters.status));
  }
  if (filters.from) {
    conditions.push(gte(leadsTable.createdAt, new Date(filters.from)));
  }
  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(leadsTable.createdAt, end));
  }
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(leadsTable.name, term),
        ilike(leadsTable.email, term),
        ilike(leadsTable.phone, term),
        ilike(leadsTable.subject, term),
        ilike(leadsTable.message, term)
      )!
    );
  }

  const stored = await db
    .select()
    .from(leadsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leadsTable.createdAt));

  const storedIds = new Set(
    stored.filter((l) => l.relatedId != null).map((l) => `${l.type}:${l.relatedId}`)
  );

  const rows: LeadRow[] = stored.map(formatLead);

  // Backfill guest listing requests not yet in leads table
  const guestCars = await db
    .select()
    .from(carsTable)
    .where(sql`${carsTable.ownerEmail} IS NOT NULL`)
    .orderBy(desc(carsTable.createdAt));

  for (const car of guestCars) {
    const key = `list_car:${car.id}`;
    if (storedIds.has(key)) continue;
    if (filters.type && filters.type !== "all" && filters.type !== "list_car") continue;

    const status = listingStatusToLeadStatus(car.listingApprovalStatus);
    if (filters.status && filters.status !== "all" && filters.status !== status) continue;

    const createdAt = car.createdAt.toISOString();
    if (filters.from && createdAt < new Date(filters.from).toISOString()) continue;
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      if (createdAt > end.toISOString()) continue;
    }

    const haystack = [car.ownerName, car.ownerEmail, car.ownerPhone, car.brand, car.model, car.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (filters.q?.trim() && !haystack.includes(filters.q.trim().toLowerCase())) continue;

    rows.push({
      id: `car-${car.id}`,
      source: "legacy",
      type: "list_car",
      status,
      name: car.ownerName || "Host",
      email: car.ownerEmail,
      phone: car.ownerPhone,
      subject: `${car.brand} ${car.model} · ${car.location}`,
      message: car.description,
      relatedId: car.id,
      metadata: {
        year: car.year,
        pricePerDay: Number(car.pricePerDay),
        listingApprovalStatus: car.listingApprovalStatus,
      },
      adminNotes: null,
      createdAt,
    });
  }

  // Backfill bookings not yet in leads table
  const allBookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));
  const allCars = await db.select().from(carsTable);
  const carById = new Map(allCars.map((c) => [c.id, c]));

  for (const b of allBookings) {
    const key = `booking:${b.id}`;
    if (storedIds.has(key)) continue;
    if (filters.type && filters.type !== "all" && filters.type !== "booking") continue;

    const status = bookingStatusToLeadStatus(b.status);
    if (filters.status && filters.status !== "all" && filters.status !== status) continue;

    const createdAt = b.createdAt.toISOString();
    if (filters.from && createdAt < new Date(filters.from).toISOString()) continue;
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      if (createdAt > end.toISOString()) continue;
    }

    const car = carById.get(b.carId);
    const displayName = b.guestName || (b.userId ? `User #${b.userId}` : "Customer");
    const haystack = [displayName, b.guestPhone, b.guestEmail, car?.brand, car?.model]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (filters.q?.trim() && !haystack.includes(filters.q.trim().toLowerCase())) continue;

    rows.push({
      id: `booking-${b.id}`,
      source: "legacy",
      type: "booking",
      status,
      name: displayName,
      email: b.guestEmail,
      phone: b.guestPhone,
      subject: car ? `Booking · ${car.brand} ${car.model}` : `Booking #${b.id}`,
      message: `Pickup ${b.pickupDate} · Return ${b.returnDate} · ₹${Number(b.totalPrice)}`,
      relatedId: b.id,
      metadata: {
        carId: b.carId,
        bookingStatus: b.status,
        pickupDate: b.pickupDate,
        returnDate: b.returnDate,
        withDriver: b.withDriver,
      },
      adminNotes: null,
      createdAt,
    });
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows;
}

export async function updateLeadStatus(
  leadId: number,
  patch: { status?: LeadStatus; adminNotes?: string | null }
) {
  const [row] = await db
    .update(leadsTable)
    .set({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.adminNotes !== undefined ? { adminNotes: patch.adminNotes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(leadsTable.id, leadId))
    .returning();
  return row;
}
