import { randomUUID } from "node:crypto";
import {
  addRound,
  bergerRound,
  bergerSchedule,
  recordResult,
  type GameResult,
  type Round,
  type Tournament,
  type TournamentFormat,
} from "@rokade/core";
import { pairTournamentNextRound } from "@rokade/pairing";
import { pairingEnginePath, type StoredTournament, type TournamentStore } from "./store.js";

const FORMATS = new Set<TournamentFormat>(["fide-swiss", "berger"]);
const RESULTS = new Set<GameResult>([
  "white-wins",
  "draw",
  "black-wins",
  "white-forfeit-win",
  "black-forfeit-win",
  "double-forfeit",
]);

export interface CreateTournamentInput {
  name: string;
  format: string;
  totalRounds: number;
  city?: string;
  /** Owning club; null in local file mode. */
  clubId?: string | null;
}

export async function createTournament(
  store: TournamentStore,
  input: CreateTournamentInput,
): Promise<string> {
  const name = input.name.trim();
  if (name === "") throw new Error("turneringen må ha et navn");
  if (!FORMATS.has(input.format as TournamentFormat)) {
    throw new Error(`ustøttet turneringsform: ${input.format}`);
  }
  const format = input.format as TournamentFormat;
  if (format === "fide-swiss" && !(Number.isInteger(input.totalRounds) && input.totalRounds >= 1)) {
    throw new Error("antall runder må være minst 1");
  }

  const record: StoredTournament = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    clubId: input.clubId ?? null,
    tournament: {
      name,
      format,
      // For Berger the round count follows from the field size; it is set
      // when round 1 is paired.
      totalRounds: format === "berger" ? 0 : input.totalRounds,
      players: [],
      rounds: [],
      ...(input.city?.trim() ? { city: input.city.trim() } : {}),
    },
  };
  await store.save(record);
  return record.id;
}

async function load(store: TournamentStore, id: string): Promise<StoredTournament> {
  const record = await store.get(id);
  if (!record) throw new Error(`fant ingen turnering med id ${id}`);
  return record;
}

export async function addPlayer(
  store: TournamentStore,
  id: string,
  input: { name: string; rating: number | null },
): Promise<void> {
  const record = await load(store, id);
  const name = input.name.trim();
  if (name === "") throw new Error("spilleren må ha et navn");
  if (record.tournament.format === "berger" && record.tournament.rounds.length > 0) {
    throw new Error("kan ikke legge til spillere etter at et berger-skjema er satt opp");
  }
  record.tournament.players.push({ id: randomUUID(), name, rating: input.rating });
  await store.save(record);
}

export async function pairNextRound(store: TournamentStore, id: string): Promise<Round> {
  const record = await load(store, id);
  let t = record.tournament;
  if (t.players.length < 2) throw new Error("minst to spillere kreves");

  let round: Round;
  switch (t.format) {
    case "berger": {
      if (t.rounds.length === 0) {
        t = { ...t, totalRounds: bergerSchedule(t.players.length).length };
      }
      round = bergerRound(t, t.rounds.length + 1);
      break;
    }
    case "fide-swiss":
      round = await pairTournamentNextRound(t, { binaryPath: pairingEnginePath() });
      break;
    default:
      throw new Error(`runde-oppsett for ${t.format} er ikke implementert ennå`);
  }

  record.tournament = addRound(t, round);
  await store.save(record);
  return round;
}

export async function setResult(
  store: TournamentStore,
  id: string,
  roundNumber: number,
  boardNumber: number,
  result: string,
): Promise<void> {
  if (!RESULTS.has(result as GameResult)) throw new Error(`ugyldig resultat: ${result}`);
  const record = await load(store, id);
  record.tournament = recordResult(
    record.tournament,
    roundNumber,
    boardNumber,
    result as GameResult,
  );
  await store.save(record);
}

/** True when every board in every recorded round has a result. */
export function allResultsRecorded(t: Tournament): boolean {
  return t.rounds.every((round) => round.boards.every((board) => board.result !== null));
}
