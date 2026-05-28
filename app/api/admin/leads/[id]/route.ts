import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { updateLeadStatus } from "@/lib/leads";
import type { LeadStatus } from "@/lib/db/schema";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]).optional(),
  adminNotes: z.string().max(2000).nullable().optional(),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: rawId } = await params;
    if (!rawId.startsWith("lead-")) {
      return NextResponse.json(
        { error: "Only stored leads can be updated. Legacy rows are read-only." },
        { status: 400 }
      );
    }

    const leadId = parseInt(rawId.replace("lead-", ""), 10);
    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const row = await updateLeadStatus(leadId, {
      status: parsed.data.status as LeadStatus | undefined,
      adminNotes: parsed.data.adminNotes,
    });
    if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    return NextResponse.json({
      id: `lead-${row.id}`,
      status: row.status,
      adminNotes: row.adminNotes,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
