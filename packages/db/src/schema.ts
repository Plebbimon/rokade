import type { Tournament } from "@rokade/core";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per tournament, with the domain aggregate stored as jsonb — the
 * same shape the file store writes. Columns are only broken out where the
 * database needs them (ordering, keys); relational tables for players and
 * rounds come when the public pages need to query into them.
 */
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  tournament: jsonb("tournament").$type<Tournament>().notNull(),
  // Owning club. Null only for rows from before clubs existed (and in the
  // file store, which has no clubs); new tournaments always carry one.
  clubId: uuid("club_id").references(() => clubs.id),
  // Null while the tournament is an unpublished draft.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // Bumped on every save; the change signal for live public pages.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The tenant: one club = one organization, mirroring how TS6 licenses map
 * to clubs. Tournaments belong to a club; members administer them.
 */
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClubRole = "admin" | "arbiter";

/**
 * Club membership. "admin" manages the club (members, settings); "arbiter"
 * runs tournaments. Every admin can also do everything an arbiter can.
 * NSF-level oversight is not a membership: see users.nsfAdmin.
 */
export const memberships = pgTable(
  "memberships",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<ClubRole>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.clubId, table.userId] })],
);

/**
 * Passwordless auth: a user is just a verified email address. Accounts are
 * created on first successful magic-link login, never up front.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored lower-cased; the application normalizes before every query.
  email: text("email").notNull().unique(),
  name: text("name"),
  // Federation-level oversight (NSF office): sees and administers every
  // club and tournament. Set manually in the database, never via the UI.
  nsfAdmin: boolean("nsf_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per emailed magic link. Only the SHA-256 of the token is stored,
 * so a database leak reveals no usable links. Consumption is single-use and
 * atomic (UPDATE ... WHERE consumed_at IS NULL).
 */
export const loginTokens = pgTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only record of arbiter/admin actions. Deliberately without foreign
 * keys: an audit entry must outlive whatever it describes, so actors are
 * snapshotted by e-mail and club/tournament are plain ids. Only successful
 * mutations are recorded (rejected requests never reach the log).
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: uuid("user_id").notNull(),
    userEmail: text("user_email").notNull(),
    clubId: uuid("club_id"),
    tournamentId: uuid("tournament_id"),
    action: text("action").$type<AuditAction>().notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("audit_log_tournament_idx").on(table.tournamentId, table.at),
    index("audit_log_club_idx").on(table.clubId, table.at),
  ],
);

export type AuditAction =
  | "tournament.create"
  | "tournament.update"
  | "tournament.publish"
  | "tournament.unpublish"
  | "player.add"
  | "round.pair"
  | "result.set"
  | "club.create"
  | "member.add";

/** Browser sessions; the cookie holds the raw token, the row its SHA-256. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
