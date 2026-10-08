import { describe, expect, it } from "vitest";
import type { MusicEvent } from "../song/types";
import { sampleOffset, SongClock, type ClockSource } from "./clock";
import { detectAttack, findRegion, layerFor, parseManifest, velocityGain, type SampleRegion } from "./regions";
import { EventScheduler } from "./scheduler";

describe("sampleOffset", () => {
  it("出力時刻が使えるならそれを使う", () => {
    const source: ClockSource = {
      currentTime: 10.05,
      getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 5000 }),
    };
    expect(sampleOffset(source, 5020)).toBeCloseTo(5);
  });

  it("出力時刻が壊れていれば currentTime と遅延の申告から推定する", () => {
    const source: ClockSource = {
      currentTime: 10,
      baseLatency: 0.01,
      outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    };
    expect(sampleOffset(source, 5000)).toBeCloseTo(10 - 0.05 - 5);
  });
});

/** currentTime が performance.now() と同じ速さで進む偽の時計。 */
function fakeSource(offset: number, latency = 0) {
  const state = { now: 0 };
  const source: ClockSource = {
    get currentTime() {
      return offset + state.now / 1000;
    },
    outputLatency: latency,
  };
  return { state, source };
}

describe("SongClock", () => {
  it("遅延の分だけ曲の位置を手前にする", () => {
    const { state, source } = fakeSource(2, 0.1);
    const clock = new SongClock(source, 3, 1);
    state.now = 1500;
    clock.update(state.now);
    // currentTime = 3.5、聞こえているのは 3.4 → 曲の 0.4 秒
    expect(clock.songTimeAt(1500)).toBeCloseTo(0.4);
    expect(clock.songTimeAt(1600)).toBeCloseTo(0.5);
  });

  it("テンポを落とすと曲の進みも遅くなる", () => {
    const { state, source } = fakeSource(0);
    const clock = new SongClock(source, 1, 0.5);
    state.now = 3000;
    expect(clock.songTimeAt(3000)).toBeCloseTo(1);
    expect(clock.contextTimeOf(1)).toBeCloseTo(3);
  });

  it("小さな揺れはならし、大きなずれにはすぐ追従する", () => {
    let jitter = 0;
    const source: ClockSource = {
      get currentTime() {
        return 0;
      },
      getOutputTimestamp: () => ({ contextTime: jitter, performanceTime: 1 }),
    };
    const clock = new SongClock(source, 0, 1);
    clock.update(0);
    jitter = 0.01;
    clock.update(0);
    expect(clock.songTimeAt(0)).toBeCloseTo(-0.001 + 0.0005, 4);
    jitter = 0.2;
    clock.update(0);
    expect(clock.songTimeAt(0)).toBeCloseTo(0.2 - 0.001, 4);
  });
});

describe("EventScheduler", () => {
  const events: MusicEvent[] = [0, 0.2, 0.5, 0.9, 1.5].map((t) => [t, 60, 0.1, 80, 0]);

  it("先読みの範囲だけ予約し、同じ音を二度予約しない", () => {
    const played: number[] = [];
    const s = new EventScheduler(events, new Set(), (_, i) => played.push(i), 0.4);
    s.pump(0);
    expect(played).toEqual([0, 1]);
    s.pump(0.1);
    expect(played).toEqual([0, 1, 2]);
    s.pump(1.4);
    expect(played).toEqual([0, 1, 2, 4]); // 0.9 は過ぎてしまったので鳴らさない
    expect(s.finished).toBe(true);
  });

  it("キー音にした音は予約しない", () => {
    const played: number[] = [];
    const s = new EventScheduler(events, new Set([1, 3]), (_, i) => played.push(i));
    s.pump(5);
    expect(played).toEqual([]);
    const fresh = new EventScheduler(events, new Set([1, 3]), (_, i) => played.push(i), 10);
    fresh.pump(0);
    expect(played).toEqual([0, 2, 4]);
  });
});

describe("regions", () => {
  const regions: SampleRegion[] = [
    { file: "C4vL.mp3", key: 60, lo: 59, hi: 61, layer: "L" },
    { file: "C4vH.mp3", key: 60, lo: 59, hi: 61, layer: "H" },
    { file: "E4vL.mp3", key: 64, lo: 62, hi: 65, layer: "L" },
  ];

  it("音高と強さで区間を選ぶ", () => {
    expect(findRegion(regions, 63, "L")?.file).toBe("E4vL.mp3");
    expect(findRegion(regions, 60, "H")?.file).toBe("C4vH.mp3");
  });

  it("範囲外は最も近い基準音で代用する", () => {
    expect(findRegion(regions, 90, "L")?.file).toBe("E4vL.mp3");
    expect(findRegion(regions, 90, "H")?.file).toBe("C4vH.mp3");
  });

  it("強さの分かれ目", () => {
    expect(layerFor(80, 81)).toBe("L");
    expect(layerFor(81, 81)).toBe("H");
  });

  it("目録のファイル名にパスを含めさせない", () => {
    const base = { name: "x", license: "CC0", source: "x", velocitySplit: 81 };
    expect(() => parseManifest({ ...base, regions })).not.toThrow();
    expect(() => parseManifest({ ...base, regions: [{ ...regions[0], file: "../x.mp3" }] })).toThrow();
    expect(() => parseManifest({ ...base, regions: [{ ...regions[0], layer: "M" }] })).toThrow();
  });

  it("立ち上がりの位置を 2 ms 手前から取る", () => {
    const sr = 1000;
    const samples = new Float32Array(100);
    samples[40] = 0.5;
    samples[41] = 1;
    expect(detectAttack(samples, sr)).toBeCloseTo(0.038);
    expect(detectAttack(new Float32Array(10), sr)).toBe(0);
  });

  it("弱音でも聞こえる音量にする", () => {
    expect(velocityGain(1)).toBeGreaterThan(0.18);
    expect(velocityGain(127)).toBeCloseTo(1);
    expect(velocityGain(200)).toBeCloseTo(1);
  });
});
