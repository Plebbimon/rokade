import { readFileSync } from "node:fs";
import type { Tournament } from "../model/types.js";

/**
 * A 6-player, 5-round Swiss tournament with 2 rounds played.
 * Used as the golden file for TRF round-trip tests and as input
 * for pairing-engine integration tests.
 */
export function exampleTournamentTrf(): string {
  return readFileSync(new URL("./fixtures/eksempel-2026.trf", import.meta.url), "utf8");
}

/**
 * The same tournament as {@link exampleTournamentTrf}, expressed in the
 * domain model. `toTrf` + `serializeTrf` of this must reproduce the golden
 * file byte for byte.
 */
export function exampleTournament(): Tournament {
  return {
    name: "Eksempelturneringen 2026",
    format: "fide-swiss",
    totalRounds: 5,
    city: "Oslo",
    federation: "NOR",
    dateBegin: "2026/01/10",
    dateEnd: "2026/01/11",
    chiefArbiter: "Hansen, Kari",
    timeControl: "90 min + 30 sec/move",
    players: [
      { id: "anna", name: "Andersen, Anna", rating: 2100, sex: "w", federation: "NOR", fideId: "1500001", birthDate: "1990/01/01" },
      { id: "bjorn", name: "Berg, Bjorn", rating: 2050, sex: "m", federation: "NOR", fideId: "1500002", birthDate: "1988/05/12" },
      { id: "cecilie", name: "Carlsen, Cecilie", rating: 1980, sex: "w", federation: "NOR", fideId: "1500003", birthDate: "1995/09/23" },
      { id: "david", name: "Dahl, David", rating: 1900, sex: "m", federation: "NOR", fideId: "1500004", birthDate: "1979/03/30" },
      { id: "erik", name: "Eriksen, Erik", rating: 1850, sex: "m", federation: "NOR", fideId: "1500005", birthDate: "2001/11/05" },
      { id: "frida", name: "Foss, Frida", rating: 1800, sex: "w", federation: "NOR", fideId: "1500006", birthDate: "1998/07/17" },
    ],
    rounds: [
      {
        number: 1,
        boards: [
          { boardNumber: 1, white: "anna", black: "david", result: "white-wins" },
          { boardNumber: 2, white: "erik", black: "bjorn", result: "black-wins" },
          { boardNumber: 3, white: "cecilie", black: "frida", result: "draw" },
        ],
        byes: [],
      },
      {
        number: 2,
        boards: [
          { boardNumber: 1, white: "bjorn", black: "anna", result: "draw" },
          { boardNumber: 2, white: "frida", black: "erik", result: "white-wins" },
          { boardNumber: 3, white: "david", black: "cecilie", result: "white-wins" },
        ],
        byes: [],
      },
    ],
  };
}
