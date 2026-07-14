import Link from "next/link";
import { redirect } from "next/navigation";
import { completeLoginAction } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

/**
 * The link from the e-mail lands here. Logging in requires pressing the
 * button (a POST): e-mail scanners that prefetch links must not be able to
 * consume the single-use token.
 */
export default async function ConfirmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/logg-inn");

  return (
    <main>
      <p>
        <Link href="/">← Rokade</Link>
      </p>
      <h1>Fullfør innlogging</h1>
      <p className="lead">Trykk på knappen for å logge inn på denne enheten.</p>
      <form action={completeLoginAction}>
        <input type="hidden" name="token" value={token} />
        <button type="submit">Logg inn</button>
      </form>
    </main>
  );
}
