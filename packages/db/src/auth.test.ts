import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import {
  consumeLoginToken,
  createLoginToken,
  createSession,
  deleteSession,
  sessionUser,
} from "./auth.js";
import { loginTokens, users } from "./schema.js";

const url = process.env["DATABASE_URL"];

// Unique per run so parallel/dirty databases never collide.
const domain = `test-${randomUUID().slice(0, 8)}.example`;
const address = (local: string) => `${local}@${domain}`;

describe.skipIf(!url)("magic-link auth", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);

  afterAll(async () => {
    await db.delete(users).where(like(users.email, `%@${domain}`));
    await db.delete(loginTokens).where(like(loginTokens.email, `%@${domain}`));
    await pool.end();
  });

  it("full flow: token -> first login creates user -> session -> logout", async () => {
    const token = await createLoginToken(db, ` Kari.Nordmann@${domain} `);
    const user = await consumeLoginToken(db, token);
    expect(user?.email).toBe(address("kari.nordmann"));

    const session = await createSession(db, user!.id);
    expect((await sessionUser(db, session))?.id).toBe(user!.id);

    await deleteSession(db, session);
    expect(await sessionUser(db, session)).toBeNull();
  });

  it("second login reuses the same user", async () => {
    const first = await consumeLoginToken(db, await createLoginToken(db, address("ola")));
    const second = await consumeLoginToken(db, await createLoginToken(db, address("OLA")));
    expect(second?.id).toBe(first?.id);
  });

  it("tokens are single-use", async () => {
    const token = await createLoginToken(db, address("engangs"));
    expect(await consumeLoginToken(db, token)).not.toBeNull();
    expect(await consumeLoginToken(db, token)).toBeNull();
  });

  it("rejects expired, unknown and malformed tokens", async () => {
    const token = await createLoginToken(db, address("treg"));
    await db
      .update(loginTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(loginTokens.email, address("treg")));
    expect(await consumeLoginToken(db, token)).toBeNull();
    expect(await consumeLoginToken(db, "no-such-token")).toBeNull();
  });

  it("rejects invalid email addresses", async () => {
    await expect(createLoginToken(db, "ikke en adresse")).rejects.toThrow(/ugyldig/);
  });

  it("expired sessions do not resolve", async () => {
    const user = await consumeLoginToken(db, await createLoginToken(db, address("utlopt")));
    const session = await createSession(db, user!.id);
    const { sessions } = await import("./schema.js");
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, user!.id));
    expect(await sessionUser(db, session)).toBeNull();
  });
});
