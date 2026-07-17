export { createDb, type Db } from "./client.js";
export { auditLog, clubs, loginTokens, memberships, sessions, tournaments, users } from "./schema.js";
export type { AuditAction, ClubRole } from "./schema.js";
export {
  clubAuditTrail,
  recordAudit,
  tournamentAuditTrail,
  type AuditEntry,
  type RecordAuditInput,
} from "./audit.js";
export {
  addMemberByEmail,
  allClubs,
  clubMembers,
  createClub,
  membershipRole,
  userClubs,
  type ClubMember,
  type ClubWithRole,
} from "./clubs.js";
export {
  PgTournamentStore,
  connectPgTournamentStore,
  createPgTournamentStore,
  type PgTournamentStoreHandle,
} from "./store.js";
export {
  consumeLoginToken,
  createLoginToken,
  createSession,
  deleteSession,
  isValidEmail,
  normalizeEmail,
  pruneAuth,
  sessionUser,
  type AuthUser,
} from "./auth.js";
