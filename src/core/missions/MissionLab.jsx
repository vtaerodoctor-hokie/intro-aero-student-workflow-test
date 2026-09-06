import { useEffect,useMemo,useRef,useState } from 'react';
import initialData from 'virtual:mission-state';
import { studentRequest } from './AnswerEditor.jsx';
import { mission,implementationSpecification } from './manifest.js';
import { validateMission,evidenceCurrent } from './validation.js';
import { featureEntries } from '../features/index.js';
import { authorityProvider,evaluateAuthority,beginAuthority,advanceAuthority,replayAuthority,compatibleBaseline,week05Evidence } from './experiment.js';
import { initialAircraft } from '../data/aircraft.js';
import FlightScene from '../flight/FlightScene.jsx';
import { getRecords,putRecord,download } from '../flight/storage.js';
import { offlineStatus } from '../flight/offline.js';
import EngineeringPlot from '../visualization/EngineeringPlot.jsx';
import './missions.css';
import StageGuide from './StageGuide.jsx';
const packages=import.meta.glob('../../../student-work/mission-support/*.mission.js',{eager:true});
const teaching=Object.values(packages).map(p=>p.missionPackage).find(p=>p?.id===mission.id);
const reviewPackages=import.meta.glob('../../../.instructor/private/dashboard/*.json',{eager:true,import:'default'});
const samples=Object.values(reviewPackages).flat();
const fmt=n=>Number.isFinite(n)?n.toFixed(2):'—';
export default function MissionLab(){
 const [data,setData]=useState(initialData);
 async function refreshMission(){try{const state=await studentRequest("state");setData(state.mission);}catch{}}
 useEffect(()=>{refreshMission();},[]);
 const [records,setRecords]=useState([]),[notice,setNotice]=useState(''),[offline,setOffline]=useState('Checking offline availability…');
 const [selected,setSelected]=useState('question'),[scenarioId,setScenarioId]=useState('baseline'),[command,setCommand]=useState(0),[session,setSession]=useState(null),[prediction,setPrediction]=useState(''),[savedPrediction,setSavedPrediction]=useState(''),[running,setRunning]=useState(false),[dashboard,setDashboard]=useState(false),[crosswind,setCrosswind]=useState(false);
 const predictionTime=useRef(null),runTime=useRef(null);
 const commandRef=useRef(command);commandRef.current=command;
 const provider=useMemo(()=>authorityProvider(featureEntries),[]);
 const status=validateMission({...data,implemented:data.implemented&&Boolean(provider),records:[...data.records,...records]});
 const descriptor=teaching?.scenarios.find(s=>s.id===scenarioId);
 const aircraft=useMemo(()=>teaching?{...teaching.aircraft,...descriptor?.changes}:null,[descriptor]);
 const [savedAircraft,setSavedAircraft]=useState(null);
 const activeAircraft=savedAircraft||aircraft;
 const result=useMemo(()=>{try{return status.flightUnlocked&&provider&&activeAircraft?evaluateAuthority(provider,activeAircraft,command):null;}catch(error){return {error:error.message};}},[status.flightUnlocked,provider,activeAircraft,command]);
 const upstream=useMemo(()=>week05Evidence(featureEntries,teaching?.week05,aircraft||{}),[aircraft]);
 const reference=Boolean(teaching&&samples.length);
 const stage=status.stages.find(s=>s.id===selected);
 useEffect(()=>{getRecords().then(setRecords).catch(e=>setNotice(`Browser storage unavailable: ${e.message}. Export remains available.`));offlineStatus().then(setOffline).catch(e=>setOffline(e.message));},[]);
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>setSession(current=>{if(!current)return current;const next=advanceAuthority(provider,activeAircraft,current,commandRef.current,teaching.limits);if(next.status!=='running')setRunning(false);return next;}),20);return()=>clearInterval(timer);},[running,provider,activeAircraft]);
 useEffect(()=>{
  const pause=()=>{setRunning(false);setCommand(0);};
  const down=e=>{if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();pause();}if(status.elevatorUnlocked&&['ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();setCommand(e.code==='ArrowDown'?1:0);}};
  const up=e=>{if(['ArrowDown','ArrowUp'].includes(e.code))setCommand(0);};
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',pause);window.addEventListener('keydown',down);window.addEventListener('keyup',up);
  return()=>{window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',pause);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
 },[status.elevatorUnlocked]);
 function start(){try{runTime.current=Date.now();setSavedAircraft(structuredClone(aircraft));setSession(beginAuthority(provider,aircraft));setRunning(true);setNotice('');}catch(e){setNotice(e.message);}}
 function chooseScenario(id){setRunning(false);setSession(null);setSavedAircraft(null);setScenarioId(id);setPrediction('');setSavedPrediction('');setCommand(0);}
 async function save(){if(!session||session.status!=='complete')return;const record={...session,id:crypto.randomUUID(),kind:'week06-authority',challenge:scenarioId,prediction:savedPrediction,predictedAt:predictionTime.current,startedAt:runTime.current,savedAt:new Date().toISOString(),sourceHash:data.sourceHash,baselineHash:data.baselineHash,aircraft:activeAircraft,limits:teaching.limits,model:teaching.provenance};setRecords(old=>[...old,record]);try{await putRecord(record);setNotice('Challenge evidence saved in this browser. Export it into the mission evidence folder for CLI review.');}catch(e){setNotice(`Kept in memory. Storage failed: ${e.message}`);}}
 const row=session?.history.at(-1),value=row||(savedPrediction?result:null);
 const frame={xM:0,yM:0,altitudeM:.3,overlayMomentScaleNm:Math.max(1,result?.availableMomentNm||1),overlayForceScaleN:Math.max(1,(result?.availableMomentNm||1)/(aircraft?.equivalentTailArmM||1)),pitchRad:row?.pitchRad||0,rollRad:0,yawRad:0,pitchDeg:(row?.pitchRad||0)*180/Math.PI,rollDeg:0,alphaDeg:0,betaDeg:0,liftN:value?.equivalentTailForceN||0,pitchMomentNm:value?.commandedMomentNm||0,elevatorDeg:status.elevatorUnlocked?command*(teaching?.visualElevatorDeg||20):0};
 const currentRecords=records.filter(r=>r.kind==='week06-authority');
 return <main className="mission-shell">
  <header className="mission-hero"><div><p className="mission-kicker">AERO / ENGINEERING MISSIONS</p><h1>Build the evidence.<br/>Earn the response.</h1><p>{mission.title}</p></div><div className="mission-score"><strong>{status.complete}<small> / 12</small></strong><span>stages complete</span><span>{status.history}</span></div></header>
  <div className="mission-notice">{offline} · Initial pitch authority only</div>
  <section className="mission-card student-start"><p className="mission-kicker">Start here</p><h2>Your job: build and defend an engineering answer</h2><p>Decide whether the elevator can produce the requested initial pitch response. First explain the physics and establish an expected result. Then have AI implement your specification, test it, and use the aircraft experiment to make a bounded decision.</p><div className="student-roles"><p><strong>You</strong><br/>Choose the model, predict, calculate, and explain.</p><p><strong>AI</strong><br/>Implement the specification you reviewed and approved.</p><p><strong>This app</strong><br/>Save your answers, display checks and run the verified model.</p></div>{reference&&<div className="student-reference-note"><strong>Completed instructor reference</strong><p>The answers and implementation in this preview were supplied in advance. The completion count belongs to this example, not to a student's work. A student starts with blank worksheets and no Week 6 implementation. The cards below explain that workflow.</p></div>}<p><strong>Student workflow:</strong> read the task → write your answers below → save a GitHub checkpoint → continue. Drafts save automatically while you write. Engineering reasoning still needs instructor review.</p></section>
  <section className="mission-system" aria-label="Aircraft system status"><span>Starting files: {data.baseline?'protected':'baseline unavailable'}</span><span>Pitch authority: {status.flightUnlocked?'verified':'locked'}</span><span>Roll / yaw: outside this mission</span><span>Takeoff trajectory: not modeled</span></section>
  {!data.protection.passed&&<div role="alert">{data.protection.errors.join('\n')}</div>}
  <div className="mission-layout"><aside className="mission-stages"><h2>Twelve engineering stages</h2>{status.stages.map(s=><button key={s.id} onClick={()=>setSelected(s.id)} aria-current={selected===s.id?'step':undefined}><span>{String(s.number).padStart(2,'0')}</span><b>{s.title}</b><small>{s.status}</small></button>)}<button onClick={()=>download('rotation-authority-spec.md',implementationSpecification(data.files),'text/markdown')}>Export AI specification</button></aside>
  <div className="mission-content"><StageGuide stage={stage} files={data.files} onRefresh={refreshMission} reference={reference} errors={stage.errors} onNext={setSelected} onExport={()=>download('rotation-authority-spec.md',implementationSpecification(data.files),'text/markdown')}/>
  <section className="mission-card"><div className="mission-card-title"><div><p className="mission-kicker">Initial response experiment</p><h2>Can the elevator meet the demand?</h2></div><span className={`mission-badge ${value?.marginNm>=0?'pass':''}`}>{!status.flightUnlocked?'LOCKED':!savedPrediction?'PREDICT FIRST':value?.marginNm>=0?'CAPACITY PASS':'CAPACITY FAIL'}</span></div>
  <p>{teaching?.notice||'This blank test shell supports answer saving and code testing. Independent instructor verification and the calculated experiment are not installed.'}</p>
  <details><summary>Preserved Week 5 capability evidence</summary><pre>{JSON.stringify(upstream,null,2)}</pre></details>
  <p className="mission-muted">Week 5 condition: {compatibleBaseline(teaching?.week05,aircraft||{})?'compatible verified upstream evidence':'condition mismatch / compatibility unestablished. Week 5 results are retained, not transferred into the trainer.'}</p>
  {teaching&&<><label>Challenge<select value={scenarioId} disabled={running} onChange={e=>chooseScenario(e.target.value)}>{teaching.scenarios.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><p>{descriptor?.description}</p><details><summary>Aircraft condition and provenance</summary><pre>{JSON.stringify({aircraft,provenance:teaching.provenance,limits:teaching.limits},null,2)}</pre></details></>}
  <FlightScene presentation="authority" frame={frame} history={[]} aircraft={initialAircraft} metadata={{resolved:{cgM:initialAircraft.cgM,neutralPointM:initialAircraft.neutralPointM}}} view="side" overlays={status.flightUnlocked} reduced={false}/>
  <p className="mission-muted">Schematic geometry, fixed position. Orange elevator shows normalized command; purple indicates commanded moment. Green is an equivalent force using an assumed arm, not validated tail aerodynamics.</p>
  <label>Elevator command <output>{Math.round(command*100)}%</output><input aria-label="Elevator command" type="range" min="0" max="1" step=".05" value={command} disabled={!status.elevatorUnlocked} onChange={e=>setCommand(Number(e.target.value))}/></label>
  <p>{status.elevatorUnlocked&&!status.flightUnlocked?'Control input detected. Complete verification before physics response is enabled.':'Click the scene, hold ↓ to command full nose-up authority; release to center. Space or leaving the window pauses.'}</p>
  <div className="mission-telemetry">{[['Required',value?.requiredMomentNm,'N·m'],['Available capacity',value?.availableMomentNm,'N·m'],['Capacity margin',value?.marginNm,'N·m'],['Applied moment',value?.commandedMomentNm,'N·m'],['Initial acceleration',value?.actualAccelerationRadS2,'rad/s²'],['Pitch',frame.pitchDeg,'deg']].map(([name,v,unit])=><div key={name}><small>{name}</small><strong>{fmt(v)}</strong><span>{unit}</span></div>)}</div>
  {result?.error&&<p role="alert">{result.error}</p>}
  <label>Prediction before this challenge<textarea aria-label="Challenge prediction" value={prediction} disabled={running||Boolean(session)} onChange={e=>{setPrediction(e.target.value);setSavedPrediction('');}} placeholder="I predict… because…"/></label><button disabled={!prediction.trim()||running||Boolean(session)} onClick={()=>{predictionTime.current=Date.now();setSavedPrediction(prediction.trim());setNotice('Prediction recorded before run.');}}>Record prediction</button>
  <div className="mission-actions"><button disabled={!status.flightUnlocked||!teaching||!savedPrediction||running||Boolean(session)} onClick={start}>Run initial response</button><button disabled={!running} onClick={()=>setRunning(false)}>Pause</button><button disabled={running||!session||session.status!=='running'} onClick={()=>setRunning(true)}>Resume</button><button disabled={!session||running} onClick={()=>{setSession(null);setSavedAircraft(null);}}>Reset run</button><button disabled={!session||running} onClick={()=>{try{const replay=replayAuthority(provider,{...session,aircraft:activeAircraft},teaching.limits);setSession(replay);setNotice('Replayed the exact recorded commands.');}catch(e){setNotice(e.message);}}}>Replay commands</button><button disabled={session?.status!=='complete'} onClick={save}>Save challenge evidence</button></div>
  <p role="status">{session?`${!running&&session.status==='running'?'paused':session.status} · ${fmt(session.timeS)} s · ${session.reason||''}`:'No run recorded.'} {notice}</p>
  {session&&<EngineeringPlot plot={{title:'Bounded initial pitch response',xLabel:'Time (s)',yLabel:'Pitch (rad)',series:[{label:'Pitch',points:session.history.map(r=>({x:r.timeS,y:r.pitchRad}))}]}}/>}
  </section>
  <section className="mission-card"><h2>Evidence and decision</h2><p>{Object.entries(status.achievements).map(([key,v])=>`${v?'★':'☆'} ${key}`).join(' · ')}</p><ul>{mission.challenges.map(id=><li key={id}>{id}: {[...data.records,...records].some(r=>r.challenge===id&&evidenceCurrent(r,data.sourceHash,data.baselineHash))?'evidence recorded':'awaiting run'}</li>)}</ul><button onClick={()=>download('records.json',JSON.stringify([...data.records,...currentRecords],null,2),'application/json')}>Export evidence JSON</button><button disabled={!session} onClick={()=>{const keys=Object.keys(session.history[0]);download('authority.csv',[keys.join(','),...session.history.map(r=>keys.map(k=>r[k]).join(','))].join('\n'),'text/csv');}}>Export trace CSV</button><p>Save JSON as <code>{mission.directory}/evidence/records.json</code> for CLI review. Old records remain available but do not unlock a changed source.</p><button disabled={!status.flightUnlocked} onClick={()=>setCrosswind(true)}>Assess crosswind requirement</button>{crosswind&&<p role="alert"><strong>INSUFFICIENT MODEL</strong> · A 6 m/s crosswind requires lateral-directional control evidence, travel limits and gust response. The longitudinal claim cannot expand.</p>}</section>
  {samples.length>0&&<section className="mission-card"><button onClick={()=>setDashboard(!dashboard)}>Instructor review dashboard</button>{dashboard&&<><p>Local sample teams · demonstrations, not live student grades.</p><table><thead><tr>{['Team','Stage','Verification','Build','Flight','Decision'].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{[{team:'Current private preview',stage:`${status.complete}/12`,verification:status.verified?'pass':'pending',build:data.report?.checks?.['production-build']?.passed?'pass':'pending',flight:`${currentRecords.length} browser records`,decision:status.achievements.decision?'recorded; review needed':'pending'},...samples].map(r=><tr key={r.team}>{['team','stage','verification','build','flight','decision'].map(k=><td key={k}>{r[k]}</td>)}</tr>)}</tbody></table></>}</section>}
  </div></div>
 </main>;
}
