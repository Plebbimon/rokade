import Link from "next/link";
import { createTournamentAction } from "@/lib/actions";
import { logoutAction } from "@/lib/auth-actions";
import { requireUser } from "@/lib/auth";
import { tournamentStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Tournaments() {
  const user = await requireUser();
  const records = await tournamentStore().list();

  return (
    <main>
      <div className="topbar">
        <Link href="/">← Rokade</Link>
        {user ? (
          <form action={logoutAction} className="userbox">
            <span className="muted">{user.email}</span> <button type="submit">Logg ut</button>
          </form>
        ) : null}
      </div>
      <h1>Turneringer</h1>

      {records.length === 0 ? (
        <p className="lead">Ingen turneringer ennå – opprett den første nedenfor.</p>
      ) : (
        <ul className="plain">
          {records.map((record) => (
            <li key={record.id}>
              <Link href={`/turneringer/${record.id}`}>{record.tournament.name}</Link>{" "}
              <span className="muted">
                {record.tournament.format === "berger" ? "Berger" : "FIDE Swiss"} ·{" "}
                {record.tournament.players.length} spillere · {record.tournament.rounds.length}{" "}
                runder spilt
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>Ny turnering</h2>
      <form action={createTournamentAction} className="stack">
        <label>
          Navn
          <input name="name" required placeholder="Klubbmesterskapet 2026" />
        </label>
        <label>
          Form
          <select name="format" defaultValue="fide-swiss">
            <option value="fide-swiss">FIDE Swiss</option>
            <option value="berger">Berger (rundturnering)</option>
          </select>
        </label>
        <label>
          Antall runder (Swiss – for Berger følger det av antall spillere)
          <input name="totalRounds" type="number" min={1} defaultValue={5} />
        </label>
        <label>
          Sted
          <input name="city" placeholder="Oslo" />
        </label>
        <button type="submit">Opprett turnering</button>
      </form>
    </main>
  );
}
