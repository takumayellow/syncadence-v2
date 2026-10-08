import { describe, expect, it } from "vitest";
import { composerMark, jacketHue, stepDifficulty, stepIndex } from "./select";

describe("jacketHue", () => {
  it("同じ ID なら同じ色、0〜359 に収まる", () => {
    expect(jacketHue("fur-elise")).toBe(jacketHue("fur-elise"));
    for (const id of ["fur-elise", "clair-de-lune", "", "x".repeat(200)]) {
      const hue = jacketHue(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe("composerMark", () => {
  it("姓の頭文字を大文字で返す", () => {
    expect(composerMark("Ludwig van Beethoven")).toBe("B");
    expect(composerMark("Erik Satie")).toBe("S");
    expect(composerMark("")).toBe("");
  });
});

describe("stepIndex / stepDifficulty", () => {
  it("端で止まる", () => {
    expect(stepIndex(0, -1, 5)).toBe(0);
    expect(stepIndex(4, 1, 5)).toBe(4);
    expect(stepIndex(2, 1, 5)).toBe(3);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });

  it("難易度を左右に動かす", () => {
    expect(stepDifficulty("easy", -1)).toBe("easy");
    expect(stepDifficulty("normal", 1)).toBe("hard");
    expect(stepDifficulty("expert", 1)).toBe("expert");
  });
});
