import { BLACK_POINTS, BYE_POINTS, WHITE_POINTS } from "./results.js";
import type { PlayerId, Tournament } from "./types.js";

/**
 * What one round meant for one player, classified the way the FIDE
 * tie-break regulations (C.07, 2023) need it:
 * - game: an actually played game (win/draw/loss over the board)
 * - forfeit: a board decided without play (+/-), points as awarded
 * - bye: any arbiter- or pairing-allocated bye
 * - absent: not paired at all in the round
 * - pending: a board whose result is not recorded yet
 */
export type RoundOutcome =
  | { kind: "game"; opponent: PlayerId; points: number }
  | { kind: "forfeit"; points: number }
  | { kind: "bye"; byeType: "pairing" | "full-point" | "half-point" | "zero"; points: number }
  | { kind: "absent"; points: 0 }
  | { kind: "pending" };

const PLAYED_RESULTS = new Set(["white-wins", "draw", "black-wins"]);

/** One outcome per recorded round, in round order. */
export function roundOutcomes(tournament: Tournament, playerId: PlayerId): RoundOutcome[] {
  return tournament.rounds.map((round) => {
    const board = round.boards.find((b) => b.white === playerId || b.black === playerId);
    if (board) {
      if (board.result === null) return { kind: "pending" };
      const isWhite = board.white === playerId;
      const points = isWhite ? WHITE_POINTS[board.result] : BLACK_POINTS[board.result];
      if (PLAYED_RESULTS.has(board.result)) {
        return { kind: "game", opponent: isWhite ? board.black : board.white, points };
      }
      return { kind: "forfeit", points };
    }
    const bye = round.byes.find((b) => b.player === playerId);
    if (bye) return { kind: "bye", byeType: bye.type, points: BYE_POINTS[bye.type] };
    return { kind: "absent", points: 0 };
  });
}

/** Total points for one player across all recorded rounds. */
export function playerPoints(tournament: Tournament, playerId: PlayerId): number {
  return roundOutcomes(tournament, playerId).reduce(
    (sum, outcome) => sum + (outcome.kind === "pending" ? 0 : outcome.points),
    0,
  );
}
