import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Tournament } from "@rokade/core";

export interface StoredTournament {
  id: string;
  createdAt: string;
  tournament: Tournament;
}

/**
 * Persistence boundary for tournaments. The file implementation below is for
 * local, single-arbiter use; a PostgreSQL implementation replaces it behind
 * the same interface without touching the service layer or UI.
 */
export interface TournamentStore {
  list(): Promise<StoredTournament[]>;
  get(id: string): Promise<StoredTournament | null>;
  save(record: StoredTournament): Promise<void>;
}

const ID_PATTERN = /^[a-z0-9-]+$/;

export class FileTournamentStore implements TournamentStore {
  constructor(private readonly dir: string) {}

  private file(id: string): string {
    if (!ID_PATTERN.test(id)) throw new Error(`invalid tournament id: ${id}`);
    return path.join(this.dir, `${id}.json`);
  }

  async list(): Promise<StoredTournament[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const records = await Promise.all(
      names
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => {
          const raw = await readFile(path.join(this.dir, name), "utf8");
          return JSON.parse(raw) as StoredTournament;
        }),
    );
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<StoredTournament | null> {
    const file = this.file(id);
    try {
      return JSON.parse(await readFile(file, "utf8")) as StoredTournament;
    } catch {
      return null;
    }
  }

  async save(record: StoredTournament): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(record.id), JSON.stringify(record, null, 2) + "\n", "utf8");
  }
}

/** Walk up from cwd to the workspace root (marked by package-lock.json). */
export function findWorkspaceRoot(from = process.cwd()): string {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "package-lock.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return from;
}

let defaultStore: TournamentStore | undefined;

export function tournamentStore(): TournamentStore {
  defaultStore ??= new FileTournamentStore(
    process.env["ROKADE_DATA_DIR"] ?? path.join(findWorkspaceRoot(), ".data", "tournaments"),
  );
  return defaultStore;
}

/** Path to the bbpPairings binary: $BBP_PAIRINGS_BIN, or the vendored build. */
export function pairingEnginePath(): string {
  return (
    process.env["BBP_PAIRINGS_BIN"] ??
    path.join(findWorkspaceRoot(), "vendor", "bbpPairings", "bbpPairings.exe")
  );
}
