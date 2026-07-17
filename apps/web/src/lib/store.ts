import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredTournament, TournamentStore } from "@rokade/core";
import { createDb, PgTournamentStore, type Db } from "@rokade/db";

export type { StoredTournament, TournamentStore } from "@rokade/core";

let sharedDb: Db | undefined;

/**
 * Shared connection pool for everything Postgres-backed (tournaments, auth).
 * Only call when DATABASE_URL is set; multi-user features are Postgres-only.
 */
export function db(): Db {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL er ikke satt – flerbrukermodus krever PostgreSQL");
  sharedDb ??= createDb(url);
  return sharedDb;
}

/** True when running against PostgreSQL (auth and orgs active). */
export function isMultiUser(): boolean {
  return Boolean(process.env["DATABASE_URL"]);
}

const ID_PATTERN = /^[a-z0-9-]+$/;

export class FileTournamentStore implements TournamentStore {
  constructor(private readonly dir: string) {}

  private file(id: string): string {
    if (!ID_PATTERN.test(id)) throw new Error(`invalid tournament id: ${id}`);
    return path.join(this.dir, `${id}.json`);
  }

  private parse(raw: string): StoredTournament {
    const record = JSON.parse(raw) as StoredTournament;
    // Files written before club ownership / publishing existed lack these.
    record.clubId ??= null;
    record.publishedAt ??= null;
    return record;
  }

  async list(clubIds?: string[]): Promise<StoredTournament[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const records = await Promise.all(
      names
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => this.parse(await readFile(path.join(this.dir, name), "utf8"))),
    );
    return records
      .filter((r) => !clubIds || (r.clubId !== null && clubIds.includes(r.clubId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<StoredTournament | null> {
    const file = this.file(id);
    try {
      return this.parse(await readFile(file, "utf8"));
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

/**
 * DATABASE_URL set -> PostgreSQL (the multi-user path, Docker Compose in
 * dev); unset -> file store, so the app still runs with zero setup.
 */
export function tournamentStore(): TournamentStore {
  defaultStore ??= isMultiUser()
    ? new PgTournamentStore(db())
    : new FileTournamentStore(
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
