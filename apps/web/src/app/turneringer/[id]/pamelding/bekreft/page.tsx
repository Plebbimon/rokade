import Link from "next/link";
import { redirect } from "next/navigation";
import { completeSignupConfirmAction } from "@/lib/signup-actions";

export const dynamic = "force-dynamic";

/**
 * The link from the signup e-mail lands here. Confirming requires pressing
 * the button (a POST): e-mail scanners that prefetch links must not be able
 * to consume the single-use token.
 */
export default async function ConfirmSignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { id } = await params;
  const { token, status } = await searchParams;

  if (status === "ok") {
    return (
      <main>
        <p>
          <Link href={`/turneringer/${id}`}>← Til turneringen</Link>
        </p>
        <h1>Påmeldingen er bekreftet</h1>
        <p className="lead">
          Takk! Arrangøren godkjenner påmeldingene, og du dukker opp i spillerlisten når din er
          godkjent.
        </p>
      </main>
    );
  }
  if (status === "ugyldig") {
    return (
      <main>
        <p>
          <Link href={`/turneringer/${id}`}>← Til turneringen</Link>
        </p>
        <h1>Lenken virker ikke lenger</h1>
        <p className="lead">
          Bekreftelseslenken er brukt eller utløpt. Er du ikke bekreftet, kan du{" "}
          <Link href={`/turneringer/${id}/pamelding`}>melde deg på på nytt</Link>.
        </p>
      </main>
    );
  }
  if (!token) redirect(`/turneringer/${id}`);

  return (
    <main>
      <p>
        <Link href={`/turneringer/${id}`}>← Til turneringen</Link>
      </p>
      <h1>Bekreft påmeldingen</h1>
      <p className="lead">Trykk på knappen for å bekrefte at e-postadressen er din.</p>
      <form action={completeSignupConfirmAction}>
        <input type="hidden" name="tournamentId" value={id} />
        <input type="hidden" name="token" value={token} />
        <button type="submit">Bekreft påmeldingen</button>
      </form>
    </main>
  );
}
