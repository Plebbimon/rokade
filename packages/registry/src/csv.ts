import { readFile } from "node:fs/promises";
import type { MemberRegistry, RegistryPlayer } from "./registry.js";

/**
 * CSV-backed registry for development and self-hosted trials. Semicolon-
 * separated with a header row (the format Norwegian spreadsheets export):
 *
 *   id;name;club;federation;rating;fideId;birthYear;duesPaid
 *
 * Empty cells mean unknown; duesPaid is "ja"/"nei" or empty.
 */
export class CsvMemberRegistry implements MemberRegistry {
  private players: RegistryPlayer[] | undefined;

  constructor(
    private readonly path: string,
    private readonly source: "nsf" | "fide" = "nsf",
  ) {}

  private async load(): Promise<RegistryPlayer[]> {
    if (this.players) return this.players;
    const lines = (await readFile(this.path, "utf8")).split("\n").filter((l) => l.trim() !== "");
    this.players = lines.slice(1).map((line) => {
      const [id, name, club, federation, rating, fideId, birthYear, duesPaid] = line
        .split(";")
        .map((cell) => cell.trim());
      if (!id || !name) throw new Error(`ugyldig medlemslisterad: ${line}`);
      return {
        id,
        source: this.source,
        name,
        ...(club ? { club } : {}),
        ...(federation ? { federation } : {}),
        rating: rating ? Number.parseInt(rating, 10) : null,
        ...(fideId ? { fideId } : {}),
        ...(birthYear ? { birthYear: Number.parseInt(birthYear, 10) } : {}),
        ...(duesPaid ? { duesPaid: duesPaid.toLowerCase() === "ja" } : {}),
      };
    });
    return this.players;
  }

  async search(prefix: string, limit = 10): Promise<RegistryPlayer[]> {
    const needle = fold(prefix);
    if (needle === "") return [];
    return (await this.load())
      .filter((p) => nameParts(p.name).some((part) => fold(part).startsWith(needle)))
      .slice(0, limit);
  }

  async searchExtended(query: string, limit = 25): Promise<RegistryPlayer[]> {
    const needle = fold(query);
    if (needle === "") return [];
    return (await this.load())
      .filter((p) => fold(p.name).includes(needle))
      .slice(0, limit);
  }

  async get(id: string): Promise<RegistryPlayer | null> {
    return (await this.load()).find((p) => p.id === id) ?? null;
  }
}

/**
 * Case- and diacritic-insensitive comparison key. Folds true accents
 * (é -> e, ü -> u) for foreign names, but keeps æ/ø/å
 * intact: they are separate letters in Norwegian, not accented variants.
 * The protected letters are swapped to control characters before the
 * combining-mark strip, then restored.
 */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "")
    .replace(/ø/g, "")
    .replace(/å/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .replace(//g, "æ")
    .replace(//g, "ø")
    .replace(//g, "å");
}

/**
 * "Lastname, Firstname" -> each word of both names, so prefix search
 * matches either (TS6 searches given and family name).
 */
function nameParts(name: string): string[] {
  return name.split(/[,\s]+/).filter((part) => part !== "");
}
