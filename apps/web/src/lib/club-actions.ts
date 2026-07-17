"use server";

import { revalidatePath } from "next/cache";
import {
  createClub,
  addMemberByEmail,
  membershipRole,
  normalizeEmail,
  type ClubRole,
} from "@rokade/db";
import { audit } from "./audit.js";
import { requireUser } from "./auth.js";
import { db } from "./store.js";

export async function createClubAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) throw new Error("klubber finnes bare i flerbrukermodus");
  const name = String(formData.get("name") ?? "").trim();
  const clubId = await createClub(db(), name, user.id);
  await audit(user, "club.create", { clubId, details: { name } });
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

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  await addMemberByEmail(db(), clubId, email, role as ClubRole);
  await audit(user, "member.add", { clubId, details: { email, role } });
  revalidatePath("/klubber");
}
