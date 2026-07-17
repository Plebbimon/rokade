"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { membershipRole, type AuthUser } from "@rokade/db";
import type { StoredTournament } from "@rokade/core";
import { accessibleTournament } from "./access.js";
import { audit } from "./audit.js";
import { requireUser } from "./auth.js";
import {
  addPlayer,
  createTournament,
  pairNextRound,
  setPublished,
  setResult,
  updateTournamentInfo,
} from "./service.js";
import { db, tournamentStore } from "./store.js";

export async function createTournamentAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  // In multi-user mode every tournament belongs to a club the creator is a
  // member of; in file mode there are no clubs.
  let clubId: string | null = null;
  if (user) {
    clubId = String(formData.get("clubId") ?? "");
    if (clubId === "") redirect("/klubber");
    if (!user.nsfAdmin && !(await membershipRole(db(), clubId, user.id))) {
      throw new Error("du er ikke medlem av denne klubben");
    }
  }

  const name = String(formData.get("name") ?? "");
  const format = String(formData.get("format") ?? "");
  const id = await createTournament(tournamentStore(), {
    name,
    format,
    totalRounds: Number.parseInt(String(formData.get("totalRounds") ?? "0"), 10),
    city: String(formData.get("city") ?? ""),
    clubId,
  });
  await audit(user, "tournament.create", {
    clubId,
    tournamentId: id,
    details: { name: name.trim(), format },
  });
  revalidatePath("/turneringer");
  redirect(`/turneringer/${id}`);
}

/** Access check shared by all actions that modify an existing tournament. */
async function requireAccess(
  id: string,
): Promise<{ user: AuthUser | null; record: StoredTournament }> {
  const user = await requireUser();
  const record = await accessibleTournament(id);
  if (!record) throw new Error("fant ikke turneringen, eller du har ikke tilgang til den");
  return { user, record };
}

export async function updateTournamentInfoAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const { user, record } = await requireAccess(id);
  await updateTournamentInfo(tournamentStore(), id, {
    dateBegin: String(formData.get("dateBegin") ?? ""),
    dateEnd: String(formData.get("dateEnd") ?? ""),
    timeControl: String(formData.get("timeControl") ?? ""),
    invitation: String(formData.get("invitation") ?? ""),
  });
  await audit(user, "tournament.update", { clubId: record.clubId, tournamentId: id });
  revalidatePath(`/turneringer/${id}`);
}

export async function setPublishedAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const { user, record } = await requireAccess(id);
  const published = String(formData.get("published")) === "true";
  await setPublished(tournamentStore(), id, published);
  await audit(user, published ? "tournament.publish" : "tournament.unpublish", {
    clubId: record.clubId,
    tournamentId: id,
  });
  revalidatePath(`/turneringer/${id}`);
  revalidatePath("/terminliste");
}

export async function addPlayerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const { user, record } = await requireAccess(id);
  const ratingRaw = String(formData.get("rating") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rating = ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10);
  await addPlayer(tournamentStore(), id, { name, rating });
  await audit(user, "player.add", {
    clubId: record.clubId,
    tournamentId: id,
    details: { name, rating },
  });
  revalidatePath(`/turneringer/${id}`);
}

export async function pairNextRoundAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const { user, record } = await requireAccess(id);
  const round = await pairNextRound(tournamentStore(), id);
  await audit(user, "round.pair", {
    clubId: record.clubId,
    tournamentId: id,
    details: { round: round.number },
  });
  revalidatePath(`/turneringer/${id}`);
}

export async function setResultAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const { user, record } = await requireAccess(id);
  const round = Number.parseInt(String(formData.get("round")), 10);
  const board = Number.parseInt(String(formData.get("board")), 10);
  const result = String(formData.get("result") ?? "");
  await setResult(tournamentStore(), id, round, board, result);
  await audit(user, "result.set", {
    clubId: record.clubId,
    tournamentId: id,
    details: { round, board, result },
  });
  revalidatePath(`/turneringer/${id}`);
}
