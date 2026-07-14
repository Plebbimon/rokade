import type { Tournament } from "./types.js";

export interface StoredTournament {
  id: string;
  createdAt: string;
  tournament: Tournament;
}

/**
 * Persistence boundary for tournaments. Implementations live outside the
 * domain core: a file-based store for local single-arbiter use, and a
 * PostgreSQL store (@rokade/db) for the multi-user service. The service
 * layer and UI only ever see this interface.
 */
export interface TournamentStore {
  list(): Promise<StoredTournament[]>;
  get(id: string): Promise<StoredTournament | null>;
  save(record: StoredTournament): Promise<void>;
}
