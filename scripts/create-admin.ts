/**
 * Create or promote an admin user (does not wipe cars/bookings).
 * Usage:
 *   ADMIN_EMAIL=rindorecar@gmail.com ADMIN_PASSWORD='your-password' npm run db:create-admin
 */
import "dotenv/config";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "../lib/db/index";

function hashPassword(password: string) {
  return crypto
    .createHash("sha256")
    .update(password + (process.env.SESSION_SECRET || "secret"))
    .digest("hex");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "rindorecar@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "UB's Admin";

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set in .env");
    process.exit(1);
  }
  if (!password) {
    console.error("ERROR: Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL, ADMIN_NAME).");
    process.exit(1);
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const hashed = hashPassword(password);

  if (existing) {
    await db
      .update(usersTable)
      .set({ role: "admin", password: hashed, name })
      .where(eq(usersTable.id, existing.id));
    console.log(`✓ Admin updated: ${email}`);
  } else {
    await db.insert(usersTable).values({
      name,
      email,
      password: hashed,
      role: "admin",
    });
    console.log(`✓ Admin created: ${email}`);
  }

  console.log("Log in at /login — you will be redirected to /admin");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
