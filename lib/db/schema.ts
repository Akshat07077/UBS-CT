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
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
/** Guest / peer listings: admin approves before the car appears in public browse. */
export const listingApprovalEnum = pgEnum("listing_approval_status", ["approved", "pending", "rejected"]);

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
    transmission: transmissionEnum("transmission").notNull(),
    fuelType: fuelTypeEnum("fuel_type").notNull(),
    seats: integer("seats").notNull(),
    location: text("location").notNull(),
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
    withDriver: boolean("with_driver").notNull().default(false),
    driverPrice: numeric("driver_price", { precision: 10, scale: 2 }).notNull().default("0"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    /** One-time token for guest to view booking / pay without login. */
    guestAccessToken: text("guest_access_token"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    carIdx: index("bookings_car_id_idx").on(t.carId),
    userIdx: index("bookings_user_id_idx").on(t.userId),
    statusIdx: index("bookings_status_idx").on(t.status),
    datesIdx: index("bookings_dates_idx").on(t.pickupDate, t.returnDate),
    guestTokenIdx: uniqueIndex("bookings_guest_token_idx").on(t.guestAccessToken),
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
