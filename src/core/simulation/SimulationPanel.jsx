import { useEffect, useMemo, useState } from "react";
import { modelsForFeature } from "../capabilities/capabilityContract.js";
import { advanceSimulationSession, createSimulationSession, FIXED_STEP_S } from "./runtime.js";

function createSafeSession(entries, aircraft, scenario) {
  try {
    return createSimulationSession({ entries, aircraft, scenario });
  } catch (error) {
    return { timeS: 0, durationS: scenario.durationS || aircraft.simulationDurationS, state: {}, history: [], status: "error", error: error.message };
  }
}

export function simulationPlot(session) {
  if (!session?.history?.length) return null;
  const requestedKeys = Array.isArray(session.plotStateKeys) ? new Set(session.plotStateKeys) : null;
  const stateSeries = [
    ["Pitch angle", "pitchRad", "#ff5a36"],
    ["Roll angle", "rollRad", "#164f45"],
    ["Yaw angle", "yawRad", "#6886c5"],
  ].filter(([, key]) => (!requestedKeys || requestedKeys.has(key)) && session.history.some((sample) => Number.isFinite(sample[key])));
  return {
    id: "simulation-attitude-history",
    title: "Attitude response history",
    xLabel: "Time (s)",
    yLabel: "Angle (deg)",
    currentX: session.timeS,
    referenceLines: (session.events || []).map(({ timeS, label }) => ({ axis: "x", value: timeS, label })),
    series: stateSeries.map(([label, key, color]) => ({
      label,
      color,
      points: session.history.map((sample) => ({ x: sample.timeS, y: sample[key] * 180 / Math.PI })),
    })),
  };
}

export function simulationRatePlot(session) {
  if (!session?.history?.length || !Array.isArray(session.plotStateKeys)) return null;
  const requestedKeys = new Set(session.plotStateKeys.map(String));
  const rateSeries = [
    ["Pitch rate", "pitchRateRadS", "#b7482f"],
    ["Roll rate", "rollRateRadS", "#164f45"],
    ["Yaw rate", "yawRateRadS", "#6886c5"],
  ].filter(([, key]) => requestedKeys.has(key) && session.history.some((sample) => Number.isFinite(sample[key])));
  if (rateSeries.length === 0) return null;
  return {
    id: "simulation-angular-rate-history",
    title: "Angular-rate response history",
    xLabel: "Time (s)",
    yLabel: "Angular rate (deg/s)",
    currentX: session.timeS,
    referenceLines: (session.events || []).map(({ timeS, label }) => ({ axis: "x", value: timeS, label })),
    series: rateSeries.map(([label, key, color]) => ({
      label,
      color,
      points: session.history.map((sample) => ({ x: sample.timeS, y: sample[key] * 180 / Math.PI })),
    })),
  };
}

export function simulationPlots(session) {
  return [simulationPlot(session), simulationRatePlot(session)].filter(Boolean);
}

export function useSimulationController({ activeModule, registry, aircraft }) {
  const entries = useMemo(
    () => activeModule?.entry ? modelsForFeature(activeModule.feature.id, registry) : [],
    [activeModule, registry],
  );
  const declaredDurationS = activeModule?.feature?.simulation?.durationS ?? aircraft.simulationDurationS;
  const minimumDurationS = Math.max(
    FIXED_STEP_S,
    (activeModule?.feature?.simulation?.disturbance?.pitchRamp?.durationS ?? 0) + FIXED_STEP_S,
  );
  const [durationS, setDurationS] = useState(() => Math.max(declaredDurationS, minimumDurationS));
  const scenario = useMemo(() => ({
    durationS,
    initialState: activeModule?.feature?.simulation?.initialState,
    controls: activeModule?.feature?.simulation?.controls,
    disturbance: activeModule?.feature?.simulation?.disturbance,
    plotStateKeys: activeModule?.feature?.simulation?.plotStateKeys,
  }), [activeModule, durationS]);
  const runnable = Boolean(activeModule?.runtimeReady && entries.length > 0);
  const [session, setSession] = useState(() => createSafeSession(entries, aircraft, scenario));

  useEffect(() => {
    setDurationS(Math.max(declaredDurationS, minimumDurationS));
  }, [activeModule?.feature?.id, declaredDurationS, minimumDurationS]);

  useEffect(() => {
    const next = createSafeSession(entries, aircraft, scenario);
    setSession(next);
  }, [activeModule?.feature?.id, aircraft, entries, scenario]);

  useEffect(() => {
    if (session.status !== "running" || !runnable) return undefined;
    const timer = window.setInterval(() => {
      setSession((current) => {
        try {
          const next = advanceSimulationSession(current, { entries, aircraft, scenario, stepS: FIXED_STEP_S });
          const running = next.status === "complete" ? next : { ...next, status: "running" };
          return running;
        } catch (error) {
          const failed = { ...current, status: "error", error: error.message };
          return failed;
        }
      });
    }, FIXED_STEP_S * 1000);
    return () => window.clearInterval(timer);
  }, [session.status, runnable, entries, aircraft, scenario]);

  function reset() {
    const next = createSafeSession(entries, aircraft, scenario);
    setSession(next);
  }

  function step() {
    try {
      const next = advanceSimulationSession(session, { entries, aircraft, scenario });
      setSession(next);
    } catch (error) {
      const failed = { ...session, status: "error", error: error.message };
      setSession(failed);
    }
  }

  function clearRun() {
    const next = { ...session, history: [] };
    setSession(next);
  }

  function toggleRun() {
    const next = { ...session, status: session.status === "running" ? "paused" : "running" };
    setSession(next);
  }

  function setDuration(nextDurationS) {
    if (!Number.isFinite(nextDurationS) || nextDurationS <= 0) return;
    setDurationS(Math.max(nextDurationS, minimumDurationS));
  }

  return { session, runnable, durationS, minimumDurationS, setDuration, reset, step, clearRun, toggleRun };
}

export default function SimulationPanel({ controller, compact = false, idSuffix = "response" }) {
  const { session, runnable, durationS, minimumDurationS, setDuration, reset, step, clearRun, toggleRun } = controller;
  const titleId = `simulation-title-${idSuffix}`;
  const durationId = `simulation-duration-${idSuffix}`;

  return (
    <section className={`simulation-panel${compact ? " simulation-panel-compact" : ""}`} aria-labelledby={titleId}>
      <div>
        <p className="eyebrow">Reduced-order runtime</p>
        <h3 id={titleId}>Deterministic response</h3>
        <p className="simulation-disclaimer">Linear teaching models only · fixed 0.02 s RK4 step · not a validated nonlinear 6-DOF digital twin</p>
      </div>
      <div className="simulation-status">
        <label className="simulation-duration" htmlFor={durationId}>
          <span>Run duration</span>
          <span className="input-with-unit">
            <input
              id={durationId}
              type="number"
              min={minimumDurationS}
              step={FIXED_STEP_S}
              value={Number(durationS.toFixed(2))}
              disabled={session.status === "running"}
              title="Changing the duration resets the simulation"
              onChange={(event) => setDuration(Number(event.target.value))}
            />
            <span>s</span>
          </span>
        </label>
        <div className="simulation-readout" aria-live="polite">
          <strong>{session.timeS.toFixed(2)} s</strong>
          <span>{runnable ? `${session.status} · ends at ${durationS.toFixed(2)} s` : "Waiting for an installed Version 4 model"}</span>
        </div>
      </div>
      <div className="simulation-actions">
        <button type="button" disabled={!runnable || session.status === "complete"} onClick={toggleRun}>
          {session.status === "running" ? "Pause" : "Run"}
        </button>
        <button type="button" disabled={!runnable || session.status === "running" || session.status === "complete"} onClick={step}>Step</button>
        <button type="button" disabled={!runnable} onClick={reset}>Reset</button>
        <button type="button" disabled={!runnable || session.history.length === 0} onClick={clearRun}>Clear run</button>
      </div>
      {session.error && <p className="runtime-error">{session.error}</p>}
    </section>
  );
}
