import { describe, expect, it } from "vitest";
import { createCapabilityRegistry, modelsForFeature, requirementsFor } from "../../src/core/capabilities/capabilityContract.js";

function entry(id, { requires = [], provides = [], version = 4, kind = "derived" } = {}) {
  return {
    feature: {
      id,
      contractVersion: version,
      requiresCapabilities: requires,
      providesCapabilities: provides,
    },
    model: version === 4 ? { kind, evaluate: () => ({ values: {} }) } : undefined,
  };
}

describe("Version 4 capability registry", () => {
  it("orders providers before consumers and selects the dependency closure", () => {
    const first = entry("first", { provides: [{ id: "loads.pitch", version: 1 }] });
    const second = entry("second", { requires: [{ id: "loads.pitch", version: 1 }], provides: [{ id: "state.pitch", version: 1 }], kind: "state-model" });
    const registry = createCapabilityRegistry([second, first, entry("legacy", { version: 1 })]);

    expect(registry.issues).toEqual([]);
    expect(registry.orderedEntries.map(({ feature }) => feature.id)).toEqual(["first", "second"]);
    expect(modelsForFeature("second", registry).map(({ feature }) => feature.id)).toEqual(["first", "second"]);
    expect(modelsForFeature("legacy", registry)).toEqual([]);
  });

  it("reports missing and insufficient capability versions", () => {
    const registry = createCapabilityRegistry([
      entry("provider", { provides: [{ id: "a", version: 1 }] }),
      entry("consumer", { requires: [{ id: "a", version: 2 }, { id: "missing", version: 1 }], provides: [{ id: "b", version: 1 }] }),
    ]);
    expect(registry.issues.map(({ type }) => type).sort()).toEqual(["missing-capability", "version-mismatch"]);
    expect(requirementsFor(registry.entries[1].feature, registry).every(({ satisfied }) => !satisfied)).toBe(true);
  });

  it("reports duplicate providers and dependency cycles", () => {
    const duplicate = createCapabilityRegistry([
      entry("one", { provides: ["shared"] }),
      entry("two", { provides: ["shared"] }),
    ]);
    expect(duplicate.issues.some(({ type }) => type === "duplicate-provider")).toBe(true);

    const cycle = createCapabilityRegistry([
      entry("one", { requires: ["b"], provides: ["a"] }),
      entry("two", { requires: ["a"], provides: ["b"] }),
    ]);
    expect(cycle.issues.some(({ type }) => type === "dependency-cycle")).toBe(true);
  });

  it("rejects invalid model kinds without taking down legacy entries", () => {
    const invalid = entry("invalid", { provides: ["x"] });
    invalid.model.kind = "renderer";
    const registry = createCapabilityRegistry([invalid, entry("legacy", { version: 1 })]);
    expect(registry.issues[0].type).toBe("invalid-module");
    expect(registry.availableCapabilities).toEqual([]);
  });
});
