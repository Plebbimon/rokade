import Link from "next/link";
import { notFound } from "next/navigation";
import { standings, type GameResult, type TiebreakKey } from "@rokade/core";
import { tournamentAuditTrail } from "@rokade/db";
import { AuditTable } from "@/components/audit-trail";
import { addPlayerAction, pairNextRoundAction, setResultAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { RESULT_LABEL, formatPoints } from "@/lib/format";
import { allResultsRecorded } from "@/lib/service";
import { accessibleTournament } from "@/lib/access";
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

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const record = await accessibleTournament(id);
  if (!record) notFound();

  const t = record.tournament;
  const players = new Map(t.players.map((p) => [p.id, p]));
  const tiebreaks = t.format === "berger" ? BERGER_TIEBREAKS : SWISS_TIEBREAKS;
  const table = standings(t, { tiebreaks });
  const complete = allResultsRecorded(t);
  const finished = t.totalRounds > 0 && t.rounds.length >= t.totalRounds;
  const trail = isMultiUser() ? await tournamentAuditTrail(db(), id) : [];

  return (
    <main>
      <p>
        <Link href="/turneringer">← Turneringer</Link>
      </p>
      <h1>{t.name}</h1>
      <p className="lead">
        {t.format === "berger" ? "Berger (rundturnering)" : "FIDE Swiss"}
        {t.city ? ` · ${t.city}` : ""} · {t.rounds.length}
        {t.totalRounds > 0 ? ` av ${t.totalRounds}` : ""} runder spilt
      </p>

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
      <form action={addPlayerAction} className="row">
        <input type="hidden" name="tournamentId" value={id} />
        <input name="name" required placeholder="Etternavn, Fornavn" />
        <input name="rating" type="number" min={0} max={4000} placeholder="Rating" />
        <button type="submit">Legg til spiller</button>
      </form>

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
                      ) : (
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

      {!finished &&
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

      {trail.length > 0 && (
        <section>
          <h2>Logg</h2>
          <AuditTable entries={trail} />
        </section>
      )}
    </main>
  );
}
