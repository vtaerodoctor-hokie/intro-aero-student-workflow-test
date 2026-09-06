// Core demonstrations and student analyses share one read-only rendering contract.
const coreFeatureModules = import.meta.glob("../demonstrations/*.feature.js", { eager: true });
const studentFeatureModules = import.meta.glob("../../student/features/*.feature.js", { eager: true });

const featureModules = {
  ...coreFeatureModules,
  ...studentFeatureModules,
};

export const featureEntries = Object.values(featureModules)
  .map((module) => ({ feature: module.feature, model: module.model }))
  .filter(({ feature }) => feature && typeof feature === "object")
  .sort((a, b) => String(a.feature.title).localeCompare(String(b.feature.title)));

export const features = featureEntries.map(({ feature }) => feature);
