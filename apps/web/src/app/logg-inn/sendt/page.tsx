import Link from "next/link";

export default function LinkSentPage() {
  return (
    <main>
      <p>
        <Link href="/">← Rokade</Link>
      </p>
      <h1>Sjekk e-posten din</h1>
      <p className="lead">
        Hvis adressen er riktig, kommer det en innloggingslenke i løpet av et minutt. Lenken
        virker én gang og utløper etter 15 minutter.
      </p>
      <p className="muted">
        Ingen e-post? Sjekk søppelpost, eller <Link href="/logg-inn">be om en ny lenke</Link>.
      </p>
    </main>
  );
}
