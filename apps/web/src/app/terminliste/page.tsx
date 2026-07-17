import Link from "next/link";
import type { StoredTournament } from "@rokade/core";
import { tournamentStore } from "@/lib/store";
import { formatDomainDate, terminStatus } from "@/lib/terminliste";

export const dynamic = "force-dynamic";

/** Descending by start date; tournaments without a date sort last. */
function byDateDesc(a: StoredTournament, b: StoredTournament): number {
  const da = a.tournament.dateBegin;
  const db = b.tournament.dateBegin;
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return db.localeCompare(da);
}

function byDateAsc(a: StoredTournament, b: StoredTournament): number {
  const da = a.tournament.dateBegin;
  const db = b.tournament.dateBegin;
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
}

function summary(record: StoredTournament, finished: boolean): string {
  const t = record.tournament;
  const parts: string[] = [];
  if (t.city) parts.push(t.city);
  if (t.dateBegin) {
    parts.push(
      t.dateEnd && t.dateEnd !== t.dateBegin
        ? `${formatDomainDate(t.dateBegin)}–${formatDomainDate(t.dateEnd)}`
        : formatDomainDate(t.dateBegin),
    );
  }
  parts.push(t.format === "berger" ? "Berger (rundturnering)" : "FIDE Swiss");
  parts.push(finished ? `${t.players.length} spillere` : `${t.players.length} påmeldte`);
  return parts.join(" · ");
}

function Section({
  title,
  records,
  finished,
}: {
  title: string;
  records: StoredTournament[];
  finished: boolean;
}) {
  if (records.length === 0) return null;
  return (
    <>
      <h2>{title}</h2>
      <ul className="plain">
        {records.map((record) => (
          <li key={record.id}>
            <Link href={`/turneringer/${record.id}`}>{record.tournament.name}</Link>{" "}
            <span className="muted">{summary(record, finished)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function Terminliste() {
  const published = (await tournamentStore().list()).filter((r) => r.publishedAt !== null);

  const ongoing = published.filter((r) => terminStatus(r) === "ongoing").sort(byDateDesc);
  const upcoming = published.filter((r) => terminStatus(r) === "upcoming").sort(byDateAsc);
  const finished = published.filter((r) => terminStatus(r) === "finished").sort(byDateDesc);

  return (
    <main>
      <p>
        <Link href="/">← Rokade</Link>
      </p>
      <h1>Terminliste</h1>
      <p className="lead">Nasjonal kalender over publiserte turneringer.</p>

      {published.length === 0 ? (
        <p className="lead">Ingen publiserte turneringer ennå.</p>
      ) : (
        <>
          <Section title="Pågår" records={ongoing} finished={false} />
          <Section title="Kommende" records={upcoming} finished={false} />
          <Section title="Ferdigspilt" records={finished} finished={true} />
        </>
      )}
    </main>
  );
}
