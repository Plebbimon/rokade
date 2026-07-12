import type { TrfResult } from "../trf/types.js";
import type { ByeType, GameResult } from "./types.js";

/** Points for the white player under standard scoring (win 1, draw ½). */
export const WHITE_POINTS: Record<GameResult, number> = {
  "white-wins": 1,
  draw: 0.5,
  "black-wins": 0,
  "white-forfeit-win": 1,
  "black-forfeit-win": 0,
  "double-forfeit": 0,
};

/** Points for the black player under standard scoring. */
export const BLACK_POINTS: Record<GameResult, number> = {
  "white-wins": 0,
  draw: 0.5,
  "black-wins": 1,
  "white-forfeit-win": 0,
  "black-forfeit-win": 1,
  "double-forfeit": 0,
};

export const BYE_POINTS: Record<ByeType, number> = {
  pairing: 1,
  "full-point": 1,
  "half-point": 0.5,
  zero: 0,
};

/** TRF result char for the white player (FIDE Handbook C.04.A result column). */
export const WHITE_TRF_RESULT: Record<GameResult, TrfResult> = {
  "white-wins": "1",
  draw: "=",
  "black-wins": "0",
  "white-forfeit-win": "+",
  "black-forfeit-win": "-",
  "double-forfeit": "-",
};

/** TRF result char for the black player. */
export const BLACK_TRF_RESULT: Record<GameResult, TrfResult> = {
  "white-wins": "0",
  draw: "=",
  "black-wins": "1",
  "white-forfeit-win": "-",
  "black-forfeit-win": "+",
  "double-forfeit": "-",
};

export const BYE_TRF_RESULT: Record<ByeType, TrfResult> = {
  pairing: "U",
  "full-point": "F",
  "half-point": "H",
  zero: "Z",
};
