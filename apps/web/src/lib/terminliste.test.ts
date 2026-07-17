import { describe, expect, it } from "vitest";
import type { StoredTournament, GameResult, Round } from "@rokade/core";
import { formatDomainDate, terminStatus } from "./terminliste.js";

function round(number: number, results: (GameResult | null)[]): Round {
  return {
    number,
    boards: results.map((result, i) => ({
      boardNumber: i + 1,
      white: `w${i}`,
      black: `b${i}`,
      result,
    })),
    byes: [],
  };
}

function record(tournament: Partial<StoredTournament["tournament"]>): StoredTournament {
  return {
    id: "t",
    createdAt: "2026-01-01T00:00:00.000Z",
    clubId: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    tournament: {
      name: "Test",
      format: "fide-swiss",
      totalRounds: 0,
      players: [],
      rounds: [],
      ...tournament,
    },
  };
}

describe("terminStatus", () => {
  it("is finished when all rounds are fully played", () => {
    const r = record({ totalRounds: 2, rounds: [round(1, ["white-wins"]), round(2, ["draw"])] });
    expect(terminStatus(r, "2026/07/17")).toBe("finished");
  });

  it("is finished when the end date has passed", () => {
    const r = record({ dateBegin: "2026/06/01", dateEnd: "2026/06/02" });
    expect(terminStatus(r, "2026/07/17")).toBe("finished");
  });

  it("is upcoming when the start date is in the future", () => {
    const r = record({ dateBegin: "2026/08/01" });
    expect(terminStatus(r, "2026/07/17")).toBe("upcoming");
  });

  it("is ongoing when rounds have started but no dates are set", () => {
    const r = record({ totalRounds: 3, rounds: [round(1, ["white-wins"])] });
    expect(terminStatus(r, "2026/07/17")).toBe("ongoing");
  });
});

describe("formatDomainDate", () => {
  it("converts yyyy/mm/dd to dd.mm.yyyy", () => {
    expect(formatDomainDate("2026/08/01")).toBe("01.08.2026");
  });
});
