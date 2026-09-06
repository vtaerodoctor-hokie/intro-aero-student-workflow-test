import { createCapabilityRegistry, modelsForFeature } from '../capabilities/capabilityContract.js';
import { capabilityContext } from '../simulation/runtime.js';
const REQUIRED = ['stability.pitch.cm-alpha','dynamics.longitudinal.pitch','stability.lateral.static'];
export function studentAvailability(entries) {
  const registry=createCapabilityRegistry(entries);
  const needed = new Set();
  const errors=[];
  for(const id of REQUIRED){
    const provider=registry.providers.get(id);
    if(!provider)errors.push(`Missing ${id}.`);
    else modelsForFeature(provider.entry.feature.id,registry).forEach(e=>needed.add(e.feature.id));
  }
  registry.issues.filter(i=>needed.has(i.featureId)).forEach(i=>errors.push(i.message));
  return {ready:!errors.length,errors,registry};
}
export function createStudentBridge(entries, aircraft) {
  const {ready,errors,registry}=studentAvailability(entries);
  if(!ready)throw new Error(errors.join(' '));
  const providers={};
  for(const id of REQUIRED){
    const entry=registry.providers.get(id).entry;
    const capabilities=capabilityContext(modelsForFeature(entry.feature.id,registry),aircraft,{});
    providers[id]={entry,capabilities};
  }
  function call(id, changes={}, state={}, momentsBodyNm={x:0,y:0,z:0}) {
    const {entry,capabilities}=providers[id];
    return entry.model.evaluate({aircraft:{...aircraft,...changes},state,controls:{},disturbance:{},timeS:0,capabilities,derived:capabilities.derived||{},forcesBodyN:{x:0,y:0,z:0},momentsBodyNm});
  }
  const finite=(v,label)=>{if(!Number.isFinite(v))throw new Error(`Student module must return finite ${label}.`);return v;};
  return {
    sources:REQUIRED.map(id=>({capability:id,feature:providers[id].entry.feature.id,version:registry.providers.get(id).version})),
    cm(alphaRad){return finite(call('stability.pitch.cm-alpha',{angleOfAttackDeg:alphaRad*180/Math.PI}).values?.cm,'values.cm');},
    pitchAcceleration(moment,q){return finite(call('dynamics.longitudinal.pitch',{}, {pitchRateRadS:q},{x:0,y:moment,z:0}).derivatives?.pitchRateRadS,'pitch acceleration');},
    lateral(beta){const result=call('stability.lateral.static',{sideslipDeg:beta*180/Math.PI});return {roll:finite(result.momentsBodyNm?.x,'roll moment'),yaw:finite(result.momentsBodyNm?.z,'yaw moment')};},
  };
}
