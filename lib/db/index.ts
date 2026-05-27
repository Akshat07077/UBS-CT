import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool: Pool };

// Lazy pool — only created when first accessed at runtime, not at build time
function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return globalForDb.pool;
}

// Proxy so `db` is safe to import at module level but only connects at runtime
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return drizzle(getPool(), { schema })[prop as keyof ReturnType<typeof drizzle>];
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return getPool()[prop as keyof Pool];
  },
});

export * from "./schema";
