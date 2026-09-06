import { describe, expect, it } from "vitest";
import { resolveFeatureAnalysis } from "../../src/core/features/featureContract.js";

const aircraft = { massKg: 1 };
const validAnalysis = {
  results: [{ label: "Value", value: 1, unit: "N" }],
  verificationCases: [{ label: "Known case", passed: true }],
  decision: { question: "Question?", interpretation: "Interpretation", status: "neutral" },
};

describe("feature contract compatibility", () => {
  it("keeps unversioned legacy features working", () => {
    expect(resolveFeatureAnalysis({ analyze: () => validAnalysis }, aircraft)).toBe(validAnalysis);
  });

  it("accepts Version 2 visualization data", () => {
    const analysis = { ...validAnalysis, plots: [], scene: null };
    expect(resolveFeatureAnalysis({ contractVersion: 2, analyze: () => analysis }, aircraft)).toBe(analysis);
  });

  it("accepts Version 3 learning-mode features", () => {
    expect(resolveFeatureAnalysis({ contractVersion: 3, learningMode: "design", topicId: "stability", analyze: () => validAnalysis }, aircraft)).toBe(validAnalysis);
  });

  it("passes capability context to Version 4 analyses", () => {
    const context = { derived: { loadedCgM: 0.2 } };
    let received;
    const feature = {
      contractVersion: 4,
      learningMode: "aircraft",
      topicId: "stability",
      requiresCapabilities: [],
      providesCapabilities: [{ id: "mass.cg.loaded", version: 1 }],
      analyze: (_aircraft, capabilityContext) => { received = capabilityContext; return validAnalysis; },
    };
    expect(resolveFeatureAnalysis(feature, aircraft, context)).toBe(validAnalysis);
    expect(received).toBe(context);
  });

  it("shows a contract failure when Version 3 mode metadata is missing", () => {
    const analysis = resolveFeatureAnalysis({ contractVersion: 3, analyze: () => validAnalysis }, aircraft);
    expect(analysis.verificationCases[0].passed).toBe(false);
  });

  it("converts unsupported contracts to a visible failure instead of crashing", () => {
    const analysis = resolveFeatureAnalysis({ contractVersion: 99, analyze: () => validAnalysis }, aircraft);
    expect(analysis.verificationCases[0].passed).toBe(false);
    expect(analysis.results[0].value).toBe("—");
  });
});
