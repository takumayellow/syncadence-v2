import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeSettings, DEFAULT_SETTINGS } from "../storage";
import { DIFFICULTIES } from "./types";
import { parseIndex, parseSong } from "./validate";

const root = new URL("../../public/songs/", import.meta.url);
const json = (name: string): unknown => JSON.parse(readFileSync(new URL(name, root), "utf8"));

describe("同梱の曲データ", () => {
  const index = parseIndex(json("index.json"));

  it("12 曲ある", () => {
    expect(index).toHaveLength(12);
  });

  it.each(index.map((s) => s.id))("%s を読める", (id) => {
    const song = parseSong(json(`${id}.json`), id);
    for (const d of DIFFICULTIES) {
      expect(song.charts[d].notes.length).toBeGreaterThan(0);
    }
  });
});

describe("parseSong", () => {
  const valid = () => structuredClone(json("prelude-op28-4.json")) as Record<string, any>;

  it("ID が違えば拒否する", () => {
    expect(() => parseSong(valid(), "other")).toThrow();
  });

  it("レーンの範囲外を拒否する", () => {
    const data = valid();
    data.charts.easy.notes[0][1] = data.charts.easy.lanes;
    expect(() => parseSong(data, "prelude-op28-4")).toThrow();
  });

  it("存在しない音への参照を拒否する", () => {
    const data = valid();
    data.charts.hard.notes[0][3] = [data.events.length];
    expect(() => parseSong(data, "prelude-op28-4")).toThrow();
  });

  it("不正な ID の形式を拒否する", () => {
    const data = valid();
    data.id = "../evil";
    expect(() => parseSong(data, "../evil")).toThrow();
  });

  it("Mutopia 以外へのリンクを拒否する", () => {
    const data = valid();
    data.credit.pieceUrl = "javascript:alert(1)";
    expect(() => parseSong(data, "prelude-op28-4")).toThrow();
  });

  it("クレジットの欠けた項目を拒否する", () => {
    const data = valid();
    delete data.credit.maintainer;
    expect(() => parseSong(data, "prelude-op28-4")).toThrow();
  });
});

describe("sanitizeSettings", () => {
  it("壊れた値は既定値に戻し、範囲外は丸める", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ inputOffsetMs: 9999, rate: 0.1, volume: "x", keysound: 1 })).toEqual({
      ...DEFAULT_SETTINGS,
      inputOffsetMs: 300,
      rate: 0.5,
    });
  });
});
