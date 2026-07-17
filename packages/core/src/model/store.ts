import type { Tournament } from "./types.js";

export interface StoredTournament {
  id: string;
  createdAt: string;
  /** Owning club (multi-user mode); null in local file mode. */
  clubId: string | null;
  /**
   * When the organizer published the tournament, or null while it is a
   * draft. Published tournaments are readable by anyone (public page,
   * terminliste); drafts only by the owning club.
   */
  publishedAt: string | null;
  tournament: Tournament;
}

/**
 * Persistence boundary for tournaments. Implementations live outside the
 * domain core: a file-based store for local single-arbiter use, and a
 * PostgreSQL store (@rokade/db) for the multi-user service. The service
 * layer and UI only ever see this interface.
 */
export interface TournamentStore {
  /**
   * All tournaments, newest first. With `clubIds`, only tournaments owned
   * by those clubs (an empty array matches nothing); without, unscoped —
   * for local file mode and federation-level oversight.
   */
  list(clubIds?: string[]): Promise<StoredTournament[]>;
  get(id: string): Promise<StoredTournament | null>;
  save(record: StoredTournament): Promise<void>;
  /**
   * Opaque change marker for a tournament (bumped on every save), or null
   * when it does not exist. Lets live pages poll for changes without
   * loading the whole record.
   */
  lastModified(id: string): Promise<string | null>;
}
