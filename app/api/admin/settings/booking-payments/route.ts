import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { normalizeBookingPaymentSettings } from "@/lib/booking-payment-settings";
import { getBookingPaymentSettings, setBookingPaymentSettings } from "@/lib/db/site-settings";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const settings = await getBookingPaymentSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const settings = await setBookingPaymentSettings(normalizeBookingPaymentSettings(body));
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
