import { describe, expect, it } from "vitest";
import { learningModeFor, learningModes } from "../../src/core/data/learningModes.js";
import { plannedFeatureSlots } from "../../src/core/data/lessonCatalog.js";

describe("three learning modes", () => {
  it("defines concept, aircraft, and design in progression order", () => {
    expect(learningModes.map(({ id }) => id)).toEqual(["concept", "aircraft", "design"]);
  });

  it("keeps legacy student analyses in Concept mode", () => {
    expect(learningModeFor({ id: "legacy-lift" })).toBe("concept");
    expect(learningModeFor({ learningMode: "unknown" })).toBe("concept");
  });

  it("classifies planned stability work without implementing its physics", () => {
    expect(plannedFeatureSlots.every((slot) => ["concept", "aircraft", "design"].includes(slot.learningMode))).toBe(true);
    expect(plannedFeatureSlots.every((slot) => slot.planned)).toBe(true);
    expect(plannedFeatureSlots.filter((slot) => slot.topicId === "stability")).toHaveLength(14);
  });
});
