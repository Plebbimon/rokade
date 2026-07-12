import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { standings } from "@rokade/core";
import {
  addPlayer,
  allResultsRecorded,
  createTournament,
  pairNextRound,
  setResult,
} from "./service.js";
import { FileTournamentStore, pairingEnginePath } from "./store.js";

const dir = await mkdtemp(path.join(tmpdir(), "rokade-store-"));
const store = new FileTournamentStore(dir);

afterAll(() => rm(dir, { recursive: true, force: true }));

describe("FileTournamentStore + service", () => {
  it("creates, lists and reloads tournaments", async () => {
    const id = await createTournament(store, {
      name: "Klubbmesterskapet 2026",
      format: "fide-swiss",
      totalRounds: 5,
      city: "Bergen",
    });
    const record = await store.get(id);
    expect(record?.tournament.name).toBe("Klubbmesterskapet 2026");
    expect(record?.tournament.city).toBe("Bergen");
    expect((await store.list()).some((r) => r.id === id)).toBe(true);
  });

  it("rejects invalid input", async () => {
    await expect(
      createTournament(store, { name: " ", format: "fide-swiss", totalRounds: 5 }),
    ).rejects.toThrow(/navn/);
    await expect(
      createTournament(store, { name: "X", format: "nsf-monrad", totalRounds: 5 }),
    ).rejects.toThrow(/ustøttet/);
    await expect(store.get("../../etc/passwd")).rejects.toThrow(/invalid tournament id/);
  });

  it("sets the Berger round count from the field when round 1 is set up", async () => {
    const id = await createTournament(store, {
      name: "Berger-gruppe A",
      format: "berger",
      totalRounds: 0,
    });
    for (const name of ["A", "B", "C", "D", "E"]) {
      await addPlayer(store, id, { name, rating: null });
    }
    await pairNextRound(store, id);

    const record = (await store.get(id))!;
    expect(record.tournament.totalRounds).toBe(5);
    expect(record.tournament.rounds[0]!.boards).toHaveLength(2);
    expect(record.tournament.rounds[0]!.byes).toHaveLength(1);
  });
});

describe.skipIf(!existsSync(pairingEnginePath()))("full Swiss flow (engine)", () => {
  it("creates, registers, pairs, records and ranks", async () => {
    const id = await createTournament(store, {
      name: "Hurtigsjakk",
      format: "fide-swiss",
      totalRounds: 3,
    });
    const names: [string, number][] = [
      ["Andersen, Anna", 2100],
      ["Berg, Bjorn", 2050],
      ["Carlsen, Cecilie", 1980],
      ["Dahl, David", 1900],
    ];
    for (const [name, rating] of names) {
      await addPlayer(store, id, { name, rating });
    }

    const round1 = await pairNextRound(store, id);
    expect(round1.number).toBe(1);
    expect(round1.boards).toHaveLength(2);

    let record = (await store.get(id))!;
    expect(allResultsRecorded(record.tournament)).toBe(false);
    for (const board of round1.boards) {
      await setResult(store, id, 1, board.boardNumber, "white-wins");
    }

    record = (await store.get(id))!;
    expect(allResultsRecorded(record.tournament)).toBe(true);

    const round2 = await pairNextRound(store, id);
    expect(round2.number).toBe(2);
    expect(round2.boards).toHaveLength(2);

    record = (await store.get(id))!;
    const table = standings(record.tournament, { tiebreaks: ["buchholz"] });
    expect(table[0]!.points).toBe(1);
    expect(table.filter((e) => e.points === 1)).toHaveLength(2);
  });
});
