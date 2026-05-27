import "dotenv/config";
import { db, carsTable } from "./index";

async function reset() {
  const before = await db.select().from(carsTable);
  console.log(`Cars before delete: ${before.length}`);
  await db.delete(carsTable);
  const after = await db.select().from(carsTable);
  console.log(`Cars after delete: ${after.length}`);
  console.log("Done — now run: npm run db:seed");
  process.exit(0);
}

reset().catch((e) => { console.error(e); process.exit(1); });
