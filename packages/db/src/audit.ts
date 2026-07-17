import { and, desc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { auditLog, type AuditAction } from "./schema.js";

export interface AuditEntry {
  id: string;
  at: Date;
  userEmail: string;
  action: AuditAction;
  details: Record<string, unknown>;
}

export interface RecordAuditInput {
  userId: string;
  userEmail: string;
  clubId?: string | null;
  tournamentId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
}

export async function recordAudit(db: NodePgDatabase, input: RecordAuditInput): Promise<void> {
  await db.insert(auditLog).values({
    userId: input.userId,
    userEmail: input.userEmail,
    clubId: input.clubId ?? null,
    tournamentId: input.tournamentId ?? null,
    action: input.action,
    details: input.details ?? {},
  });
}

const ENTRY_COLUMNS = {
  id: auditLog.id,
  at: auditLog.at,
  userEmail: auditLog.userEmail,
  action: auditLog.action,
  details: auditLog.details,
};

/** Everything done to one tournament, newest first. */
export async function tournamentAuditTrail(
  db: NodePgDatabase,
  tournamentId: string,
  limit = 200,
): Promise<AuditEntry[]> {
  return db
    .select(ENTRY_COLUMNS)
    .from(auditLog)
    .where(eq(auditLog.tournamentId, tournamentId))
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(limit);
}

/**
 * Club administration events (club created, members added), newest first.
 * Tournament events belong to the tournament's own trail and are excluded.
 */
export async function clubAuditTrail(
  db: NodePgDatabase,
  clubId: string,
  limit = 200,
): Promise<AuditEntry[]> {
  return db
    .select(ENTRY_COLUMNS)
    .from(auditLog)
    .where(and(eq(auditLog.clubId, clubId), isNull(auditLog.tournamentId)))
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(limit);
}
