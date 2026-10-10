import { describe, expect, it } from "vitest";
import { wantsFullscreen } from "./landscape";

const button = { tagName: "BUTTON" } as unknown as Element;
const canvas = { tagName: "CANVAS" } as unknown as EventTarget;

describe("wantsFullscreen", () => {
  it("全画面でないときにボタンなどをタップすると入る", () => {
    expect(wantsFullscreen({ fullscreenEnabled: true, fullscreenElement: null }, button)).toBe(true);
  });

  it("ノーツを叩くキャンバスのタップでは入らない", () => {
    expect(wantsFullscreen({ fullscreenEnabled: true, fullscreenElement: null }, canvas)).toBe(false);
  });

  it("もう全画面のとき、全画面にできない端末では入らない", () => {
    expect(wantsFullscreen({ fullscreenEnabled: true, fullscreenElement: button }, button)).toBe(false);
    expect(wantsFullscreen({ fullscreenEnabled: false, fullscreenElement: null }, button)).toBe(false);
  });

  it("タップした先が分からないときは入る", () => {
    expect(wantsFullscreen({ fullscreenEnabled: true, fullscreenElement: null }, null)).toBe(true);
  });
});
