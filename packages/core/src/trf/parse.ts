import type { TrfColor, TrfFile, TrfPlayer, TrfResult, TrfRoundEntry } from "./types.js";

/**
 * Extract a 1-indexed, inclusive column range from a fixed-width line,
 * matching how FIDE Handbook C.04.A specifies TRF columns.
 */
function field(line: string, start: number, end: number): string {
  return line.slice(start - 1, end);
}

function intOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "0000") return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isNaN(value) ? null : value;
}

const RESULT_CHARS = new Set(["1", "0", "=", "+", "-", "W", "D", "L", "H", "F", "U", "Z", " "]);

function parsePlayerLine(rawLine: string): TrfPlayer {
  // Pad so column access never runs off the end of a short line.
  const line = rawLine.padEnd(99, " ");

  const rounds: TrfRoundEntry[] = [];
  // Round blocks are 10 columns wide: opponent 92-95, color 97, result 99, then +10 per round.
  for (let start = 92; start <= line.length; start += 10) {
    const block = field(line, start - 2, start + 7);
    if (block.trim() === "" && start > 92) break;
    const opponent = intOrNull(field(line, start, start + 3));
    const colorChar = field(line, start + 5, start + 5).trim();
    const resultChar = field(line, start + 7, start + 7);
    const color: TrfColor = colorChar === "w" || colorChar === "b" ? colorChar : "-";
    const result: TrfResult = RESULT_CHARS.has(resultChar) ? (resultChar as TrfResult) : " ";
    rounds.push({ opponent, color, result });
  }

  return {
    startRank: intOrNull(field(line, 5, 8)) ?? 0,
    sex: field(line, 10, 10).trim(),
    title: field(line, 11, 13).trim(),
    name: field(line, 15, 47).trim(),
    rating: intOrNull(field(line, 49, 52)),
    federation: field(line, 54, 56).trim(),
    fideId: field(line, 58, 68).trim(),
    birthDate: field(line, 70, 79).trim(),
    points: Number.parseFloat(field(line, 81, 84).trim() || "0"),
    rank: intOrNull(field(line, 86, 89)),
    rounds,
  };
}

/** Parse a TRF16 report. Unknown lines are preserved for later serialization. */
export function parseTrf(text: string): TrfFile {
  const trf: TrfFile = { configurationLines: [], players: [], unknownLines: [] };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const code = line.slice(0, 3);
    const value = line.slice(4).trim();

    switch (code) {
      case "012":
        trf.tournamentName = value;
        break;
      case "022":
        trf.city = value;
        break;
      case "032":
        trf.federation = value;
        break;
      case "042":
        trf.dateBegin = value;
        break;
      case "052":
        trf.dateEnd = value;
        break;
      case "062":
        trf.numberOfPlayers = intOrNull(value) ?? undefined;
        break;
      case "072":
        trf.numberOfRatedPlayers = intOrNull(value) ?? undefined;
        break;
      case "082":
        trf.numberOfTeams = intOrNull(value) ?? undefined;
        break;
      case "092":
        trf.tournamentType = value;
        break;
      case "102":
        trf.chiefArbiter = value;
        break;
      case "112":
        trf.deputyArbiters = value;
        break;
      case "122":
        trf.timeControl = value;
        break;
      case "132":
        trf.roundDatesLine = line;
        break;
      case "XXR":
        trf.numberOfRounds = intOrNull(value) ?? undefined;
        break;
      case "001":
        trf.players.push(parsePlayerLine(line));
        break;
      default:
        if (code.startsWith("XX") || code.startsWith("BB")) {
          trf.configurationLines.push(line);
        } else {
          trf.unknownLines.push(line);
        }
    }
  }

  return trf;
}
