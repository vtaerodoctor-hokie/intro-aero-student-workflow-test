import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { featureEntries } from '../features/index.js';
import { createCapabilityRegistry } from '../capabilities/capabilityContract.js';
import { buildCurriculum } from '../data/curriculum.js';
import { initialAircraft, parameterDefinitions } from '../data/aircraft.js';
import EngineeringPlot from '../visualization/EngineeringPlot.jsx';
const FlightLab = lazy(() => import('../flight/FlightLab.jsx'));
const AircraftViewport = lazy(() => import('../visualization/AircraftViewport.jsx'));
import ExperimentControl from './ExperimentControl.jsx';
import TeachingDiagram from './TeachingDiagram.jsx';
import { evaluateExperiment, frameAtTime, comparePlot, readNotebook, writeNotebook, snapshotExperiment } from './experimentContract.js';

const registry = createCapabilityRegistry(featureEntries);
const topics = buildCurriculum(featureEntries, registry);
const modules = topics.flatMap((topic) => topic.modules);
const first = modules.find((m) => m.feature.topicId === 'stability') || modules[0];
const format = (value, precision = 3) => typeof value === 'number' ? Number(value.toFixed(precision)).toString() : String(value ?? '—');
const initialNotebook = () => { try { return readNotebook(window.localStorage); } catch { return {}; } };
const defaults = (module) => ({ ...initialAircraft, ...module.feature.experiment?.defaults });

function exportRecord(record) {
  const result = record.result;
  const lines = [record.title, '', `Question: ${record.question}`, `Prediction: ${record.prediction || 'Not recorded'}`, `Observation: ${record.observation || 'Not recorded'}`, `Conclusion: ${record.conclusion || 'Not recorded'}`, `Limitation: ${record.limitation || 'Not recorded'}`, '', 'Inputs', ...Object.entries(record.inputs).map(([key, value]) => `${key}: ${value}`), '', 'Results', ...result.results.map((item) => `${item.label}: ${format(item.value)} ${item.unit}`), '', result.decision?.interpretation || '', '', 'Assumptions and limits', ...record.assumptions, ...record.limits, '', 'Graph data and full experiment record', JSON.stringify(record, null, 2)];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${record.id}-experiment.txt`; anchor.click(); URL.revokeObjectURL(url);
}

export default function GuidedLab() {
  const [notebook, setNotebook] = useState(initialNotebook);
  const [selected, setSelected] = useState(first.feature.id);
  const active = modules.find((m) => m.feature.id === selected) || first;
  const feature = active.feature;
  const exp = feature.experiment || {};
  const [inputs, setInputs] = useState(() => ({ ...defaults(first), ...initialNotebook()[first.feature.id]?.inputs }));
  const [workspace, setWorkspace] = useState('learn');
  const [compare, setCompare] = useState(true);
  const [orbit, setOrbit] = useState(false);
  const [animateDiagram, setAnimateDiagram] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [needsReplay, setNeedsReplay] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const entry = notebook[selected] || {};
  const result = useMemo(() => active.entry ? evaluateExperiment(feature, inputs, registry) : { results: [], plots: [], derived: [] }, [feature, inputs, active.entry]);
  const motion = result.motion || [];
  const duration = motion.at(-1)?.timeS || 0;
  const frame = frameAtTime(motion, time);
  const group = topics.find((topic) => topic.id === feature.topicId);
  const index = group.modules.findIndex((m) => m.feature.id === selected);
  const baseline = entry.baseline;
  const compatibleBaseline = baseline && result.plots?.some((p) => baseline.result.plots?.some((b) => b.id === p.id && b.xLabel === p.xLabel && b.yLabel === p.yLabel));
  const controls = (typeof exp.controls === "function" ? exp.controls(inputs) : exp.controls) || (feature.inputKeys || []).map((key) => parameterDefinitions.find((d) => d.key === key)).filter(Boolean);
  const primary = new Set((typeof exp.primary === "function" ? exp.primary(inputs) : exp.primary) || controls.slice(0, 2).map((d) => d.key));
  const question = exp.question || result.decision?.question || feature.description;

  useEffect(() => { try { setStorageError(!writeNotebook(window.localStorage, notebook)); } catch { setStorageError(true); } }, [notebook]);
  useEffect(() => { setTime(0); setRunning(false); }, [selected]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTime((old) => {
      const next = Math.min(Number((old + .04).toFixed(10)), duration);
      if (next >= duration) setRunning(false);
      return next;
    }), 40);
    return () => window.clearInterval(timer);
  }, [running, duration]);

  function record(change) { setNotebook((old) => ({ ...old, [selected]: { ...old[selected], ...change } })); }
  function choose(module) {
    setSelected(module.feature.id); setInputs({ ...defaults(module), ...notebook[module.feature.id]?.inputs }); setTime(0); setRunning(false); setNeedsReplay(false); setOrbit(false);
    window.requestAnimationFrame(() => { const main = document.getElementById('main-experiment'); main?.focus({ preventScroll: true }); main?.scrollIntoView({ block: 'start' }); });
  }
  function change(next) { setInputs(next); record({ inputs: next }); setRunning(false); setTime(0); setNeedsReplay(true); }
  function start() { if (time >= duration) setTime(0); setRunning(true); setNeedsReplay(false); }
  function control(definition) { return <ExperimentControl key={`${selected}-${definition.key}`} definition={definition} value={inputs[definition.key]} onChange={(key, value) => change({ ...inputs, [key]: value })} />; }
  function recordPayload() { return { version: 1, id: selected, title: feature.title, question, ...entry, inputs, result, assumptions: exp.assumptions || feature.assumptions || [], limits: exp.limits || feature.validityLimits || [] }; }
  const changed = baseline ? controls.filter(({ key }) => inputs[key] !== baseline.inputs[key]) : [];

  return <div className="guided-lab">
    <header className="lab-header"><a href="#main-experiment" className="lab-brand">AERO <span>/ STABILITY LAB</span></a><span className="lab-private">Explore · observe · explain</span><nav aria-label="Workspace"><button aria-pressed={workspace === 'learn'} onClick={() => setWorkspace('learn')}>Explore & learn</button><button aria-pressed={workspace === 'flight'} onClick={() => setWorkspace('flight')}>Flight Test</button><button aria-pressed={workspace === 'build'} onClick={() => setWorkspace('build')}>Build & verify</button></nav></header>
    {storageError && <p role="status" className="lab-alert">Browser storage is unavailable or full. Your current work is still visible; export it before closing.</p>}
    <div className="lab-layout">
      <aside className="lab-rail"><p className="lab-kicker">Your learning journey</p><h1>{group.title}</h1><label className="lab-topic">Course topic<select value={group.id} onChange={(e) => choose(topics.find((t) => t.id === e.target.value).modules[0])}>{topics.filter((t) => t.modules.length).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label><nav aria-label="Lesson sequence">{group.modules.map((module, i) => <button key={module.feature.id} aria-current={selected === module.feature.id ? 'step' : undefined} onClick={() => choose(module)}><span className="lab-step">{String(module.descriptor?.stage || i + 1).padStart(2, '0')}</span><span>{module.feature.experiment?.shortTitle || module.feature.title}<small>{notebook[module.feature.id]?.explored ? 'Explored' : module.entry ? (module.runtimeReady || (module.feature.contractVersion ?? 1) < 4 ? 'Ready to explore' : 'Needs prerequisite') : 'Not implemented'}</small></span></button>)}</nav><p className="lab-rail-note">Start with a prediction.<br/>Change one thing.<br/>See what it tells you.</p></aside>
      <main id="main-experiment" className="lab-main" tabIndex={-1}>
        <div className="lab-breadcrumb"><span>{group.title} / Experiment {index + 1} of {group.modules.length}</span><span>{feature.learningMode || 'concept'}</span></div>
        <div className="lab-intro"><h2>{exp.shortTitle || feature.title}</h2><p>{question}</p></div>
        {workspace === 'flight' ? <Suspense fallback={<p>Loading flight test…</p>}><FlightLab key={selected} lessonId={selected} aircraft={inputs} onAircraftChange={change} /></Suspense> : workspace === 'build' ? <section className="lab-build"><h3>Build this module</h3><p>Learning progress and software implementation are separate. This module is {active.entry ? 'installed' : 'not installed'}; your experiment is {entry.explored ? 'marked explored' : 'not marked explored'}.</p><p>The normal workflow uses three student-owned files:</p><ul><li><code>src/student/physics/{selected}.js</code></li><li><code>src/student/features/{selected}.feature.js</code></li><li><code>tests/student/{selected}.test.js</code></li></ul><h3>Prerequisites</h3><ul>{active.requirements.map((r) => <li key={r.id}>{r.satisfied ? 'Available' : 'Missing'}: {r.id} v{r.version}</li>)}</ul>{!active.requirements.length && <p>No prerequisite modules.</p>}<h3>Verification</h3><p>These are the current module’s declared reference checks. The complete automated suite is run separately.</p><ul>{result.verificationCases?.map((c) => <li key={c.label}>{c.passed ? 'Pass' : 'Fail'} — {c.label}</li>)}</ul><p>Passing software checks does not establish model validity or student understanding.</p>{result.error && <p role="alert">{result.error}</p>}</section> : !active.entry ? <section className="lab-build"><h3>This experiment needs its student implementation</h3><p>Use Build & verify to see the three files and prerequisites. No completed model is included in this slot.</p></section> : <>
          <section className="lab-prompt"><span className="lab-number">01</span><div><h3>Predict, then try it</h3><p>{exp.instruction || 'Change one input, observe the result, and explain why it changed.'}</p><label>My prediction <span>(optional)</span><input type="text" placeholder="I think… because…" value={entry.prediction || ''} onChange={(e) => record({ prediction: e.target.value })} /></label></div></section>
          <div className="lab-experiment">
            <section className="lab-controls"><div className="lab-card-title"><h3>Change one thing</h3><span>02</span></div>{controls.filter((d) => primary.has(d.key)).map(control)}{controls.some((d) => !primary.has(d.key)) && <details><summary>More inputs & model settings</summary>{controls.filter((d) => !primary.has(d.key)).map(control)}</details>}
              {exp.presets?.length > 0 && <div className="lab-presets"><p>Try a case</p>{exp.presets.map((p) => <button key={p.label} onClick={() => change({ ...inputs, ...p.values })}>{p.label}</button>)}</div>}
              <button className="lab-reset" onClick={() => change(defaults(active))}>Reset experiment</button>
              {result.notice && <p className="lab-model-notice">{result.notice}</p>}
              {!!result.derived?.length && <details><summary>Where these values come from</summary><dl>{result.derived.map((d) => <div key={d.key}><dt>{d.label}</dt><dd>{format(d.value)} {d.unit} — {d.source}</dd></div>)}</dl><p>Controls above are supplied inputs. These values are derived for this experiment.</p></details>}
            </section>
            <div className="lab-observation">
              <div className="lab-comparison"><strong>03 <span>Observe the difference</span></strong><div><button disabled={Boolean(result.error)} onClick={() => { record({ baseline: snapshotExperiment(inputs, result) }); setCompare(true); }}>Save baseline</button><button disabled={!baseline} aria-pressed={compare && Boolean(baseline)} onClick={() => setCompare(!compare)}>Compare{compare && baseline ? ' on' : ''}</button>{baseline && <><button onClick={() => change({ ...baseline.inputs })}>Restore baseline</button><button onClick={() => record({ baseline: null })}>Clear baseline</button></>}</div></div>
              <p className="lab-comparison-note">{baseline && !compatibleBaseline ? 'This baseline uses different model variables. Restore it or save a new baseline for a direct graph comparison.' : baseline ? changed.length ? `Changed: ${changed.map((d) => `${d.label} ${format(baseline.inputs[d.key])} → ${format(inputs[d.key])} ${d.unit || ''}`).join('; ')}.` : 'Current inputs match your saved baseline.' : 'Save this condition, change an input, and compare the two cases on the same graph.'}</p>
              {result.error ? <div role="alert" className="lab-alert"><h3>This condition could not be evaluated</h3><p>{result.error}</p><p>Adjust the input or reset the experiment. Your saved baseline is preserved.</p></div> : <>
                <div className="lab-visuals"><div><TeachingDiagram diagram={result.diagram} frame={animateDiagram ? frame : motion[0] || {}}/>{motion.length > 1 && <section className="lab-playback" aria-label="Experiment playback"><button aria-pressed={animateDiagram} onClick={() => setAnimateDiagram(!animateDiagram)}>Aircraft motion {animateDiagram ? "on" : "off"}</button><button onClick={running ? () => setRunning(false) : start}>{running ? 'Pause' : 'Disturb / Run'}</button><button onClick={() => { setTime(0); setRunning(true); setNeedsReplay(false); }}>Replay</button><input type="range" aria-label="Time cursor" min="0" max={duration} step=".02" value={time} onChange={(e) => { setTime(Number(e.target.value)); setRunning(false); }}/><output>{time.toFixed(2)} / {duration.toFixed(2)} s</output>{needsReplay && <span>Inputs changed · ready to replay</span>}<p>{result.motionNotice || 'Animation and graph share the same model history. Drag the time cursor to inspect it.'}</p></section>}<details onToggle={(e) => setOrbit(e.currentTarget.open)}><summary>Optional 3D aircraft view</summary>{orbit && <Suspense fallback={<p>Loading optional 3D view…</p>}><AircraftViewport aircraft={result.aircraft} scene={result.scene} attitude={animateDiagram ? frame : motion[0] || {}}/></Suspense>}</details></div><div className="lab-graphs">{(result.plots || []).map((p) => <EngineeringPlot key={p.id} plot={{ ...comparePlot(p, baseline?.result.plots?.find((b) => b.id === p.id), compare), ...(p.timeHistory ? { currentX: time } : {}) }}/>)}</div></div>
                
                <section className="lab-insight"><h3>{result.headline || 'What this condition tells us'}</h3><p>{result.explanation || result.decision?.interpretation}</p></section>
                <div className="lab-results">{result.results.map((r) => <div key={r.label}><span>{r.label}</span><strong>{format(r.value, r.precision)} <small>{r.unit}</small></strong>{baseline && compare && <small>Baseline: {format(baseline.result.results.find((b) => b.label === r.label)?.value, r.precision)}</small>}{r.note && <small>{r.note}</small>}</div>)}</div>
              </>}
            </div>
          </div>
          <section className="lab-reflect"><div><p className="lab-kicker">04 / Make sense of it</p><h3>{exp.checkpoint || 'What changed, and why?'}</h3><p>{exp.takeaway}</p><details><summary>Equations, assumptions & limits</summary>{exp.equations?.map((eq) => <p className="lab-equation" key={eq}>{eq}</p>)}<ul>{[...(exp.assumptions || feature.assumptions || []), ...(exp.limits || feature.validityLimits || [])].map((text, i) => <li key={i}>{text}</li>)}</ul>{exp.sources?.map((s) => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></p>)}</details></div><div><label>What I observed<textarea value={entry.observation || ''} onChange={(e) => record({ observation: e.target.value })} placeholder="When I changed… I noticed…"/></label><label>My explanation<textarea value={entry.conclusion || ''} onChange={(e) => record({ conclusion: e.target.value })} placeholder="This happens because…"/></label><label>One limitation<input value={entry.limitation || ''} onChange={(e) => record({ limitation: e.target.value })} placeholder="This model does not include…"/></label><div className="lab-record-actions"><button aria-pressed={Boolean(entry.explored)} onClick={() => record({ explored: !entry.explored })}>{entry.explored ? 'Marked explored ✓' : 'Mark explored'}</button><button onClick={() => exportRecord(recordPayload())}>Export record</button><button onClick={() => window.print()}>Print with graphs</button></div><p className="lab-save-note">Saved in this browser. Predictions are optional and ungraded.</p></div></section>
        </>}
        <nav className="lab-next" aria-label="Previous and next experiment"><button disabled={index === 0} onClick={() => choose(group.modules[index - 1])}>← Previous</button><span>{index + 1} / {group.modules.length}</span><button disabled={index === group.modules.length - 1} onClick={() => choose(group.modules[index + 1])}>Next experiment →</button></nav>
      </main>
    </div>
  </div>;
}
