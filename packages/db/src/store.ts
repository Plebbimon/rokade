import type { StoredTournament, TournamentStore } from "@rokade/core";
import { desc, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { tournaments } from "./schema.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = typeof tournaments.$inferSelect;

function toRecord(row: Row): StoredTournament {
  return { id: row.id, createdAt: row.createdAt.toISOString(), tournament: row.tournament };
}

export class PgTournamentStore implements TournamentStore {
  constructor(private readonly db: NodePgDatabase) {}

  async list(): Promise<StoredTournament[]> {
    const rows = await this.db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    return rows.map(toRecord);
  }

  async get(id: string): Promise<StoredTournament | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const rows = await this.db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async save(record: StoredTournament): Promise<void> {
    const row = {
      id: record.id,
      createdAt: new Date(record.createdAt),
      tournament: record.tournament,
    };
    await this.db
      .insert(tournaments)
      .values(row)
      .onConflictDoUpdate({ target: tournaments.id, set: { tournament: row.tournament } });
  }
}

/** Store plus the pool handle, so tests and scripts can disconnect cleanly. */
export interface PgTournamentStoreHandle {
  store: PgTournamentStore;
  close(): Promise<void>;
}

export function connectPgTournamentStore(connectionString: string): PgTournamentStoreHandle {
  const pool = new pg.Pool({ connectionString });
  return {
    store: new PgTournamentStore(drizzle(pool)),
    close: () => pool.end(),
  };
}

/** Process-lifetime store for the web app; the pool closes with the process. */
export function createPgTournamentStore(connectionString: string): PgTournamentStore {
  return connectPgTournamentStore(connectionString).store;
}
