import { NextRequest, NextResponse } from "next/server";
import { db, bookingsTable, carsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession, formatUser } from "@/lib/auth";
import { formatBooking, createBooking, BookingError } from "@/lib/booking-service";

function formatRow(row: {
  booking: typeof bookingsTable.$inferSelect;
  car: typeof carsTable.$inferSelect | null;
  user: typeof usersTable.$inferSelect | null;
}) {
  return {
    ...formatBooking(row.booking),
    car: row.car
      ? {
          id: row.car.id,
          brand: row.car.brand,
          model: row.car.model,
          imageUrl: row.car.imageUrl,
          pricePerDay: Number(row.car.pricePerDay),
          listing: row.car.listing ?? null,
          hostUserId: row.car.hostUserId ?? null,
          isCommunityListing:
            row.car.hostUserId != null || (!!row.car.ownerEmail && row.car.ownerEmail.length > 0),
        }
      : undefined,
    user: row.user ? formatUser(row.user) : undefined,
    guestName: row.booking.guestName,
    guestPhone: row.booking.guestPhone,
    guestEmail: row.booking.guestEmail,
    aadharUrl: row.booking.aadharUrl,
    drivingLicenseUrl: row.booking.drivingLicenseUrl,
    source: row.booking.source,
    adminNotes: row.booking.adminNotes,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query = db
      .select({ booking: bookingsTable, car: carsTable, user: usersTable })
      .from(bookingsTable)
      .leftJoin(carsTable, eq(bookingsTable.carId, carsTable.id))
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id));

    const rows =
      currentUser.role === "admin"
        ? await query
        : await query.where(eq(bookingsTable.userId, currentUser.id));

    return NextResponse.json(rows.map(formatRow));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      carId,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      withDriver,
      guestName,
      guestPhone,
      guestEmail,
      aadharUrl,
      drivingLicenseUrl,
      collateralType,
      collateralDetail,
    } = body;

    if (!carId || !pickupDate || !returnDate) {
      return NextResponse.json({ error: "carId, pickupDate, and returnDate required" }, { status: 400 });
    }

    const session = await getSession();
    let currentUser = null;
    if (session.userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      currentUser = u ?? null;
    }

    const { booking, guestAccessToken } = await createBooking({
      carId: Number(carId),
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      withDriver: !!withDriver,
      guestName,
      guestPhone,
      guestEmail,
      aadharUrl,
      drivingLicenseUrl,
      collateralType,
      collateralDetail,
      currentUser,
    });

    return NextResponse.json(
      {
        ...booking,
        guestAccessToken: guestAccessToken ?? undefined,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
