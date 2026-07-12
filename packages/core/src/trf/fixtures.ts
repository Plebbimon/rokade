import { readFileSync } from "node:fs";

/**
 * A 6-player, 5-round Swiss tournament with 2 rounds played.
 * Used as the golden file for TRF round-trip tests and as input
 * for pairing-engine integration tests.
 */
export function exampleTournamentTrf(): string {
  return readFileSync(new URL("./fixtures/eksempel-2026.trf", import.meta.url), "utf8");
}
