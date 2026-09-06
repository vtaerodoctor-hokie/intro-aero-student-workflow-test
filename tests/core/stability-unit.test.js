import { describe, expect, it } from "vitest";
import { initialAircraft, parameterDefinitions } from "../../src/core/data/aircraft.js";
import { featuresForLesson, lessonCatalog } from "../../src/core/data/lessonCatalog.js";

describe("stability teaching core", () => {
  it("provides reusable course topics instead of a stability-specific shell", () => {
    expect(lessonCatalog.map((lesson) => lesson.id)).toEqual([
      "foundations", "stability", "control", "lift", "drag", "performance",
    ]);
  });

  it("uses unique feature slots", () => {
    const featureIds = lessonCatalog.flatMap((lesson) => lesson.modules.map((module) => module.id));
    expect(new Set(featureIds).size).toBe(featureIds.length);
    expect(featureIds).toEqual(expect.arrayContaining([
      "force-moment", "trim-response", "static-margin", "cg-loading", "dynamic-mode", "mission-loading", "lift",
    ]));
  });

  it("defines every lesson input in the canonical aircraft state", () => {
    const definitionKeys = new Set(parameterDefinitions.map(({ key }) => key));
    const lessonKeys = new Set(lessonCatalog.flatMap((lesson) => lesson.modules.flatMap((module) => module.parameterKeys || [])));

    lessonKeys.forEach((key) => {
      expect(initialAircraft).toHaveProperty(key);
      expect(definitionKeys.has(key)).toBe(true);
    });
  });

  it("places assigned analyses and leaves legacy analyses in foundations", () => {
    const features = [{ id: "lift" }, { id: "static-margin" }, { id: "weight-demo" }];

    expect(featuresForLesson(features, lessonCatalog[0]).map(({ id }) => id)).toEqual(["weight-demo"]);
    expect(featuresForLesson(features, lessonCatalog[1]).map(({ id }) => id)).toEqual([
      "static-margin",
    ]);
    expect(featuresForLesson(features, lessonCatalog[3]).map(({ id }) => id)).toEqual(["lift"]);
  });

  it("starts with a physically consistent introductory loading scenario", () => {
    expect(initialAircraft.forwardCgLimitM).toBeLessThan(initialAircraft.aftCgLimitM);
    expect(initialAircraft.initialPayloadPositionM).toBeLessThan(initialAircraft.missionPayloadPositionM);
    expect(initialAircraft.dutchRollRealPartPerS).toBeLessThan(0);
    expect(initialAircraft.dutchRollImagPartRadS).toBeGreaterThan(0);
  });
});
