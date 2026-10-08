import { Sampler } from "./sampler";

export interface AudioKit {
  readonly ctx: AudioContext;
  readonly sampler: Sampler;
}

let kit: AudioKit | null = null;

/** AudioContext は1つだけ作って使い回す。ユーザー操作の中で最初に呼ぶ。 */
export function audioKit(): AudioKit {
  if (!kit) {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    kit = { ctx, sampler: new Sampler(ctx) };
  }
  return kit;
}
