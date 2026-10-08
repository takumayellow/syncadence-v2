import type { MusicEvent } from "../song/types";

export type PlayEvent = (event: MusicEvent, index: number) => void;

/** 曲の音を少し先まで AudioContext に予約していく。keysound で叩いて鳴らす音は除外できる。 */
export class EventScheduler {
  private cursor = 0;

  constructor(
    private readonly events: readonly MusicEvent[],
    private readonly skip: ReadonlySet<number>,
    private readonly play: PlayEvent,
    private readonly lookahead = 0.4,
  ) {}

  /** 曲の位置 songTime から lookahead 秒先までの音を予約する。 */
  pump(songTime: number): number {
    const horizon = songTime + this.lookahead;
    let scheduled = 0;
    while (this.cursor < this.events.length) {
      const event = this.events[this.cursor]!;
      if (event[0] > horizon) break;
      if (!this.skip.has(this.cursor) && event[0] >= songTime - 0.05) {
        this.play(event, this.cursor);
        scheduled += 1;
      }
      this.cursor += 1;
    }
    return scheduled;
  }

  get finished(): boolean {
    return this.cursor >= this.events.length;
  }
}
