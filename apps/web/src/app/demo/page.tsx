import { standings, type GameResult, type Tournament } from "@rokade/core";
import { exampleTournament } from "@rokade/core/fixtures";
import Link from "next/link";

const RESULT_LABEL: Record<GameResult, string> = {
  "white-wins": "1 – 0",
  draw: "½ – ½",
  "black-wins": "0 – 1",
  "white-forfeit-win": "+ – −",
  "black-forfeit-win": "− – +",
  "double-forfeit": "− – −",
};

function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole === 0.5;
  if (whole === 0 && half) return "½";
  return `${whole}${half ? "½" : ""}`;
}

export default function Demo() {
  const tournament: Tournament = exampleTournament();
  const table = standings(tournament, {
    tiebreaks: ["buchholz", "buchholz-cut-1", "sonneborn-berger"],
  });
  const players = new Map(tournament.players.map((p) => [p.id, p]));

  return (
    <main>
      <p>
        <Link href="/">← Rokade</Link>
      </p>
      <h1>{tournament.name}</h1>
      <p className="lead">
        {tournament.city} · {tournament.rounds.length} av {tournament.totalRounds} runder spilt ·
        FIDE Swiss · Hovmeddommer: {tournament.chiefArbiter}
      </p>

      <h2>Stilling</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="left">Navn</th>
              <th>Rating</th>
              <th>Poeng</th>
              <th title="Buchholz">BH</th>
              <th title="Buchholz cut-1">BH-C1</th>
              <th title="Sonneborn-Berger">SB</th>
            </tr>
          </thead>
          <tbody>
            {table.map((entry) => {
              const player = players.get(entry.playerId)!;
              return (
                <tr key={entry.playerId}>
                  <td>{entry.rank}</td>
                  <td className="left">{player.name}</td>
                  <td>{player.rating ?? "–"}</td>
                  <td>
                    <strong>{formatPoints(entry.points)}</strong>
                  </td>
                  <td>{formatPoints(entry.tiebreaks[0]!)}</td>
                  <td>{formatPoints(entry.tiebreaks[1]!)}</td>
                  <td>{entry.tiebreaks[2]!.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tournament.rounds.map((round) => (
        <section key={round.number}>
          <h2>Runde {round.number}</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {round.boards.map((board) => (
                  <tr key={board.boardNumber}>
                    <td>{board.boardNumber}</td>
                    <td className="left">{players.get(board.white)!.name}</td>
                    <td className="result">
                      {board.result ? RESULT_LABEL[board.result] : "…"}
                    </td>
                    <td className="left">{players.get(board.black)!.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
