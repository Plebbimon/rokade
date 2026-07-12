export default function Home() {
  return (
    <main>
      <h1>♜ Rokade</h1>
      <p className="lead">
        Fri og åpen programvare for sjakkturneringer i Norge – rundeoppsett, resultater,
        terminliste og ELO-rapportering. Under utvikling.
      </p>
      <ul>
        <li>FIDE Swiss (Dutch) via den FIDE-validerte motoren bbpPairings</li>
        <li>Berger og NSF Monrad (planlagt)</li>
        <li>TRF-import og -eksport for FIDE-rapportering</li>
        <li>ELO-rapport til NSF (planlagt, avhenger av API-tilgang)</li>
        <li>Påmelding, live resultater og turneringssider (planlagt)</li>
      </ul>
    </main>
  );
}
