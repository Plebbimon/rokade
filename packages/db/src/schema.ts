import type { Tournament } from "@rokade/core";
import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

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
