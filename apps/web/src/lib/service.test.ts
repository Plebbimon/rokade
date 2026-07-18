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
  setPublished,
  setResult,
  signupIsOpen,
  updateSignupSettings,
  updateTournamentInfo,
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

  it("updates announcement info and converts dates to the domain format", async () => {
    const id = await createTournament(store, {
      name: "Vårturneringen",
      format: "fide-swiss",
      totalRounds: 5,
    });
    await updateTournamentInfo(store, id, {
      dateBegin: "2026-08-01",
      dateEnd: "2026-08-02",
      timeControl: "90+30",
      invitation: "Velkommen til vårturneringen!",
    });
    let t = (await store.get(id))!.tournament;
    expect(t.dateBegin).toBe("2026/08/01");
    expect(t.dateEnd).toBe("2026/08/02");
    expect(t.timeControl).toBe("90+30");
    expect(t.invitation).toBe("Velkommen til vårturneringen!");

    // Blank fields clear; bad input rejects.
    await updateTournamentInfo(store, id, {
      dateBegin: "2026-08-01",
      dateEnd: "",
      timeControl: "",
      invitation: "Oppdatert",
    });
    t = (await store.get(id))!.tournament;
    expect(t.dateEnd).toBeUndefined();
    expect(t.timeControl).toBeUndefined();
    await expect(
      updateTournamentInfo(store, id, {
        dateBegin: "1. august",
        dateEnd: "",
        timeControl: "",
        invitation: "",
      }),
    ).rejects.toThrow(/ugyldig dato/);
    await expect(
      updateTournamentInfo(store, id, {
        dateBegin: "2026-08-02",
        dateEnd: "2026-08-01",
        timeControl: "",
        invitation: "",
      }),
    ).rejects.toThrow(/sluttdatoen/);
  });

  it("publishes and retracts", async () => {
    const id = await createTournament(store, {
      name: "Publiseringstest",
      format: "fide-swiss",
      totalRounds: 5,
    });
    expect((await store.get(id))!.publishedAt).toBeNull();
    await setPublished(store, id, true);
    expect((await store.get(id))!.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await setPublished(store, id, false);
    expect((await store.get(id))!.publishedAt).toBeNull();
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

describe("signup settings", () => {
  it("stores registry identity fields on added players", async () => {
    const id = await createTournament(store, {
      name: "Identitetstest",
      format: "fide-swiss",
      totalRounds: 5,
    });
    await addPlayer(store, id, {
      name: "Andersen, Anna",
      rating: 1850,
      club: "Bergen SK",
      federation: "NOR",
      fideId: "1500000",
      nsfMemberNumber: "12345",
    });
    const player = (await store.get(id))!.tournament.players[0]!;
    expect(player.club).toBe("Bergen SK");
    expect(player.federation).toBe("NOR");
    expect(player.fideId).toBe("1500000");
    expect(player.nsfMemberNumber).toBe("12345");
  });

  it("opens, closes and validates the deadline", async () => {
    const id = await createTournament(store, {
      name: "Påmeldingstest",
      format: "fide-swiss",
      totalRounds: 5,
    });
    await updateSignupSettings(store, id, { open: true, deadline: "2026-08-01" });
    let t = (await store.get(id))!.tournament;
    expect(t.signupOpen).toBe(true);
    expect(t.signupDeadline).toBe("2026/08/01");

    await updateSignupSettings(store, id, { open: false, deadline: "" });
    t = (await store.get(id))!.tournament;
    expect(t.signupOpen).toBeUndefined();
    expect(t.signupDeadline).toBeUndefined();

    await expect(
      updateSignupSettings(store, id, { open: true, deadline: "1. august" }),
    ).rejects.toThrow(/ugyldig dato/);
  });

  it("is only open when published, opened and within the deadline", async () => {
    const id = await createTournament(store, {
      name: "Åpningstest",
      format: "fide-swiss",
      totalRounds: 5,
    });
    await updateSignupSettings(store, id, { open: true, deadline: "2026-08-01" });

    // Draft: never open, regardless of settings.
    let record = (await store.get(id))!;
    expect(signupIsOpen(record, new Date(2026, 6, 1))).toBe(false);

    await setPublished(store, id, true);
    record = (await store.get(id))!;
    expect(signupIsOpen(record, new Date(2026, 6, 1))).toBe(true);
    // Deadline day is inclusive; the day after is closed.
    expect(signupIsOpen(record, new Date(2026, 7, 1))).toBe(true);
    expect(signupIsOpen(record, new Date(2026, 7, 2))).toBe(false);

    // No deadline: open indefinitely while signupOpen is set.
    await updateSignupSettings(store, id, { open: true, deadline: "" });
    record = (await store.get(id))!;
    expect(signupIsOpen(record, new Date(2030, 0, 1))).toBe(true);

    // Toggled off: closed.
    await updateSignupSettings(store, id, { open: false, deadline: "" });
    record = (await store.get(id))!;
    expect(signupIsOpen(record, new Date(2026, 6, 1))).toBe(false);
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
