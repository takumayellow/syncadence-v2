import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sampler } from "../audio/sampler";
import type { RawChartNote, Song } from "../song/types";
import { DEFAULT_SETTINGS, type Settings } from "../storage";
import { eventTimeMs, PlayEngine } from "./engine";

describe("eventTimeMs", () => {
  it("妥当な timeStamp はそのまま使う", () => {
    expect(eventTimeMs(990, 1000)).toBe(990);
  });

  it("0・未来・1 秒以上前の値は今の時刻で代用する", () => {
    expect(eventTimeMs(0, 1000)).toBe(1000);
    expect(eventTimeMs(1500, 1000)).toBe(1000);
    expect(eventTimeMs(1, 5000)).toBe(5000);
  });
});

/** performance.now() と同じ速さで進み、suspend している間は止まる偽の AudioContext。 */
function fakeContext() {
  const state = { now: 0, suspended: false, suspendedAt: 0, stoppedMs: 0 };
  const gain = {
    gain: { value: 1, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const ctx = {
    get currentTime() {
      return ((state.suspended ? state.suspendedAt : state.now) - state.stoppedMs) / 1000;
    },
    destination: {},
    createGain: () => gain,
    resume: vi.fn(async () => {
      if (state.suspended) state.stoppedMs += state.now - state.suspendedAt;
      state.suspended = false;
    }),
    suspend: vi.fn(async () => {
      if (!state.suspended) state.suspendedAt = state.now;
      state.suspended = true;
    }),
  };
  return { state, ctx: ctx as unknown as AudioContext };
}

function makeSong(notes: readonly RawChartNote[]): Song {
  const events = notes.map(([time]) => [time, 60, 0.3, 80, 0] as const);
  const chart = { level: 1, lanes: 4, notes };
  return {
    version: 2,
    id: "test",
    title: "t",
    titleEn: "t",
    composer: "c",
    composerEn: "c",
    composerYears: "",
    bpm: 120,
    duration: 10,
    credit: {
      source: "s",
      mutopiaId: 1,
      pieceUrl: "https://www.mutopiaproject.org/",
      maintainer: "m",
      edition: "e",
      license: "Public Domain",
    },
    bars: [0],
    beats: [0],
    events,
    charts: { easy: chart, normal: chart, hard: chart, expert: chart },
  };
}

function setup(notes: readonly RawChartNote[], overrides: Partial<Settings> = {}) {
  const { state, ctx } = fakeContext();
  const sampler = { play: vi.fn() } as unknown as Sampler;
  const settings = { ...DEFAULT_SETTINGS, approachSeconds: 1, ...overrides };
  const engine = new PlayEngine({ ctx, sampler, song: makeSong(notes), difficulty: "easy", settings });
  vi.spyOn(performance, "now").mockImplementation(() => state.now);
  /** 曲の位置 songTime（秒）になる performance.now() の値（ミリ秒）。 */
  const at = (songTime: number) => (engine as unknown as { clock: { contextTimeOf(t: number): number } }).clock.contextTimeOf(songTime) * 1000;
  const runTo = (ms: number, step = 16) => {
    let done = false;
    while (state.now < ms && !done) {
      state.now = Math.min(ms, state.now + step);
      done = engine.tick(state.now);
    }
    return done;
  };
  return { state, ctx, sampler, engine, at, runTo };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PlayEngine", () => {
  const notes: RawChartNote[] = [
    [1, 0, 0, [0]],
    [1.5, 1, 0, [1]],
    [2, 2, 0.6, [2]],
    [3, 2, 0, [3]],
  ];

  it("開始前は判定しない", () => {
    const { engine } = setup(notes);
    engine.press(0, 0);
    expect(engine.state).toBe("ready");
    expect(engine.stats().counts.perfect).toBe(0);
  });

  it("ちょうどの時刻に押せば PERFECT", async () => {
    const { engine, state, at, runTo } = setup(notes);
    await engine.start();
    runTo(at(1) - 5);
    state.now = at(1);
    engine.press(0, state.now);
    engine.release(0, state.now + 50);
    expect(engine.stats().counts.perfect).toBe(1);
  });

  it("入力の補正を引いて判定する", async () => {
    const { engine, at, runTo } = setup(notes, { inputOffsetMs: 60 });
    await engine.start();
    runTo(at(1) + 50);
    engine.press(0, at(1) + 60);
    expect(engine.stats().counts.perfect).toBe(1);
  });

  it("オートプレイは全部 PERFECT で終わる", async () => {
    const { engine, at, runTo } = setup(notes, { autoplay: true });
    await engine.start();
    expect(runTo(at(10) + 1000)).toBe(true);
    expect(engine.state).toBe("finished");
    const stats = engine.stats();
    expect(stats.counts.perfect).toBe(5);
    expect(stats.maxCombo).toBe(5);
  });

  it("フレームが詰まってロングノーツの終点を飛び越えても、オートプレイは次のノーツを取る", async () => {
    const { engine, at, runTo } = setup(notes, { autoplay: true });
    await engine.start();
    runTo(at(1.9));
    runTo(at(3.05), 5000);
    expect(engine.stats().counts.miss).toBe(0);
    expect(engine.stats().counts.perfect).toBe(5);
  });

  it("一時停止中は時間が進んでも見逃しにならない", async () => {
    const { engine, ctx, state, at, runTo } = setup(notes);
    await engine.start();
    runTo(at(0.5));
    engine.pause();
    expect(engine.state).toBe("paused");
    expect(ctx.suspend).toHaveBeenCalled();
    state.now += 5000;
    expect(engine.tick(state.now)).toBe(false);
    expect(engine.stats().counts.miss).toBe(0);
    await engine.resume();
    expect(engine.state).toBe("playing");
  });

  it("一時停止中はノーツが止まり、再開すると止めた位置から進む", async () => {
    const { engine, state, at, runTo } = setup(notes);
    await engine.start();
    runTo(at(0.5));
    const paused = engine.frame(state.now).songTime;
    engine.pause();
    state.now += 3000;
    expect(engine.frame(state.now).songTime).toBe(paused);
    await engine.resume();
    expect(engine.frame(state.now).songTime).toBeCloseTo(paused, 5);
  });

  it("キー音では叩いた音だけを鳴らす", async () => {
    const { engine, sampler, at, runTo } = setup(notes, { keysound: true });
    await engine.start();
    runTo(at(1.7));
    expect(sampler.play).not.toHaveBeenCalled();
  });

  it("キー音で叩けば、その音が鳴る", async () => {
    const { engine, sampler, at, runTo } = setup(notes, { keysound: true });
    await engine.start();
    runTo(at(1));
    engine.press(0, at(1));
    expect(sampler.play).toHaveBeenCalledTimes(1);
  });

  it("キー音でなければ曲の音を先に予約する", async () => {
    const { engine, sampler, at, runTo } = setup(notes);
    await engine.start();
    runTo(at(0.7));
    expect(sampler.play).toHaveBeenCalledTimes(1);
  });
});
