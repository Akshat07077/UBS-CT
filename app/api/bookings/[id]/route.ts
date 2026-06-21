import { NextRequest, NextResponse } from "next/server";
import { db, bookingsTable, carsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession, formatUser } from "@/lib/auth";
import { formatBooking, guestTokenMatches } from "@/lib/booking-service";

function hostOwnsCar(
  car: typeof carsTable.$inferSelect,
  user: typeof usersTable.$inferSelect
) {
  const email = user.email.toLowerCase();
  return car.hostUserId === user.id || (car.ownerEmail != null && car.ownerEmail.toLowerCase() === email);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.nextUrl.searchParams.get("token");

    const [row] = await db
      .select({ booking: bookingsTable, car: carsTable, user: usersTable })
      .from(bookingsTable)
      .leftJoin(carsTable, eq(bookingsTable.carId, carsTable.id))
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id))
      .where(eq(bookingsTable.id, Number(id)))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const session = await getSession();
    let allowed = guestTokenMatches(row.booking, token);

    if (!allowed && session.userId) {
      const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (currentUser) {
        const isRenter = row.booking.userId != null && row.booking.userId === currentUser.id;
        const isHost = row.car != null && hostOwnsCar(row.car, currentUser);
        allowed = currentUser.role === "admin" || isRenter || isHost;
      }
    }

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      ...formatBooking(row.booking),
      car: row.car
        ? {
            brand: row.car.brand,
            model: row.car.model,
            location: row.car.location,
            imageUrl: row.car.imageUrl,
            pricePerDay: Number(row.car.pricePerDay),
          }
        : undefined,
      user: row.user ? formatUser(row.user) : undefined,
      guestName: row.booking.guestName,
      guestPhone: row.booking.guestPhone,
      guestEmail: row.booking.guestEmail,
      aadharUrl: row.booking.aadharUrl,
      drivingLicenseUrl: row.booking.drivingLicenseUrl,
      paymentScreenshotUrl: row.booking.paymentScreenshotUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!currentUser || currentUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status, adminNotes } = body;
    if (!status && adminNotes === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const patch: { status?: typeof bookingsTable.$inferInsert.status; adminNotes?: string | null } = {};
    if (status) patch.status = status;
    if (adminNotes !== undefined) patch.adminNotes = adminNotes?.trim() || null;

    const [booking] = await db
      .update(bookingsTable)
      .set(patch)
      .where(eq(bookingsTable.id, Number(id)))
      .returning();
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    return NextResponse.json(formatBooking(booking));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
