import { describe, expect, it } from "vitest";
import { calculateWeight } from "../../src/core/physics/example.js";

describe("weight demonstration", () => {
  it("matches a known numerical case", () => {
    expect(calculateWeight(1)).toBeCloseTo(9.81);
  });

  it("doubles weight when mass doubles", () => {
    expect(calculateWeight(2)).toBeCloseTo(2 * calculateWeight(1));
  });

  it("returns zero for zero mass", () => {
    expect(calculateWeight(0)).toBe(0);
  });

  it("rejects invalid mass", () => {
    expect(() => calculateWeight(-1)).toThrow(RangeError);
  });
});
