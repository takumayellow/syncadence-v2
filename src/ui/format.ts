export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function signedMs(ms: number): string {
  const rounded = Math.round(ms);
  return `${rounded > 0 ? "+" : ""}${rounded} ms`;
}

export { rankOf } from "../game/rank";
