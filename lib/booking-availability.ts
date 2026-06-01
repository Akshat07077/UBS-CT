import { bookingsTable } from "@/lib/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

/** Only website bookings block dates on the public car page. */
export const blocksPublicAvailability = sql`${bookingsTable.source} = 'website'`;

/** Paid / active rentals block new website bookings. Pending checkout does not. */
export const websiteBlockingStatuses = sql`${bookingsTable.status} IN ('confirmed', 'completed')`;

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
    blocksPublicAvailability,
    websiteBlockingStatuses,
    bookingDateOverlap(pickupDate, returnDate)
  );
}

/** Cancel abandoned pending website bookings so the same customer can retry checkout. */
export function guestPendingReleaseConditions(
  carId: number,
  pickupDate: string,
  returnDate: string,
  opts: { userId?: number | null; guestPhone?: string | null }
) {
  const guestMatch =
    opts.userId != null && opts.guestPhone?.trim()
      ? or(eq(bookingsTable.userId, opts.userId), eq(bookingsTable.guestPhone, opts.guestPhone.trim()))
      : opts.userId != null
        ? eq(bookingsTable.userId, opts.userId)
        : opts.guestPhone?.trim()
          ? eq(bookingsTable.guestPhone, opts.guestPhone.trim())
          : null;

  if (!guestMatch) return null;

  return and(
    eq(bookingsTable.carId, carId),
    eq(bookingsTable.status, "pending"),
    blocksPublicAvailability,
    bookingDateOverlap(pickupDate, returnDate),
    guestMatch
  );
}

/** True if date string YYYY-MM-DD falls within booking range (inclusive). */
export function dateInBookingRange(day: string, pickupDate: string, returnDate: string) {
  return day >= pickupDate && day <= returnDate;
}

type SqlDb = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: { count: string }[] }> };

/**
 * Count overlapping website bookings using only core columns.
 * Works even when optional columns (collateral, advance) are not migrated yet.
 */
export async function countWebsiteBookingConflicts(
  db: SqlDb,
  carId: number,
  pickupDate: string,
  returnDate: string
): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COUNT(*)::text AS count
    FROM bookings
    WHERE car_id = ${carId}
      AND source = 'website'
      AND status IN ('confirmed', 'completed')
      AND NOT (return_date < ${pickupDate}::date OR pickup_date > ${returnDate}::date)
  `);
  const first = rows.rows[0];
  return Number(first?.count ?? 0);
}

/** Cancel the current guest's abandoned pending bookings for the same car/dates. */
export async function cancelGuestPendingOverlaps(
  db: SqlDb,
  carId: number,
  pickupDate: string,
  returnDate: string,
  opts: { userId?: number | null; guestPhone?: string | null }
): Promise<void> {
  const phone = opts.guestPhone?.trim();
  if (opts.userId == null && !phone) return;

  if (opts.userId != null && phone) {
    await db.execute(sql`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE car_id = ${carId}
        AND status = 'pending'
        AND source = 'website'
        AND NOT (return_date < ${pickupDate}::date OR pickup_date > ${returnDate}::date)
        AND (user_id = ${opts.userId} OR guest_phone = ${phone})
    `);
    return;
  }

  if (opts.userId != null) {
    await db.execute(sql`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE car_id = ${carId}
        AND status = 'pending'
        AND source = 'website'
        AND NOT (return_date < ${pickupDate}::date OR pickup_date > ${returnDate}::date)
        AND user_id = ${opts.userId}
    `);
    return;
  }

  await db.execute(sql`
    UPDATE bookings
    SET status = 'cancelled'
    WHERE car_id = ${carId}
      AND status = 'pending'
      AND source = 'website'
      AND NOT (return_date < ${pickupDate}::date OR pickup_date > ${returnDate}::date)
      AND guest_phone = ${phone!}
  `);
}
