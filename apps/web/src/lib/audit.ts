import { recordAudit, type AuditAction, type AuthUser } from "@rokade/db";
import { db, isMultiUser } from "./store.js";

/**
 * Record a successful action in the audit log. File mode has no users and
 * no database, so there the whole thing is a no-op.
 */
export async function audit(
  user: AuthUser | null,
  action: AuditAction,
  scope: {
    clubId?: string | null;
    tournamentId?: string | null;
    details?: Record<string, unknown>;
  } = {},
): Promise<void> {
  if (!isMultiUser() || !user) return;
  await recordAudit(db(), {
    userId: user.id,
    userEmail: user.email,
    action,
    ...scope,
  });
}
