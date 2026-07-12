import { describe, expect, it } from "vitest";
import { exampleTournament } from "../trf/fixtures.js";
import { standings } from "./standings.js";
import { adjustedScore, buchholz, sonnebornBerger } from "./tiebreaks.js";
import type { Tournament } from "./types.js";

describe("tiebreaks on a tournament with only played games", () => {
  // Final scores: anna/bjorn/frida 1.5, david 1.0, cecilie 0.5, erik 0.
  const t = exampleTournament();

  it("adjusted scores equal raw scores when everything was played", () => {
    expect(adjustedScore(t, "anna")).toBe(1.5);
    expect(adjustedScore(t, "erik")).toBe(0);
  });

  it("computes Buchholz as the sum of opponent scores", () => {
    expect(buchholz(t, "anna")).toBe(2.5); // david 1.0 + bjorn 1.5
    expect(buchholz(t, "bjorn")).toBe(1.5); // erik 0 + anna 1.5
    expect(buchholz(t, "frida")).toBe(0.5); // cecilie 0.5 + erik 0
    expect(buchholz(t, "erik")).toBe(3.0); // bjorn 1.5 + frida 1.5
  });

  it("cuts the lowest opponent for Buchholz cut-1", () => {
    expect(buchholz(t, "anna", 1)).toBe(1.5); // cut david's 1.0
    expect(buchholz(t, "erik", 1)).toBe(1.5); // both 1.5, cut one
  });

  it("computes Sonneborn-Berger from points scored against each opponent", () => {
    expect(sonnebornBerger(t, "anna")).toBe(1.75); // 1×1.0 + 0.5×1.5
    expect(sonnebornBerger(t, "bjorn")).toBe(0.75); // 1×0 + 0.5×1.5
    expect(sonnebornBerger(t, "frida")).toBe(0.25); // 0.5×0.5 + 1×0
  });

  it("orders standings by the requested tiebreaks", () => {
    const table = standings(t, { tiebreaks: ["buchholz", "sonneborn-berger"] });
    expect(table.map((e) => e.playerId)).toEqual([
      "anna",
      "bjorn",
      "frida",
      "david",
      "cecilie",
      "erik",
    ]);
    expect(table[0]!.tiebreaks).toEqual([2.5, 1.75]);
  });
});

describe("tiebreaks with unplayed rounds (C.07 Article 16)", () => {
  // 3 players, 3 rounds; everyone ends on 1.5 points:
  //   R1: x beats y; z has a pairing-allocated bye.
  //   R2: x draws z; y has a requested half-point bye (plays again later).
  //   R3: y beats z; x takes a zero-point bye and never plays again.
  const t: Tournament = {
    name: "Bye-fest",
    format: "fide-swiss",
    totalRounds: 3,
    players: [
      { id: "x", name: "X", rating: null },
      { id: "y", name: "Y", rating: null },
      { id: "z", name: "Z", rating: null },
    ],
    rounds: [
      {
        number: 1,
        boards: [{ boardNumber: 1, white: "x", black: "y", result: "white-wins" }],
        byes: [{ player: "z", type: "pairing" }],
      },
      {
        number: 2,
        boards: [{ boardNumber: 1, white: "x", black: "z", result: "draw" }],
        byes: [{ player: "y", type: "half-point" }],
      },
      {
        number: 3,
        boards: [{ boardNumber: 1, white: "y", black: "z", result: "white-wins" }],
        byes: [{ player: "x", type: "zero" }],
      },
    ],
  };

  it("adjusts opponent scores per Article 16.3", () => {
    // x's trailing zero-point bye counts as a draw for the opponents' view.
    expect(adjustedScore(t, "x")).toBe(2.0);
    // y's half-point bye is followed by a played game: counts as awarded.
    expect(adjustedScore(t, "y")).toBe(1.5);
    // z's pairing-allocated bye always counts as awarded.
    expect(adjustedScore(t, "z")).toBe(1.5);
  });

  it("uses the own-score dummy for unplayed rounds per Article 16.4", () => {
    expect(buchholz(t, "x")).toBe(4.5); // y 1.5 + z 1.5 + dummy 1.5
    expect(buchholz(t, "y")).toBe(5.0); // x 2.0 + dummy 1.5 + z 1.5
    expect(buchholz(t, "z")).toBe(5.0); // dummy 1.5 + x 2.0 + y 1.5
  });

  it("cuts voluntarily unplayed rounds first per Article 16.5", () => {
    expect(buchholz(t, "x", 1)).toBe(3.0); // must cut the zero-bye dummy (1.5)
    expect(buchholz(t, "y", 1)).toBe(3.5); // must cut the half-bye dummy (1.5)
    // z's pairing bye is not voluntary: plain lowest value is cut.
    expect(buchholz(t, "z", 1)).toBe(3.5);
  });

  it("computes Sonneborn-Berger with dummies", () => {
    expect(sonnebornBerger(t, "x")).toBe(2.25); // 1×1.5 + 0.5×1.5 + 0×1.5
    expect(sonnebornBerger(t, "y")).toBe(2.25); // 0×2.0 + 0.5×1.5 + 1×1.5
    expect(sonnebornBerger(t, "z")).toBe(2.5); // 1×1.5 + 0.5×2.0 + 0×1.5
  });

  it("breaks a three-way points tie via cut-1 then Sonneborn-Berger", () => {
    const table = standings(t, { tiebreaks: ["buchholz-cut-1", "sonneborn-berger"] });
    expect(table.map((e) => e.playerId)).toEqual(["z", "y", "x"]);
    expect(table.map((e) => e.points)).toEqual([1.5, 1.5, 1.5]);
  });
});
