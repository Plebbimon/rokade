import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isValidEmail, normalizeEmail } from "./auth.js";
import { signups, type SignupStatus } from "./schema.js";

/**
 * Lifetime of the confirmation link. Generous compared to login links:
 * entrants sign up days before a tournament and may not read e-mail at
 * once, and the link grants nothing but confirming their own entry.
 */
const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;

export interface Signup {
  id: string;
  tournamentId: string;
  name: string;
  email: string;
  rating: number | null;
  club: string | null;
  federation: string | null;
  fideId: string | null;
  registrySource: "nsf" | "fide" | null;
  registryId: string | null;
  status: SignupStatus;
  confirmedAt: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
}

export interface CreateSignupInput {
  tournamentId: string;
  /** "Lastname, Firstname" — the domain's participant name format. */
  name: string;
  email: string;
  rating: number | null;
  club?: string;
  federation?: string;
  fideId?: string;
  registrySource?: "nsf" | "fide";
  registryId?: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Record a signup and issue its confirmation token. Returns the raw token
 * for the e-mail link; only its hash is stored.
 */
export async function createSignup(db: NodePgDatabase, input: CreateSignupInput): Promise<string> {
  const name = input.name.trim();
  if (name === "") throw new Error("påmeldingen må ha et navn");
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("ugyldig e-postadresse");

  const token = randomBytes(32).toString("base64url");
  await db.insert(signups).values({
    tournamentId: input.tournamentId,
    name,
    email,
    rating: input.rating,
    club: input.club ?? null,
    federation: input.federation ?? null,
    fideId: input.fideId ?? null,
    registrySource: input.registrySource ?? null,
    registryId: input.registryId ?? null,
    confirmTokenHash: hashToken(token),
    confirmExpiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
  });
  return token;
}

/**
 * Confirm a signup from its e-mailed token: single-use, unexpired. Returns
 * the confirmed signup, or null when the token is invalid, expired or
 * already used — a second click tells the entrant the link is spent,
 * matching the login-token behaviour.
 */
export async function confirmSignup(db: NodePgDatabase, token: string): Promise<Signup | null> {
  const rows = await db
    .update(signups)
    .set({ confirmedAt: new Date() })
    .where(
      and(
        eq(signups.confirmTokenHash, hashToken(token)),
        isNull(signups.confirmedAt),
        sql`${signups.confirmExpiresAt} > now()`,
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/** All signups for a tournament in arrival order — the arbiter's queue. */
export async function tournamentSignups(
  db: NodePgDatabase,
  tournamentId: string,
): Promise<Signup[]> {
  return db
    .select()
    .from(signups)
    .where(eq(signups.tournamentId, tournamentId))
    .orderBy(asc(signups.createdAt), asc(signups.id));
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSignup(db: NodePgDatabase, id: string): Promise<Signup | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const rows = await db.select().from(signups).where(eq(signups.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Atomically claim a pending, confirmed signup as approved or rejected.
 * Returns the decided row, or null when it was already decided (or never
 * confirmed) — so a double-click cannot approve twice.
 */
export async function decideSignup(
  db: NodePgDatabase,
  id: string,
  decision: "approved" | "rejected",
): Promise<Signup | null> {
  const rows = await db
    .update(signups)
    .set({ status: decision, decidedAt: new Date() })
    .where(
      and(
        eq(signups.id, id),
        eq(signups.status, "pending"),
        sql`${signups.confirmedAt} is not null`,
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * Undo a decision, back to the pending queue. Used when the step after an
 * approval (adding the player to the tournament) fails, and by an arbiter
 * who rejected the wrong entry.
 */
export async function reopenSignup(db: NodePgDatabase, id: string): Promise<void> {
  await db.update(signups).set({ status: "pending", decidedAt: null }).where(eq(signups.id, id));
}

/** Housekeeping: drop signups whose confirmation window passed unused. */
export async function pruneSignups(db: NodePgDatabase): Promise<void> {
  await db
    .delete(signups)
    .where(and(isNull(signups.confirmedAt), lt(signups.confirmExpiresAt, new Date())));
}
