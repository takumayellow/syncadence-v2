/** ランクと、そのランクになる最低のスコア（高い順）。 */
export const RANKS: readonly { readonly rank: string; readonly min: number }[] = [
  { rank: "SSS", min: 990_000 },
  { rank: "SS", min: 970_000 },
  { rank: "S", min: 940_000 },
  { rank: "A", min: 880_000 },
  { rank: "B", min: 800_000 },
  { rank: "C", min: 700_000 },
  { rank: "D", min: 0 },
];

export function rankOf(score: number): string {
  return RANKS.find((r) => score >= r.min)?.rank ?? "D";
}
