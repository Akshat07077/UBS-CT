import { db, bookingsTable, carsTable, usersTable } from "@/lib/db";
import { desc, eq, inArray } from "drizzle-orm";
import { formatAdminCar } from "@/lib/car-response";
import { formatBooking } from "@/lib/booking-service";
import { getGalleryUrlsByCarIds } from "@/lib/db/car-images";
import { phoneDigits, phonesMatch } from "@/lib/phone-match";
import type { User } from "@/lib/db/schema";

export type MyBookingRow = ReturnType<typeof formatBooking> & {
  car?: {
    brand: string;
    model: string;
    imageUrl: string | null;
    location?: string;
    pricePerDay?: number;
  };
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestAccessToken?: string | null;
};

function formatBookingRow(row: {
  booking: typeof bookingsTable.$inferSelect;
  car: typeof carsTable.$inferSelect | null;
}) {
  return {
    ...formatBooking(row.booking),
    car: row.car
      ? {
          brand: row.car.brand,
          model: row.car.model,
          imageUrl: row.car.imageUrl,
          location: row.car.location,
          pricePerDay: Number(row.car.pricePerDay),
        }
      : undefined,
    guestName: row.booking.guestName,
    guestPhone: row.booking.guestPhone,
    guestEmail: row.booking.guestEmail,
    guestAccessToken: row.booking.guestAccessToken,
  };
}

function bookingMatchesPhone(
  booking: typeof bookingsTable.$inferSelect,
  phone: string
) {
  return phonesMatch(booking.guestPhone, phone);
}

function carOwnedByUser(car: typeof carsTable.$inferSelect, user: User) {
  const email = user.email.toLowerCase();
  return (
    car.hostUserId === user.id ||
    (car.ownerEmail != null && car.ownerEmail.toLowerCase() === email)
  );
}

function carOwnedByPhone(car: typeof carsTable.$inferSelect, phone: string) {
  return phonesMatch(car.ownerPhone, phone);
}

export async function getMyBookings(user: User | null, phone: string | null): Promise<MyBookingRow[]> {
  const all = await db
    .select({ booking: bookingsTable, car: carsTable })
    .from(bookingsTable)
    .leftJoin(carsTable, eq(bookingsTable.carId, carsTable.id))
    .orderBy(desc(bookingsTable.createdAt));

  if (user) {
    const email = user.email.toLowerCase();
    return all
      .filter(
        (r) =>
          r.booking.userId === user.id ||
          (r.booking.guestEmail != null && r.booking.guestEmail.toLowerCase() === email) ||
          (phone && bookingMatchesPhone(r.booking, phone))
      )
      .map(formatBookingRow);
  }

  if (!phone) return [];
  return all.filter((r) => bookingMatchesPhone(r.booking, phone)).map(formatBookingRow);
}

export async function getMyListings(user: User | null, phone: string | null) {
  const cars = await db.select().from(carsTable).orderBy(desc(carsTable.createdAt));

  const mine = cars.filter((c) => {
    if (user && carOwnedByUser(c, user)) return true;
    if (phone && carOwnedByPhone(c, phone)) return true;
    return false;
  });

  const ids = mine.map((c) => c.id);
  const galleryMap = await getGalleryUrlsByCarIds(ids);
  return mine.map((c) => formatAdminCar(c, user ?? undefined, galleryMap.get(c.id) ?? null));
}

export async function getHostBookings(user: User | null, phone: string | null): Promise<MyBookingRow[]> {
  const cars = await db.select().from(carsTable);
  const ownedCarIds = cars
    .filter((c) => {
      if (user && carOwnedByUser(c, user)) return true;
      if (phone && carOwnedByPhone(c, phone)) return true;
      return false;
    })
    .map((c) => c.id);

  if (ownedCarIds.length === 0) return [];

  const rows = await db
    .select({ booking: bookingsTable, car: carsTable })
    .from(bookingsTable)
    .leftJoin(carsTable, eq(bookingsTable.carId, carsTable.id))
    .where(inArray(bookingsTable.carId, ownedCarIds))
    .orderBy(desc(bookingsTable.createdAt));

  return rows.map(formatBookingRow);
}

export function normalizeLookupPhone(input: string): string {
  return phoneDigits(input);
}
