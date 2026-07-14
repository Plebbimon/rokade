import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

export type Db = NodePgDatabase;

/** Process-lifetime connection pool; the pool closes with the process. */
export function createDb(connectionString: string): Db {
  return drizzle(new pg.Pool({ connectionString }));
}
