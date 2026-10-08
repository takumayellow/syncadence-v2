import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bestKey, DEFAULT_SETTINGS, loadBest, loadSettings, recordBest, saveSettings } from "./storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("設定", () => {
  it("保存したものを読み戻せる", () => {
    const settings = { ...DEFAULT_SETTINGS, inputOffsetMs: 35, keysound: true };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it("壊れた JSON は既定値になる", () => {
    storage.data.set("syncadence.v2.settings", "{broken");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("localStorage が使えなくても例外を出さない", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe("自己ベスト", () => {
  const key = bestKey("fur-elise", "hard");

  it("キーは曲と難易度から作る", () => {
    expect(key).toBe("fur-elise:hard");
  });

  it("高い点だけを記録して保存する", () => {
    const first = recordBest({}, key, 800_000);
    expect(first[key]).toBe(800_000);
    expect(loadBest()).toEqual({ [key]: 800_000 });

    const lower = recordBest(first, key, 700_000);
    expect(lower).toBe(first);
    expect(loadBest()[key]).toBe(800_000);

    const higher = recordBest(first, key, 900_000);
    expect(higher[key]).toBe(900_000);
    expect(first[key]).toBe(800_000);
    expect(loadBest()[key]).toBe(900_000);
  });

  it("数値でない記録は読み捨てる", () => {
    storage.data.set("syncadence.v2.best", JSON.stringify({ a: 1, b: "x", c: null }));
    expect(loadBest()).toEqual({ a: 1 });
  });

  it("記録が無ければ空", () => {
    expect(loadBest()).toEqual({});
  });
});
