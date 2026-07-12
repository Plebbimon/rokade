/**
 * The tournament domain model: what an arbiter actually manages.
 * Persistence-free — plain data plus pure functions. The TRF format is a
 * serialization concern handled by the bridge in trf-bridge.ts.
 */

export type PlayerId = string;

export interface Participant {
  id: PlayerId;
  /** "Lastname, Firstname" */
  name: string;
  rating: number | null;
  sex?: "m" | "w";
  title?: string;
  federation?: string;
  fideId?: string;
  /** yyyy/mm/dd */
  birthDate?: string;
  /** Norwegian club name (for NSF reports and club tournaments). */
  club?: string;
  /** NSF membership number (for the member-registry adapter, later). */
  nsfMemberNumber?: string;
}

export type GameResult =
  | "white-wins"
  | "draw"
  | "black-wins"
  | "white-forfeit-win"
  | "black-forfeit-win"
  | "double-forfeit";

export interface Board {
  boardNumber: number;
  white: PlayerId;
  black: PlayerId;
  /** null until the game is decided. */
  result: GameResult | null;
}

/**
 * pairing: allocated by the pairing system when the field is odd (scores as a win).
 * full-point / half-point: byes granted by the arbiter (e.g. requested absence).
 * zero: absent without a bye.
 */
export type ByeType = "pairing" | "full-point" | "half-point" | "zero";

export interface RoundBye {
  player: PlayerId;
  type: ByeType;
}

export interface Round {
  /** 1-based. */
  number: number;
  boards: Board[];
  byes: RoundBye[];
}

export type TournamentFormat = "fide-swiss" | "nsf-monrad" | "berger" | "cup";

export interface Tournament {
  name: string;
  format: TournamentFormat;
  totalRounds: number;
  /** Seed order: players[0] has start rank 1. */
  players: Participant[];
  rounds: Round[];
  city?: string;
  federation?: string;
  /** yyyy/mm/dd */
  dateBegin?: string;
  /** yyyy/mm/dd */
  dateEnd?: string;
  chiefArbiter?: string;
  timeControl?: string;
}
