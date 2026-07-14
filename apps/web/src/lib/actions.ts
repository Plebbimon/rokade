"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { membershipRole } from "@rokade/db";
import { accessibleTournament } from "./access.js";
import { requireUser } from "./auth.js";
import { addPlayer, createTournament, pairNextRound, setResult } from "./service.js";
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

  const id = await createTournament(tournamentStore(), {
    name: String(formData.get("name") ?? ""),
    format: String(formData.get("format") ?? ""),
    totalRounds: Number.parseInt(String(formData.get("totalRounds") ?? "0"), 10),
    city: String(formData.get("city") ?? ""),
    clubId,
  });
  revalidatePath("/turneringer");
  redirect(`/turneringer/${id}`);
}

/** Access check shared by all actions that modify an existing tournament. */
async function requireAccess(id: string): Promise<void> {
  await requireUser();
  if (!(await accessibleTournament(id))) {
    throw new Error("fant ikke turneringen, eller du har ikke tilgang til den");
  }
}

export async function addPlayerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  await requireAccess(id);
  const ratingRaw = String(formData.get("rating") ?? "").trim();
  await addPlayer(tournamentStore(), id, {
    name: String(formData.get("name") ?? ""),
    rating: ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10),
  });
  revalidatePath(`/turneringer/${id}`);
}

export async function pairNextRoundAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  await requireAccess(id);
  await pairNextRound(tournamentStore(), id);
  revalidatePath(`/turneringer/${id}`);
}

export async function setResultAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  await requireAccess(id);
  await setResult(
    tournamentStore(),
    id,
    Number.parseInt(String(formData.get("round")), 10),
    Number.parseInt(String(formData.get("board")), 10),
    String(formData.get("result") ?? ""),
  );
  revalidatePath(`/turneringer/${id}`);
}
