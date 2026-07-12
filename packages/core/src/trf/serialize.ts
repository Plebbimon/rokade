import type { TrfFile, TrfPlayer } from "./types.js";

/**
 * Serialize a player back to a fixed-width 001 line per FIDE Handbook C.04.A:
 * cols 5-8 start rank, 10 sex, 11-13 title, 15-47 name, 49-52 rating,
 * 54-56 federation, 58-68 FIDE id, 70-79 birth date, 81-84 points, 86-89 rank,
 * then one 10-column block per round (opponent 92-95, color 97, result 99).
 */
function serializePlayer(player: TrfPlayer): string {
  let line =
    "001 " +
    String(player.startRank).padStart(4) +
    " " +
    (player.sex || " ").padEnd(1) +
    player.title.padStart(3) +
    " " +
    player.name.padEnd(33).slice(0, 33) +
    " " +
    (player.rating === null ? "0000" : String(player.rating).padStart(4)) +
    " " +
    player.federation.padEnd(3).slice(0, 3) +
    " " +
    player.fideId.padStart(11) +
    " " +
    player.birthDate.padEnd(10).slice(0, 10) +
    " " +
    player.points.toFixed(1).padStart(4) +
    " " +
    (player.rank === null ? "    " : String(player.rank).padStart(4));

  for (const round of player.rounds) {
    line +=
      "  " +
      (round.opponent === null ? "0000" : String(round.opponent).padStart(4)) +
      " " +
      round.color +
      " " +
      round.result;
  }

  return line.trimEnd();
}

/** Serialize a TrfFile to TRF16 text (with XXR extension when present). */
export function serializeTrf(trf: TrfFile): string {
  const lines: string[] = [];
  const push = (code: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") lines.push(`${code} ${value}`);
  };

  push("012", trf.tournamentName);
  push("022", trf.city);
  push("032", trf.federation);
  push("042", trf.dateBegin);
  push("052", trf.dateEnd);
  push("062", trf.numberOfPlayers);
  push("072", trf.numberOfRatedPlayers);
  push("082", trf.numberOfTeams);
  push("092", trf.tournamentType);
  push("102", trf.chiefArbiter);
  push("112", trf.deputyArbiters);
  push("122", trf.timeControl);
  if (trf.roundDatesLine !== undefined) lines.push(trf.roundDatesLine);
  push("XXR", trf.numberOfRounds);
  lines.push(...trf.configurationLines);
  lines.push(...trf.players.map(serializePlayer));
  lines.push(...trf.unknownLines);

  return lines.join("\n") + "\n";
}
