/**
 * The member-registry boundary: how Rokade resolves a typed name into an
 * identified player. Modeled on how TS6 integrates rating lists (see
 * docs/ts6-notes.md): candidates come from publicly available lists and
 * carry the ids that make federation reporting unambiguous. Implementations:
 * a CSV stub now, NSF's public rating list next, NSF's registry API (dues
 * status) when access lands.
 */

export interface RegistryPlayer {
  /** Stable id in the source list: NSF member number or FIDE id. */
  id: string;
  source: "nsf" | "fide";
  /** "Lastname, Firstname" — the domain's participant name format. */
  name: string;
  club?: string;
  /** Three-letter federation code, e.g. "NOR". */
  federation?: string;
  rating: number | null;
  fideId?: string;
  birthYear?: number;
  /**
   * Membership dues status, surfaced to the organizer during påmelding.
   * Undefined when the source doesn't know (rating lists don't; only the
   * federation's registry does).
   */
  duesPaid?: boolean;
}

export interface MemberRegistry {
  /**
   * Primary lookup while typing: prefix match on the given or family
   * name, case- and diacritic-insensitively. TS6's main-window search.
   */
  search(prefix: string, limit?: number): Promise<RegistryPlayer[]>;
  /** Extended lookup: substring match anywhere in the name. */
  searchExtended(query: string, limit?: number): Promise<RegistryPlayer[]>;
  /** Exact lookup, for re-validating a signup server-side. */
  get(id: string): Promise<RegistryPlayer | null>;
}
