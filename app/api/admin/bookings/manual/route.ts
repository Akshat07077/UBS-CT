import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createManualBooking, BookingError } from "@/lib/booking-service";

const schema = z.object({
  carId: z.coerce.number().int().positive(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().optional(),
  returnTime: z.string().optional(),
  guestName: z.string().trim().min(1).max(120),
  guestPhone: z.string().trim().max(24).optional(),
  guestEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  totalPrice: z.coerce.number().nonnegative().optional(),
  withDriver: z.boolean().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Admin: add offline booking — calendar only, does not block website availability. */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;
    const booking = await createManualBooking({
      carId: data.carId,
      pickupDate: data.pickupDate,
      returnDate: data.returnDate,
      pickupTime: data.pickupTime,
      returnTime: data.returnTime,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || undefined,
      totalPrice: data.totalPrice,
      withDriver: data.withDriver,
      status: data.status,
      adminNotes: data.adminNotes,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
