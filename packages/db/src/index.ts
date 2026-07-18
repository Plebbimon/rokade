export { createDb, type Db } from "./client.js";
export {
  auditLog,
  clubs,
  loginTokens,
  memberships,
  sessions,
  signups,
  tournaments,
  users,
} from "./schema.js";
export type { AuditAction, ClubRole, SignupStatus } from "./schema.js";
export {
  confirmSignup,
  createSignup,
  decideSignup,
  getSignup,
  pruneSignups,
  reopenSignup,
  tournamentSignups,
  type CreateSignupInput,
  type Signup,
} from "./signups.js";
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
