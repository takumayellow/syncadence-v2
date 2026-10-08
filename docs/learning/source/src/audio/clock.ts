/** AudioContext の時刻と performance.now() の対応を取り、「いま聞こえている曲の位置」を出す。 */

export interface ClockSource {
  readonly currentTime: number;
  readonly baseLatency?: number;
  readonly outputLatency?: number;
  getOutputTimestamp?(): AudioTimestamp;
}

const MAX_TIMESTAMP_SKEW = 0.5; // 秒。これ以上 currentTime から離れた出力時刻は壊れているとみなす
const JUMP_MS = 25; // これより大きく変わったら平滑化をやめて追従する
const SMOOTHING = 0.05;

/** 聞こえている AudioContext 時刻（秒）− performance.now()/1000 の推定値を返す。 */
export function sampleOffset(source: ClockSource, nowMs: number): number {
  const stamp = source.getOutputTimestamp?.();
  if (
    stamp &&
    typeof stamp.contextTime === "number" &&
    typeof stamp.performanceTime === "number" &&
    stamp.performanceTime > 0 &&
    Math.abs(stamp.contextTime - source.currentTime) <= MAX_TIMESTAMP_SKEW
  ) {
    return stamp.contextTime - stamp.performanceTime / 1000;
  }
  const latency = (source.baseLatency ?? 0) + (source.outputLatency ?? 0);
  return source.currentTime - latency - nowMs / 1000;
}

export class SongClock {
  private offset: number | null = null;

  /**
   * @param startContextTime 曲の 0 秒を鳴らす AudioContext の時刻
   * @param rate 再生速度（0.5〜1）。曲の 1 秒が実時間で 1/rate 秒になる
   */
  constructor(
    private readonly source: ClockSource,
    readonly startContextTime: number,
    readonly rate: number,
  ) {}

  /** 毎フレーム呼ぶ。出力時刻の揺れをならしつつ、大きなずれ（中断・再開）にはすぐ追従する。 */
  update(nowMs: number): void {
    const sample = sampleOffset(this.source, nowMs);
    if (this.offset === null || Math.abs(sample - this.offset) * 1000 > JUMP_MS) {
      this.offset = sample;
    } else {
      this.offset += (sample - this.offset) * SMOOTHING;
    }
  }

  reset(): void {
    this.offset = null;
  }

  /** performance.now() の時刻 perfMs に聞こえていた曲の位置（秒）。 */
  songTimeAt(perfMs: number): number {
    if (this.offset === null) this.update(perfMs);
    const heard = (this.offset ?? 0) + perfMs / 1000;
    return (heard - this.startContextTime) * this.rate;
  }

  /** 曲の位置 songTime を鳴らす AudioContext の時刻。 */
  contextTimeOf(songTime: number): number {
    return this.startContextTime + songTime / this.rate;
  }
}
