import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser, type AuthUser } from "@rokade/db";
import { db, isMultiUser } from "./store.js";

export const SESSION_COOKIE = "rokade_session";

/**
 * The logged-in user, or null. In file mode (no DATABASE_URL) there is no
 * auth at all — the app is a local single-arbiter tool — so this returns
 * null and nothing should gate on it.
 */
export async function currentUser(): Promise<AuthUser | null> {
  if (!isMultiUser()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return sessionUser(db(), token);
}

/** Gate for arbiter pages: in multi-user mode, redirect anonymous visitors. */
export async function requireUser(): Promise<AuthUser | null> {
  if (!isMultiUser()) return null;
  const user = await currentUser();
  if (!user) redirect("/logg-inn");
  return user;
}

/** Origin for links in emails: explicit env var, else the request's host. */
export async function requestOrigin(): Promise<string> {
  const configured = process.env["ROKADE_BASE_URL"];
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
