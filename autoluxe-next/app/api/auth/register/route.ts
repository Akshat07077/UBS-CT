import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession, hashPassword, formatUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const [user] = await db.insert(usersTable).values({
      name: name || null, email, password: hashPassword(password), role: "user",
    }).returning();

    const session = await getSession();
    session.userId = user.id;
    await session.save();

    return NextResponse.json({ user: formatUser(user), message: "Registered successfully" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
