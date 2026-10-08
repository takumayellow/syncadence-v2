export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface TimingSummary {
  readonly median: number;
  readonly early: number;
  readonly late: number;
}

/** 押したタイミングの偏り。正なら遅め。 */
export function summarizeDeltas(deltas: readonly number[]): TimingSummary | null {
  const m = median(deltas);
  if (m === null) return null;
  return {
    median: m,
    early: deltas.filter((d) => d < -20).length,
    late: deltas.filter((d) => d > 20).length,
  };
}

/**
 * タップ較正。clicks（実時間ミリ秒の拍）に対し、各タップを最も近い拍と組にして
 * 差の中央値を返す。半拍以上離れたタップは外れ値として捨てる。
 */
export function calibrate(taps: readonly number[], clicks: readonly number[], intervalMs: number): number | null {
  const deltas: number[] = [];
  for (const tap of taps) {
    let best: number | null = null;
    for (const click of clicks) {
      if (best === null || Math.abs(tap - click) < Math.abs(tap - best)) best = click;
    }
    if (best !== null && Math.abs(tap - best) < intervalMs / 2) deltas.push(tap - best);
  }
  return deltas.length >= 4 ? median(deltas) : null;
}
