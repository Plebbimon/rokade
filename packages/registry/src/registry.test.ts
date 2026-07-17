import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CsvMemberRegistry } from "./csv.js";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "nsf-medlemsliste-fixtur.csv",
);
const registry = new CsvMemberRegistry(fixture);

describe("CsvMemberRegistry", () => {
  it("prefix-matches on given and family name, case-insensitively", async () => {
    const byLast = await registry.search("sør");
    expect(byLast.map((p) => p.name)).toContain("Sørensen, Håkon");

    const byFirst = await registry.search("Håk");
    expect(byFirst.map((p) => p.name)).toEqual(["Sørensen, Håkon"]);
  });

  it("keeps æ/ø/å distinct but folds true accents", async () => {
    // "so" must not match "Sørensen" (ø is its own letter)...
    expect((await registry.search("so")).map((p) => p.name)).toEqual(["Brekke, Solveig"]);
    // ...while ø-prefixes match ø-names.
    expect((await registry.search("øst")).map((p) => p.name)).toEqual(["Østby, Kristian"]);
  });

  it("substring search finds mid-name matches that prefix search misses", async () => {
    expect(await registry.search("jærheim")).toEqual([]);
    const hits = await registry.searchExtended("jærheim");
    expect(hits.map((p) => p.name)).toEqual(["Njærheim, Odd"]);
  });

  it("resolves a player by id with full details", async () => {
    const p = await registry.get("101877");
    expect(p).toMatchObject({
      name: "Løvås, Petter",
      club: "Trondheim Sjakkforening",
      rating: 1998,
      fideId: "1512743",
      duesPaid: false,
      source: "nsf",
    });
    expect(await registry.get("999999")).toBeNull();
  });

  it("handles unknown cells: missing fideId and unrated players", async () => {
    const p = await registry.get("102308");
    expect(p?.fideId).toBeUndefined();
    expect(p?.duesPaid).toBe(true);
    const unrated = (await registry.searchExtended("Wold")).at(0);
    expect(unrated?.rating).toBe(1264);
  });

  it("empty queries return nothing", async () => {
    expect(await registry.search("  ")).toEqual([]);
    expect(await registry.searchExtended("")).toEqual([]);
  });
});
