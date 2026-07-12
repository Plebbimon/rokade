import { BLACK_POINTS, BYE_POINTS, WHITE_POINTS } from "./results.js";
import type { PlayerId, Tournament } from "./types.js";

export interface StandingEntry {
  playerId: PlayerId;
  points: number;
  gamesPlayed: number;
  rank: number;
}

/** Total points for one player across all recorded rounds. */
export function playerPoints(tournament: Tournament, playerId: PlayerId): number {
  let points = 0;
  for (const round of tournament.rounds) {
    for (const board of round.boards) {
      if (board.result === null) continue;
      if (board.white === playerId) points += WHITE_POINTS[board.result];
      if (board.black === playerId) points += BLACK_POINTS[board.result];
    }
    for (const bye of round.byes) {
      if (bye.player === playerId) points += BYE_POINTS[bye.type];
    }
  }
  return points;
}

/**
 * Current standings, ordered by points (desc) with seed order as the only
 * tiebreak for now. Proper tiebreaks (Buchholz etc. per the FIDE 2023
 * regulations and NSF practice) are a separate, later step.
 */
export function standings(tournament: Tournament): StandingEntry[] {
  const entries = tournament.players.map((player, seedIndex) => {
    let gamesPlayed = 0;
    for (const round of tournament.rounds) {
      for (const board of round.boards) {
        if (board.result !== null && (board.white === player.id || board.black === player.id)) {
          gamesPlayed += 1;
        }
      }
    }
    return {
      playerId: player.id,
      points: playerPoints(tournament, player.id),
      gamesPlayed,
      seedIndex,
    };
  });

  entries.sort((a, b) => b.points - a.points || a.seedIndex - b.seedIndex);

  return entries.map(({ seedIndex: _seedIndex, ...entry }, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
