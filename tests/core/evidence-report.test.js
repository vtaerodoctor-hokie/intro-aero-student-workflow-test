import { describe, expect, it } from "vitest";
import { evidencePayload, historyCsv } from "../../src/core/components/EvidenceReport.jsx";

describe("engineering evidence exports", () => {
  it("records configuration, capabilities, verification, warnings, and the reduced-order disclaimer", () => {
    const payload = evidencePayload({
      aircraft: { massKg: 1, payloadKg: 0.2 },
      activeModule: { status: "installed", feature: { id: "test", title: "Test", topicId: "stability", assumptions: ["Linear"], validityLimits: ["Small disturbance"] } },
      registry: { availableCapabilities: [{ id: "test.capability", version: 1, featureId: "test" }], issues: [{ message: "Example warning" }] },
      analysis: { verificationCases: [{ label: "Known case", passed: true }], decision: { question: "Accept?", interpretation: "Qualified result" } },
      session: { timeS: 0.02, durationS: 1, status: "paused", history: [{ timeS: 0, pitchRad: 0 }] },
    });
    expect(payload.modelNotice).toMatch(/not a validated nonlinear 6-DOF/i);
    expect(payload.installedCapabilities[0].id).toBe("test.capability");
    expect(payload.verificationCases[0].passed).toBe(true);
    expect(payload.warnings).toEqual(["Example warning"]);
  });

  it("exports the union of trace fields as CSV", () => {
    const csv = historyCsv([{ timeS: 0, pitchRad: 0 }, { timeS: 0.02, pitchRad: 0.1, pitchMomentNm: 2 }]);
    expect(csv.split("\n")[0]).toBe("timeS,pitchRad,pitchMomentNm");
    expect(csv).toContain("0.02,0.1,2");
  });
});
