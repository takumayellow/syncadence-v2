import { describe, expect, it } from "vitest";
import { depthAtY, depthOf, laneAtX, laneEdge, makeTrack, spreadAt, yAt } from "./perspective";

describe("depthOf", () => {
  it("判定線で 1、奥の端で 0", () => {
    expect(depthOf(0)).toBeCloseTo(1);
    expect(depthOf(1)).toBeCloseTo(0);
  });

  it("奥から手前へ単調に増え、手前ほど速く動く", () => {
    const samples = [1, 0.75, 0.5, 0.25, 0].map(depthOf);
    const steps = samples.slice(1).map((d, i) => d - samples[i]!);
    for (const step of steps) expect(step).toBeGreaterThan(0);
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
  });

  it("判定線を過ぎると 1 を超えるが、発散はしない", () => {
    expect(depthOf(-0.1)).toBeGreaterThan(1);
    expect(depthOf(-10)).toBe(depthOf(-0.3));
    expect(Number.isFinite(depthOf(-10))).toBe(true);
  });
});

describe("makeTrack", () => {
  it("横長でも縦長でも、判定線は画面の中、奥の端より下にある", () => {
    for (const [w, h] of [
      [1280, 720],
      [844, 390],
      [390, 780],
    ] as const) {
      const t = makeTrack(w, h, 4);
      expect(t.judgeY).toBeLessThan(h);
      expect(t.judgeY).toBeGreaterThan(t.farY);
      expect(t.nearWidth).toBeLessThanOrEqual(w);
    }
  });

  it("横長の画面では幅を画面の幅の 0.79 倍と高さの 1.4 倍の小さいほうにし、レーン数によらない", () => {
    expect(makeTrack(1280, 800, 4).nearWidth).toBeCloseTo(1280 * 0.79);
    expect(makeTrack(844, 390, 6).nearWidth).toBeCloseTo(390 * 1.4);
    expect(makeTrack(1280, 720, 6).nearWidth).toBe(makeTrack(1280, 720, 4).nearWidth);
    expect(makeTrack(1280, 720, 4).judgeY).toBeCloseTo(720 * 0.79);
  });

  it("縦長の画面ではほぼ画面幅いっぱいに使う", () => {
    expect(makeTrack(390, 844, 4).nearWidth).toBeCloseTo(390 * 0.94);
  });

  it("y と深さは互いに逆写像", () => {
    const t = makeTrack(800, 600, 6);
    for (const d of [0, 0.3, 1, 1.2]) expect(depthAtY(t, yAt(t, d))).toBeCloseTo(d);
  });

  it("レーンは中央に対して左右対称で、判定線で全体の幅になる", () => {
    const t = makeTrack(800, 600, 4);
    expect(spreadAt(t, 1)).toBeCloseTo(t.nearWidth);
    expect(laneEdge(t, 0, 1) + laneEdge(t, 4, 1)).toBeCloseTo(2 * t.centerX);
    expect(laneEdge(t, 2, 0.4)).toBeCloseTo(t.centerX);
  });
});

describe("laneAtX", () => {
  it("判定線のレーン幅で区切り、端のレーンは画面の端まで広げる", () => {
    const t = makeTrack(800, 600, 4);
    const w = t.nearWidth / 4;
    const left = laneEdge(t, 0, 1);
    expect(laneAtX(t, 0)).toBe(0);
    expect(laneAtX(t, left + w * 1.5)).toBe(1);
    expect(laneAtX(t, left + w * 2.5)).toBe(2);
    expect(laneAtX(t, 800)).toBe(3);
  });

  it("6 レーンでも同じ幅で区切り、画面の外の x は端のレーンになる", () => {
    const t = makeTrack(1280, 800, 6);
    const w = t.nearWidth / 6;
    const left = laneEdge(t, 0, 1);
    expect(laneAtX(t, -50)).toBe(0);
    expect(laneAtX(t, left + w * 0.5)).toBe(0);
    expect(laneAtX(t, left + w * 3.5)).toBe(3);
    expect(laneAtX(t, left + w * 5.5)).toBe(5);
    expect(laneAtX(t, 1400)).toBe(5);
  });
});
