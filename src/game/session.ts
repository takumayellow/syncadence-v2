import type { RawChartNote } from "../song/types";
import { HOLD_RELEASE_TOLERANCE_MS, judgeDelta, MAX_SCORE, SCORE_WEIGHT, WINDOWS, type Judgement } from "./judge";

export type NoteState = "pending" | "holding" | "done";

export interface PlayNote {
  readonly index: number;
  readonly time: number;
  readonly lane: number;
  readonly duration: number;
  readonly links: readonly number[];
}

export interface NoteResult {
  readonly note: PlayNote;
  readonly judgement: Judgement;
  /** 実時間ミリ秒。正なら遅い。見逃し・終点の判定では null */
  readonly deltaMs: number | null;
  readonly part: "head" | "tail";
}

export interface SessionStats {
  readonly counts: Readonly<Record<Judgement, number>>;
  readonly combo: number;
  readonly maxCombo: number;
  readonly score: number;
  readonly judged: number;
  readonly total: number;
  /** 判定の付いた押下の差（実時間ミリ秒） */
  readonly deltas: readonly number[];
}

/**
 * 1 プレイ分の判定状態。毎フレーム大量のノーツを扱うので、内部の状態配列だけは
 * その場で更新し、外へは読み取り専用の値として渡す。
 */
export class GameSession {
  readonly notes: readonly PlayNote[];
  private readonly states: NoteState[];
  private readonly lanes: number[][];
  private readonly laneCursor: number[];
  private readonly holding: (number | null)[];
  private counts: Record<Judgement, number> = { perfect: 0, great: 0, good: 0, miss: 0 };
  private combo = 0;
  private maxCombo = 0;
  private points = 0;
  private judged = 0;
  private readonly deltas: number[] = [];
  readonly total: number;

  /** @param rate 再生速度。曲の時間差を rate で割ると実時間になる */
  constructor(raw: readonly RawChartNote[], laneCount: number, private readonly rate = 1) {
    this.notes = raw
      .map(([time, lane, duration, links], index) => ({ index, time, lane, duration, links }))
      .sort((a, b) => a.time - b.time || a.lane - b.lane);
    this.states = this.notes.map(() => "pending");
    this.lanes = Array.from({ length: laneCount }, () => []);
    this.notes.forEach((note, i) => this.lanes[note.lane]?.push(i));
    this.laneCursor = this.lanes.map(() => 0);
    this.holding = this.lanes.map(() => null);
    this.total = this.notes.reduce((sum, note) => sum + (note.duration > 0 ? 2 : 1), 0);
  }

  stateOf(i: number): NoteState {
    return this.states[i] ?? "done";
  }

  isHolding(lane: number): boolean {
    return this.holding[lane] != null;
  }

  private realMs(songSeconds: number): number {
    return (songSeconds / this.rate) * 1000;
  }

  private record(judgement: Judgement, deltaMs: number | null): void {
    this.counts = { ...this.counts, [judgement]: this.counts[judgement] + 1 };
    this.judged += 1;
    this.points += SCORE_WEIGHT[judgement];
    if (judgement === "miss") {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    if (deltaMs !== null && judgement !== "miss") this.deltas.push(deltaMs);
  }

  /** レーン lane を押した。曲の位置 songTime（入力補正済み）で判定する。 */
  press(lane: number, songTime: number): NoteResult | null {
    const queue = this.lanes[lane];
    if (!queue || this.holding[lane] != null) return null;
    let cursor = this.laneCursor[lane] ?? 0;
    while (cursor < queue.length && this.states[queue[cursor]!] !== "pending") cursor += 1;
    this.laneCursor[lane] = cursor;
    const i = queue[cursor];
    if (i === undefined) return null;
    const note = this.notes[i]!;
    const deltaMs = this.realMs(songTime - note.time);
    const judgement = judgeDelta(deltaMs);
    if (judgement === null) return null;
    this.record(judgement, deltaMs);
    if (note.duration > 0 && judgement !== "miss") {
      this.states[i] = "holding";
      this.holding[lane] = i;
    } else {
      this.states[i] = "done";
      if (note.duration > 0) this.record("miss", null);
    }
    return { note, judgement, deltaMs, part: "head" };
  }

  /** レーン lane を離した。ロングノーツの途中なら終点を判定する。 */
  release(lane: number, songTime: number): NoteResult | null {
    const i = this.holding[lane];
    if (i == null) return null;
    const note = this.notes[i]!;
    const early = this.realMs(note.time + note.duration - songTime);
    const judgement: Judgement = early <= HOLD_RELEASE_TOLERANCE_MS ? "perfect" : "miss";
    return this.finishHold(i, judgement);
  }

  private finishHold(i: number, judgement: Judgement): NoteResult {
    const note = this.notes[i]!;
    this.states[i] = "done";
    this.holding[note.lane] = null;
    this.record(judgement, null);
    return { note, judgement, deltaMs: null, part: "tail" };
  }

  /** 時間経過の処理。見逃したノーツと、押し切ったロングノーツを確定させる。 */
  update(songTime: number): NoteResult[] {
    const results: NoteResult[] = [];
    this.holding.forEach((i) => {
      if (i == null) return;
      const note = this.notes[i]!;
      if (songTime >= note.time + note.duration) results.push(this.finishHold(i, "perfect"));
    });
    this.lanes.forEach((queue, lane) => {
      let cursor = this.laneCursor[lane] ?? 0;
      while (cursor < queue.length) {
        const i = queue[cursor]!;
        if (this.states[i] !== "pending") {
          cursor += 1;
          continue;
        }
        const note = this.notes[i]!;
        if (this.realMs(songTime - note.time) <= WINDOWS.good) break;
        this.states[i] = "done";
        this.record("miss", null);
        if (note.duration > 0) this.record("miss", null);
        results.push({ note, judgement: "miss", deltaMs: null, part: "head" });
        cursor += 1;
      }
      this.laneCursor[lane] = cursor;
    });
    return results;
  }

  get finished(): boolean {
    return this.judged >= this.total;
  }

  /** 毎フレームの表示用。stats() と違い配列を複製しない。 */
  hud(): { readonly combo: number; readonly score: number } {
    return { combo: this.combo, score: this.currentScore() };
  }

  private currentScore(): number {
    return Math.round((this.points / Math.max(this.total, 1)) * MAX_SCORE);
  }

  stats(): SessionStats {
    return {
      counts: { ...this.counts },
      combo: this.combo,
      maxCombo: this.maxCombo,
      score: this.currentScore(),
      judged: this.judged,
      total: this.total,
      deltas: [...this.deltas],
    };
  }
}

