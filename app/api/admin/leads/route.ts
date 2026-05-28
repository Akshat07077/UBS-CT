import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { listLeadsForAdmin } from "@/lib/leads";
import type { LeadStatus, LeadType } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "all") as LeadType | "all";
    const status = (sp.get("status") || "all") as LeadStatus | "all";
    const q = sp.get("q") || undefined;
    const from = sp.get("from") || undefined;
    const to = sp.get("to") || undefined;

    const rows = await listLeadsForAdmin({ type, status, q, from, to });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
