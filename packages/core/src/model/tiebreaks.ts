/**
 * Tie-breaks per the FIDE Tie-Break Regulations (C.07, in force since
 * September 2023). The 2023 rewrite abolished the old "virtual opponent":
 *
 * - Article 16.4: a participant's own unplayed round counts as a game
 *   against a dummy that finishes with the participant's own final score.
 * - Article 16.3: when a player appears as someone's opponent, their score
 *   is adjusted — pairing-allocated byes and forfeits count as awarded,
 *   while requested byes/absences with no later played game count as draws.
 * - Article 16.5: when cutting (Buchholz cut-1), contributions from the
 *   participant's own voluntarily unplayed rounds are cut first.
 *   (Interpretation to be validated against the FIDE arbiter exercises.)
 */

import { playerPoints, roundOutcomes } from "./outcomes.js";
import type { PlayerId, Tournament } from "./types.js";

export type TiebreakKey = "buchholz" | "buchholz-cut-1" | "sonneborn-berger";

/**
 * A player's score as seen from their opponents' tie-breaks (Article 16.3).
 */
export function adjustedScore(tournament: Tournament, playerId: PlayerId): number {
  const outcomes = roundOutcomes(tournament, playerId);
  const lastPlayed = outcomes.findLastIndex((o) => o.kind === "game");

  return outcomes.reduce((sum, outcome, index) => {
    switch (outcome.kind) {
      case "game":
      case "forfeit":
        return sum + outcome.points;
      case "bye":
        if (outcome.byeType === "pairing" || index < lastPlayed) return sum + outcome.points;
        return sum + 0.5;
      case "absent":
        return sum + (index < lastPlayed ? 0 : 0.5);
      case "pending":
        return sum;
    }
  }, 0);
}

interface Contribution {
  value: number;
  /** From the participant's own voluntarily unplayed round (Article 16.5). */
  voluntary: boolean;
}

function buchholzContributions(tournament: Tournament, playerId: PlayerId): Contribution[] {
  const ownFinalScore = playerPoints(tournament, playerId);
  return roundOutcomes(tournament, playerId).flatMap((outcome): Contribution[] => {
    switch (outcome.kind) {
      case "pending":
        return [];
      case "game":
        return [{ value: adjustedScore(tournament, outcome.opponent), voluntary: false }];
      case "forfeit":
        // A forfeit win is the opponent's fault; a forfeit loss is your own.
        return [{ value: ownFinalScore, voluntary: outcome.points === 0 }];
      case "bye":
        return [{ value: ownFinalScore, voluntary: outcome.byeType !== "pairing" }];
      case "absent":
        return [{ value: ownFinalScore, voluntary: true }];
    }
  });
}

/** Buchholz (Article 8.1): sum of (adjusted) opponent scores, dummies for unplayed rounds. */
export function buchholz(tournament: Tournament, playerId: PlayerId, cut = 0): number {
  const contributions = buchholzContributions(tournament, playerId);

  for (let i = 0; i < cut && contributions.length > 0; i++) {
    const voluntary = contributions.filter((c) => c.voluntary);
    const pool = voluntary.length > 0 ? voluntary : contributions;
    const lowest = pool.reduce((a, b) => (b.value < a.value ? b : a));
    contributions.splice(contributions.indexOf(lowest), 1);
  }

  return contributions.reduce((sum, c) => sum + c.value, 0);
}

/**
 * Sonneborn-Berger (Article 9.1): for each round, the (adjusted) final score
 * of the opponent multiplied by the points scored against them; unplayed
 * rounds use the dummy of Article 16.4.
 */
export function sonnebornBerger(tournament: Tournament, playerId: PlayerId): number {
  const ownFinalScore = playerPoints(tournament, playerId);
  return roundOutcomes(tournament, playerId).reduce((sum, outcome) => {
    if (outcome.kind === "pending") return sum;
    if (outcome.kind === "game") {
      return sum + outcome.points * adjustedScore(tournament, outcome.opponent);
    }
    return sum + outcome.points * ownFinalScore;
  }, 0);
}

export function tiebreak(tournament: Tournament, playerId: PlayerId, key: TiebreakKey): number {
  switch (key) {
    case "buchholz":
      return buchholz(tournament, playerId);
    case "buchholz-cut-1":
      return buchholz(tournament, playerId, 1);
    case "sonneborn-berger":
      return sonnebornBerger(tournament, playerId);
  }
}
