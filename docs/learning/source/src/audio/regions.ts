export type Layer = "L" | "H";

export interface SampleRegion {
  readonly file: string;
  readonly key: number;
  readonly lo: number;
  readonly hi: number;
  readonly layer: Layer;
}

export interface SampleManifest {
  readonly name: string;
  readonly license: string;
  readonly source: string;
  readonly velocitySplit: number;
  readonly regions: readonly SampleRegion[];
}

const FILE = /^[A-Za-z0-9]+\.mp3$/;

export function parseManifest(data: unknown): SampleManifest {
  if (typeof data !== "object" || data === null) throw new Error("音源の目録が不正です");
  const m = data as Record<string, unknown>;
  if (typeof m.velocitySplit !== "number" || !Array.isArray(m.regions)) throw new Error("音源の目録が不正です");
  for (const r of m.regions as Record<string, unknown>[]) {
    const ok =
      typeof r.file === "string" &&
      FILE.test(r.file) &&
      [r.key, r.lo, r.hi].every((v) => Number.isInteger(v)) &&
      (r.layer === "L" || r.layer === "H");
    if (!ok) throw new Error("音源の目録の項目が不正です");
  }
  return data as SampleManifest;
}

export function layerFor(velocity: number, split: number): Layer {
  return velocity >= split ? "H" : "L";
}

/** 音高を受け持つ区間を探す。見つからなければ、最も近い基準音の区間で代用する。 */
export function findRegion(regions: readonly SampleRegion[], pitch: number, layer: Layer): SampleRegion | undefined {
  const pool = regions.filter((r) => r.layer === layer);
  const exact = pool.find((r) => r.lo <= pitch && pitch <= r.hi);
  if (exact) return exact;
  let best: SampleRegion | undefined;
  for (const r of pool) {
    if (!best || Math.abs(r.key - pitch) < Math.abs(best.key - pitch)) best = r;
  }
  return best;
}

/** 立ち上がり（ピーク比 threshold を初めて超える位置）を秒で返す。mp3 の先頭の無音を飛ばすのに使う。 */
export function detectAttack(samples: Float32Array, sampleRate: number, threshold = 0.05): number {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return 0;
  const limit = peak * threshold;
  const index = samples.findIndex((s) => Math.abs(s) >= limit);
  const preRoll = Math.round(sampleRate * 0.002);
  return Math.max(0, index - preRoll) / sampleRate;
}

/** MIDI ベロシティから音量。強弱の差は残しつつ、弱音でも聞こえるようにする。 */
export function velocityGain(velocity: number): number {
  const v = Math.min(Math.max(velocity, 1), 127) / 127;
  return 0.18 + 0.82 * v ** 1.6;
}
