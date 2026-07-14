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
