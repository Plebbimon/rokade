import Link from "next/link";
import { requestLoginLinkAction } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  epost: "Det ser ikke ut som en gyldig e-postadresse.",
  lenke: "Lenken er ugyldig, brukt eller utløpt. Be om en ny nedenfor.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ feil?: string }>;
}) {
  const { feil } = await searchParams;
  const error = feil ? ERRORS[feil] : undefined;

  return (
    <main>
      <p>
        <Link href="/">← Rokade</Link>
      </p>
      <h1>Logg inn</h1>
      <p className="lead">
        Ingen passord: skriv inn e-postadressen din, så sender vi en innloggingslenke. Første
        innlogging oppretter kontoen.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <form action={requestLoginLinkAction} className="stack">
        <label>
          E-postadresse
          <input name="email" type="email" required placeholder="kari@sjakklubb.no" />
        </label>
        <button type="submit">Send innloggingslenke</button>
      </form>
    </main>
  );
}
