const DISPLAY_MODES = new Set(["response", "analysis-only"]);

export function simulationDisplayMode(feature) {
  const mode = feature?.simulation?.display ?? "response";
  if (!DISPLAY_MODES.has(mode)) {
    throw new TypeError(`Unsupported simulation display mode: ${mode}.`);
  }
  return mode;
}

export function showsSimulationResponse(feature, runtimeReady) {
  return Boolean(runtimeReady && simulationDisplayMode(feature) === "response");
}
