import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { StoredTournament } from "@rokade/core";
import { signups, tournaments } from "./schema.js";
import {
  confirmSignup,
  createSignup,
  decideSignup,
  getSignup,
  pruneSignups,
  reopenSignup,
  tournamentSignups,
} from "./signups.js";
import { PgTournamentStore } from "./store.js";

const url = process.env["DATABASE_URL"];

function record(name: string): StoredTournament {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    clubId: null,
    publishedAt: new Date().toISOString(),
    tournament: { name, format: "fide-swiss", totalRounds: 5, players: [], rounds: [] },
  };
}

describe.skipIf(!url)("signups", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  const store = new PgTournamentStore(db);
  const insertedTournaments: string[] = [];

  async function newTournament(): Promise<string> {
    const r = record(`Påmeldingstest ${randomUUID().slice(0, 8)}`);
    await store.save(r);
    insertedTournaments.push(r.id);
    return r.id;
  }

  afterAll(async () => {
    // Signups cascade with their tournaments.
    await db.delete(tournaments).where(inArray(tournaments.id, insertedTournaments));
    await pool.end();
  });

  it("runs the full flow: create, confirm, approve", async () => {
    const tournamentId = await newTournament();
    const token = await createSignup(db, {
      tournamentId,
      name: "Andersen, Anna",
      email: "Anna@Example.com",
      rating: 1850,
      club: "Bergen SK",
      registrySource: "nsf",
      registryId: "12345",
    });

    const queue = await tournamentSignups(db, tournamentId);
    expect(queue).toHaveLength(1);
    const signup = queue[0]!;
    expect(signup.email).toBe("anna@example.com");
    expect(signup.status).toBe("pending");
    expect(signup.confirmedAt).toBeNull();

    // Unconfirmed signups cannot be decided.
    expect(await decideSignup(db, signup.id, "approved")).toBeNull();

    const confirmed = await confirmSignup(db, token);
    expect(confirmed?.id).toBe(signup.id);
    // The token is single-use.
    expect(await confirmSignup(db, token)).toBeNull();

    const decided = await decideSignup(db, signup.id, "approved");
    expect(decided?.status).toBe("approved");
    expect(decided?.registryId).toBe("12345");
    // Deciding twice fails: the claim is atomic.
    expect(await decideSignup(db, signup.id, "rejected")).toBeNull();

    // Reopening puts it back in the queue.
    await reopenSignup(db, signup.id);
    expect((await getSignup(db, signup.id))?.status).toBe("pending");
    expect(await getSignup(db, "not-a-uuid")).toBeNull();
  });

  it("rejects invalid input and unknown tokens", async () => {
    const tournamentId = await newTournament();
    await expect(
      createSignup(db, { tournamentId, name: " ", email: "a@b.example", rating: null }),
    ).rejects.toThrow(/navn/);
    await expect(
      createSignup(db, { tournamentId, name: "Berg, Bjørn", email: "ikke-en-adresse", rating: null }),
    ).rejects.toThrow(/e-postadresse/);
    expect(await confirmSignup(db, "no-such-token")).toBeNull();
  });

  it("prunes signups whose confirmation window passed unused", async () => {
    const tournamentId = await newTournament();
    await createSignup(db, {
      tournamentId,
      name: "Carlsen, Cecilie",
      email: "cecilie@example.com",
      rating: null,
    });
    // Backdate the confirmation window to simulate expiry.
    await db
      .update(signups)
      .set({ confirmExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(signups.tournamentId, tournamentId));

    await pruneSignups(db);
    expect(await tournamentSignups(db, tournamentId)).toHaveLength(0);
  });
});
