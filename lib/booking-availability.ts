import { bookingsTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

/** Only website bookings block dates on the public car page. */
export const blocksPublicAvailability = sql`${bookingsTable.source} = 'website'`;

export function bookingDateOverlap(pickupDate: string, returnDate: string) {
  return sql`NOT (${bookingsTable.returnDate} < ${pickupDate} OR ${bookingsTable.pickupDate} > ${returnDate})`;
}

export function activeBookingStatuses() {
  return sql`${bookingsTable.status} NOT IN ('cancelled')`;
}

export function websiteAvailabilityConflictConditions(
  carId: number,
  pickupDate: string,
  returnDate: string
) {
  return and(
    eq(bookingsTable.carId, carId),
    activeBookingStatuses(),
    blocksPublicAvailability,
    bookingDateOverlap(pickupDate, returnDate)
  );
}

/** True if date string YYYY-MM-DD falls within booking range (inclusive). */
export function dateInBookingRange(day: string, pickupDate: string, returnDate: string) {
  return day >= pickupDate && day <= returnDate;
}
