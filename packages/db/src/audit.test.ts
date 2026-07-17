import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { clubAuditTrail, recordAudit, tournamentAuditTrail } from "./audit.js";
import { auditLog } from "./schema.js";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("audit log", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);

  // Fabricated ids: audit rows deliberately have no foreign keys, so no
  // users/clubs/tournaments need to exist for these tests.
  const userId = randomUUID();
  const clubId = randomUUID();
  const otherClubId = randomUUID();
  const tournamentId = randomUUID();

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.userId, userId));
    await pool.end();
  });

  it("records and returns a tournament trail, newest first", async () => {
    const actor = { userId, userEmail: "dommer@klubb.example" };
    await recordAudit(db, {
      ...actor,
      clubId,
      tournamentId,
      action: "tournament.create",
      details: { name: "Klubbmesterskapet", format: "fide-swiss" },
    });
    await recordAudit(db, {
      ...actor,
      clubId,
      tournamentId,
      action: "result.set",
      details: { round: 1, board: 1, result: "white-wins" },
    });

    const trail = await tournamentAuditTrail(db, tournamentId);
    expect(trail).toHaveLength(2);
    expect(trail.map((e) => e.action)).toEqual(["result.set", "tournament.create"]);
    expect(trail[0]!.userEmail).toBe("dommer@klubb.example");
    expect(trail[0]!.details).toEqual({ round: 1, board: 1, result: "white-wins" });
    expect(trail[0]!.at).toBeInstanceOf(Date);
  });

  it("scopes trails to their tournament", async () => {
    expect(await tournamentAuditTrail(db, randomUUID())).toEqual([]);
  });

  it("club trail holds administration events but not tournament events", async () => {
    const actor = { userId, userEmail: "admin@klubb.example" };
    await recordAudit(db, {
      ...actor,
      clubId,
      action: "member.add",
      details: { email: "ny@medlem.example", role: "arbiter" },
    });

    const trail = await clubAuditTrail(db, clubId);
    expect(trail.map((e) => e.action)).toEqual(["member.add"]);
    expect(await clubAuditTrail(db, otherClubId)).toEqual([]);
  });

  it("defaults: missing scope and details are stored as null/empty", async () => {
    const soloTournament = randomUUID();
    await recordAudit(db, {
      userId,
      userEmail: "nsf@sjakk.example",
      tournamentId: soloTournament,
      action: "round.pair",
    });
    const trail = await tournamentAuditTrail(db, soloTournament);
    expect(trail).toHaveLength(1);
    expect(trail[0]!.details).toEqual({});
  });
});
