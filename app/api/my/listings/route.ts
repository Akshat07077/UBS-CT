import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getMyListings, normalizeLookupPhone } from "@/lib/my-account";
import { isValidLookupPhone } from "@/lib/phone-match";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const phoneParam = req.nextUrl.searchParams.get("phone")?.trim() || null;

    let user = null;
    if (session.userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      user = u ?? null;
    }

    if (!user && !phoneParam) {
      return NextResponse.json(
        { error: "Log in or provide your 10-digit mobile number (?phone=)" },
        { status: 400 }
      );
    }

    if (phoneParam && !isValidLookupPhone(phoneParam)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }

    const phone = phoneParam ? normalizeLookupPhone(phoneParam) : null;
    const listings = await getMyListings(user, phone);

    return NextResponse.json(listings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
