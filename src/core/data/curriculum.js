import { requirementsFor } from "../capabilities/capabilityContract.js";
import { topicCatalog, topicForFeature } from "./topicCatalog.js";

export function buildCurriculum(featureEntries, registry) {
  const installedById = new Map(featureEntries.map((entry) => [entry.feature.id, entry]));
  const catalogIds = new Set(topicCatalog.flatMap((topic) => topic.modules.map((module) => module.id)));

  return topicCatalog.map((topic) => {
    const catalogModules = topic.modules.map((descriptor) => {
      const entry = installedById.get(descriptor.id);
      const feature = entry ? { ...descriptor, ...entry.feature, topicId: topic.id } : { ...descriptor, topicId: topic.id, inputKeys: descriptor.parameterKeys, planned: true };
      const requirements = requirementsFor(feature, registry);
      const requirementsSatisfied = requirements.every(({ satisfied }) => satisfied);
      return {
        descriptor,
        entry,
        feature,
        requirements,
        status: entry ? "installed" : requirementsSatisfied ? "ready" : "locked",
        runtimeReady: Boolean(entry?.model && requirementsSatisfied),
      };
    });

    const uncatalogued = featureEntries
      .filter(({ feature }) => !catalogIds.has(feature.id) && topicForFeature(feature) === topic.id)
      .map((entry) => ({
        descriptor: null,
        entry,
        feature: { ...entry.feature, topicId: topic.id },
        requirements: requirementsFor(entry.feature, registry),
        status: "installed",
        runtimeReady: Boolean(entry.model),
      }));

    return { ...topic, modules: [...catalogModules, ...uncatalogued] };
  });
}
