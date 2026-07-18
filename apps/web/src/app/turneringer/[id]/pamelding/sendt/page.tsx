import Link from "next/link";

export default async function SignupSentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <p>
        <Link href={`/turneringer/${id}`}>← Til turneringen</Link>
      </p>
      <h1>Sjekk e-posten din</h1>
      <p className="lead">
        Påmeldingen er registrert, men gjelder ikke før du bekrefter den med lenken vi har sendt
        deg. Lenken virker én gang og utløper etter 48 timer.
      </p>
      <p className="muted">
        Ingen e-post? Sjekk søppelpost, eller{" "}
        <Link href={`/turneringer/${id}/pamelding`}>meld deg på på nytt</Link>.
      </p>
    </main>
  );
}
