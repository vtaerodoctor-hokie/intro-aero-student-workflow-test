import {describe,it,expect} from 'vitest';
import {createRun,advanceRun,neutralControls,scheduledControls,recordedControls,frameAt,csv,validateConfig} from '../../src/core/flight/contract.js';
import {flightParameters} from '../../src/core/flight/parameterRoles.js';
import {studentAvailability,createStudentBridge} from '../../src/core/flight/studentBridge.js';
const config={mode:'reference',linkage:'linked',maneuver:'elevator',duration:2,pulse:2,altitude:80,speedKick:.5,aircraft:{}};
const adapter={prepare:()=>({initial:{x:1},metadata:{id:'abstract-decay'},derivatives:s=>({x:-s.x}),check:s=>Number.isFinite(s.x)?'':'invalid',telemetry:s=>({x:s.x})})};
describe('flight runtime contracts',()=>{
 it('integrates a generic analytic decay independently of render callbacks',()=>{
  let {model,session}=createRun(adapter,config);
  for(let i=0;i<100;i++)session=advanceRun(model,session,neutralControls());
  expect(session.timeS).toBe(2);expect(session.state.x).toBeCloseTo(Math.exp(-2),8);expect(session.history).toHaveLength(101);expect(session.status).toBe('complete');
 });
 it('freezes configuration and keeps the last valid state on model failure',()=>{
  const {model,session}=createRun(adapter,config);expect(Object.isFrozen(session.config.aircraft)).toBe(true);
  model.check=()=> 'outside envelope';const stopped=advanceRun(model,session,neutralControls());expect(stopped.status).toBe('stopped');expect(stopped.history).toEqual(session.history);expect(stopped.timeS).toBe(0);
  model.check=()=>'';model.derivatives=()=>({x:NaN});expect(advanceRun(model,session,neutralControls()).reason).toMatch(/finite/);
 });
 it('uses zero amplitude literally and exact recorded input timestamps',()=>{
  expect(scheduledControls(1,{...config,pulse:0}).elevator).toBe(0);expect(scheduledControls(1,config).elevator).toBe(.4);expect(scheduledControls(1.5,config).elevator).toBe(0);
  const log=[{timeS:0,elevator:0},{timeS:.02,elevator:.4},{timeS:.5,elevator:0}];expect(recordedControls(log,.019).elevator).toBe(0);expect(recordedControls(log,.02).elevator).toBe(.4);
 });
 it('rejects unsupported configurations and preserves inspectable histories',()=>{
  expect(()=>validateConfig({...config,duration:Infinity})).toThrow();expect(()=>validateConfig({...config,pulse:10})).toThrow();
  expect(frameAt([{timeS:0,x:1},{timeS:.02,x:2}],.01).x).toBe(1);expect(csv({history:[{timeS:0,x:1}]})).toBe('timeS,x\n0,1');
 });
 it('maps every canonical aircraft parameter exactly once',()=>{
  expect(flightParameters.every(p=>p.role!=='unmapped')).toBe(true);expect(new Set(flightParameters.map(p=>p.key)).size).toBe(flightParameters.length);
 });
 it('disables student flight when capabilities are missing without supplying answers',()=>{
  expect(studentAvailability([]).ready).toBe(false);expect(()=>createStudentBridge([],{})).toThrow(/Missing/);
 });
});
