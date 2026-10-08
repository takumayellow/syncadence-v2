import { describe, expect, it } from "vitest";
import { RANKS, rankOf } from "./rank";

describe("rankOf", () => {
  it("境界の点数ちょうどでそのランクになる", () => {
    expect(rankOf(1_000_000)).toBe("SSS");
    expect(rankOf(990_000)).toBe("SSS");
    expect(rankOf(989_999)).toBe("SS");
    expect(rankOf(880_000)).toBe("A");
    expect(rankOf(700_000)).toBe("C");
    expect(rankOf(699_999)).toBe("D");
    expect(rankOf(0)).toBe("D");
    expect(rankOf(-1)).toBe("D");
  });

  it("表は高い順に並んでいる", () => {
    for (let i = 1; i < RANKS.length; i += 1) expect(RANKS[i]!.min).toBeLessThan(RANKS[i - 1]!.min);
  });
});
