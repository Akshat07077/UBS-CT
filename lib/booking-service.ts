import crypto from "crypto";
import { db, bookingsTable, carsTable, usersTable } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { sumDailyRates, driverDailyMidpoint } from "@/lib/rental-listing";
import { viewerOwnsCar } from "@/lib/car-response";
import { DEFAULT_PICKUP_TIME, DEFAULT_RETURN_TIME, isValidBookingTime } from "@/lib/constants/booking-times";
import type { User } from "@/lib/db/schema";
import { createLead } from "@/lib/leads";

export function formatBooking(b: typeof bookingsTable.$inferSelect) {
  return {
    ...b,
    totalPrice: Number(b.totalPrice),
    driverPrice: Number(b.driverPrice),
  };
}

export function guestTokenMatches(
  booking: typeof bookingsTable.$inferSelect,
  token: string | null | undefined
) {
  return !!booking.guestAccessToken && !!token && booking.guestAccessToken === token;
}

export async function createBooking(input: {
  carId: number;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  withDriver?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  aadharUrl?: string;
  drivingLicenseUrl?: string;
  currentUser?: User | null;
}) {
  const {
    carId,
    pickupDate,
    returnDate,
    pickupTime = DEFAULT_PICKUP_TIME,
    returnTime = DEFAULT_RETURN_TIME,
    withDriver,
    guestName,
    guestPhone,
    guestEmail,
    aadharUrl,
    drivingLicenseUrl,
    currentUser,
  } = input;

  if (!isValidBookingTime(pickupTime) || !isValidBookingTime(returnTime)) {
    throw new BookingError("Invalid pickup or return time", 400);
  }

  const isGuest = !currentUser;
  if (!aadharUrl?.trim() || !drivingLicenseUrl?.trim()) {
    throw new BookingError("Please upload your Aadhar card and driving licence", 400);
  }

  if (isGuest) {
    if (!guestName?.trim() || !guestPhone?.trim()) {
      throw new BookingError("Name and phone number are required", 400);
    }
    const phone = guestPhone.replace(/\D/g, "");
    if (phone.length < 10) throw new BookingError("Enter a valid 10-digit phone number", 400);
  }

  const pickup = new Date(pickupDate);
  const returnD = new Date(returnDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (pickup < today) throw new BookingError("Pickup date cannot be in the past", 400);
  if (returnD <= pickup) throw new BookingError("Return date must be after pickup date", 400);

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
  if (!car) throw new BookingError("Car not found", 404);
  if (car.listingApprovalStatus !== "approved") {
    throw new BookingError("This vehicle is not available for booking yet", 400);
  }
  if (!car.available) throw new BookingError("Car is not available", 400);
  if (currentUser && viewerOwnsCar(car, currentUser)) {
    throw new BookingError("You cannot book your own listing", 400);
  }

  const conflicting = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.carId, carId),
      sql`${bookingsTable.status} NOT IN ('cancelled')`,
      sql`NOT (${bookingsTable.returnDate} < ${pickupDate} OR ${bookingsTable.pickupDate} > ${returnDate})`
    )
  );
  if (conflicting.length > 0) {
    throw new BookingError("Car is already booked for the selected dates", 400);
  }

  const days = Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
  const rentalTotal = sumDailyRates(pickupDate, returnDate, Number(car.pricePerDay));
  const driverRate = driverDailyMidpoint(car.listing);
  const driverPrice = withDriver && driverRate > 0 ? days * driverRate : 0;
  const totalPrice = rentalTotal + driverPrice;

  const guestAccessToken = isGuest ? crypto.randomBytes(16).toString("hex") : null;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      userId: currentUser?.id ?? null,
      carId,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      totalPrice: String(totalPrice),
      withDriver: !!withDriver,
      driverPrice: String(driverPrice),
      status: "pending",
      guestName: isGuest ? guestName!.trim() : null,
      guestPhone: isGuest ? guestPhone!.trim() : null,
      guestEmail: guestEmail?.trim() || null,
      aadharUrl: aadharUrl.trim(),
      drivingLicenseUrl: drivingLicenseUrl.trim(),
      guestAccessToken,
    })
    .returning();

  const customerName =
    currentUser?.name?.trim() ||
    guestName?.trim() ||
    currentUser?.email ||
    "Customer";

  await createLead({
    type: "booking",
    name: customerName,
    email: guestEmail?.trim() || currentUser?.email || null,
    phone: guestPhone?.trim() || null,
    subject: `${car.brand} ${car.model} · ${pickupDate} → ${returnDate}`,
    message: `Total ₹${totalPrice}${withDriver ? " · with chauffeur" : ""}`,
    relatedId: booking.id,
    metadata: {
      carId,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      totalPrice,
      withDriver: !!withDriver,
      bookingStatus: booking.status,
    },
  });

  return {
    booking: formatBooking(booking),
    guestAccessToken,
    car,
  };
}

export class BookingError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
