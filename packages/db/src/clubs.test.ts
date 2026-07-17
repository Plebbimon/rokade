import { randomUUID } from "node:crypto";
import { inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { StoredTournament } from "@rokade/core";
import { consumeLoginToken, createLoginToken } from "./auth.js";
import { addMemberByEmail, clubMembers, createClub, membershipRole, userClubs } from "./clubs.js";
import { clubs, tournaments, users } from "./schema.js";
import { PgTournamentStore } from "./store.js";

const url = process.env["DATABASE_URL"];

const run = randomUUID().slice(0, 8);
const domain = `test-${run}.example`;
const address = (local: string) => `${local}@${domain}`;
const clubName = (base: string) => `${base} ${run}`;

function record(name: string, clubId: string | null): StoredTournament {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    clubId,
    publishedAt: null,
    tournament: { name, format: "fide-swiss", totalRounds: 5, players: [], rounds: [] },
  };
}

describe.skipIf(!url)("clubs and club-scoped tournaments", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  const store = new PgTournamentStore(db);
  const insertedTournaments: string[] = [];
  const insertedClubs: string[] = [];

  async function login(local: string) {
    return (await consumeLoginToken(db, await createLoginToken(db, address(local))))!;
  }

  afterAll(async () => {
    await db.delete(tournaments).where(inArray(tournaments.id, insertedTournaments));
    await db.delete(clubs).where(inArray(clubs.id, insertedClubs));
    await db.delete(users).where(like(users.email, `%@${domain}`));
    await pool.end();
  });

  it("creator becomes admin; members and roles are visible", async () => {
    const anna = await login("anna");
    const clubId = await createClub(db, clubName("Bergen SK"), anna.id);
    insertedClubs.push(clubId);

    expect(await membershipRole(db, clubId, anna.id)).toBe("admin");
    expect(await userClubs(db, anna.id)).toEqual([
      { id: clubId, name: clubName("Bergen SK"), role: "admin" },
    ]);

    await addMemberByEmail(db, clubId, address("Turneringsleder"), "arbiter");
    const members = await clubMembers(db, clubId);
    expect(members.map((m) => [m.email, m.role])).toEqual([
      [address("anna"), "admin"],
      [address("turneringsleder"), "arbiter"],
    ]);
  });

  it("invited address logs in and lands in the club", async () => {
    const anna = await login("anna2");
    const clubId = await createClub(db, clubName("Oslo SK"), anna.id);
    insertedClubs.push(clubId);

    await addMemberByEmail(db, clubId, address("invitert"), "arbiter");
    const invited = await login("invitert");
    expect(await membershipRole(db, clubId, invited.id)).toBe("arbiter");
  });

  it("re-adding an existing member keeps the original role", async () => {
    const anna = await login("anna3");
    const clubId = await createClub(db, clubName("Tromsø SK"), anna.id);
    insertedClubs.push(clubId);

    await addMemberByEmail(db, clubId, address("anna3"), "arbiter");
    expect(await membershipRole(db, clubId, anna.id)).toBe("admin");
  });

  it("non-members have no role", async () => {
    const anna = await login("anna4");
    const outsider = await login("utenfor");
    const clubId = await createClub(db, clubName("Narvik SK"), anna.id);
    insertedClubs.push(clubId);
    expect(await membershipRole(db, clubId, outsider.id)).toBeNull();
  });

  it("tournament listing is scoped by club", async () => {
    const anna = await login("anna5");
    const clubA = await createClub(db, clubName("Klubb A"), anna.id);
    const clubB = await createClub(db, clubName("Klubb B"), anna.id);
    insertedClubs.push(clubA, clubB);

    const inA = record("A-turnering", clubA);
    const inB = record("B-turnering", clubB);
    insertedTournaments.push(inA.id, inB.id);
    await store.save(inA);
    await store.save(inB);

    const onlyA = await store.list([clubA]);
    expect(onlyA.map((r) => r.id)).toContain(inA.id);
    expect(onlyA.map((r) => r.id)).not.toContain(inB.id);

    expect(await store.list([])).toEqual([]);

    const unscoped = await store.list();
    expect(unscoped.map((r) => r.id)).toEqual(expect.arrayContaining([inA.id, inB.id]));

    expect((await store.get(inA.id))?.clubId).toBe(clubA);
  });
});
