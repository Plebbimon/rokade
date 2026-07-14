"use server";

import { revalidatePath } from "next/cache";
import { createClub, addMemberByEmail, membershipRole, type ClubRole } from "@rokade/db";
import { requireUser } from "./auth.js";
import { db } from "./store.js";

export async function createClubAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) throw new Error("klubber finnes bare i flerbrukermodus");
  await createClub(db(), String(formData.get("name") ?? ""), user.id);
  revalidatePath("/klubber");
}

export async function addMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) throw new Error("klubber finnes bare i flerbrukermodus");

  const clubId = String(formData.get("clubId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "admin" && role !== "arbiter") throw new Error(`ukjent rolle: ${role}`);
  if (!user.nsfAdmin && (await membershipRole(db(), clubId, user.id)) !== "admin") {
    throw new Error("bare klubbens administrator kan legge til medlemmer");
  }

  await addMemberByEmail(db(), clubId, String(formData.get("email") ?? ""), role as ClubRole);
  revalidatePath("/klubber");
}
