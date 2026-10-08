import { describe, expect, it } from "vitest";
import type { RawChartNote } from "../song/types";
import { judgeDelta, MAX_SCORE } from "./judge";
import { GameSession } from "./session";

describe("judgeDelta", () => {
  it.each([
    [0, "perfect"],
    [-42, "perfect"],
    [43, "great"],
    [-83, "great"],
    [100, "good"],
    [-125, "good"],
    [140, "miss"],
    [-160, "miss"],
  ] as const)("%d ms → %s", (delta, expected) => {
    expect(judgeDelta(delta)).toBe(expected);
  });

  it("判定幅の外は空振りとして null", () => {
    expect(judgeDelta(-161)).toBeNull();
    expect(judgeDelta(500)).toBeNull();
  });
});

const tap = (t: number, lane: number): RawChartNote => [t, lane, 0, []];

describe("GameSession", () => {
  it("ぴったり叩けば満点", () => {
    const s = new GameSession([tap(1, 0), tap(2, 1)], 4);
    expect(s.press(0, 1)?.judgement).toBe("perfect");
    expect(s.press(1, 2.03)?.judgement).toBe("perfect");
    expect(s.finished).toBe(true);
    expect(s.stats()).toMatchObject({ score: MAX_SCORE, maxCombo: 2, deltas: [0, expect.closeTo(30, 6)] });
  });

  it("遠い未来のノーツを叩いても何も起きない", () => {
    const s = new GameSession([tap(5, 0)], 4);
    expect(s.press(0, 1)).toBeNull();
    expect(s.stateOf(0)).toBe("pending");
  });

  it("違うレーンは判定しない", () => {
    const s = new GameSession([tap(1, 0)], 4);
    expect(s.press(2, 1)).toBeNull();
  });

  it("見逃すとミスになりコンボが切れる", () => {
    const s = new GameSession([tap(1, 0), tap(1.5, 0), tap(3, 0)], 4);
    s.press(0, 1);
    s.press(0, 1.5);
    expect(s.hud().combo).toBe(2);
    expect(s.update(3.2)).toHaveLength(1);
    const stats = s.stats();
    expect(stats.counts.miss).toBe(1);
    expect(stats.combo).toBe(0);
    expect(stats.maxCombo).toBe(2);
  });

  it("判定幅の内側にいるうちは見逃し扱いにしない", () => {
    const s = new GameSession([tap(1, 0)], 4);
    expect(s.update(1.1)).toHaveLength(0);
    expect(s.press(0, 1.1)?.judgement).toBe("good");
  });

  it("早すぎる押下は空振りミス、ミスは時刻のずれに数えない", () => {
    const s = new GameSession([tap(1, 0)], 4);
    expect(s.press(0, 0.85)?.judgement).toBe("miss");
    expect(s.stats().deltas).toEqual([]);
  });

  it("同じ時刻の和音は別々のレーンで取れる", () => {
    const s = new GameSession([tap(1, 0), tap(1, 3)], 4);
    expect(s.press(3, 1)?.judgement).toBe("perfect");
    expect(s.press(0, 1)?.judgement).toBe("perfect");
  });

  describe("ロングノーツ", () => {
    const hold: RawChartNote = [1, 0, 1, []];

    it("始点と終点で 2 つ数える", () => {
      expect(new GameSession([hold], 4).total).toBe(2);
    });

    it("押し続ければ終点で成功", () => {
      const s = new GameSession([hold], 4);
      s.press(0, 1);
      expect(s.isHolding(0)).toBe(true);
      expect(s.update(2)).toEqual([expect.objectContaining({ judgement: "perfect", part: "tail" })]);
      expect(s.finished).toBe(true);
      expect(s.stats().score).toBe(MAX_SCORE);
    });

    it("終点の少し手前で離すのは許す", () => {
      const s = new GameSession([hold], 4);
      s.press(0, 1);
      expect(s.release(0, 1.9)?.judgement).toBe("perfect");
    });

    it("早く離すと終点はミス", () => {
      const s = new GameSession([hold], 4);
      s.press(0, 1);
      expect(s.release(0, 1.5)?.judgement).toBe("miss");
      expect(s.stats().counts).toMatchObject({ perfect: 1, miss: 1 });
    });

    it("始点を見逃すと終点もミスになる", () => {
      const s = new GameSession([hold], 4);
      s.update(1.5);
      expect(s.stats().counts.miss).toBe(2);
      expect(s.finished).toBe(true);
    });

    it("押している間は同じレーンの次のノーツを取らない", () => {
      const s = new GameSession([hold, tap(1.05, 0)], 4);
      s.press(0, 1);
      expect(s.press(0, 1.05)).toBeNull();
    });
  });

  it("テンポを落とすと、曲の時間差は実時間に直して判定する", () => {
    // 半分の速さでは、曲の 0.03 秒は実時間の 60 ms
    const s = new GameSession([tap(1, 0)], 4, 0.5);
    const result = s.press(0, 1.03);
    expect(result?.deltaMs).toBeCloseTo(60);
    expect(result?.judgement).toBe("great");
  });

  it("stats は内部の配列を共有しない", () => {
    const s = new GameSession([tap(1, 0)], 4);
    s.press(0, 1);
    const first = s.stats();
    (first.deltas as number[]).push(999);
    expect(s.stats().deltas).toEqual([0]);
  });
});
