import { describe, expect, it } from "vitest";
import { bodyAttitudeToScene, bodyVectorToScene, cameraPresetToScene } from "../../src/core/visualization/aircraftFrame.js";

describe("standard aircraft body-frame rendering", () => {
  it("maps body +z down to scene -z while preserving x and y", () => {
    expect(bodyVectorToScene({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: -3 });
  });

  it("renders positive body pitch as nose-up", () => {
    expect(bodyAttitudeToScene({ rollRad: 0.1, pitchRad: 0.2, yawRad: 0.3 })).toEqual({
      rollRad: -0.1,
      pitchRad: -0.2,
      yawRad: 0.3,
    });
  });

  it("rejects non-finite frame data", () => {
    expect(() => bodyVectorToScene({ x: 0, y: 0, z: NaN })).toThrow();
    expect(() => bodyAttitudeToScene({ pitchRad: Infinity })).toThrow();
  });

  it.each([
    ["side-negative-y", { x: 0, y: 2, z: 0 }],
    ["side-positive-y", { x: 0, y: -2, z: 0 }],
    ["top", { x: 0, y: 0, z: 2 }],
    ["bottom", { x: 0, y: 0, z: -2 }],
    ["front", { x: 2, y: 0, z: 0 }],
    ["rear", { x: -2, y: 0, z: 0 }],
  ])("places the %s camera to produce the declared body-axis viewing direction", (presetId, expectedScenePosition) => {
    expect(cameraPresetToScene(presetId, 2).position).toEqual(expectedScenePosition);
  });
});
