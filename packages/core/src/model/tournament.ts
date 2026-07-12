import type { GameResult, Round, Tournament } from "./types.js";

/** Append the next round. Its number must be rounds.length + 1 and every player must exist. */
export function addRound(tournament: Tournament, round: Round): Tournament {
  const expected = tournament.rounds.length + 1;
  if (round.number !== expected) {
    throw new Error(`expected round ${expected}, got ${round.number}`);
  }
  if (round.number > tournament.totalRounds) {
    throw new Error(`tournament has only ${tournament.totalRounds} rounds`);
  }

  const known = new Set(tournament.players.map((p) => p.id));
  const seen = new Set<string>();
  const use = (id: string) => {
    if (!known.has(id)) throw new Error(`unknown player: ${id}`);
    if (seen.has(id)) throw new Error(`player appears twice in round: ${id}`);
    seen.add(id);
  };
  for (const board of round.boards) {
    use(board.white);
    use(board.black);
  }
  for (const bye of round.byes) use(bye.player);

  return { ...tournament, rounds: [...tournament.rounds, round] };
}

/** Record (or correct) the result on one board. Returns a new Tournament. */
export function recordResult(
  tournament: Tournament,
  roundNumber: number,
  boardNumber: number,
  result: GameResult,
): Tournament {
  const round = tournament.rounds.find((r) => r.number === roundNumber);
  if (!round) throw new Error(`no round ${roundNumber}`);
  const board = round.boards.find((b) => b.boardNumber === boardNumber);
  if (!board) throw new Error(`no board ${boardNumber} in round ${roundNumber}`);

  const updatedRound: Round = {
    ...round,
    boards: round.boards.map((b) => (b.boardNumber === boardNumber ? { ...b, result } : b)),
  };
  return {
    ...tournament,
    rounds: tournament.rounds.map((r) => (r.number === roundNumber ? updatedRound : r)),
  };
}
