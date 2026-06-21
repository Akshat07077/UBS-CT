import crypto from "crypto";
import { db, bookingsTable, carsTable, paymentsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { computeRentalTotal, driverDailyMidpoint, defaultHourlyFromDaily } from "@/lib/rental-listing";
import { viewerOwnsCar } from "@/lib/car-response";
import { DEFAULT_PICKUP_TIME, DEFAULT_RETURN_TIME, isValidBookingTime, validateBookingSchedule } from "@/lib/constants/booking-times";
import { cancelGuestPendingOverlaps, countWebsiteBookingConflicts } from "@/lib/booking-availability";
import type { User } from "@/lib/db/schema";
import { createLead } from "@/lib/leads";
import {
  computeBookingPaymentQuote,
  securityDepositForCollateral,
} from "@/lib/booking-payment-settings";
import { getBookingPaymentSettings, getPricingOfferSettings, getPricingUpliftSettings } from "@/lib/db/site-settings";
import { applyPricingOffer } from "@/lib/pricing-offer-settings";
import type { CollateralType } from "@/lib/constants/collateral";

export function formatBooking(b: typeof bookingsTable.$inferSelect) {
  const totalPrice = Number(b.totalPrice);
  const advanceAmount = Number(b.advanceAmount);
  return {
    ...b,
    totalPrice,
    driverPrice: Number(b.driverPrice),
    advanceAmount,
    securityDepositAmount: Number(b.securityDepositAmount),
    balanceDue: Math.max(0, totalPrice - advanceAmount),
    collateralType: b.collateralType ?? null,
    collateralDetail: b.collateralDetail ?? null,
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
  paymentScreenshotUrl?: string;
  collateralType?: CollateralType;
  collateralDetail?: string;
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
    paymentScreenshotUrl,
    collateralType,
    collateralDetail,
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

  const scheduleError = validateBookingSchedule(pickupDate, pickupTime, returnDate, returnTime);
  if (scheduleError) throw new BookingError(scheduleError, 400);

  const pickup = new Date(pickupDate + "T12:00:00");
  const returnD = new Date(returnDate + "T12:00:00");
  if (returnD < pickup) throw new BookingError("Return date must be on or after pickup date", 400);

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
  if (!car) throw new BookingError("Car not found", 404);
  if (car.listingApprovalStatus !== "approved") {
    throw new BookingError("This vehicle is not available for booking yet", 400);
  }
  if (!car.available) throw new BookingError("Car is not available", 400);
  if (currentUser && viewerOwnsCar(car, currentUser)) {
    throw new BookingError("You cannot book your own listing", 400);
  }

  await cancelGuestPendingOverlaps(db, carId, pickupDate, returnDate, {
    userId: currentUser?.id,
    guestPhone: isGuest ? guestPhone : currentUser ? guestPhone : null,
  });

  const conflictCount = await countWebsiteBookingConflicts(db, carId, pickupDate, returnDate);
  if (conflictCount > 0) {
    throw new BookingError("Car is already booked for the selected dates", 400);
  }

  const days = Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
  const pricingUplift = await getPricingUpliftSettings();
  const pricePerHour =
    car.pricePerHour != null && car.pricePerHour !== ""
      ? Number(car.pricePerHour)
      : defaultHourlyFromDaily(Number(car.pricePerDay));
  const rentalSubtotal = computeRentalTotal(
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    Number(car.pricePerDay),
    pricePerHour,
    pricingUplift
  );
  const pricingOffer = await getPricingOfferSettings();
  const rentalTotal = applyPricingOffer(rentalSubtotal, pricingOffer);
  const driverRate = driverDailyMidpoint(car.listing);
  const driverPrice = withDriver && driverRate > 0 ? days * driverRate : 0;
  const paymentSettings = await getBookingPaymentSettings();
  const paymentQuote = computeBookingPaymentQuote(
    paymentSettings,
    car.listing,
    rentalTotal,
    driverPrice
  );
  const totalPrice = paymentQuote.totalPrice;
  const payNow =
    paymentQuote.advanceEnabled && paymentQuote.advanceAmount > 0
      ? paymentQuote.advanceAmount
      : totalPrice;

  if (paymentQuote.collateralRequired) {
    if (collateralType !== "bike_scooty" && collateralType !== "cash_refundable") {
      throw new BookingError("Please choose bike/scooty deposit or cash refundable deposit", 400);
    }
    if (collateralType === "bike_scooty" && !collateralDetail?.trim()) {
      throw new BookingError("Please enter your bike or scooty details (model and registration)", 400);
    }
  }

  const securityDepositAmount = collateralType
    ? securityDepositForCollateral(collateralType, paymentQuote.cashRefundableAmountInr)
    : 0;

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
      advanceAmount: String(payNow),
      securityDepositAmount: String(securityDepositAmount),
      collateralType: collateralType ?? null,
      collateralDetail: collateralType === "bike_scooty" ? collateralDetail?.trim() || null : null,
      withDriver: !!withDriver,
      driverPrice: String(driverPrice),
      status: "pending",
      guestName: isGuest ? guestName!.trim() : null,
      guestPhone: isGuest ? guestPhone!.trim() : null,
      guestEmail: guestEmail?.trim() || null,
      aadharUrl: aadharUrl.trim(),
      drivingLicenseUrl: drivingLicenseUrl.trim(),
      paymentScreenshotUrl: paymentScreenshotUrl?.trim() || null,
      guestAccessToken,
      source: "website",
    })
    .returning();

  if (paymentScreenshotUrl?.trim()) {
    await db.insert(paymentsTable).values({
      bookingId: booking.id,
      amount: String(payNow),
      paymentStatus: "pending",
      stripeSessionId: "qr",
    });
  }

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
      advanceAmount: payNow,
      collateralType,
      securityDepositAmount,
      withDriver: !!withDriver,
      bookingStatus: booking.status,
    },
  });

  return {
    booking: formatBooking(booking),
    paymentQuote,
    guestAccessToken,
    car,
  };
}

/** Admin: offline / phone / walk-in booking — shown on calendar only, does not block website dates. */
export async function createManualBooking(input: {
  carId: number;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  totalPrice?: number;
  withDriver?: boolean;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  adminNotes?: string;
}) {
  const {
    carId,
    pickupDate,
    returnDate,
    pickupTime = DEFAULT_PICKUP_TIME,
    returnTime = DEFAULT_RETURN_TIME,
    guestName,
    guestPhone,
    guestEmail,
    totalPrice: totalOverride,
    withDriver,
    status = "confirmed",
    adminNotes,
  } = input;

  if (!guestName?.trim()) throw new BookingError("Customer name is required", 400);
  if (!isValidBookingTime(pickupTime) || !isValidBookingTime(returnTime)) {
    throw new BookingError("Invalid pickup or return time", 400);
  }

  const scheduleError = validateBookingSchedule(pickupDate, pickupTime, returnDate, returnTime);
  if (scheduleError) throw new BookingError(scheduleError, 400);

  const pickup = new Date(pickupDate + "T12:00:00");
  const returnD = new Date(returnDate + "T12:00:00");

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
  if (!car) throw new BookingError("Car not found", 404);

  const days = Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
  const pricingUplift = await getPricingUpliftSettings();
  const pricePerHour =
    car.pricePerHour != null && car.pricePerHour !== ""
      ? Number(car.pricePerHour)
      : defaultHourlyFromDaily(Number(car.pricePerDay));
  const rentalSubtotal = computeRentalTotal(
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    Number(car.pricePerDay),
    pricePerHour,
    pricingUplift
  );
  const pricingOffer = await getPricingOfferSettings();
  const rentalTotal = applyPricingOffer(rentalSubtotal, pricingOffer);
  const driverRate = driverDailyMidpoint(car.listing);
  const driverPrice = withDriver && driverRate > 0 ? days * driverRate : 0;
  const totalPrice =
    totalOverride != null && Number.isFinite(totalOverride) ? totalOverride : rentalTotal + driverPrice;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      userId: null,
      carId,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      totalPrice: String(totalPrice),
      withDriver: !!withDriver,
      driverPrice: String(driverPrice),
      status,
      source: "manual",
      adminNotes: adminNotes?.trim() || null,
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || null,
      guestEmail: guestEmail?.trim() || null,
      aadharUrl: null,
      drivingLicenseUrl: null,
      guestAccessToken: null,
    })
    .returning();

  return formatBooking(booking);
}

export class BookingError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
