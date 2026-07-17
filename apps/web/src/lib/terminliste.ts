import type { StoredTournament } from "@rokade/core";

export type TerminStatus = "ongoing" | "upcoming" | "finished";

/** Today as "yyyy/mm/dd" (Europe/Oslo), matching the domain date format. */
function todayDomain(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA yields "yyyy-mm-dd"; the domain uses slashes.
  return parts.replace(/-/g, "/");
}

/**
 * Where a published tournament sits on the calendar. Dates are fixed-format
 * "yyyy/mm/dd", so lexical comparison is chronological.
 */
export function terminStatus(record: StoredTournament, today: string = todayDomain()): TerminStatus {
  const t = record.tournament;
  const fullyPlayed =
    t.totalRounds > 0 &&
    t.rounds.length >= t.totalRounds &&
    t.rounds.every((round) => round.boards.every((board) => board.result !== null));
  if (fullyPlayed || (t.dateEnd && t.dateEnd < today)) return "finished";
  if (t.dateBegin && t.dateBegin > today) return "upcoming";
  return "ongoing";
}

/** "2026/08/01" → "01.08.2026". */
export function formatDomainDate(d: string): string {
  const [year, month, day] = d.split("/");
  return `${day}.${month}.${year}`;
}
