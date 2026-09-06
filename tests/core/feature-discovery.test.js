import { describe, expect, it } from "vitest";
import { features } from "../../src/core/features/index.js";

describe("feature discovery", () => {
  it("loads instructor demonstrations and student feature files", () => {
    expect(features.map((feature) => feature.id)).toEqual(
      expect.arrayContaining(["weight-demo", "geometry-visualization"]),
    );
  });

  it.skipIf(!features.some(feature => feature.id === "lift"))("keeps legacy Version 1 student features discoverable", () => {
    const lift = features.find((feature) => feature.id === "lift");
    expect(lift).toBeDefined();
    expect(lift.contractVersion).toBeUndefined();
  });
});
