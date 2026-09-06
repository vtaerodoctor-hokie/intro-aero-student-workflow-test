import { rk4Step } from '../simulation/integrator.js';
export const STEP_S = .02;
export const CONTROL_KEYS = ['elevator', 'aileron', 'rudder', 'throttle'];
export const neutralControls = () => Object.fromEntries(CONTROL_KEYS.map(k => [k, 0]));
export const MANEUVERS = [
  { id: 'pitch', title: 'Pitch disturbance & release', help: 'Start with the selected angle-of-attack disturbance and release the controls.' },
  { id: 'elevator', title: 'Elevator pulse', help: 'Apply a short elevator pulse at 1 second, then release.' },
  { id: 'rudder', title: 'Rudder pulse', help: 'Apply a short rudder pulse at 1 second; observe sideslip, roll and yaw.' },
  { id: 'short-period', title: 'Short-period excitation', help: 'Start with a pitch-rate disturbance. The coupled model may also excite slower motion.' },
  { id: 'phugoid', title: 'Speed / height exchange', help: 'Start with a speed perturbation and observe the coupled longitudinal response.' },
  { id: 'roll', title: 'Roll release', help: 'Start with roll rate, then release. Stopping roll does not imply returning to wings level.' },
  { id: 'spiral', title: 'Bank release', help: 'Start banked; observe the slow coupled response. No mode is artificially forced to grow or decay.' },
  { id: 'manual', title: 'Fly it yourself', help: 'Start airborne at trim. Small control inputs are enough; release to observe the natural response.' },
];
export function defaultManeuver(id) {
  if (['lateral-static-stability','dynamic-mode'].includes(id)) return 'rudder';
  if (['tail-elevator-contribution','trim-response'].includes(id)) return 'elevator';
  if (id === 'longitudinal-modes') return 'phugoid';
  return 'pitch';
}
export function cleanControls(value = {}) {
  return Object.fromEntries(CONTROL_KEYS.map(k => {
    const v = value[k] ?? 0;
    if (!Number.isFinite(v) || Math.abs(v) > 1) throw new Error(`Control ${k} must be between -1 and 1.`);
    return [k, v];
  }));
}
export function scheduledControls(time, config) {
  const controls = neutralControls();
  if (time >= 1 && time < 1.5 && ['elevator','rudder'].includes(config.maneuver)) controls[config.maneuver] = config.pulse / 5;
  return cleanControls(controls);
}
export function immutable(value) {
  const copy = structuredClone(value);
  function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
  return freeze(copy);
}
export function validateConfig(config) {
  if (!MANEUVERS.some(m => m.id === config.maneuver)) throw new Error('Choose a supported flight test.');
  if (!['reference','student'].includes(config.mode)) throw new Error('Choose a model source.');
  if (!['linked','coefficients'].includes(config.linkage)) throw new Error('Choose how aircraft coefficients are resolved.');
  for (const [key, [min,max]] of Object.entries({duration:[.02,120],pulse:[-5,5],altitude:[10,2000],speedKick:[-5,5]})) {
    if (!Number.isFinite(config[key]) || config[key] < min || config[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
}
export function createRun(adapter, config) {
  validateConfig(config);
  const frozen = immutable(config);
  const model = adapter.prepare(frozen);
  for (const value of Object.values(model.initial)) if (!Number.isFinite(value)) throw new Error('Initial state must be finite.');
  const reason = model.check(model.initial);
  if (reason) throw new Error(reason);
  const session = { version:1, config:frozen, model:model.metadata, state:{...model.initial}, timeS:0, history:[], inputLog:[], status:'paused', reason:'' };
  session.history.push(sample(model, session, neutralControls()));
  return { model, session };
}
function sample(model, session, controls) {
  const row = { timeS:session.timeS, ...model.telemetry(session.state, controls), ...Object.fromEntries(CONTROL_KEYS.map(k => [k, controls[k]])) };
  if (!Object.values(row).every(Number.isFinite)) throw new Error('Model returned nonfinite telemetry.');
  return row;
}
export function advanceRun(model, session, controls, stepS = STEP_S) {
  if (['complete','stopped'].includes(session.status)) return session;
  const h = Math.min(stepS, session.config.duration - session.timeS);
  const input = cleanControls(controls);
  try {
    const state = rk4Step(s => model.derivatives(s, input), session.state, session.timeS, h);
    const reason = model.check(state);
    if (reason) return {...session,status:'stopped',reason};
    const next = {...session,state,timeS:Number((session.timeS+h).toFixed(10)),status:'running'};
    const row = sample(model,next,input);
    next.history = [...session.history,row];
    next.inputLog = [...session.inputLog,{timeS:session.timeS,...input}];
    if (next.timeS >= session.config.duration) next.status='complete';
    return next;
  } catch (error) { return {...session,status:'stopped',reason:`Model stopped: ${error.message}`}; }
}
export function recordedControls(log, timeS) {
  let low=0, high=log.length-1, found=-1;
  while(low<=high){const mid=(low+high)>>1;if(log[mid].timeS<=timeS+1e-9){found=mid;low=mid+1;}else high=mid-1;}
  return found < 0 ? neutralControls() : cleanControls(log[found]);
}
export function frameAt(history, time) {
  if (!history?.length) return null;
  let lo=0,hi=history.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(history[mid].timeS<=time)lo=mid;else hi=mid-1;}
  return history[lo];
}
export function csv(record) {
  const rows=record.history;if(!rows.length)return '';
  const keys=Object.keys(rows[0]);return [keys.join(','),...rows.map(row=>keys.map(k=>row[k]).join(','))].join('\n');
}
