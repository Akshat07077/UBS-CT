import { NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession, formatUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    return NextResponse.json(users.map(formatUser));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
