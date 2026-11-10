import { Pool, types } from "pg";

// Return `date` columns as YYYY-MM-DD strings instead of local-midnight Dates.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
