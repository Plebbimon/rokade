"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addPlayer, createTournament, pairNextRound, setResult } from "./service.js";
import { tournamentStore } from "./store.js";

export async function createTournamentAction(formData: FormData): Promise<void> {
  const id = await createTournament(tournamentStore(), {
    name: String(formData.get("name") ?? ""),
    format: String(formData.get("format") ?? ""),
    totalRounds: Number.parseInt(String(formData.get("totalRounds") ?? "0"), 10),
    city: String(formData.get("city") ?? ""),
  });
  revalidatePath("/turneringer");
  redirect(`/turneringer/${id}`);
}

export async function addPlayerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  const ratingRaw = String(formData.get("rating") ?? "").trim();
  await addPlayer(tournamentStore(), id, {
    name: String(formData.get("name") ?? ""),
    rating: ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10),
  });
  revalidatePath(`/turneringer/${id}`);
}

export async function pairNextRoundAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  await pairNextRound(tournamentStore(), id);
  revalidatePath(`/turneringer/${id}`);
}

export async function setResultAction(formData: FormData): Promise<void> {
  const id = String(formData.get("tournamentId"));
  await setResult(
    tournamentStore(),
    id,
    Number.parseInt(String(formData.get("round")), 10),
    Number.parseInt(String(formData.get("board")), 10),
    String(formData.get("result") ?? ""),
  );
  revalidatePath(`/turneringer/${id}`);
}
