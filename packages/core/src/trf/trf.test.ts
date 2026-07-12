import { describe, expect, it } from "vitest";
import { parseTrf } from "./parse.js";
import { serializeTrf } from "./serialize.js";
import { exampleTournamentTrf } from "./fixtures.js";

describe("TRF parsing", () => {
  const trf = parseTrf(exampleTournamentTrf());

  it("reads the tournament section", () => {
    expect(trf.tournamentName).toBe("Eksempelturneringen 2026");
    expect(trf.city).toBe("Oslo");
    expect(trf.federation).toBe("NOR");
    expect(trf.numberOfPlayers).toBe(6);
    expect(trf.numberOfRounds).toBe(5);
    expect(trf.chiefArbiter).toBe("Hansen, Kari");
  });

  it("reads player lines", () => {
    expect(trf.players).toHaveLength(6);

    const anna = trf.players[0]!;
    expect(anna.startRank).toBe(1);
    expect(anna.sex).toBe("w");
    expect(anna.name).toBe("Andersen, Anna");
    expect(anna.rating).toBe(2100);
    expect(anna.federation).toBe("NOR");
    expect(anna.fideId).toBe("1500001");
    expect(anna.birthDate).toBe("1990/01/01");
    expect(anna.points).toBe(1.5);
    expect(anna.rank).toBe(1);
    expect(anna.rounds).toEqual([
      { opponent: 4, color: "w", result: "1" },
      { opponent: 2, color: "b", result: "=" },
    ]);

    const erik = trf.players[4]!;
    expect(erik.points).toBe(0);
    expect(erik.rank).toBe(6);
    expect(erik.rounds).toEqual([
      { opponent: 2, color: "w", result: "0" },
      { opponent: 6, color: "b", result: "0" },
    ]);
  });
});

describe("TRF serialization", () => {
  it("round-trips the golden fixture byte for byte", () => {
    const fixture = exampleTournamentTrf();
    expect(serializeTrf(parseTrf(fixture))).toBe(fixture);
  });

  it("places fields on the exact columns from FIDE Handbook C.04.A", () => {
    const serialized = serializeTrf(parseTrf(exampleTournamentTrf()));
    const line = serialized.split("\n").find((l) => l.startsWith("001"))!;

    // Slices are 0-indexed; the spec's columns are 1-indexed.
    expect(line.slice(4, 8)).toBe("   1"); // start rank, cols 5-8
    expect(line[9]).toBe("w"); // sex, col 10
    expect(line.slice(14, 47)).toBe("Andersen, Anna".padEnd(33)); // name, cols 15-47
    expect(line.slice(48, 52)).toBe("2100"); // rating, cols 49-52
    expect(line.slice(53, 56)).toBe("NOR"); // federation, cols 54-56
    expect(line.slice(57, 68)).toBe("    1500001"); // FIDE id, cols 58-68
    expect(line.slice(69, 79)).toBe("1990/01/01"); // birth date, cols 70-79
    expect(line.slice(80, 84)).toBe(" 1.5"); // points, cols 81-84
    expect(line.slice(85, 89)).toBe("   1"); // rank, cols 86-89
    expect(line.slice(91, 95)).toBe("   4"); // round 1 opponent, cols 92-95
    expect(line[96]).toBe("w"); // round 1 color, col 97
    expect(line[98]).toBe("1"); // round 1 result, col 99
    expect(line.slice(101, 105)).toBe("   2"); // round 2 opponent, cols 102-105
    expect(line[106]).toBe("b"); // round 2 color, col 107
    expect(line[108]).toBe("="); // round 2 result, col 109
  });

  it("serializes byes with opponent 0000", () => {
    const trf = parseTrf(exampleTournamentTrf());
    trf.players[0]!.rounds.push({ opponent: null, color: "-", result: "U" });
    const line = serializeTrf(trf)
      .split("\n")
      .find((l) => l.startsWith("001"))!;
    expect(line.slice(111, 115)).toBe("0000"); // round 3 opponent, cols 112-115
    expect(line[116]).toBe("-");
    expect(line[118]).toBe("U");
  });
});
