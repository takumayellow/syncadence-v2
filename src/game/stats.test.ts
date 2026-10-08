import { describe, expect, it } from "vitest";
import { isStartKey, keyLabels, laneOfKey } from "./keys";
import { calibrate, median, summarizeDeltas } from "./stats";

describe("median", () => {
  it("奇数個・偶数個・空", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("summarizeDeltas", () => {
  it("±20 ms を超えたものを早め・遅めに数える", () => {
    expect(summarizeDeltas([-30, -5, 0, 10, 25, 40])).toEqual({ median: 5, early: 1, late: 2 });
    expect(summarizeDeltas([])).toBeNull();
  });
});

describe("calibrate", () => {
  const clicks = Array.from({ length: 16 }, (_, i) => 2400 + i * 600);

  it("一定の遅れを取り出す", () => {
    const taps = clicks.map((c, i) => c + 35 + (i % 3) - 1);
    expect(calibrate(taps, clicks, 600)).toBe(35);
  });

  it("半拍以上離れたタップは捨てる", () => {
    const taps = [...clicks.slice(0, 6).map((c) => c - 20), clicks[6]! + 310];
    expect(calibrate(taps, clicks, 600)).toBe(-20);
  });

  it("タップが 4 回に満たなければ測れない", () => {
    expect(calibrate([2400, 3000, 3600], clicks, 600)).toBeNull();
  });
});

describe("keys", () => {
  const key = (code: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey", boolean>> = {}) => ({
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  });

  it("レーンのキーと表示", () => {
    expect(laneOfKey("KeyJ", 4)).toBe(2);
    expect(laneOfKey("KeyS", 4)).toBeNull();
    expect(laneOfKey("KeyS", 6)).toBe(0);
    expect(keyLabels(6)).toEqual(["S", "D", "F", "J", "K", "L"]);
  });

  it.each(["KeyD", "Space", "Enter", "Digit1", "ArrowUp"])("%s で開始できる", (code) => {
    expect(isStartKey(key(code))).toBe(true);
  });

  it.each(["F11", "F5", "F12", "Tab", "Escape", "ShiftLeft", "MetaLeft", "BrowserBack", "AudioVolumeUp"])(
    "%s はブラウザに任せる",
    (code) => {
      expect(isStartKey(key(code))).toBe(false);
    },
  );

  it("修飾キーとの組み合わせ（Ctrl+R など）では開始しない", () => {
    expect(isStartKey(key("KeyR", { ctrlKey: true }))).toBe(false);
    expect(isStartKey(key("KeyI", { metaKey: true }))).toBe(false);
    expect(isStartKey(key("ArrowLeft", { altKey: true }))).toBe(false);
  });
});
