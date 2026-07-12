import type { Round, Tournament } from "./types.js";

/** A pairing between seat numbers (1-based positions in the start list). */
export interface BergerSeatPairing {
  white: number;
  black: number;
}

export interface BergerRoundSchedule {
  pairs: BergerSeatPairing[];
  /** With an odd number of players, the seat that sits out this round. */
  byeSeat: number | null;
}

/**
 * The full round-robin schedule for `playerCount` players, following the
 * Berger tables in FIDE Handbook C.05 Annex 1 (colors included: the
 * first-named player of each pair in those tables has white).
 *
 * Even count: playerCount - 1 rounds. Odd count: the schedule for
 * playerCount + 1 is used and the seat paired against the phantom last
 * seat sits out, giving playerCount rounds.
 *
 * Seats are positions in the start list; by round-robin convention they
 * come from a drawing of lots, not from rating seeding.
 */
export function bergerSchedule(playerCount: number): BergerRoundSchedule[] {
  if (playerCount < 2) return [];

  const odd = playerCount % 2 === 1;
  const n = odd ? playerCount + 1 : playerCount;
  const m = n - 1;
  const half = n / 2;
  // Wrap into 1..m (the rotating seats; seat n is fixed).
  const wrap = (x: number) => ((x - 1 + m * 2) % m) + 1;

  const rounds: BergerRoundSchedule[] = [];
  for (let r = 1; r <= m; r++) {
    const pairs: BergerSeatPairing[] = [];
    let byeSeat: number | null = null;

    // The seat meeting the fixed seat n this round; n has black in odd rounds.
    const p = wrap((r - 1) * half + 1);
    if (odd) {
      byeSeat = p;
    } else {
      pairs.push(r % 2 === 1 ? { white: p, black: n } : { white: n, black: p });
    }

    for (let k = 1; k < half; k++) {
      pairs.push({ white: wrap(p + k), black: wrap(p - k) });
    }

    rounds.push({ pairs, byeSeat });
  }
  return rounds;
}

/**
 * The given round of a Berger round-robin as a domain Round, mapping seat i
 * to players[i - 1]. A sitting-out player (odd field) is recorded as a
 * zero-point bye: no game, no point.
 */
export function bergerRound(tournament: Tournament, roundNumber: number): Round {
  const schedule = bergerSchedule(tournament.players.length);
  const round = schedule[roundNumber - 1];
  if (!round) {
    throw new Error(
      `round ${roundNumber} does not exist in a ${tournament.players.length}-player round robin ` +
        `(${schedule.length} rounds)`,
    );
  }

  const seat = (s: number) => {
    const player = tournament.players[s - 1];
    if (!player) throw new Error(`no player at seat ${s}`);
    return player.id;
  };

  return {
    number: roundNumber,
    boards: round.pairs.map((pair, index) => ({
      boardNumber: index + 1,
      white: seat(pair.white),
      black: seat(pair.black),
      result: null,
    })),
    byes: round.byeSeat === null ? [] : [{ player: seat(round.byeSeat), type: "zero" }],
  };
}
