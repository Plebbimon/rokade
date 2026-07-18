import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerLookup } from "@/components/player-lookup";
import { submitSignupAction } from "@/lib/signup-actions";
import { signupIsOpen } from "@/lib/service";
import { tournamentAccess } from "@/lib/access";
import { formatDomainDate } from "@/lib/terminliste";

export const dynamic = "force-dynamic";

const FEIL: Record<string, string> = {
  epost: "Oppgi en gyldig e-postadresse.",
  navn: "Oppgi navn.",
  rating: "Ugyldig rating.",
  oppslag: "Fant ikke spilleren i ratinglisten – prøv på nytt.",
};

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}) {
  const { id } = await params;
  const { feil } = await searchParams;
  const access = await tournamentAccess(id);
  if (!access) notFound();
  const { record } = access;
  const t = record.tournament;

  const back = (
    <p>
      <Link href={`/turneringer/${id}`}>← {t.name}</Link>
    </p>
  );

  if (!signupIsOpen(record)) {
    return (
      <main>
        {back}
        <h1>Påmelding</h1>
        <p className="muted">Påmeldingen er ikke åpen.</p>
      </main>
    );
  }

  const deadline = t.signupDeadline ? formatDomainDate(t.signupDeadline) : "";
  const error = feil ? FEIL[feil] : undefined;

  return (
    <main>
      {back}
      <h1>Påmelding</h1>
      <p className="lead">
        {t.name}
        {deadline ? ` · Frist: ${deadline}` : ""}
      </p>

      {error && <p className="error">{error}</p>}

      <form action={submitSignupAction} className="stack">
        <input type="hidden" name="tournamentId" value={id} />
        <PlayerLookup />
        <label>
          E-postadresse
          <input type="email" name="email" required />
        </label>
        <p className="muted">
          Du får en bekreftelseslenke på e-post. Påmeldingen teller først når du har klikket på
          den.
        </p>
        <button type="submit">Meld meg på</button>
      </form>
    </main>
  );
}
