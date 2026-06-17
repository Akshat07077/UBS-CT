/**
 * Non-interactive Neon patch for booking collateral + payment columns.
 * Run when `npm run db:push` stalls on enum prompts: npm run db:patch
 */
import "dotenv/config";
import { pool } from "@/lib/db";

const statements = [
  `DO $$ BEGIN
    CREATE TYPE collateral_type AS ENUM ('bike_scooty', 'cash_refundable');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collateral_type collateral_type`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collateral_detail text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_amount numeric(10, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2) NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE cars DROP COLUMN IF EXISTS vehicle_type`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_per_hour numeric(10, 2)`,
  `UPDATE cars SET price_per_hour = GREATEST(1, ROUND(price_per_day / 24)) WHERE price_per_hour IS NULL`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS pickup_location text`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS drop_location text`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env");
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      console.log("→", sql.split("\n")[0].slice(0, 72) + "…");
      await client.query(sql);
    }
    console.log("\nDone. Re-run npm run db:push if drizzle still reports drift.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
