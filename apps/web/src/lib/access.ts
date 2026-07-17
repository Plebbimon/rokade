import type { StoredTournament } from "@rokade/core";
import { membershipRole } from "@rokade/db";
import { currentUser } from "./auth.js";
import { db, isMultiUser, tournamentStore } from "./store.js";

/**
 * Load a tournament the current user may see and administer, or null.
 * File mode has no users or clubs, so everything is accessible. In
 * multi-user mode: NSF admins see everything, club members (any role) see
 * their club's tournaments, and club-less rows are NSF-admin-only.
 */
export async function accessibleTournament(id: string): Promise<StoredTournament | null> {
  const record = await tournamentStore().get(id);
  if (!record || !isMultiUser()) return record;

  const user = await currentUser();
  if (!user) return null;
  if (user.nsfAdmin) return record;
  if (!record.clubId) return null;
  const role = await membershipRole(db(), record.clubId, user.id);
  return role ? record : null;
}

export interface TournamentAccess {
  record: StoredTournament;
  /** True when the viewer may administer (club member / NSF admin / file mode). */
  canAdmin: boolean;
}

/**
 * How the current viewer — possibly anonymous — may see a tournament.
 * Published tournaments are readable by anyone; drafts only by those who
 * can administer them. Mutations must keep using accessibleTournament:
 * being able to read a published tournament grants nothing else.
 */
export async function tournamentAccess(id: string): Promise<TournamentAccess | null> {
  const admin = await accessibleTournament(id);
  if (admin) return { record: admin, canAdmin: true };

  const record = await tournamentStore().get(id);
  if (record?.publishedAt) return { record, canAdmin: false };
  return null;
}
