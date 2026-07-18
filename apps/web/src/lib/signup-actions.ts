"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  confirmSignup,
  createSignup,
  decideSignup,
  getSignup,
  isValidEmail,
  normalizeEmail,
  pruneSignups,
  reopenSignup,
  type CreateSignupInput,
} from "@rokade/db";
import { accessibleTournament } from "./access.js";
import { audit } from "./audit.js";
import { requestOrigin, requireUser } from "./auth.js";
import { mailer } from "./mailer.js";
import { memberRegistry } from "./registry.js";
import { addPlayer, signupIsOpen, updateSignupSettings } from "./service.js";
import { db, isMultiUser, tournamentStore } from "./store.js";

/**
 * Public form submission — no login. The tournament must be published with
 * signup open; everything else redirects back to the form with ?feil=.
 * Anti-spam is the e-mail confirmation: nothing reaches the arbiter's
 * queue for approval until the entrant clicks the mailed link.
 */
export async function submitSignupAction(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!isMultiUser()) throw new Error("påmelding krever flerbrukermodus");
  const record = await tournamentStore().get(tournamentId);
  if (!record || !signupIsOpen(record)) {
    throw new Error("påmeldingen er ikke åpen for denne turneringen");
  }
  const formPath = `/turneringer/${record.id}/pamelding`;

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) redirect(`${formPath}?feil=epost`);

  const registryId = String(formData.get("registryId") ?? "").trim();
  let input: CreateSignupInput;
  if (registryId !== "") {
    // The entrant picked a lookup candidate. Re-resolve it server-side:
    // the registry is the truth, hidden form fields are only a claim.
    const player = await memberRegistry().get(registryId);
    if (!player) redirect(`${formPath}?feil=oppslag`);
    input = {
      tournamentId: record.id,
      email,
      name: player.name,
      rating: player.rating,
      ...(player.club ? { club: player.club } : {}),
      ...(player.federation ? { federation: player.federation } : {}),
      ...(player.fideId ? { fideId: player.fideId } : {}),
      registrySource: player.source,
      registryId: player.id,
    };
  } else {
    // Free-form entry, for players not on any list yet.
    const name = String(formData.get("name") ?? "").trim();
    if (name === "") redirect(`${formPath}?feil=navn`);
    const ratingRaw = String(formData.get("rating") ?? "").trim();
    const rating = ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10);
    if (rating !== null && Number.isNaN(rating)) redirect(`${formPath}?feil=rating`);
    const club = String(formData.get("club") ?? "").trim();
    input = { tournamentId: record.id, email, name, rating, ...(club ? { club } : {}) };
  }

  const token = await createSignup(db(), input);
  const url = `${await requestOrigin()}${formPath}/bekreft?token=${encodeURIComponent(token)}`;
  await mailer().sendSignupConfirmation(email, record.tournament.name, url);
  // Housekeeping on the write path, like auth does: expired unconfirmed
  // signups leave the queue's counts honest.
  await pruneSignups(db());
  redirect(`${formPath}/sendt`);
}

/** POST target of the confirm page's button (links must not self-confirm). */
export async function completeSignupConfirmAction(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const token = String(formData.get("token") ?? "");
  const signup = token === "" ? null : await confirmSignup(db(), token);
  const base = `/turneringer/${signup?.tournamentId ?? tournamentId}/pamelding/bekreft`;
  redirect(`${base}?status=${signup ? "ok" : "ugyldig"}`);
}

/**
 * Arbiter decision on a confirmed signup. Approval is claim-first: the
 * atomic status flip prevents a double-click adding the player twice, and
 * a failed player-add (e.g. a locked Berger field) reopens the signup.
 */
export async function decideSignupAction(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const user = await requireUser();
  const record = await accessibleTournament(tournamentId);
  if (!record) throw new Error("fant ikke turneringen, eller du har ikke tilgang til den");

  const signupId = String(formData.get("signupId") ?? "");
  const signup = await getSignup(db(), signupId);
  // The signup must belong to the tournament the arbiter has access to.
  if (!signup || signup.tournamentId !== record.id) throw new Error("fant ikke påmeldingen");

  const approve = String(formData.get("decision")) === "approve";
  const decided = await decideSignup(db(), signup.id, approve ? "approved" : "rejected");
  if (!decided) throw new Error("påmeldingen er allerede avgjort, eller ikke bekreftet");

  if (approve) {
    try {
      await addPlayer(tournamentStore(), record.id, {
        name: decided.name,
        rating: decided.rating,
        ...(decided.club ? { club: decided.club } : {}),
        ...(decided.federation ? { federation: decided.federation } : {}),
        ...(decided.fideId ? { fideId: decided.fideId } : {}),
        ...(decided.registrySource === "nsf" && decided.registryId
          ? { nsfMemberNumber: decided.registryId }
          : {}),
      });
    } catch (error) {
      await reopenSignup(db(), decided.id);
      throw error;
    }
  }
  await audit(user, approve ? "signup.approve" : "signup.reject", {
    clubId: record.clubId,
    tournamentId: record.id,
    details: { signupId: decided.id, name: decided.name },
  });
  revalidatePath(`/turneringer/${record.id}`);
}

export async function updateSignupSettingsAction(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const user = await requireUser();
  const record = await accessibleTournament(tournamentId);
  if (!record) throw new Error("fant ikke turneringen, eller du har ikke tilgang til den");

  const open = String(formData.get("signupOpen")) === "true";
  const deadline = String(formData.get("signupDeadline") ?? "");
  await updateSignupSettings(tournamentStore(), record.id, { open, deadline });
  await audit(user, "signup.settings", {
    clubId: record.clubId,
    tournamentId: record.id,
    details: { open, deadline: deadline.trim() || null },
  });
  revalidatePath(`/turneringer/${record.id}`);
  revalidatePath(`/turneringer/${record.id}/pamelding`);
}
