import type { GameResult } from "@rokade/core";
import type { AuditAction, ClubRole } from "@rokade/db";

export const ROLE_LABEL: Record<ClubRole, string> = {
  admin: "administrator",
  arbiter: "turneringsleder",
};

export const RESULT_LABEL: Record<GameResult, string> = {
  "white-wins": "1 – 0",
  draw: "½ – ½",
  "black-wins": "0 – 1",
  "white-forfeit-win": "+ – −",
  "black-forfeit-win": "− – +",
  "double-forfeit": "− – −",
};

export function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole === 0.5;
  if (whole === 0 && half) return "½";
  return `${whole}${half ? "½" : ""}`;
}

const AUDIT_TIME = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Oslo",
});

export function formatAuditTime(at: Date): string {
  return AUDIT_TIME.format(at);
}

/** One Norwegian sentence fragment per audit entry: "<actor> <did what>". */
export function describeAuditEntry(entry: {
  action: AuditAction;
  details: Record<string, unknown>;
}): string {
  const d = entry.details;
  switch (entry.action) {
    case "tournament.create":
      return `opprettet turneringen «${d["name"]}»`;
    case "player.add":
      return `la til spilleren ${d["name"]}${d["rating"] != null ? ` (${d["rating"]})` : ""}`;
    case "round.pair":
      return `satte opp runde ${d["round"]}`;
    case "result.set":
      return `registrerte resultat i runde ${d["round"]}, bord ${d["board"]}: ${
        RESULT_LABEL[d["result"] as GameResult] ?? d["result"]
      }`;
    case "club.create":
      return `opprettet klubben «${d["name"]}»`;
    case "member.add":
      return `la til ${d["email"]} som ${ROLE_LABEL[d["role"] as ClubRole] ?? d["role"]}`;
  }
}
