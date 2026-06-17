import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CarListingJson } from "@/lib/rental-listing";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const transmissionEnum = pgEnum("transmission", ["manual", "automatic"]);
export const fuelTypeEnum = pgEnum("fuel_type", ["petrol", "diesel", "electric", "hybrid"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "cancelled", "completed"]);
/** Pickup collateral: leave bike/scooty OR pay refundable cash deposit. */
export const collateralTypeEnum = pgEnum("collateral_type", ["bike_scooty", "cash_refundable"]);
/** website = blocks public availability; manual = admin-only calendar entry (offline booking). */
export const bookingSourceEnum = pgEnum("booking_source", ["website", "manual"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
/** Guest / peer listings: admin approves before the car appears in public browse. */
export const listingApprovalEnum = pgEnum("listing_approval_status", ["approved", "pending", "rejected"]);
export const leadTypeEnum = pgEnum("lead_type", ["contact", "list_car", "booking"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "closed"]);

/** Key-value site configuration (booking payments, etc.). */
export const siteSettingsTable = pgTable(
  "site_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    password: text("password").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export const carsTable = pgTable(
  "cars",
  {
    id: serial("id").primaryKey(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
    pricePerHour: numeric("price_per_hour", { precision: 10, scale: 2 }).notNull(),
    transmission: transmissionEnum("transmission").notNull(),
    fuelType: fuelTypeEnum("fuel_type").notNull(),
    seats: integer("seats").notNull(),
    location: text("location").notNull(),
    /** Specific pickup point shown to renters (e.g. airport, hotel, address). */
    pickupLocation: text("pickup_location"),
    /** Drop-off point; if empty, pickup location is used in the UI. */
    dropLocation: text("drop_location"),
    description: text("description"),
    imageUrl: text("image_url"),
    /** Marketplace-style extras: supplier, tags, trip slabs, deposits (see `lib/rental-listing.ts`). */
    listing: jsonb("listing").$type<CarListingJson | null>(),
    available: boolean("available").notNull().default(true),
    /** When set, this vehicle is listed by a user (peer / host); null = company fleet. */
    hostUserId: integer("host_user_id").references(() => usersTable.id),
    listingApprovalStatus: listingApprovalEnum("listing_approval_status").notNull().default("approved"),
    /** Filled for guest listing requests (no account); used for admin contact and dashboard match. */
    ownerName: text("owner_name"),
    ownerEmail: text("owner_email"),
    ownerPhone: text("owner_phone"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    locationIdx: index("cars_location_idx").on(t.location),
    availableIdx: index("cars_available_idx").on(t.available),
    approvalIdx: index("cars_approval_idx").on(t.listingApprovalStatus),
    hostIdx: index("cars_host_user_idx").on(t.hostUserId),
  })
);

/** Gallery images for a vehicle (ordered). `cars.image_url` remains the legacy cover / first image. */
export const carImagesTable = pgTable(
  "car_images",
  {
    id: serial("id").primaryKey(),
    carId: integer("car_id")
      .notNull()
      .references(() => carsTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    carIdx: index("car_images_car_id_idx").on(t.carId),
  })
);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    /** Null for guest checkout (no account). */
    userId: integer("user_id").references(() => usersTable.id),
    carId: integer("car_id").notNull().references(() => carsTable.id),
    pickupDate: date("pickup_date").notNull(),
    returnDate: date("return_date").notNull(),
    pickupTime: text("pickup_time").notNull().default("10:00"),
    returnTime: text("return_time").notNull().default("10:00"),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
    /** Amount due online now (advance); remainder paid at pickup. */
    advanceAmount: numeric("advance_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    /** Refundable deposit amount (₹) when collateral is cash; 0 for bike/scooty. */
    securityDepositAmount: numeric("security_deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    collateralType: collateralTypeEnum("collateral_type"),
    /** Bike/scooty model or reg when collateral is two-wheeler. */
    collateralDetail: text("collateral_detail"),
    withDriver: boolean("with_driver").notNull().default(false),
    driverPrice: numeric("driver_price", { precision: 10, scale: 2 }).notNull().default("0"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    source: bookingSourceEnum("source").notNull().default("website"),
    adminNotes: text("admin_notes"),
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    aadharUrl: text("aadhar_url"),
    drivingLicenseUrl: text("driving_license_url"),
    /** One-time token for guest to view booking / pay without login. */
    guestAccessToken: text("guest_access_token"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    carIdx: index("bookings_car_id_idx").on(t.carId),
    userIdx: index("bookings_user_id_idx").on(t.userId),
    statusIdx: index("bookings_status_idx").on(t.status),
    sourceIdx: index("bookings_source_idx").on(t.source),
    datesIdx: index("bookings_dates_idx").on(t.pickupDate, t.returnDate),
    guestTokenIdx: uniqueIndex("bookings_guest_token_idx").on(t.guestAccessToken),
  })
);

/** Contact form, list-your-car, and booking enquiries for admin CRM. */
export const leadsTable = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    type: leadTypeEnum("type").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message"),
    /** Linked car id (list_car) or booking id (booking). */
    relatedId: integer("related_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("leads_type_idx").on(t.type),
    statusIdx: index("leads_status_idx").on(t.status),
    createdIdx: index("leads_created_at_idx").on(t.createdAt),
    relatedIdx: index("leads_related_id_idx").on(t.relatedId),
  })
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    bookingIdx: index("payments_booking_id_idx").on(t.bookingId),
    statusIdx: index("payments_status_idx").on(t.paymentStatus),
    stripeSessionIdx: uniqueIndex("payments_stripe_session_idx").on(t.stripeSessionId),
  })
);

export type User = typeof usersTable.$inferSelect;
export type Car = typeof carsTable.$inferSelect;
export type CarImage = typeof carImagesTable.$inferSelect;
export type Booking = typeof bookingsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type Lead = typeof leadsTable.$inferSelect;
export type LeadType = (typeof leadTypeEnum.enumValues)[number];
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type BookingSource = (typeof bookingSourceEnum.enumValues)[number];
