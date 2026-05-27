/**
 * One-shot Neon setup: create tables (drizzle push) + seed Indore fleet.
 * Usage: npm run db:setup
 */
import "dotenv/config";
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("ERROR: Set DATABASE_URL in .env (Neon connection string).");
  process.exit(1);
}

console.log("Step 1/2 — Applying schema to Neon (drizzle-kit push)...\n");
execSync("npx drizzle-kit push", { stdio: "inherit", env: process.env });

console.log("\nStep 2/2 — Seeding users + Indore fleet...\n");
execSync("npx tsx lib/db/seed.ts", { stdio: "inherit", env: process.env });

console.log("\nAll set. Restart `npm run dev` if it was already running.");
