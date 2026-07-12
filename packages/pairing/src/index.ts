import { serializeTrf, toTrf } from "@rokade/core";
import type { Board, Round, RoundBye, Tournament } from "@rokade/core";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** One pairing for the next round. `black: null` means a pairing-allocated bye. */
export interface Pairing {
  white: number;
  black: number | null;
}

export interface PairOptions {
  /** Path to the bbpPairings binary. Defaults to $BBP_PAIRINGS_BIN, then "bbpPairings" on $PATH. */
  binaryPath?: string;
}

/** bbpPairings exit codes, per its README. */
const EXIT_MESSAGES: Record<number, string> = {
  1: "no valid pairing exists for the tournament",
  2: "the request was unexpected (malformed TRF or unsupported rules)",
  3: "a limit was exceeded (e.g. too many players)",
  4: "file system error",
};

/**
 * Compute the next round's pairings for a tournament using the FIDE Dutch
 * system, by invoking the bbpPairings engine on a TRF(bx) report.
 *
 * The TRF must include the XXR line (total number of rounds); the engine
 * pairs the round after the last one recorded on the player lines.
 */
export async function pairNextRound(trf: string, options: PairOptions = {}): Promise<Pairing[]> {
  const binary = options.binaryPath ?? process.env["BBP_PAIRINGS_BIN"] ?? "bbpPairings";

  const dir = await mkdtemp(join(tmpdir(), "rokade-pairing-"));
  try {
    const inputPath = join(dir, "input.trf");
    const outputPath = join(dir, "pairings.txt");
    await writeFile(inputPath, trf, "utf8");

    try {
      await execFileAsync(binary, ["--dutch", inputPath, "-p", outputPath]);
    } catch (error) {
      const code = (error as { code?: number }).code;
      const reason = (typeof code === "number" && EXIT_MESSAGES[code]) || String(error);
      throw new Error(`bbpPairings failed: ${reason}`);
    }

    return parsePairingOutput(await readFile(outputPath, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Pair the next round of a domain Tournament with the FIDE Dutch system.
 * Returns a Round (with undecided boards) ready for `addRound`.
 */
export async function pairTournamentNextRound(
  tournament: Tournament,
  options: PairOptions = {},
): Promise<Round> {
  const pairings = await pairNextRound(serializeTrf(toTrf(tournament)), options);

  const byStartRank = (rank: number) => {
    const player = tournament.players[rank - 1];
    if (!player) throw new Error(`engine returned unknown start rank ${rank}`);
    return player.id;
  };

  const boards: Board[] = [];
  const byes: RoundBye[] = [];
  for (const pairing of pairings) {
    if (pairing.black === null) {
      byes.push({ player: byStartRank(pairing.white), type: "pairing" });
    } else {
      boards.push({
        boardNumber: boards.length + 1,
        white: byStartRank(pairing.white),
        black: byStartRank(pairing.black),
        result: null,
      });
    }
  }

  return { number: tournament.rounds.length + 1, boards, byes };
}

/**
 * Parse bbpPairings' pairing output: the first line is the number of
 * pairings, then one "<white> <black>" line per board, where 0 as the
 * second number marks a pairing-allocated bye.
 */
export function parsePairingOutput(text: string): Pairing[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  const count = Number.parseInt(lines[0] ?? "", 10);
  if (Number.isNaN(count)) {
    throw new Error(`unexpected pairing output: ${JSON.stringify(lines[0])}`);
  }

  return lines.slice(1, 1 + count).map((line) => {
    const [white, black] = line.split(/\s+/).map((n) => Number.parseInt(n, 10));
    if (white === undefined || black === undefined || Number.isNaN(white) || Number.isNaN(black)) {
      throw new Error(`unexpected pairing line: ${JSON.stringify(line)}`);
    }
    return { white, black: black === 0 ? null : black };
  });
}
