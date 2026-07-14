import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { StoredTournament } from "@rokade/core";
import { tournaments } from "./schema.js";
import { PgTournamentStore } from "./store.js";

const url = process.env["DATABASE_URL"];

function record(name: string, createdAt: string): StoredTournament {
  return {
    id: randomUUID(),
    createdAt,
    clubId: null,
    tournament: { name, format: "fide-swiss", totalRounds: 5, players: [], rounds: [] },
  };
}

describe.skipIf(!url)("PgTournamentStore", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  const store = new PgTournamentStore(db);
  const inserted: string[] = [];

  afterAll(async () => {
    await db.delete(tournaments).where(inArray(tournaments.id, inserted));
    await pool.end();
  });

  it("round-trips a record exactly", async () => {
    const rec = record("Klubbmesterskapet 2026", "2026-07-15T18:30:00.123Z");
    inserted.push(rec.id);
    await store.save(rec);
    expect(await store.get(rec.id)).toEqual(rec);
  });

  it("save on an existing id updates the tournament", async () => {
    const rec = record("Hurtigsjakk", new Date().toISOString());
    inserted.push(rec.id);
    await store.save(rec);
    rec.tournament.players.push({ id: randomUUID(), name: "Andersen, Anna", rating: 2100 });
    await store.save(rec);
    const loaded = await store.get(rec.id);
    expect(loaded?.tournament.players).toHaveLength(1);
  });

  it("lists newest first", async () => {
    const older = record("Eldre", "2020-01-01T00:00:00.000Z");
    const newer = record("Nyere", "2030-01-01T00:00:00.000Z");
    inserted.push(older.id, newer.id);
    await store.save(older);
    await store.save(newer);
    const ids = (await store.list()).map((r) => r.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });

  it("returns null for unknown and malformed ids", async () => {
    expect(await store.get(randomUUID())).toBeNull();
    expect(await store.get("../../etc/passwd")).toBeNull();
  });
});
