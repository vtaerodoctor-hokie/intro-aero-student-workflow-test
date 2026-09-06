import { useEffect, useMemo, useRef, useState } from 'react';
import FlightScene from './FlightScene.jsx';
import EngineeringPlot from '../visualization/EngineeringPlot.jsx';
import FlightSettingEditor from './FlightSettingEditor.jsx';
import { featureEntries } from '../features/index.js';
import { adapters } from './models.js';
import { studentAvailability } from './studentBridge.js';
import { MANEUVERS, defaultManeuver, neutralControls, frameAt, csv } from './contract.js';
import { putRecord,getRecords,removeRecord,download } from './storage.js';
import { offlineStatus } from './offline.js';
import './flight.css';
const student=studentAvailability(featureEntries);
const defaultOptions=id=>({mode:'reference',linkage:'linked',loading:['cg-loading','mission-loading'].includes(id),free:id==='stick-free-effect',maneuver:defaultManeuver(id),pulse:2,altitude:80,speedKick:.5});
const fmt=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
const neutral=neutralControls();
const plotFields=[['alphaDeg','Angle of attack','deg'],['pitchDeg','Pitch attitude','deg'],['speedMps','Airspeed','m/s'],['altitudeM','Altitude','m'],['rollDeg','Bank angle','deg'],['betaDeg','Sideslip','deg'],['yawRateRadS','Yaw rate','rad/s']];
function plotted(history,key){const stride=Math.max(1,Math.ceil(history.length/180));return history.filter((_,i)=>i%stride===0||i===history.length-1).map(s=>({x:s.timeS,y:s[key]}));}
export default function FlightLab({lessonId,aircraft,onAircraftChange}){
 const [options,setOptions]=useState(()=>defaultOptions(lessonId)),[session,setSession]=useState(null),[baseline,setBaseline]=useState(null),[comparison,setComparison]=useState(null),[comparing,setComparing]=useState(false),[error,setError]=useState(''),[cursor,setCursor]=useState(0),[live,setLive]=useState(true),[view,setView]=useState('chase'),[overlays,setOverlays]=useState(true),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[control,setControl]=useState(neutral),[observation,setObservation]=useState(''),[records,setRecords]=useState([]),[storageNote,setStorageNote]=useState(''),[offline,setOffline]=useState('Checking offline availability…');
 const worker=useRef(null),compareWorker=useRef(null),lastReply=useRef(0),lastCompareReply=useRef(0),latest=useRef(),controls=useRef(neutral),held=useRef(new Set());
 const config=useMemo(()=>({version:1,adapter:adapters[0]?.id,lessonId,aircraft:{...aircraft},...options,duration:aircraft.simulationDurationS}),[aircraft,options,lessonId]);
 const busy=session?.status==='running';latest.current={busy,session,options,comparing};
 useEffect(()=>{getRecords().then(setRecords).catch(()=>setStorageNote('Browser recording storage is unavailable. Export records before closing.'));offlineStatus().then(setOffline).catch(e=>setOffline(e.message));return()=>{worker.current?.terminate();compareWorker.current?.terminate();};},[]);
 function sendControl(c){controls.current=c;setControl(c);worker.current?.postMessage({type:'controls',controls:c});}
 function pause(){held.current.clear();sendControl(neutralControls());worker.current?.postMessage({type:'pause'});compareWorker.current?.postMessage({type:'pause'});}
 useEffect(()=>{
  const stop=()=>{held.current.clear();controls.current=neutralControls();setControl(neutralControls());worker.current?.postMessage({type:'pause'});compareWorker.current?.postMessage({type:'pause'});};
  const hidden=()=>{if(document.hidden)stop();};
  function key(e){
   if(e.type==='keydown'&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||!latest.current.busy||latest.current.options.maneuver!=='manual'))return;
   if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','KeyW','KeyS','Space'].includes(e.code))return;
   if(e.code==='Space'){if(e.type==='keydown'){e.preventDefault();stop();}return;}
   e.preventDefault();if(e.type==='keydown')held.current.add(e.code);else held.current.delete(e.code);
   const h=held.current,c={elevator:(+h.has('ArrowUp')-h.has('ArrowDown'))*.35,aileron:(+h.has('ArrowRight')-h.has('ArrowLeft'))*.35,rudder:(+h.has('KeyE')-h.has('KeyQ'))*.35,throttle:(+h.has('KeyW')-h.has('KeyS'))*.5};
   controls.current=c;setControl(c);worker.current?.postMessage({type:'controls',controls:c});
  }
  addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);addEventListener('keydown',key);addEventListener('keyup',key);
  return()=>{removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden);removeEventListener('keydown',key);removeEventListener('keyup',key);};
 },[]);
 useEffect(()=>{const timer=setInterval(()=>{if(latest.current.comparing&&Date.now()-lastCompareReply.current>5000){compareWorker.current?.terminate();setComparing(false);setError('Baseline model timed out. Its last received trace is preserved.');}if(latest.current.busy&&Date.now()-lastReply.current>5000){worker.current?.terminate();setSession(s=>s?{...s,status:'stopped',reason:'The flight model did not respond within 5 seconds. The last received trace is preserved.'}:s);setError('Model timed out. Inspect the student implementation or reset.');}},1000);return()=>clearInterval(timer);},[]);
 function launch(nextConfig,replay=null,compare=false){
  setError('');if(compare){compareWorker.current?.terminate();setComparing(true);}else{worker.current?.terminate();setComparison(null);setLive(true);sendControl(neutralControls());}
  const w=new Worker(new URL('./flight.worker.js',import.meta.url),{type:'module'});if(compare)compareWorker.current=w;else worker.current=w;
  lastReply.current=Date.now();lastCompareReply.current=Date.now();
  let timeout=setTimeout(()=>{w.terminate();if(compare)setComparing(false);setError('Model initialization timed out. The previous trace is preserved.');},5000);
  w.onerror=()=>{clearTimeout(timeout);w.terminate();if(compare)setComparing(false);setError('The flight worker failed to load or run. Reset the test or reconnect if assets are missing.');};
  w.onmessage=({data})=>{
   clearTimeout(timeout);if(compare)lastCompareReply.current=Date.now();else lastReply.current=Date.now();
   if(data.type==='error'){w.terminate();if(compare)setComparing(false);else setSession(s=>s?{...s,status:'stopped',reason:data.message}:s);setError(data.message);return;}
   if(compare){setComparison(data.session);if(['complete','stopped'].includes(data.session.status)){setComparing(false);w.terminate();}}
   else{setSession(data.session);if(data.session.status==='running'||data.session.status==='complete')setCursor(data.session.timeS);}
  };
  w.postMessage({type:'init',config:nextConfig,replay});w.postMessage({type:'start',fast:compare});
 }
 function edit(key,value){pause();onAircraftChange({...aircraft,[key]:value});}
 function option(key,value){pause();setOptions(o=>({...o,[key]:value}));}
 const changed=session&&JSON.stringify(config)!==JSON.stringify(session.config);
 const frame=frameAt(session?.history,live?session?.timeS:cursor),baseFrame=frameAt(comparison?.history,frame?.timeS||0);
 const canLaunch=adapters.length>0&&(options.mode!=='student'||student.ready);
 const shownAircraft=session?.model.resolved||aircraft;
 async function save(){try{await putRecord({id:crypto.randomUUID(),savedAt:new Date().toISOString(),lessonId,session,baseline,comparison,observation});setRecords(await getRecords());setStorageNote('Flight record saved in this browser.');}catch{setStorageNote('Could not save to browser storage. Export the record instead.');}}
 function restore(record){pause();worker.current?.terminate();compareWorker.current?.terminate();worker.current=null;compareWorker.current=null;setComparing(false);setSession(record.session);setBaseline(record.baseline);setComparison(record.comparison);setObservation(record.observation||'');setLive(false);setCursor(0);setStorageNote('Saved trace loaded. Its captured configuration is retained for replay; current draft inputs are unchanged.');}
 return <section className="flight-lab" aria-label="Flight Test workspace">
  <div className="flight-banner"><div><p className="lab-kicker">AIRBORNE EXPERIMENTS</p><h3>Change the aircraft. Feel the response.</h3><p>Start at trim, disturb it, and compare the evidence. This is a small-disturbance teaching simulator.</p></div><span className="flight-offline" role="status">{offline}</span></div>
  {!adapters.length&&<p className="lab-alert">No flight adapter is installed in this build. Reference physics stays in the private preparation package. Existing lessons are still available.</p>}
  {error&&<p role="alert" className="lab-alert">{error}</p>}
  <div className="flight-settings">
   <label>Model source<select value={options.mode} onChange={e=>option('mode',e.target.value)}><option value="reference">Teaching reference</option><option value="student">Student modules + labeled teaching support</option></select></label>
   <label>Resolve aircraft<select value={options.linkage} onChange={e=>option('linkage',e.target.value)}><option value="linked">Linked CG & tail geometry</option><option value="coefficients">Supplied coefficients</option></select></label>
   <label>Flight test<select value={options.maneuver} onChange={e=>option('maneuver',e.target.value)}>{MANEUVERS.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
   <label><input type="checkbox" checked={options.loading} onChange={e=>option('loading',e.target.checked)}/> Resolve CG from payload</label><label><input type="checkbox" checked={options.free} onChange={e=>option('free',e.target.checked)}/> Free elevator approximation</label>
  </div>
  <p>{MANEUVERS.find(m=>m.id===options.maneuver)?.help}</p>
  {options.mode==='student'&&<p className={student.ready?'flight-note':'lab-alert'}>{student.ready?'Installed student capabilities will supply Cm(α), pitch acceleration and sideslip moments. Lift, drag, lateral damping, control effectiveness and kinematics use the declared teaching preset.':student.errors.join(' ')}</p>}
  <div className="flight-workspace"><aside className="flight-inputs"><FlightSettingEditor aircraft={aircraft} options={options} onAircraftChange={edit} onOptionChange={option} />
   <button onClick={()=>{pause();setBaseline(structuredClone(config));setComparison(null);}}>Save configuration as baseline</button>
   {baseline&&<><p>Baseline saved · {baseline.mode}, {baseline.linkage}, {baseline.aircraft.speedMps} m/s</p><button onClick={()=>{pause();const {aircraft:a,...rest}=baseline;onAircraftChange({...a});setOptions(rest);}}>Restore baseline inputs</button></>}
  </aside><div className="flight-observation">
   <div className="flight-toolbar"><button className="flight-primary" disabled={!canLaunch||busy||comparing} onClick={()=>launch(config)}>Launch flight</button><button disabled={!session||!worker.current||['complete','stopped'].includes(session.status)||comparing} onClick={()=>{if(busy)pause();else {lastReply.current=Date.now();setLive(true);worker.current?.postMessage({type:'start'});}}}>{busy?'Pause':'Resume'}</button><button disabled={!session||busy||comparing||!session.inputLog.length} onClick={()=>launch({...session.config,duration:session.timeS},session.inputLog)}>Replay same flight</button><button disabled={!session||!baseline||busy||comparing||!session.inputLog.length} onClick={()=>launch({...baseline,duration:session.timeS},session.inputLog,true)}>{comparing?'Comparing…':'Run baseline with same inputs'}</button><button onClick={()=>{pause();worker.current?.terminate();compareWorker.current?.terminate();setSession(null);setComparison(null);setComparing(false);setCursor(0);setError('');}}>Reset flight</button></div>
   {changed&&<p className="flight-note">Configuration changed. The visible trace retains its original inputs; launch to apply edits.</p>}
   <div className="flight-viewbar"><label>Camera<select value={view} onChange={e=>setView(e.target.value)}><option value="chase">Chase</option><option value="side">Side</option><option value="front">Front</option></select></label><label><input type="checkbox" checked={overlays} onChange={e=>setOverlays(e.target.checked)}/> Teaching overlays</label><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Diagram / reduced motion</label></div>
   <FlightScene frame={frame} baseline={baseFrame} history={session?.history} aircraft={shownAircraft} metadata={session?.model} view={view} overlays={overlays} reduced={reduced}/>
   {overlays&&<p className="flight-legend">● Orange: CG · ◆ Purple: neutral point · Blue arrow: relative airflow · Green arrow: lift · Violet arrow: pitch-moment axis · Blue aircraft: baseline. Markers are offset vertically for readability.</p>}
   <div className="flight-instruments">{[['speedMps','Airspeed','m/s'],['altitudeM','Altitude','m'],['alphaDeg','Angle of attack','°'],['pitchDeg','Pitch','°'],['rollDeg','Bank','°'],['betaDeg','Sideslip','°']].map(([key,label,unit])=><div key={key}><small>{label}</small><strong>{fmt(frame?.[key],1)} <small>{unit}</small></strong></div>)}</div>
   {session&&<><p role="status" className="flight-status">{session.status} · {fmt(session.timeS)} s {session.reason&&`— ${session.reason}`}</p><label className="flight-scrubber">Replay cursor<input type="range" min="0" max={session.timeS||.02} step=".02" value={live?session.timeS:cursor} onChange={e=>{pause();setLive(false);setCursor(Number(e.target.value));}}/><output>{fmt(frame?.timeS)} s</output></label></>}
   {comparison&&<p className="flight-note">Baseline: {comparison.status}{comparison.reason?` — ${comparison.reason}`:''}. Each aircraft starts at its own solved trim; the recorded control offsets and timestamps are identical. {frame&&frame.timeS>comparison.timeS?'Baseline ended earlier; its aircraft is held at the final valid sample.':''}</p>}
   <section className="flight-pilot"><h4>Pilot controls <small>Offsets from solved trim</small></h4><p>Manual flight: ↑ nose down · ↓ nose up · ←/→ roll · Q/E rudder · W/S throttle · Space pauses. Release keys to center. Clicking another window pauses.</p><div>{['elevator','aileron','rudder','throttle'].map(k=><label key={k}>{k}<input aria-label={`${k} pilot input`} disabled={!busy||options.maneuver!=='manual'} type="range" min="-1" max="1" step=".01" value={control[k]} onChange={e=>sendControl({...controls.current,[k]:Number(e.target.value)})}/><output>{fmt(control[k])}</output></label>)}</div><button disabled={!busy} onClick={()=>sendControl(neutralControls())}>Center controls</button><p>Actual controls: elevator {fmt(frame?.elevatorDeg,1)}° · aileron {fmt(frame?.aileronDeg,1)}° · rudder {fmt(frame?.rudderDeg,1)}° · throttle {fmt(frame?.throttlePercent,1)}%</p></section>
   {session&&<details open><summary>Flight traces · synchronized with the aircraft</summary><div className="flight-graphs">{plotFields.map(([key,label,unit])=><EngineeringPlot key={key} plot={{id:`flight-${key}`,title:label,xLabel:'Time (s)',yLabel:`${label} (${unit})`,currentX:frame?.timeS,series:[...(comparison?[{label:'Baseline',color:'#5485ab',points:plotted(comparison.history,key)}]:[]),{label:'Current flight',color:'#dd643d',points:plotted(session.history,key)}],referenceLines:[],regions:[]}}/>)}</div></details>}
  </div></div>
  {session&&<section className="flight-summary"><h4>What this aircraft is using</h4><p>{session.model.notice}</p><p>{session.model.linkage}</p><div className="flight-trim"><span>Trim α <b>{fmt(session.model.trim.alphaDeg)}°</b></span><span>Trim elevator <b>{fmt(session.model.trim.elevatorDeg)}°</b></span><span>Trim throttle <b>{fmt(session.model.trim.throttlePercent,1)}%</b></span><span>Loaded mass <b>{fmt(session.model.totalMassKg)} kg</b></span><span>Static margin <b>{fmt(session.model.staticMargin*100,1)}%</b></span></div><p>Margin criterion: {session.model.staticMargin>=session.config.aircraft.minimumStaticMargin?'meets':'below'} the selected minimum. CG range: {session.config.aircraft.forwardCgLimitM<session.config.aircraft.aftCgLimitM?'bounds are reversed for +x forward; review the limit labels':session.model.resolved.cgM>=session.config.aircraft.aftCgLimitM&&session.model.resolved.cgM<=session.config.aircraft.forwardCgLimitM?'inside supplied bounds':'outside supplied bounds'}. These criteria do not alter flight forces.</p><details><summary>Model assumptions, preset derivatives & captured configuration</summary><ul>{session.model.assumptions.map(s=><li key={s}>{s}</li>)}</ul><pre>{JSON.stringify({preset:session.model.preset,sources:session.model.sources,configuration:session.config},null,2)}</pre></details></section>}
  <section className="flight-record"><h4>Explain the evidence</h4><label>Observation and one model limitation<textarea value={observation} onChange={e=>setObservation(e.target.value)} placeholder="Compared with the baseline, I observed… This model does not include…"/></label><div><button disabled={!session||busy||comparing} onClick={save}>Save flight record</button><button disabled={!session||busy} onClick={()=>download('flight-record.json',JSON.stringify({version:1,session,baseline,comparison,observation},null,2),'application/json')}>Export full JSON record</button><button disabled={!session} onClick={()=>download('flight-telemetry.csv',csv(session),'text/csv')}>Export telemetry CSV</button></div><p role="status">{storageNote}</p><details><summary>Saved flights ({records.length})</summary>{records.map(r=><div key={r.id}><button disabled={busy} onClick={()=>restore(r)}>{new Date(r.savedAt).toLocaleString()} · {r.session.config.maneuver}</button><button onClick={async()=>{try{await removeRecord(r.id);setRecords(await getRecords());}catch{setStorageNote('Could not delete the recording.');}}}>Delete record</button></div>)}</details></section>
 </section>;
}
