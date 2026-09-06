import { describe, expect, it } from "vitest";
import { rk4Step } from "../../src/core/simulation/integrator.js";
import { createSimulationSession, prescribedPitchState, runSimulation } from "../../src/core/simulation/runtime.js";
import { simulationPlot, simulationPlots, simulationRatePlot } from "../../src/core/simulation/SimulationPanel.jsx";

const aircraft = { pitchInertiaKgM2: 2, pitchRateRadS: 0, rollRateRadS: 0, yawRateRadS: 0, bankAngleDeg: 0, simulationDurationS: 1 };

function modelEntry(id, kind, evaluate, provides = [`test.${id}`]) {
  return { feature: { id, contractVersion: 4, requiresCapabilities: [], providesCapabilities: provides }, model: { kind, evaluate } };
}

describe("topic-neutral simulation runtime", () => {
  it("uses fourth-order Runge-Kutta accurately", () => {
    const next = rk4Step((state) => ({ value: state.value }), { value: 1 }, 0, 0.1);
    expect(next.value).toBeCloseTo(Math.exp(0.1), 6);
  });

  it("preserves equilibrium when no model supplies a load", () => {
    const result = runSimulation({ entries: [], aircraft, scenario: { durationS: 0.1 } });
    expect(result.state.pitchRad).toBe(0);
    expect(result.state.pitchRateRadS).toBe(0);
    expect(result.history.at(-1).pitchMomentNm).toBe(0);
  });

  it("converts a body-axis pitching moment into the expected angular acceleration", () => {
    const load = modelEntry("load", "load", () => ({ momentsBodyNm: { x: 0, y: 1, z: 0 } }));
    const result = runSimulation({ entries: [load], aircraft, scenario: { durationS: 1 } });
    expect(result.state.pitchRateRadS).toBeCloseTo(0.5, 8);
    expect(result.state.pitchRad).toBeCloseTo(0.25, 8);
  });

  it("distinguishes restoring, neutral, and divergent qualitative behavior", () => {
    function response(stiffness) {
      const stateModel = modelEntry("mode", "state-model", ({ state }) => ({ derivatives: { pitchRad: state.pitchRateRadS, pitchRateRadS: stiffness * state.pitchRad } }));
      return runSimulation({ entries: [stateModel], aircraft, scenario: { durationS: 1, initialState: { pitchRad: 0.1, pitchRateRadS: 0 } } }).state.pitchRad;
    }
    expect(Math.abs(response(-1))).toBeLessThan(0.1);
    expect(response(0)).toBeCloseTo(0.1, 8);
    expect(response(1)).toBeGreaterThan(0.1);
  });

  it("creates a fresh in-memory session at lesson defaults", () => {
    const session = createSimulationSession({ entries: [], aircraft, scenario: { durationS: 2, initialState: { pitchRad: 0.2 } } });
    expect(session.timeS).toBe(0);
    expect(session.durationS).toBe(2);
    expect(session.history).toHaveLength(1);
    expect(session.state.pitchRad).toBe(0.2);
  });

  it("prescribes a smooth pitch disturbance before releasing the physics response", () => {
    const scenario = {
      durationS: 1,
      initialState: { pitchRad: 0, pitchRateRadS: 0 },
      disturbance: { pitchRamp: { targetDeg: -4, durationS: 0.2, label: "Released" } },
      plotStateKeys: ["pitchRad"],
    };
    const midpoint = prescribedPitchState({ pitchRad: 0, pitchRateRadS: 0 }, 0.1, scenario, aircraft);
    expect(midpoint.pitchRad * 180 / Math.PI).toBeCloseTo(-2, 10);
    const result = runSimulation({ entries: [], aircraft, scenario });
    const release = result.history.find(({ timeS }) => timeS === 0.2);
    expect(release.pitchRad * 180 / Math.PI).toBeCloseTo(-4, 10);
    expect(release.pitchRateRadS).toBeCloseTo(0, 10);
    expect(result.events).toEqual([{ timeS: 0.2, label: "Released" }]);
    expect(result.plotStateKeys).toEqual(["pitchRad"]);
  });

  it("rejects a pitch ramp that leaves no time for free response", () => {
    expect(() => createSimulationSession({
      entries: [],
      aircraft,
      scenario: { durationS: 0.2, disturbance: { pitchRamp: { targetDeg: 4, durationS: 0.2 } } },
    })).toThrow();
  });

  it("plots only requested states and marks disturbance release", () => {
    const plot = simulationPlot({
      timeS: 0.2,
      plotStateKeys: ["pitchRad"],
      events: [{ timeS: 0.1, label: "Disturbance released" }],
      history: [
        { timeS: 0, pitchRad: 0, rollRad: 0, yawRad: 0 },
        { timeS: 0.2, pitchRad: 0.1, rollRad: 0, yawRad: 0 },
      ],
    });
    expect(plot.series.map(({ label }) => label)).toEqual(["Pitch angle"]);
    expect(plot.referenceLines).toEqual([{ axis: "x", value: 0.1, label: "Disturbance released" }]);
  });

  it("plots explicitly requested angular rates separately from attitude angles", () => {
    const session = {
      timeS: 0.2,
      plotStateKeys: ["pitchRad", "pitchRateRadS"],
      events: [],
      history: [
        { timeS: 0, pitchRad: 0, pitchRateRadS: 0 },
        { timeS: 0.2, pitchRad: 0.1, pitchRateRadS: 0.5 },
      ],
    };
    const ratePlot = simulationRatePlot(session);
    expect(ratePlot.title).toBe("Angular-rate response history");
    expect(ratePlot.yLabel).toBe("Angular rate (deg/s)");
    expect(ratePlot.series.map(({ label }) => label)).toEqual(["Pitch rate"]);
    expect(ratePlot.series[0].points.at(-1).y).toBeCloseTo(0.5 * 180 / Math.PI, 10);
    expect(simulationPlots(session).map(({ id }) => id)).toEqual([
      "simulation-attitude-history",
      "simulation-angular-rate-history",
    ]);
  });

  it("does not add a rate plot unless a feature explicitly requests rate states", () => {
    expect(simulationRatePlot({
      timeS: 0,
      plotStateKeys: ["pitchRad"],
      events: [],
      history: [{ timeS: 0, pitchRad: 0, pitchRateRadS: 1 }],
    })).toBeNull();
  });
});
