import { playerPoints, roundOutcomes } from "./outcomes.js";
import { tiebreak, type TiebreakKey } from "./tiebreaks.js";
import type { PlayerId, Tournament } from "./types.js";

export interface StandingEntry {
  playerId: PlayerId;
  points: number;
  gamesPlayed: number;
  /** Values for the requested tiebreaks, in the order they were given. */
  tiebreaks: number[];
  rank: number;
}

export interface StandingsOptions {
  /** Applied in order after points; higher is better for all supported keys. */
  tiebreaks?: TiebreakKey[];
}

export { playerPoints };

/**
 * Current standings: points first, then the given tiebreaks in order, with
 * seed order as the final deterministic fallback.
 */
export function standings(
  tournament: Tournament,
  options: StandingsOptions = {},
): StandingEntry[] {
  const keys = options.tiebreaks ?? [];

  const entries = tournament.players.map((player, seedIndex) => ({
    playerId: player.id,
    points: playerPoints(tournament, player.id),
    gamesPlayed: roundOutcomes(tournament, player.id).filter((o) => o.kind === "game").length,
    tiebreaks: keys.map((key) => tiebreak(tournament, player.id, key)),
    seedIndex,
  }));

  entries.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    for (let i = 0; i < keys.length; i++) {
      if (a.tiebreaks[i] !== b.tiebreaks[i]) return b.tiebreaks[i]! - a.tiebreaks[i]!;
    }
    return a.seedIndex - b.seedIndex;
  });

  return entries.map(({ seedIndex: _seedIndex, ...entry }, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
