import { DIFFICULTIES, type Difficulty } from "../song/types";

/** 曲 ID から決まる色相（0〜359）。ジャケットの代わりのグラデーションに使う。 */
export function jacketHue(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** 作曲者の姓の頭文字（"Ludwig van Beethoven" → "B"）。 */
export function composerMark(composerEn: string): string {
  const words = composerEn.trim().split(/\s+/);
  return (words[words.length - 1] ?? "").charAt(0).toUpperCase();
}

/** 一覧の中で delta だけ動かした位置。端では止める。 */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  return Math.min(length - 1, Math.max(0, index + delta));
}

/** 難易度を delta だけ動かす。端では止める。 */
export function stepDifficulty(difficulty: Difficulty, delta: number): Difficulty {
  const index = stepIndex(DIFFICULTIES.indexOf(difficulty), delta, DIFFICULTIES.length);
  return DIFFICULTIES[index] ?? difficulty;
}
