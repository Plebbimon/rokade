import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Turneringssjakk på åpen kildekode</h1>
      <p className="lead">
        Rokade setter opp rundene, teller poengene og publiserer resultatene – fri programvare
        for norske klubber, fra innbydelse til ratingrapport. Under utvikling.
      </p>

      <div className="paths">
        <Link href="/terminliste" className="path">
          <strong>Følg en turnering</strong>
          <span>Terminliste, stilling og runderesultater – direkte, uten innlogging.</span>
        </Link>
        <Link href="/turneringer" className="path">
          <strong>Arranger en turnering</strong>
          <span>Rundeoppsett med FIDE-validert motor, resultatføring og publisering.</span>
        </Link>
      </div>

      <h2>Status</h2>
      <ul>
        <li>FIDE Swiss (Dutch) via den FIDE-validerte motoren bbpPairings</li>
        <li>Berger-rundturnering; NSF Monrad er planlagt</li>
        <li>Klubber, publisering og live turneringssider</li>
        <li>TRF-import og -eksport for FIDE-rapportering</li>
        <li>ELO-rapport til NSF (planlagt, avhenger av API-tilgang)</li>
      </ul>
      <p className="cta">
        <Link href="/demo">Se demo-turneringen med stilling og kvalitetsberegning →</Link>
      </p>
    </main>
  );
}
