import { NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession, formatUser } from "@/lib/auth";

/** 200 + `null` when not signed in — avoids treating “guest” as an error (stops client refetch spam). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json(null);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) return NextResponse.json(null);

    return NextResponse.json(formatUser(user));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
