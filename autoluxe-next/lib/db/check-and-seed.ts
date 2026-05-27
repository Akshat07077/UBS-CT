import "dotenv/config";
import { db, carsTable, usersTable, bookingsTable, paymentsTable } from "./index";
import { INDIA_FLEET } from "./india-fleet-data";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + (process.env.SESSION_SECRET || "secret")).digest("hex");
}

async function run() {
  console.log("Connecting...");

  // Check users
  const users = await db.select().from(usersTable);
  console.log(`Users in DB: ${users.length}`);
  if (users.length === 0) {
    await db.insert(usersTable).values([
      { name: "Admin User", email: "admin@luxecars.in", password: hashPassword("admin123456"), role: "admin" },
      { name: "Rahul Sharma", email: "rahul@example.com", password: hashPassword("password123"), role: "user" },
    ]);
    console.log("Users inserted");
  }

  // Always clear and re-insert cars
  const before = await db.select().from(carsTable);
  console.log(`Cars before: ${before.length}`);
  await db.delete(paymentsTable);
  await db.delete(bookingsTable);
  await db.delete(carsTable);
  console.log("Cars cleared");

  await db.insert(carsTable).values(INDIA_FLEET);

  const after = await db.select().from(carsTable);
  console.log(`Cars after insert: ${after.length}`);
  console.log("Seeding complete!");
  process.exit(0);
}

run().catch((e) => { console.error("SEED ERROR:", e); process.exit(1); });
