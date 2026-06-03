import { db, bookingsTable, carsTable, usersTable, leadsTable, paymentsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rowsToCsv } from "@/lib/csv";
import { listLeadsForAdmin } from "@/lib/leads";
import type { ExportDataset } from "@/lib/admin/export-datasets";

export type { ExportDataset } from "@/lib/admin/export-datasets";

export async function buildExportCsv(dataset: ExportDataset): Promise<string> {
  switch (dataset) {
    case "bookings":
      return buildBookingsCsv();
    case "cars":
      return buildCarsCsv();
    case "users":
      return buildUsersCsv();
    case "leads":
      return buildLeadsCsv("all");
    case "contact":
      return buildLeadsCsv("contact");
    case "payments":
      return buildPaymentsCsv();
    default:
      throw new Error("Unknown dataset");
  }
}

async function buildBookingsCsv(): Promise<string> {
  const rows = await db
    .select({ booking: bookingsTable, car: carsTable, user: usersTable })
    .from(bookingsTable)
    .leftJoin(carsTable, eq(bookingsTable.carId, carsTable.id))
    .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id));

  const headers = [
    "id",
    "status",
    "source",
    "car_id",
    "car",
    "pickup_date",
    "return_date",
    "pickup_time",
    "return_time",
    "total_price_inr",
    "advance_inr",
    "security_deposit_inr",
    "collateral_type",
    "collateral_detail",
    "with_driver",
    "driver_price_inr",
    "user_id",
    "user_name",
    "user_email",
    "guest_name",
    "guest_phone",
    "guest_email",
    "aadhar_url",
    "driving_license_url",
    "admin_notes",
    "created_at",
  ];

  const data = rows.map(({ booking: b, car, user }) => [
    b.id,
    b.status,
    b.source,
    b.carId,
    car ? `${car.brand} ${car.model}` : "",
    b.pickupDate,
    b.returnDate,
    b.pickupTime,
    b.returnTime,
    b.totalPrice,
    b.advanceAmount,
    b.securityDepositAmount,
    b.collateralType ?? "",
    b.collateralDetail ?? "",
    b.withDriver ? "yes" : "no",
    b.driverPrice,
    b.userId ?? "",
    user?.name ?? "",
    user?.email ?? "",
    b.guestName ?? "",
    b.guestPhone ?? "",
    b.guestEmail ?? "",
    b.aadharUrl ?? "",
    b.drivingLicenseUrl ?? "",
    b.adminNotes ?? "",
    b.createdAt.toISOString(),
  ]);

  return rowsToCsv([headers, ...data]);
}

async function buildCarsCsv(): Promise<string> {
  const cars = await db.select().from(carsTable);

  const headers = [
    "id",
    "brand",
    "model",
    "year",
    "price_per_day_inr",
    "price_per_hour_inr",
    "transmission",
    "fuel_type",
    "seats",
    "location",
    "available",
    "listing_approval",
    "host_user_id",
    "owner_name",
    "owner_email",
    "owner_phone",
    "description",
    "image_url",
    "listing_json",
    "created_at",
  ];

  const data = cars.map((c) => [
    c.id,
    c.brand,
    c.model,
    c.year,
    c.pricePerDay,
    c.pricePerHour,
    c.transmission,
    c.fuelType,
    c.seats,
    c.location,
    c.available ? "yes" : "no",
    c.listingApprovalStatus,
    c.hostUserId ?? "",
    c.ownerName ?? "",
    c.ownerEmail ?? "",
    c.ownerPhone ?? "",
    c.description ?? "",
    c.imageUrl ?? "",
    c.listing ? JSON.stringify(c.listing) : "",
    c.createdAt.toISOString(),
  ]);

  return rowsToCsv([headers, ...data]);
}

async function buildUsersCsv(): Promise<string> {
  const users = await db.select().from(usersTable);

  const headers = ["id", "name", "email", "role", "created_at"];
  const data = users.map((u) => [u.id, u.name ?? "", u.email, u.role, u.createdAt.toISOString()]);

  return rowsToCsv([headers, ...data]);
}

async function buildLeadsCsv(type: "all" | "contact"): Promise<string> {
  const rows = await listLeadsForAdmin({
    type: type === "contact" ? "contact" : "all",
    status: "all",
  });

  const headers = [
    "id",
    "source",
    "type",
    "status",
    "name",
    "email",
    "phone",
    "subject",
    "message",
    "related_id",
    "metadata_json",
    "admin_notes",
    "created_at",
  ];

  const data = rows.map((l) => [
    l.id,
    l.source,
    l.type,
    l.status,
    l.name,
    l.email ?? "",
    l.phone ?? "",
    l.subject ?? "",
    l.message ?? "",
    l.relatedId ?? "",
    l.metadata ? JSON.stringify(l.metadata) : "",
    l.adminNotes ?? "",
    l.createdAt,
  ]);

  return rowsToCsv([headers, ...data]);
}

async function buildPaymentsCsv(): Promise<string> {
  const rows = await db.select().from(paymentsTable);

  const headers = [
    "id",
    "booking_id",
    "amount_inr",
    "payment_status",
    "stripe_session_id",
    "created_at",
  ];

  const data = rows.map((p) => [
    p.id,
    p.bookingId,
    p.amount,
    p.paymentStatus,
    p.stripeSessionId ?? "",
    p.createdAt.toISOString(),
  ]);

  return rowsToCsv([headers, ...data]);
}
