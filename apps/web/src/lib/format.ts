import type { GameResult } from "@rokade/core";

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
