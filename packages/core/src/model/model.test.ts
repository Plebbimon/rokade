import { describe, expect, it } from "vitest";
import { exampleTournament, exampleTournamentTrf } from "../trf/fixtures.js";
import { serializeTrf } from "../trf/serialize.js";
import { playerPoints, standings } from "./standings.js";
import { addRound, recordResult } from "./tournament.js";
import { toTrf } from "./trf-bridge.js";
import type { Round } from "./types.js";

describe("standings", () => {
  const t = exampleTournament();

  it("computes points from results", () => {
    expect(playerPoints(t, "anna")).toBe(1.5);
    expect(playerPoints(t, "david")).toBe(1.0);
    expect(playerPoints(t, "erik")).toBe(0);
  });

  it("ranks by points, then seed order when no tiebreaks are requested", () => {
    expect(standings(t)).toEqual([
      { playerId: "anna", points: 1.5, gamesPlayed: 2, tiebreaks: [], rank: 1 },
      { playerId: "bjorn", points: 1.5, gamesPlayed: 2, tiebreaks: [], rank: 2 },
      { playerId: "frida", points: 1.5, gamesPlayed: 2, tiebreaks: [], rank: 3 },
      { playerId: "david", points: 1.0, gamesPlayed: 2, tiebreaks: [], rank: 4 },
      { playerId: "cecilie", points: 0.5, gamesPlayed: 2, tiebreaks: [], rank: 5 },
      { playerId: "erik", points: 0, gamesPlayed: 2, tiebreaks: [], rank: 6 },
    ]);
  });

  it("counts bye points without counting them as games", () => {
    const withBye = addRound(t, {
      number: 3,
      boards: [
        { boardNumber: 1, white: "anna", black: "frida", result: "white-wins" },
        { boardNumber: 2, white: "david", black: "bjorn", result: "draw" },
      ],
      byes: [
        { player: "cecilie", type: "half-point" },
        { player: "erik", type: "pairing" },
      ],
    });
    expect(playerPoints(withBye, "cecilie")).toBe(1.0);
    expect(playerPoints(withBye, "erik")).toBe(1.0);
    const erik = standings(withBye).find((e) => e.playerId === "erik")!;
    expect(erik.gamesPlayed).toBe(2);
  });
});

describe("tournament updates", () => {
  const t = exampleTournament();
  const round3: Round = {
    number: 3,
    boards: [{ boardNumber: 1, white: "anna", black: "frida", result: null }],
    byes: [],
  };

  it("appends rounds immutably", () => {
    const updated = addRound(t, round3);
    expect(updated.rounds).toHaveLength(3);
    expect(t.rounds).toHaveLength(2);
  });

  it("rejects out-of-sequence rounds, unknown and duplicated players", () => {
    expect(() => addRound(t, { ...round3, number: 5 })).toThrow(/expected round 3/);
    expect(() =>
      addRound(t, {
        number: 3,
        boards: [{ boardNumber: 1, white: "anna", black: "nobody", result: null }],
        byes: [],
      }),
    ).toThrow(/unknown player/);
    expect(() =>
      addRound(t, {
        number: 3,
        boards: [{ boardNumber: 1, white: "anna", black: "frida", result: null }],
        byes: [{ player: "anna", type: "half-point" }],
      }),
    ).toThrow(/appears twice/);
  });

  it("records results", () => {
    const updated = recordResult(addRound(t, round3), 3, 1, "black-wins");
    expect(updated.rounds[2]!.boards[0]!.result).toBe("black-wins");
    expect(playerPoints(updated, "frida")).toBe(2.5);
  });
});

describe("toTrf", () => {
  it("reproduces the golden TRF file byte for byte", () => {
    expect(serializeTrf(toTrf(exampleTournament()))).toBe(exampleTournamentTrf());
  });

  it("marks players absent from a round as Z", () => {
    const t = exampleTournament();
    t.rounds[1]!.boards = t.rounds[1]!.boards.filter((b) => b.white !== "frida");
    const trf = toTrf(t);
    expect(trf.players[5]!.rounds[1]).toEqual({ opponent: null, color: "-", result: "Z" });
  });

  it("refuses undecided boards", () => {
    const t = addRound(exampleTournament(), {
      number: 3,
      boards: [{ boardNumber: 1, white: "anna", black: "frida", result: null }],
      byes: [],
    });
    expect(() => toTrf(t)).toThrow(/no result/);
  });
});
