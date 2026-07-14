"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  consumeLoginToken,
  createLoginToken,
  createSession,
  deleteSession,
  isValidEmail,
  normalizeEmail,
} from "@rokade/db";
import { requestOrigin, SESSION_COOKIE } from "./auth.js";
import { mailer } from "./mailer.js";
import { db } from "./store.js";

export async function requestLoginLinkAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) redirect("/logg-inn?feil=epost");

  const token = await createLoginToken(db(), email);
  const url = `${await requestOrigin()}/logg-inn/bekreft?token=${encodeURIComponent(token)}`;
  await mailer().sendLoginLink(email, url);
  // Same destination whether or not the address was known: the login page
  // must not reveal who has an account.
  redirect("/logg-inn/sendt");
}

export async function completeLoginAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const user = token === "" ? null : await consumeLoginToken(db(), token);
  if (!user) redirect("/logg-inn?feil=lenke");

  const session = await createSession(db(), user.id);
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  redirect("/turneringer");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(db(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
