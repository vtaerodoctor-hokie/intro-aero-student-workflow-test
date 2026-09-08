import {useState,useEffect} from 'react';
export default function Experiment({mission,result}){
 const [index,setIndex]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false);
 useEffect(()=>{setIndex(0);setTime(0);setPlaying(false);},[result]);
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>setTime(t=>{if(t>=.48){setPlaying(false);return .5;}return t+.02;}),20);return()=>clearInterval(id);},[playing]);
 const rows=result.traces||[],row=rows[index];if(!row)return null;
 const pitch=mission.number===1,angle=pitch?Math.max(-20,Math.min(20,.5*row.supplied*time*time*180/Math.PI)):0;
 return <section className="instrument"><h4>Explore the experiment</h4><p>{mission.sweep.units||'Output units are declared in the Outputs section.'}</p><label>{mission.sweep.variable}: {row.x}<input aria-label="Experiment condition" type="range" min="0" max={rows.length-1} step="1" value={index} onChange={e=>{setIndex(Number(e.target.value));setTime(0);setPlaying(false);}}/></label>
 <div className="readouts"><div>Configured result<strong>{Number.isFinite(row.supplied)?row.supplied.toFixed(4):'Unavailable'}</strong></div><div>Reference / requirement<strong>{Number.isFinite(row.reference)?row.reference.toFixed(4):'Unavailable'}</strong></div></div>
 {pitch&&<><svg viewBox="0 0 600 140" role="img" aria-label={`Bounded initial pitch response, angle ${angle.toFixed(2)} degrees`}><path d="M20 110 H580" stroke="#b4c9c0" strokeDasharray="5 5"/><g transform={`translate(300 75) rotate(${-angle})`}><path d="M-170 0 L140 0 L185 10 L-160 18 Z M-150 0 L-175 -35 L-145 -35 L-120 0 M-20 8 L-100 42 L20 12" fill="#287568" stroke="#173b40" strokeWidth="3"/><path d="M-148 4 L-180 15" stroke="#e38c35" strokeWidth="6"/></g></svg><p>t = {time.toFixed(2)} s · pitch = {angle.toFixed(2)}°</p><button onClick={()=>{setTime(0);setPlaying(true);}}>Replay 0.5-second response</button><button onClick={()=>setPlaying(false)} disabled={!playing}>Pause</button><p>Constant initial acceleration, full elevator command. This short extrapolation omits changing aerodynamics and does not simulate takeoff.</p></>}
 <p>Move the control to compare the supplied test conditions. Explain the difference between your configured output and the reference.</p></section>;
}
