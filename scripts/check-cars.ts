import "dotenv/config";
import { db, carsTable } from "../lib/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }
  const rows = await db.select().from(carsTable);
  console.log("Total cars:", rows.length);
  console.log("Approved:", rows.filter((r) => r.listingApprovalStatus === "approved").length);
  console.log("Available:", rows.filter((r) => r.available).length);
  if (rows.length > 0) {
    console.log(
      "Sample:",
      rows.slice(0, 5).map((r) => ({
        id: r.id,
        brand: r.brand,
        model: r.model,
        location: r.location,
        status: r.listingApprovalStatus,
      }))
    );
    console.log("Locations:", [...new Set(rows.map((r) => r.location))]);
  } else {
    console.log("\nNo cars in database. Run: npm run db:seed");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
