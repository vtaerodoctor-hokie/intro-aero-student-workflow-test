import { createCapabilityRegistry,modelsForFeature } from '../capabilities/capabilityContract.js';
import { capabilityContext } from '../simulation/runtime.js';
import { rk4Step } from '../simulation/integrator.js';
export const STEP_S=.02;
export function authorityProvider(entries){const registry=createCapabilityRegistry(entries);const provider=registry.providers.get('control.pitch.authority');if(!provider)return null;const ordered=modelsForFeature(provider.entry.feature.id,registry);if(registry.issues.some(i=>!i.featureId||ordered.some(e=>e.feature.id===i.featureId)))return null;return {registry,ordered,entry:provider.entry};}
export function evaluateAuthority(provider,aircraft,command,state={pitchRad:0,pitchRateRadS:0}){
 if(!provider)throw new Error('Pitch authority capability is not installed or has missing prerequisites.');
 const context=capabilityContext(provider.ordered,{...aircraft,elevatorCommand:command},{initialState:state});
 const value=context['control.pitch.authority']?.values;
 for(const key of ['requiredMomentNm','availableMomentNm','marginNm','commandedMomentNm','actualAccelerationRadS2'])if(!Number.isFinite(value?.[key]))throw new Error(`Authority model must return finite ${key}.`);
 return value;
}
export function advanceAuthority(provider,aircraft,session,command,limits){
 if(session.status==='complete'||session.status==='stopped')return session;
 try{
  const h=Math.min(STEP_S,limits.durationS-session.timeS);
  const state=rk4Step((s)=>{const v=evaluateAuthority(provider,aircraft,command,s);return {pitchRad:s.pitchRateRadS,pitchRateRadS:v.actualAccelerationRadS2};},session.state,session.timeS,h);
  if(Math.abs(state.pitchRad)>limits.maxPitchRad)return {...session,status:'stopped',reason:'Initial-response angular limit reached; no takeoff claim is available.'};
  const timeS=Number((session.timeS+h).toFixed(8)),value=evaluateAuthority(provider,aircraft,command,state);
  return {...session,state,timeS,status:timeS>=limits.durationS?'complete':'running',history:[...session.history,{timeS,...state,...value,command}],inputLog:[...session.inputLog,{timeS:session.timeS,command}]};
 }catch(error){return {...session,status:'stopped',reason:error.message};}
}
export function beginAuthority(provider,aircraft){const state={pitchRad:0,pitchRateRadS:0};return {state,timeS:0,status:'paused',history:[{timeS:0,...state,...evaluateAuthority(provider,aircraft,0),command:0}],inputLog:[]};}
export function replayAuthority(provider,record,limits){let session=beginAuthority(provider,record.aircraft);for(const input of record.inputLog){if(session.status==='complete'||session.status==='stopped')break;session=advanceAuthority(provider,record.aircraft,session,input.command,limits);}return session;}
export function compatibleBaseline(baseline,current){return Boolean(baseline&&baseline.configurationId===current.configurationId&&baseline.source==='verified-week05'&&baseline.capabilityId==='stability.pitch.cm-alpha');}
// Preserve upstream engineering evidence at its own condition. Reuse is explicit.
export function week05Evidence(entries,baseline,current){
 if(!baseline?.aircraft)return {status:'unavailable',retained:null,reusable:null};
 const registry=createCapabilityRegistry(entries),source=registry.providers.get('stability.pitch.cm-alpha');
 if(!source)return {status:'missing capability',retained:null,reusable:null};
 try{
  const models=modelsForFeature(source.entry.feature.id,registry);
  if(registry.issues.some(i=>!i.featureId||models.some(e=>e.feature.id===i.featureId)))throw new Error('Upstream prerequisites unavailable.');
  const context=capabilityContext(models,baseline.aircraft,{initialState:{}});
  const retained={configurationId:baseline.configurationId,featureId:source.entry.feature.id,version:source.version,values:context['stability.pitch.cm-alpha']?.values};
  return {status:compatibleBaseline(baseline,current)?'compatible':'condition mismatch',retained,reusable:compatibleBaseline(baseline,current)?retained:null};
 }catch(error){return {status:error.message,retained:null,reusable:null};}
}
