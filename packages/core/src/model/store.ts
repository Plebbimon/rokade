import type { Tournament } from "./types.js";

export interface StoredTournament {
  id: string;
  createdAt: string;
  /** Owning club (multi-user mode); null in local file mode. */
  clubId: string | null;
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
}
