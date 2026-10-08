import { SongClock } from "../audio/clock";
import type { Sampler } from "../audio/sampler";
import { EventScheduler } from "../audio/scheduler";
import type { Flash, Frame } from "../render/highway";
import type { Difficulty, MusicEvent, Song } from "../song/types";
import type { Settings } from "../storage";
import { keyLabels } from "./keys";
import { GameSession, type NoteResult, type SessionStats } from "./session";

export type EngineState = "ready" | "playing" | "paused" | "finished";

const START_DELAY = 0.15; // 秒。開始操作から最初の予約までの余裕
const LEAD_IN = 0.8; // 秒（実時間）。最初のノーツが流れ始めるまでの間
const TAIL_SECONDS = 2.5; // 最後のノーツの後、余韻を聞かせる時間
const MAX_FLASHES = 24;
const AUTOPLAY_PRESS_MS = 70;

/** 入力イベントの時刻を performance.now() の時間軸で返す。壊れた値は今の時刻で代用する。 */
export function eventTimeMs(timeStamp: number, nowMs: number): number {
  return timeStamp > 0 && timeStamp <= nowMs + 1 && nowMs - timeStamp < 1000 ? timeStamp : nowMs;
}

export interface EngineOptions {
  readonly ctx: AudioContext;
  readonly sampler: Sampler;
  readonly song: Song;
  readonly difficulty: Difficulty;
  readonly settings: Settings;
}

/** 1 プレイ分の進行。音の予約・時計・判定・入力をまとめ、描画用のフレームを作る。 */
export class PlayEngine {
  readonly session: GameSession;
  readonly lanes: number;
  private readonly bus: GainNode;
  private readonly scheduler: EventScheduler;
  private clock: SongClock | null = null;
  private stateValue: EngineState = "ready";
  private pressedLanes: readonly boolean[];
  private flashes: readonly Flash[] = [];
  private autoCursor = 0;
  private autoReleaseAt: readonly number[];
  private readonly endTime: number;
  private readonly labels: readonly string[];
  private readonly keysound: boolean;

  constructor(private readonly opts: EngineOptions) {
    const chart = opts.song.charts[opts.difficulty];
    this.lanes = chart.lanes;
    this.labels = keyLabels(chart.lanes);
    this.session = new GameSession(chart.notes, chart.lanes, opts.settings.rate);
    this.pressedLanes = Array.from({ length: chart.lanes }, () => false);
    this.autoReleaseAt = Array.from({ length: chart.lanes }, () => -Infinity);
    this.bus = opts.ctx.createGain();
    this.bus.gain.value = opts.settings.volume;
    this.bus.connect(opts.ctx.destination);
    this.keysound = opts.settings.keysound && !opts.settings.autoplay;
    const keysounds = new Set<number>();
    if (this.keysound) {
      for (const note of chart.notes) for (const link of note[3]) keysounds.add(link);
    }
    this.scheduler = new EventScheduler(opts.song.events, keysounds, (event) => {
      if (this.clock) this.sound(event, this.clock.contextTimeOf(event[0]));
    });
    const lastNote = chart.notes.reduce((m, n) => Math.max(m, n[0] + n[2]), 0);
    this.endTime = Math.min(opts.song.duration, lastNote + TAIL_SECONDS);
  }

  get state(): EngineState {
    return this.stateValue;
  }

  private sound(event: MusicEvent, when: number): void {
    const [, pitch, duration, velocity] = event;
    this.opts.sampler.play(this.bus, pitch, velocity, when, duration / this.opts.settings.rate);
  }

  async start(): Promise<void> {
    if (this.stateValue !== "ready") return;
    const { ctx, settings, song } = this.opts;
    this.stateValue = "playing";
    await ctx.resume();
    const rate = settings.rate;
    const firstNote = song.charts[this.opts.difficulty].notes[0]?.[0] ?? 0;
    const firstSound = song.events[0]?.[0] ?? 0;
    const startSong = Math.min(0, firstNote - settings.approachSeconds * rate, firstSound) - LEAD_IN * rate;
    this.clock = new SongClock(ctx, ctx.currentTime + START_DELAY - startSong / rate, rate);
  }

  pause(): void {
    if (this.stateValue !== "playing" || !this.clock) return;
    this.stateValue = "paused";
    void this.opts.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.stateValue !== "paused") return;
    await this.opts.ctx.resume();
    this.clock?.reset();
    this.stateValue = "playing";
    const now = performance.now();
    this.pressedLanes.forEach((down, lane) => {
      if (!down) this.handle(this.session.release(lane, this.judgeTime(now)), now);
    });
  }

  dispose(): void {
    const { ctx } = this.opts;
    const t = ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(0, t, 0.03);
    window.setTimeout(() => this.bus.disconnect(), 200);
    this.stateValue = "finished";
  }

  /** 入力の補正を入れた、判定に使う曲の位置。 */
  private judgeTime(perfMs: number): number {
    const clock = this.clock;
    if (!clock) return -Infinity;
    return clock.songTimeAt(perfMs) - (this.opts.settings.inputOffsetMs / 1000) * clock.rate;
  }

  private handle(result: NoteResult | null, atMs: number): void {
    if (!result) return;
    if (result.part === "head" && result.judgement !== "miss" && this.keysound) {
      const now = this.opts.ctx.currentTime;
      for (const link of result.note.links) {
        const event = this.opts.song.events[link];
        if (event) this.sound(event, now);
      }
    }
    if (result.part === "tail" && result.judgement === "perfect") return;
    const flash: Flash = { lane: result.note.lane, judgement: result.judgement, deltaMs: result.deltaMs, atMs };
    this.flashes = [...this.flashes.slice(-(MAX_FLASHES - 1)), flash];
  }

  private setPressed(lane: number, down: boolean): void {
    this.pressedLanes = this.pressedLanes.map((v, i) => (i === lane ? down : v));
  }

  press(lane: number, timeStamp: number): void {
    if (lane < 0 || lane >= this.lanes || this.pressedLanes[lane]) return;
    this.setPressed(lane, true);
    if (this.stateValue !== "playing" || this.opts.settings.autoplay) return;
    const now = performance.now();
    this.handle(this.session.press(lane, this.judgeTime(eventTimeMs(timeStamp, now))), now);
  }

  release(lane: number, timeStamp: number): void {
    if (lane < 0 || lane >= this.lanes) return;
    this.setPressed(lane, false);
    if (this.stateValue !== "playing" || this.opts.settings.autoplay) return;
    const now = performance.now();
    this.handle(this.session.release(lane, this.judgeTime(eventTimeMs(timeStamp, now))), now);
  }

  private autoplay(judgeTime: number, nowMs: number): void {
    const notes = this.session.notes;
    let releaseAt = this.autoReleaseAt;
    while (this.autoCursor < notes.length && notes[this.autoCursor]!.time <= judgeTime) {
      const note = notes[this.autoCursor]!;
      // フレームが詰まって前のロングノーツの終点を飛び越えても、先に終点を確定させてから押す
      for (const result of this.session.update(note.time)) this.handle(result, nowMs);
      this.handle(this.session.press(note.lane, note.time), nowMs);
      releaseAt = releaseAt.map((v, i) => (i === note.lane ? note.time + note.duration : v));
      this.autoCursor += 1;
    }
    this.autoReleaseAt = releaseAt;
    const holdSong = (AUTOPLAY_PRESS_MS / 1000) * this.opts.settings.rate;
    this.pressedLanes = releaseAt.map((until) => judgeTime <= until + holdSong);
  }

  /** 毎フレーム呼ぶ。曲が終わったら true。 */
  tick(nowMs: number): boolean {
    const clock = this.clock;
    if (!clock || this.stateValue !== "playing") return this.stateValue === "finished";
    clock.update(nowMs);
    // 予約は「いま聞こえている位置」ではなく AudioContext の現在時刻から先を見る
    this.scheduler.pump((this.opts.ctx.currentTime - clock.startContextTime) * clock.rate);
    const t = this.judgeTime(nowMs);
    if (this.opts.settings.autoplay) this.autoplay(t, nowMs);
    for (const result of this.session.update(t)) this.handle(result, nowMs);
    if (this.session.finished && clock.songTimeAt(nowMs) >= this.endTime) {
      this.stateValue = "finished";
      return true;
    }
    return false;
  }

  frame(nowMs: number): Frame {
    const { settings, song } = this.opts;
    const clock = this.clock;
    const rate = settings.rate;
    const firstNote = song.charts[this.opts.difficulty].notes[0]?.[0] ?? 0;
    const heard = clock ? clock.songTimeAt(nowMs) : firstNote - settings.approachSeconds * rate;
    return {
      session: this.session,
      lanes: this.lanes,
      songTime: clock ? heard - (settings.visualOffsetMs / 1000) * rate : heard,
      rate,
      approachSeconds: settings.approachSeconds,
      bars: song.bars,
      beats: song.beats,
      pressed: this.pressedLanes,
      flashes: this.flashes,
      nowMs,
      keyLabels: this.labels,
      progress: clock ? heard / this.endTime : 0,
    };
  }

  stats(): SessionStats {
    return this.session.stats();
  }
}
