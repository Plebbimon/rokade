import type { Tournament } from "@rokade/core";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
});

/**
 * Passwordless auth: a user is just a verified email address. Accounts are
 * created on first successful magic-link login, never up front.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored lower-cased; the application normalizes before every query.
  email: text("email").notNull().unique(),
  name: text("name"),
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

/** Browser sessions; the cookie holds the raw token, the row its SHA-256. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
