import "dotenv/config";
import { db, carsTable, usersTable, bookingsTable, paymentsTable } from "./index";
import { INDIA_FLEET } from "./india-fleet-data";
import { replaceCarGallery } from "./car-images";
import { brand } from "@/lib/brand/config";
import crypto from "crypto";
import { sql } from "drizzle-orm";

function hashPassword(p: string) {
  return crypto
    .createHash("sha256")
    .update(p + (process.env.SESSION_SECRET || "secret"))
    .digest("hex");
}

function seededCarGallery(query: string) {
  const base = "https://images.unsplash.com";
  // Stable-ish variety with different signatures; safe remote placeholders for demo.
  const ids = [
    "photo-1503376760302-8fac2a800d02", // generic car
    "photo-1517673132405-a56a62b18caf", // interior / dashboard style
    "photo-1486496572940-2bb2341fdbdf", // car on road
    "photo-1493238792000-8113da705763", // close-up / detail
  ];
  return ids.map((id, i) => {
    const url = new URL(`${base}/${id}`);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", "1600");
    url.searchParams.set("q", "80");
    url.searchParams.set("fm", "jpg");
    url.searchParams.set("ixid", "M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2FyfGVufDB8fDB8fHww");
    url.searchParams.set("ixlib", "rb-4.0.3");
    url.searchParams.set("sig", String(i + 1));
    // Add a query to bias Unsplash CDN cropping cache; harmless if ignored.
    url.searchParams.set("car", query);
    return url.toString();
  });
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  console.log("UB's Car Rental — database seed");
  console.log("Target:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));

  const existingUsers = await db.select().from(usersTable);
  const adminEmail = "admin@ubscarrental.in";
  const ubsAdmin = existingUsers.find((u) => u.email === adminEmail);

  if (!ubsAdmin) {
    await db.insert(usersTable).values({
      name: "UB's Admin",
      email: adminEmail,
      password: hashPassword("admin123456"),
      role: "admin",
    });
    console.log(`✓ Admin created: ${adminEmail} / admin123456`);
  } else {
    console.log(`✓ Admin ready: ${adminEmail}`);
  }

  const hasDemo = existingUsers.some((u) => u.email === "demo@ubscarrental.in");
  if (!hasDemo) {
    await db.insert(usersTable).values({
      name: "Demo User",
      email: "demo@ubscarrental.in",
      password: hashPassword("password123"),
      role: "user",
    });
    console.log("✓ Demo user: demo@ubscarrental.in");
  }

  console.log("Clearing payments, bookings, cars...");
  await db.delete(paymentsTable);
  await db.delete(bookingsTable);
  await db.delete(carsTable);

  console.log(`Inserting ${INDIA_FLEET.length} vehicles (${brand.name} · Indore fleet)...`);
  await db.insert(carsTable).values(INDIA_FLEET);

  const fleetRows = await db.select().from(carsTable);
  for (const c of fleetRows) {
    const query = `${c.brand} ${c.model}`.trim();
    const gallery = c.imageUrl ? [c.imageUrl, ...seededCarGallery(query)] : seededCarGallery(query);
    // De-dupe in case cover is same as a seeded URL.
    const unique = Array.from(new Set(gallery));
    await replaceCarGallery(c.id, unique.slice(0, 6));
  }
  console.log("✓ Car image galleries seeded (multi-photo)");

  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM cars) AS cars,
      (SELECT COUNT(*)::int FROM bookings) AS bookings,
      (SELECT COUNT(*)::int FROM payments) AS payments
  `);

  const row = counts.rows[0] as {
    users: number;
    cars: number;
    bookings: number;
    payments: number;
  };

  console.log("\nDatabase ready:");
  console.log(`  users     → ${row.users}`);
  console.log(`  cars      → ${row.cars}`);
  console.log(`  bookings  → ${row.bookings}`);
  console.log(`  payments  → ${row.payments}`);
  console.log("\nAdmin login: admin@ubscarrental.in / admin123456");
  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
