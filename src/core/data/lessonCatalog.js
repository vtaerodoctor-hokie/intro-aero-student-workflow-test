// Compatibility exports for instructor material written before the topic catalog.
// New core work should import topicCatalog and plannedModuleSlots directly.
import { plannedModuleSlots, topicCatalog } from "./topicCatalog.js";

export const lessonCatalog = topicCatalog;
export const plannedFeatureSlots = plannedModuleSlots;
export const foundationInputKeys = [
  "massKg", "payloadKg", "speedMps", "densityKgM3", "wingSpanM",
  "wingAreaM2", "meanChordM", "cl", "cgM", "neutralPointM",
];

export function featuresForLesson(features, topic) {
  const assigned = new Set(topicCatalog.flatMap((item) => item.modules.map((module) => module.id)));
  if (topic.id === "foundations") return features.filter((feature) => !assigned.has(feature.id) && !feature.topicId);
  const ids = new Set(topic.modules.map((module) => module.id));
  return features.filter((feature) => feature.topicId === topic.id || ids.has(feature.id));
}
