export type Judgement = "perfect" | "great" | "good" | "miss";

export const JUDGEMENTS: readonly Judgement[] = ["perfect", "great", "good", "miss"];

/** 判定幅（実時間ミリ秒、±）。これより外の早押しは空振りとして無視する。 */
export const WINDOWS = {
  perfect: 42,
  great: 83,
  good: 125,
  miss: 160,
} as const;

/** ロングノーツの終点は、この時間だけ手前で離しても成功にする。 */
export const HOLD_RELEASE_TOLERANCE_MS = 150;

export const SCORE_WEIGHT: Record<Judgement, number> = { perfect: 1, great: 0.75, good: 0.35, miss: 0 };
export const MAX_SCORE = 1_000_000;

/** 押した時刻の差（実時間ミリ秒、正なら遅い）から判定する。判定の外なら null。 */
export function judgeDelta(deltaMs: number): Judgement | null {
  const d = Math.abs(deltaMs);
  if (d <= WINDOWS.perfect) return "perfect";
  if (d <= WINDOWS.great) return "great";
  if (d <= WINDOWS.good) return "good";
  if (d <= WINDOWS.miss) return "miss";
  return null;
}

export function breaksCombo(judgement: Judgement): boolean {
  return judgement === "miss";
}
