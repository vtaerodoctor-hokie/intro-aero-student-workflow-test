import { describe, expect, it } from "vitest";
import { createCapabilityRegistry } from "../../src/core/capabilities/capabilityContract.js";
import { buildCurriculum } from "../../src/core/data/curriculum.js";
import { topicCatalog } from "../../src/core/data/topicCatalog.js";
import { featureEntries } from "../../src/core/features/index.js";

describe("topic-agnostic curriculum", () => {
  it("reserves independent topic spaces and fourteen cumulative stability stages", () => {
    expect(topicCatalog.map(({ id }) => id)).toEqual(["foundations", "stability", "control", "lift", "drag", "performance"]);
    const stability = topicCatalog.find(({ id }) => id === "stability");
    expect(stability.modules).toHaveLength(14);
    expect(stability.modules.map(({ stage }) => stage)).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
  });

  it("keeps legacy modules installed while making only the first unmet chain stage ready", () => {
    const stabilityIds = new Set(topicCatalog.find(({ id }) => id === "stability").modules.map(({ id }) => id));
    const baselineEntries = featureEntries.filter(({ feature }) => !stabilityIds.has(feature.id));
    if (!baselineEntries.some(({feature}) => feature.id === "lift")) baselineEntries.push({feature:{id:"lift",title:"Legacy fixture"},model:{}});
    const curriculum = buildCurriculum(baselineEntries, createCapabilityRegistry(baselineEntries));
    const foundations = curriculum.find(({ id }) => id === "foundations");
    const lift = curriculum.find(({ id }) => id === "lift");
    const stability = curriculum.find(({ id }) => id === "stability");

    expect(foundations.modules.map(({ feature }) => feature.id)).toEqual(expect.arrayContaining(["weight-demo", "geometry-visualization"]));
    expect(lift.modules.find(({ feature }) => feature.id === "lift").status).toBe("installed");
    expect(stability.modules[0].status).toBe("ready");
    expect(stability.modules.slice(1).every(({ status }) => status === "locked")).toBe(true);
  });

  it("publishes prerequisites but no equations or reference outputs", () => {
    const publicText = JSON.stringify(topicCatalog);
    expect(publicText).not.toMatch(/equation|referenceOutput|solution/i);
    expect(topicCatalog.find(({ id }) => id === "stability").modules[1].requiresCapabilities).toEqual([{ id: "loads.pitch.external-moment", version: 1 }]);
  });
});
