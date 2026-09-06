function download(filename, type, contents) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function evidencePayload({ aircraft, activeModule, registry, analysis, session }) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    modelNotice: "Reduced-order linear teaching model; not a validated nonlinear 6-DOF digital twin.",
    module: activeModule ? { id: activeModule.feature.id, title: activeModule.feature.title, topicId: activeModule.feature.topicId, status: activeModule.status } : null,
    aircraft,
    simulation: session ? {
      stepS: 0.02,
      durationS: session.durationS,
      status: session.status,
      currentTimeS: session.timeS,
      initialState: activeModule?.feature?.simulation?.initialState || null,
      controls: activeModule?.feature?.simulation?.controls || {},
      disturbance: activeModule?.feature?.simulation?.disturbance || {},
      history: session.history,
    } : null,
    installedCapabilities: registry.availableCapabilities,
    results: analysis?.results || [],
    verificationCases: analysis?.verificationCases || [],
    decision: analysis?.decision || null,
    assumptions: activeModule?.feature?.assumptions || [],
    validityLimits: activeModule?.feature?.validityLimits || [],
    warnings: registry.issues.map(({ message }) => message),
  };
}

export function historyCsv(history = []) {
  if (history.length === 0) return "";
  const keys = [...new Set(history.flatMap((sample) => Object.keys(sample)))];
  const rows = history.map((sample) => keys.map((key) => sample[key] ?? "").join(","));
  return [keys.join(","), ...rows].join("\n");
}

export default function EvidenceReport({ aircraft, activeModule, registry, analysis, session }) {
  const payload = evidencePayload({ aircraft, activeModule, registry, analysis, session });
  const filename = activeModule?.feature?.id || "aircraft-evidence";
  const assumptions = payload.assumptions.length ? payload.assumptions : ["No assumptions were declared by this module."];
  const validityLimits = payload.validityLimits.length ? payload.validityLimits : ["No validity limits were declared by this module."];

  return (
    <section className="evidence-report" aria-labelledby="evidence-title">
      <header>
        <div><p className="eyebrow">Engineering evidence</p><h3 id="evidence-title">Defensibility record</h3></div>
        <div className="evidence-actions no-print">
          <button type="button" onClick={() => window.print()}>Print report</button>
          <button type="button" onClick={() => download(`${filename}.json`, "application/json", JSON.stringify(payload, null, 2))}>JSON</button>
          <button type="button" disabled={!session?.history?.length} onClick={() => download(`${filename}-trace.csv`, "text/csv", historyCsv(session.history))}>CSV trace</button>
        </div>
      </header>
      <p className="model-notice">{payload.modelNotice}</p>
      <div className="evidence-grid">
        <div><strong>Module</strong><span>{payload.module?.title || "No installed module selected"}</span></div>
        <div><strong>Run</strong><span>{session ? `${session.timeS.toFixed(2)} / ${session.durationS.toFixed(2)} s · ${session.status}` : "No run"}</span></div>
        <div><strong>Loading</strong><span>{aircraft.massKg + aircraft.payloadKg} kg total · CG {aircraft.cgM} m</span></div>
        <div><strong>Condition</strong><span>{aircraft.speedMps} m/s · {aircraft.densityKgM3} kg/m³</span></div>
        <div><strong>Static margin inputs</strong><span>NP {aircraft.neutralPointM} m · MAC {aircraft.meanChordM} m</span></div>
        <div><strong>Control</strong><span>Elevator {aircraft.elevatorDeflectionDeg} deg</span></div>
        <div><strong>Stability derivatives</strong><span>Cmα {aircraft.cmAlphaPerRad} · Cmq {aircraft.cmQPerRad} · Clβ {aircraft.clBetaPerRad} · Cnβ {aircraft.cnBetaPerRad}</span></div>
        <div><strong>Initial disturbance</strong><span>{payload.simulation ? JSON.stringify(payload.simulation.disturbance) : "No simulation model installed"}</span></div>
      </div>
      <div className="evidence-columns">
        <div><h4>Installed capabilities</h4><ul>{payload.installedCapabilities.length ? payload.installedCapabilities.map((item) => <li key={item.id}>{item.id} v{item.version} · {item.featureId}</li>) : <li>No Version 4 capabilities installed.</li>}</ul></div>
        <div><h4>Verification</h4><ul>{payload.verificationCases.length ? payload.verificationCases.map((item) => <li key={item.label}>{item.passed ? "✓" : "✗"} {item.label}</li>) : <li>No verification cases available.</li>}</ul></div>
        <div><h4>Assumptions</h4><ul>{assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h4>Validity limits</h4><ul>{validityLimits.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h4>Warnings</h4><ul>{payload.warnings.length ? payload.warnings.map((item) => <li key={item}>{item}</li>) : <li>No capability-registry warnings.</li>}</ul></div>
      </div>
      {analysis?.decision && <div className="evidence-conclusion"><strong>{analysis.decision.question}</strong><p>{analysis.decision.interpretation}</p></div>}
    </section>
  );
}
