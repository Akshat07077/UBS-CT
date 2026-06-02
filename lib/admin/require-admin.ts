import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import type { User } from "@/lib/db/schema";

export async function requireAdmin(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || user.role !== "admin") return null;
  return user;
}
