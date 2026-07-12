import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addRound } from "@rokade/core";
import { exampleTournament, exampleTournamentTrf } from "@rokade/core/fixtures";
import { pairNextRound, pairTournamentNextRound, parsePairingOutput } from "./index.js";

describe("parsePairingOutput", () => {
  it("parses boards and byes", () => {
    expect(parsePairingOutput("3\n1 2\n6 4\n3 0\n")).toEqual([
      { white: 1, black: 2 },
      { white: 6, black: 4 },
      { white: 3, black: null },
    ]);
  });

  it("rejects malformed output", () => {
    expect(() => parsePairingOutput("not a number\n")).toThrow(/unexpected pairing output/);
  });
});

// Integration test against the real engine. Skipped unless the binary exists;
// build it with `npm run fetch:bbppairings` or point $BBP_PAIRINGS_BIN at it.
const vendoredBinary = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
  "vendor/bbpPairings/bbpPairings.exe",
);
const binaryPath = process.env["BBP_PAIRINGS_BIN"] ?? vendoredBinary;
const binaryAvailable = existsSync(binaryPath);

describe.skipIf(!binaryAvailable)("pairNextRound (bbpPairings integration)", () => {
  it("pairs round 3 of the example tournament", async () => {
    const pairings = await pairNextRound(exampleTournamentTrf(), { binaryPath });

    expect(pairings).toHaveLength(3);
    const seen = pairings.flatMap((p) => [p.white, p.black]).sort();
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("pairs a domain Tournament into an addRound-ready Round", async () => {
    const tournament = exampleTournament();
    const round = await pairTournamentNextRound(tournament, { binaryPath });

    expect(round.number).toBe(3);
    expect(round.boards).toHaveLength(3);
    expect(round.byes).toHaveLength(0);
    const seen = round.boards.flatMap((b) => [b.white, b.black]).sort();
    expect(seen).toEqual(["anna", "bjorn", "cecilie", "david", "erik", "frida"]);

    // The engine's output must be directly usable by the domain model.
    const updated = addRound(tournament, round);
    expect(updated.rounds).toHaveLength(3);
  });
});
