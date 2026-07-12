import type { TrfFile, TrfPlayer, TrfRoundEntry } from "../trf/types.js";
import {
  BLACK_TRF_RESULT,
  BYE_TRF_RESULT,
  WHITE_TRF_RESULT,
} from "./results.js";
import { standings } from "./standings.js";
import type { Tournament, TournamentFormat } from "./types.js";

const TOURNAMENT_TYPE: Record<TournamentFormat, string> = {
  "fide-swiss": "Individual: Swiss-System",
  "nsf-monrad": "Individual: Monrad",
  berger: "Individual: Round-Robin",
  cup: "Individual: Cup",
};

/**
 * Convert the domain model to a TRF file, ready for the pairing engine or a
 * FIDE report. Requires every board in every recorded round to have a result;
 * pairing engines cannot pair the next round on top of undecided games.
 */
export function toTrf(tournament: Tournament): TrfFile {
  const startRank = new Map(tournament.players.map((p, i) => [p.id, i + 1]));
  const byPlayer = new Map(standings(tournament).map((e) => [e.playerId, e]));

  const players: TrfPlayer[] = tournament.players.map((player) => {
    const rounds: TrfRoundEntry[] = tournament.rounds.map((round) => {
      const board = round.boards.find((b) => b.white === player.id || b.black === player.id);
      if (board) {
        if (board.result === null) {
          throw new Error(
            `round ${round.number} board ${board.boardNumber} has no result; ` +
              "record all results before generating a TRF",
          );
        }
        const isWhite = board.white === player.id;
        return {
          opponent: startRank.get(isWhite ? board.black : board.white) ?? null,
          color: isWhite ? "w" : "b",
          result: isWhite ? WHITE_TRF_RESULT[board.result] : BLACK_TRF_RESULT[board.result],
        };
      }
      const bye = round.byes.find((b) => b.player === player.id);
      return {
        opponent: null,
        color: "-",
        result: bye ? BYE_TRF_RESULT[bye.type] : "Z",
      };
    });

    const standing = byPlayer.get(player.id);
    return {
      startRank: startRank.get(player.id)!,
      sex: player.sex ?? "",
      title: player.title ?? "",
      name: player.name,
      rating: player.rating,
      federation: player.federation ?? "",
      fideId: player.fideId ?? "",
      birthDate: player.birthDate ?? "",
      points: standing?.points ?? 0,
      rank: standing?.rank ?? null,
      rounds,
    };
  });

  return {
    tournamentName: tournament.name,
    city: tournament.city,
    federation: tournament.federation,
    dateBegin: tournament.dateBegin,
    dateEnd: tournament.dateEnd,
    numberOfPlayers: tournament.players.length,
    numberOfRatedPlayers: tournament.players.filter((p) => p.rating !== null).length,
    tournamentType: TOURNAMENT_TYPE[tournament.format],
    chiefArbiter: tournament.chiefArbiter,
    timeControl: tournament.timeControl,
    numberOfRounds: tournament.totalRounds,
    configurationLines: [],
    players,
    unknownLines: [],
  };
}
