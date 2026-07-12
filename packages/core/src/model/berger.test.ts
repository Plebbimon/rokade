import { describe, expect, it } from "vitest";
import { bergerRound, bergerSchedule } from "./berger.js";
import { standings } from "./standings.js";
import { addRound, recordResult } from "./tournament.js";
import type { Tournament } from "./types.js";

describe("bergerSchedule", () => {
  it("matches the FIDE Berger table for 3/4 players", () => {
    expect(bergerSchedule(4)).toEqual([
      { pairs: [{ white: 1, black: 4 }, { white: 2, black: 3 }], byeSeat: null },
      { pairs: [{ white: 4, black: 3 }, { white: 1, black: 2 }], byeSeat: null },
      { pairs: [{ white: 2, black: 4 }, { white: 3, black: 1 }], byeSeat: null },
    ]);
  });

  it("matches the FIDE Berger table for 5/6 players", () => {
    expect(bergerSchedule(6)).toEqual([
      { pairs: [{ white: 1, black: 6 }, { white: 2, black: 5 }, { white: 3, black: 4 }], byeSeat: null },
      { pairs: [{ white: 6, black: 4 }, { white: 5, black: 3 }, { white: 1, black: 2 }], byeSeat: null },
      { pairs: [{ white: 2, black: 6 }, { white: 3, black: 1 }, { white: 4, black: 5 }], byeSeat: null },
      { pairs: [{ white: 6, black: 5 }, { white: 1, black: 4 }, { white: 2, black: 3 }], byeSeat: null },
      { pairs: [{ white: 3, black: 6 }, { white: 4, black: 2 }, { white: 5, black: 1 }], byeSeat: null },
    ]);
  });

  it("gives 5 players one sit-out each across 5 rounds", () => {
    const schedule = bergerSchedule(5);
    expect(schedule).toHaveLength(5);
    expect(schedule.map((r) => r.byeSeat)).toEqual([1, 4, 2, 5, 3]);
    for (const round of schedule) {
      expect(round.pairs).toHaveLength(2);
    }
  });

  it("has every seat pair meeting exactly once (8 players)", () => {
    const schedule = bergerSchedule(8);
    expect(schedule).toHaveLength(7);

    const meetings = new Map<string, number>();
    for (const round of schedule) {
      const seatsThisRound = new Set<number>();
      for (const { white, black } of round.pairs) {
        const key = [Math.min(white, black), Math.max(white, black)].join("-");
        meetings.set(key, (meetings.get(key) ?? 0) + 1);
        seatsThisRound.add(white);
        seatsThisRound.add(black);
      }
      expect(seatsThisRound.size).toBe(8);
    }

    expect(meetings.size).toBe((8 * 7) / 2);
    for (const count of meetings.values()) expect(count).toBe(1);
  });

  it("balances colors within one game for every seat (8 players)", () => {
    const whites = new Map<number, number>();
    for (const round of bergerSchedule(8)) {
      for (const { white } of round.pairs) {
        whites.set(white, (whites.get(white) ?? 0) + 1);
      }
    }
    for (let seat = 1; seat <= 8; seat++) {
      expect(whites.get(seat) ?? 0).toBeGreaterThanOrEqual(3);
      expect(whites.get(seat) ?? 0).toBeLessThanOrEqual(4);
    }
  });

  it("handles degenerate fields", () => {
    expect(bergerSchedule(0)).toEqual([]);
    expect(bergerSchedule(1)).toEqual([]);
    expect(bergerSchedule(2)).toEqual([{ pairs: [{ white: 1, black: 2 }], byeSeat: null }]);
  });
});

describe("bergerRound", () => {
  const players = ["anna", "bjorn", "cecilie", "david", "erik"].map((id, i) => ({
    id,
    name: id,
    rating: 2000 - i * 50,
  }));
  const tournament: Tournament = {
    name: "Klubbmesterskapet",
    format: "berger",
    totalRounds: 5,
    players,
    rounds: [],
  };

  it("maps seats to players and records the sit-out as a zero-point bye", () => {
    const round1 = bergerRound(tournament, 1);
    expect(round1.byes).toEqual([{ player: "anna", type: "zero" }]);
    expect(round1.boards).toEqual([
      { boardNumber: 1, white: "bjorn", black: "erik", result: null },
      { boardNumber: 2, white: "cecilie", black: "david", result: null },
    ]);
  });

  it("rejects rounds beyond the schedule", () => {
    expect(() => bergerRound(tournament, 6)).toThrow(/round 6 does not exist/);
  });

  it("plays through a full 5-player round robin", () => {
    let t = tournament;
    for (let r = 1; r <= 5; r++) {
      t = addRound(t, bergerRound(t, r));
      for (const board of t.rounds[r - 1]!.boards) {
        t = recordResult(t, r, board.boardNumber, "draw");
      }
    }

    const table = standings(t);
    for (const entry of table) {
      expect(entry.gamesPlayed).toBe(4); // everyone plays everyone once
      expect(entry.points).toBe(2); // all draws, sit-outs score nothing
    }
  });
});
