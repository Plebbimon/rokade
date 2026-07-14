import { asc, and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isValidEmail, normalizeEmail } from "./auth.js";
import { clubs, memberships, users, type ClubRole } from "./schema.js";

export interface ClubWithRole {
  id: string;
  name: string;
  role: ClubRole;
}

export interface ClubMember {
  userId: string;
  email: string;
  name: string | null;
  role: ClubRole;
}

/** Create a club; the creator becomes its first admin. Returns the club id. */
export async function createClub(
  db: NodePgDatabase,
  name: string,
  creatorUserId: string,
): Promise<string> {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("klubben må ha et navn");
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(clubs).values({ name: trimmed }).returning({ id: clubs.id });
    const clubId = inserted[0]!.id;
    await tx.insert(memberships).values({ clubId, userId: creatorUserId, role: "admin" });
    return clubId;
  });
}

/** The clubs a user belongs to, with their role in each. */
export async function userClubs(db: NodePgDatabase, userId: string): Promise<ClubWithRole[]> {
  return db
    .select({ id: clubs.id, name: clubs.name, role: memberships.role })
    .from(memberships)
    .innerJoin(clubs, eq(memberships.clubId, clubs.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(clubs.name));
}

/** Every club — for federation-level (NSF admin) views. */
export async function allClubs(db: NodePgDatabase): Promise<{ id: string; name: string }[]> {
  return db.select({ id: clubs.id, name: clubs.name }).from(clubs).orderBy(asc(clubs.name));
}

export async function clubMembers(db: NodePgDatabase, clubId: string): Promise<ClubMember[]> {
  return db
    .select({ userId: users.id, email: users.email, name: users.name, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.clubId, clubId))
    .orderBy(asc(users.email));
}

/** The user's role in the club, or null when not a member. */
export async function membershipRole(
  db: NodePgDatabase,
  clubId: string,
  userId: string,
): Promise<ClubRole | null> {
  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.clubId, clubId), eq(memberships.userId, userId)))
    .limit(1);
  return rows[0]?.role ?? null;
}

/**
 * Add a member by e-mail address. Passwordless accounts are just verified
 * addresses, so this creates the user row up front if needed; the invitee
 * logs in with the same address and lands in the club. Adding an existing
 * member again is a no-op (the original role wins).
 */
export async function addMemberByEmail(
  db: NodePgDatabase,
  clubId: string,
  rawEmail: string,
  role: ClubRole,
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error("ugyldig e-postadresse");
  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(users)
      .values({ email })
      .onConflictDoUpdate({ target: users.email, set: { email } })
      .returning({ id: users.id });
    await tx
      .insert(memberships)
      .values({ clubId, userId: upserted[0]!.id, role })
      .onConflictDoNothing();
  });
}
