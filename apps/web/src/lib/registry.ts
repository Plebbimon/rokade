import path from "node:path";
import { CsvMemberRegistry, type MemberRegistry } from "@rokade/registry";
import { findWorkspaceRoot } from "./store.js";

let defaultRegistry: MemberRegistry | undefined;

/**
 * The member registry behind player lookup. $ROKADE_MEMBER_LIST points at a
 * CSV (see @rokade/registry for the format); unset, the bundled fixture
 * makes lookup work out of the box. NSF's real public rating list becomes
 * an adapter behind the same interface.
 */
export function memberRegistry(): MemberRegistry {
  defaultRegistry ??= new CsvMemberRegistry(
    process.env["ROKADE_MEMBER_LIST"] ??
      path.join(
        findWorkspaceRoot(),
        "packages",
        "registry",
        "fixtures",
        "nsf-medlemsliste-fixtur.csv",
      ),
  );
  return defaultRegistry;
}
