import Link from "next/link";
import { notFound } from "next/navigation";
import { standings, type GameResult, type TiebreakKey } from "@rokade/core";
import { tournamentAuditTrail } from "@rokade/db";
import { AuditTable } from "@/components/audit-trail";
import {
  addPlayerAction,
  pairNextRoundAction,
  setPublishedAction,
  setResultAction,
  updateTournamentInfoAction,
} from "@/lib/actions";
import { RESULT_LABEL, formatAuditTime, formatPoints } from "@/lib/format";
import { formatDomainDate } from "@/lib/terminliste";
import { allResultsRecorded } from "@/lib/service";
import { tournamentAccess } from "@/lib/access";
import { db, isMultiUser } from "@/lib/store";

export const dynamic = "force-dynamic";

const RESULT_OPTIONS: GameResult[] = [
  "white-wins",
  "draw",
  "black-wins",
  "white-forfeit-win",
  "black-forfeit-win",
  "double-forfeit",
];

const SWISS_TIEBREAKS: TiebreakKey[] = ["buchholz", "buchholz-cut-1", "sonneborn-berger"];
const BERGER_TIEBREAKS: TiebreakKey[] = ["sonneborn-berger"];

/** Domain "yyyy/mm/dd" → the "yyyy-mm-dd" a <input type="date"> expects. */
function dateInputValue(d?: string): string {
  return d ? d.replace(/\//g, "-") : "";
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await tournamentAccess(id);
  if (!access) notFound();
  const { record, canAdmin } = access;

  const t = record.tournament;
  const players = new Map(t.players.map((p) => [p.id, p]));
  const tiebreaks = t.format === "berger" ? BERGER_TIEBREAKS : SWISS_TIEBREAKS;
  const table = standings(t, { tiebreaks });
  const complete = allResultsRecorded(t);
  const finished = t.totalRounds > 0 && t.rounds.length >= t.totalRounds;
  const trail = canAdmin && isMultiUser() ? await tournamentAuditTrail(db(), id) : [];

  const dateSpan = t.dateBegin
    ? t.dateEnd && t.dateEnd !== t.dateBegin
      ? `${formatDomainDate(t.dateBegin)}–${formatDomainDate(t.dateEnd)}`
      : formatDomainDate(t.dateBegin)
    : "";
  const leadParts = [t.format === "berger" ? "Berger (rundturnering)" : "FIDE Swiss"];
  if (t.city) leadParts.push(t.city);
  if (dateSpan) leadParts.push(dateSpan);
  if (t.timeControl) leadParts.push(t.timeControl);
  leadParts.push(
    `${t.rounds.length}${t.totalRounds > 0 ? ` av ${t.totalRounds}` : ""} runder spilt`,
  );

  return (
    <main>
      <p>
        <Link href={canAdmin ? "/turneringer" : "/terminliste"}>
          ← {canAdmin ? "Turneringer" : "Terminliste"}
        </Link>
      </p>
      <h1>{t.name}</h1>
      <p className="lead">{leadParts.join(" · ")}</p>

      {t.invitation ? (
        <section>
          <h2>Innbydelse</h2>
          {t.invitation.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      ) : null}

      <h2>Spillere ({t.players.length})</h2>
      {t.players.length > 0 && (
        <div className="table-wrap">
          <table>
            <tbody>
              {t.players.map((player, index) => (
                <tr key={player.id}>
                  <td>{index + 1}</td>
                  <td className="left">{player.name}</td>
                  <td>{player.rating ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canAdmin && (
        <form action={addPlayerAction} className="row">
          <input type="hidden" name="tournamentId" value={id} />
          <input name="name" required placeholder="Etternavn, Fornavn" />
          <input name="rating" type="number" min={0} max={4000} placeholder="Rating" />
          <button type="submit">Legg til spiller</button>
        </form>
      )}

      {t.rounds.length > 0 && (
        <>
          <h2>Stilling</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Navn</th>
                  <th>Poeng</th>
                  {t.format !== "berger" && <th title="Buchholz">BH</th>}
                  {t.format !== "berger" && <th title="Buchholz cut-1">BH-C1</th>}
                  <th title="Sonneborn-Berger">SB</th>
                </tr>
              </thead>
              <tbody>
                {table.map((entry) => (
                  <tr key={entry.playerId}>
                    <td>{entry.rank}</td>
                    <td className="left">{players.get(entry.playerId)!.name}</td>
                    <td>
                      <strong>{formatPoints(entry.points)}</strong>
                    </td>
                    {entry.tiebreaks.slice(0, -1).map((value, i) => (
                      <td key={i}>{formatPoints(value)}</td>
                    ))}
                    <td>{entry.tiebreaks.at(-1)!.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {t.rounds.map((round) => (
        <section key={round.number}>
          <h2>Runde {round.number}</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {round.boards.map((board) => (
                  <tr key={board.boardNumber}>
                    <td>{board.boardNumber}</td>
                    <td className="left">{players.get(board.white)!.name}</td>
                    <td className="left">{players.get(board.black)!.name}</td>
                    <td className="result">
                      {board.result !== null ? (
                        RESULT_LABEL[board.result]
                      ) : canAdmin ? (
                        <form action={setResultAction} className="row">
                          <input type="hidden" name="tournamentId" value={id} />
                          <input type="hidden" name="round" value={round.number} />
                          <input type="hidden" name="board" value={board.boardNumber} />
                          <select name="result" required defaultValue="">
                            <option value="" disabled>
                              –
                            </option>
                            {RESULT_OPTIONS.map((result) => (
                              <option key={result} value={result}>
                                {RESULT_LABEL[result]}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Lagre</button>
                        </form>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
                {round.byes.map((bye) => (
                  <tr key={bye.player}>
                    <td />
                    <td className="left">{players.get(bye.player)!.name}</td>
                    <td className="left muted">
                      {bye.type === "pairing" ? "walkover (1 poeng)" : `fri (${bye.type})`}
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {canAdmin &&
        !finished &&
        (t.players.length < 2 ? (
          <p className="muted">Legg til minst to spillere for å sette opp første runde.</p>
        ) : complete ? (
          <form action={pairNextRoundAction}>
            <input type="hidden" name="tournamentId" value={id} />
            <button type="submit">Sett opp runde {t.rounds.length + 1}</button>
          </form>
        ) : (
          <p className="muted">Registrer alle resultatene før neste runde kan settes opp.</p>
        ))}
      {finished && complete && <p className="lead">Turneringen er ferdigspilt.</p>}

      {canAdmin && (
        <section>
          <h2>Innbydelse og publisering</h2>
          <form action={updateTournamentInfoAction} className="stack">
            <input type="hidden" name="tournamentId" value={id} />
            <label>
              Startdato
              <input type="date" name="dateBegin" defaultValue={dateInputValue(t.dateBegin)} />
            </label>
            <label>
              Sluttdato
              <input type="date" name="dateEnd" defaultValue={dateInputValue(t.dateEnd)} />
            </label>
            <label>
              Betenkningstid
              <input name="timeControl" defaultValue={t.timeControl ?? ""} placeholder="90 min + 30 sek" />
            </label>
            <label>
              Innbydelse
              <textarea name="invitation" rows={6} defaultValue={t.invitation ?? ""} />
            </label>
            <button type="submit">Lagre info</button>
          </form>

          <form action={setPublishedAction} className="stack">
            <input type="hidden" name="tournamentId" value={id} />
            {record.publishedAt === null ? (
              <>
                <p className="muted">Utkast – bare synlig for klubben.</p>
                <input type="hidden" name="published" value="true" />
                <button type="submit">Publiser turneringen</button>
              </>
            ) : (
              <>
                <p className="muted">
                  Publisert {formatAuditTime(new Date(record.publishedAt))}.
                </p>
                <input type="hidden" name="published" value="false" />
                <button type="submit">Avpubliser</button>
              </>
            )}
          </form>
        </section>
      )}

      {trail.length > 0 && (
        <section>
          <h2>Logg</h2>
          <AuditTable entries={trail} />
        </section>
      )}
    </main>
  );
}
