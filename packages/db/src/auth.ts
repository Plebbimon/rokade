import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { loginTokens, sessions, users } from "./schema.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  nsfAdmin: boolean;
}

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** Issue a magic-link token for the address. Returns the raw token to email. */
export async function createLoginToken(db: NodePgDatabase, rawEmail: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error("ugyldig e-postadresse");
  const { token, hash } = newToken();
  await db.insert(loginTokens).values({
    tokenHash: hash,
    email,
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });
  return token;
}

/**
 * Consume a magic-link token: single-use, unexpired. Creates the user on
 * first login. Returns the user, or null when the token is invalid, expired
 * or already used.
 */
export async function consumeLoginToken(
  db: NodePgDatabase,
  token: string,
): Promise<AuthUser | null> {
  const consumed = await db
    .update(loginTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(loginTokens.tokenHash, hashToken(token)),
        isNull(loginTokens.consumedAt),
        gt(loginTokens.expiresAt, new Date()),
      ),
    )
    .returning({ email: loginTokens.email });
  const email = consumed[0]?.email;
  if (!email) return null;

  const inserted = await db
    .insert(users)
    .values({ email })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning();
  const user = inserted[0];
  if (!user) throw new Error(`kunne ikke opprette bruker for ${email}`);
  return { id: user.id, email: user.email, name: user.name, nsfAdmin: user.nsfAdmin };
}

/** Start a session for the user. Returns the raw token for the cookie. */
export async function createSession(db: NodePgDatabase, userId: string): Promise<string> {
  const { token, hash } = newToken();
  await db.insert(sessions).values({
    tokenHash: hash,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

/** Resolve a session cookie to its user; null when missing or expired. */
export async function sessionUser(db: NodePgDatabase, token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, nsfAdmin: users.nsfAdmin })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(db: NodePgDatabase, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Housekeeping: drop expired sessions and expired/consumed login tokens. */
export async function pruneAuth(db: NodePgDatabase): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db
    .delete(loginTokens)
    .where(sql`${loginTokens.expiresAt} < ${now} or ${loginTokens.consumedAt} is not null`);
}
