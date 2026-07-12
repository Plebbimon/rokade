/**
 * Types for the FIDE Tournament Report File (TRF) format, as specified in
 * FIDE Handbook C.04.A (TRF16) with the XXR/XXC extensions used by the
 * JaVaFo and bbpPairings pairing engines (TRF(x)/TRF(bx)).
 */

/** Color a player had in one round. `-` means no color (bye, absence). */
export type TrfColor = "w" | "b" | "-";

/**
 * Result char for one round, from the C.04.A result column:
 * played games: 1/0/= (win/loss/draw), W/D/L (unrated), +/- (forfeit),
 * unplayed: H (half-point bye), F (full-point bye), U (pairing-allocated bye),
 * Z or space (absent / not paired).
 */
export type TrfResult =
  | "1"
  | "0"
  | "="
  | "+"
  | "-"
  | "W"
  | "D"
  | "L"
  | "H"
  | "F"
  | "U"
  | "Z"
  | " ";

/** One round entry on a player's 001 line. */
export interface TrfRoundEntry {
  /** Opponent's starting rank, or null when there was no opponent (bye/absent). */
  opponent: number | null;
  color: TrfColor;
  result: TrfResult;
}

/** One 001 player line. */
export interface TrfPlayer {
  /** Starting rank (the player's id within the file, 1-based). */
  startRank: number;
  /** 'm' | 'w' | '' */
  sex: string;
  /** FIDE title as written in the file (e.g. "GM", "WIM"), or ''. */
  title: string;
  /** "Lastname, Firstname" */
  name: string;
  rating: number | null;
  federation: string;
  fideId: string;
  /** yyyy/mm/dd as written, or ''. */
  birthDate: string;
  points: number;
  rank: number | null;
  rounds: TrfRoundEntry[];
}

/** A parsed TRF file. Unknown lines are preserved verbatim for round-tripping. */
export interface TrfFile {
  tournamentName?: string;
  city?: string;
  federation?: string;
  dateBegin?: string;
  dateEnd?: string;
  numberOfPlayers?: number;
  numberOfRatedPlayers?: number;
  numberOfTeams?: number;
  tournamentType?: string;
  chiefArbiter?: string;
  deputyArbiters?: string;
  timeControl?: string;
  /** The 132 round-dates line, kept verbatim (its columns align with the 001 lines). */
  roundDatesLine?: string;
  /** Total number of rounds (XXR extension; required by pairing engines). */
  numberOfRounds?: number;
  /** XXC/XXA/BB* extension lines, kept verbatim. */
  configurationLines: string[];
  players: TrfPlayer[];
  /** Any other lines (e.g. 013 team lines) kept verbatim, in original order. */
  unknownLines: string[];
}
