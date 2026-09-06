import { getAdapter } from './models.js';
import { createRun, advanceRun, scheduledControls, recordedControls, neutralControls } from './contract.js';
let run, timer, controls=neutralControls(), replay=null, fast=false;
function stop(){clearInterval(timer);timer=null;}
function send(){if(run)postMessage({type:'state',session:run.session});}
function tick(){
  for(let i=0;i<(fast?25:2);i++){
    const s=run.session;
    const input=replay ? recordedControls(replay,s.timeS) : s.config.maneuver==='manual' ? controls : scheduledControls(s.timeS,s.config);
    run.session=advanceRun(run.model,s,input);
    if(['complete','stopped'].includes(run.session.status)){stop();break;}
  }
  send();
}
self.onmessage=({data})=>{
  try{
    if(data.type==='init'){stop();controls=neutralControls();replay=data.replay||null;run=createRun(getAdapter(data.config.adapter),data.config);send();}
    if(data.type==='start'&&run&&!timer){fast=Boolean(data.fast);run.session.status='running';timer=setInterval(tick,40);send();}
    if(data.type==='pause'){stop();controls=neutralControls();if(run&&!['complete','stopped'].includes(run.session.status))run.session.status='paused';send();}
    if(data.type==='controls')controls=data.controls;
  }catch(error){stop();postMessage({type:'error',message:error.message});}
};
