export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function signedMs(ms: number): string {
  const rounded = Math.round(ms);
  return `${rounded > 0 ? "+" : ""}${rounded} ms`;
}

export function rankOf(score: number): string {
  if (score >= 990_000) return "SSS";
  if (score >= 970_000) return "SS";
  if (score >= 940_000) return "S";
  if (score >= 880_000) return "A";
  if (score >= 800_000) return "B";
  if (score >= 700_000) return "C";
  return "D";
}
