import { resolveFeatureAnalysis } from '../features/featureContract.js';
import { modelsForFeature } from '../capabilities/capabilityContract.js';
import { capabilityContext, runSimulation } from '../simulation/runtime.js';

export function evaluateExperiment(feature, supplied, registry) {
  try {
    const resolved = feature.experiment?.resolve?.({ ...supplied }) || { aircraft: { ...supplied }, derived: [] };
    const aircraft = resolved.aircraft;
    const entries = modelsForFeature(feature.id, registry);
    const invalidIds = new Set([feature.id, ...entries.map((entry) => entry.feature.id)]);
    const issue = registry.issues.find((issue) => invalidIds.has(issue.featureId));
    if (issue) throw new Error(issue.message);
    const capabilities = capabilityContext(entries, aircraft, feature.simulation);
    const analysis = feature.experiment?.evaluate
      ? feature.experiment.evaluate(aircraft, capabilities)
      : resolveFeatureAnalysis(feature, aircraft, capabilities);
    if (!analysis?.results?.length) throw new Error('The module did not return results.');
    const failure = analysis.results.find((item) => item.label === 'Analysis unavailable');
    if (failure) throw new Error(failure.note || 'Analysis unavailable');
    if (!analysis.motion && !feature.experiment && feature.simulation?.display === 'response') {
      analysis.motion = runSimulation({ entries, aircraft, scenario: feature.simulation }).history;
    }
    return { ...analysis, aircraft, derived: resolved.derived || [], notice: resolved.notice || '', error: null };
  } catch (error) {
    return { results: [], plots: [], verificationCases: [], aircraft: supplied, derived: [], error: error.message };
  }
}

export function comparePlot(plot, baseline, enabled) {
  if (!enabled || !baseline || baseline.xLabel !== plot.xLabel || baseline.yLabel !== plot.yLabel) return plot;
  return { ...plot, markers: [...(baseline.markers || []).map((m) => ({ ...m, label: `Baseline · ${m.label}`, color: "#83919e" })), ...(plot.markers || [])], series: [
    ...baseline.series.map((series) => ({ ...series, label: `Baseline · ${series.label}`, color: '#83919e' })),
    ...plot.series,
  ] };
}

export function validateInput(text, definition) {
  if (text.trim() === '') return { error: 'Enter a number; the last valid value is still in use.' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: 'Enter a finite number.' };
  if (definition.min != null && value < definition.min) return { error: `Use ${definition.min} or greater.` };
  if (definition.max != null && value > definition.max) return { error: `Use ${definition.max} or less.` };
  return { value };
}

export const STORAGE_KEY = 'aero-guided-lab-v1';
export function readNotebook(storage) {
  try { const data = JSON.parse(storage.getItem(STORAGE_KEY)); return data?.version === 1 && data.lessons && typeof data.lessons === 'object' ? data.lessons : {}; } catch { return {}; }
}
export function writeNotebook(storage, lessons) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, lessons })); return true; } catch { return false; }
}
export function snapshotExperiment(inputs, result) {
  return JSON.parse(JSON.stringify({ inputs, result, capturedAt: new Date().toISOString() }));
}

export function frameAtTime(motion, timeS) {
  if (!motion?.length) return {};
  if (timeS <= motion[0].timeS) return motion[0];
  if (timeS >= motion.at(-1).timeS) return motion.at(-1);
  let low = 0, high = motion.length - 1;
  while (high - low > 1) { const middle = Math.floor((low + high) / 2); if (motion[middle].timeS <= timeS) low = middle; else high = middle; }
  const a = motion[low], b = motion[high], fraction = (timeS - a.timeS) / (b.timeS - a.timeS);
  return Object.fromEntries(Object.keys(a).map((key) => [key, Number.isFinite(a[key]) && Number.isFinite(b[key]) ? a[key] + fraction * (b[key] - a[key]) : a[key]]));
}
