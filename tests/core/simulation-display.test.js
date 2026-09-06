import { describe, expect, it } from "vitest";
import { showsSimulationResponse, simulationDisplayMode } from "../../src/core/simulation/displayMode.js";

describe("simulation display mode", () => {
  it("shows response controls by default for runtime-ready features", () => {
    expect(simulationDisplayMode({ simulation: {} })).toBe("response");
    expect(showsSimulationResponse({ simulation: {} }, true)).toBe(true);
  });

  it("keeps analysis-only capability modules out of the response UI", () => {
    const feature = { simulation: { display: "analysis-only" } };
    expect(simulationDisplayMode(feature)).toBe("analysis-only");
    expect(showsSimulationResponse(feature, true)).toBe(false);
  });

  it("never shows response controls when a feature is not runtime ready", () => {
    expect(showsSimulationResponse({ simulation: { display: "response" } }, false)).toBe(false);
  });

  it("rejects unsupported display modes", () => {
    expect(() => simulationDisplayMode({ simulation: { display: "cinematic" } })).toThrow();
  });
});
