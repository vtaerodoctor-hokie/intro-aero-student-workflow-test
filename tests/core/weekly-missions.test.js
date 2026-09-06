import { describe,it,expect } from 'vitest';
import { mission } from '../../src/core/missions/manifest.js';
import { validateDocument,validateMission,verificationCurrent } from '../../src/core/missions/validation.js';
import { protectedDiff } from '../../scripts/mission-state.mjs';
import { authorityProvider,beginAuthority,advanceAuthority,replayAuthority,compatibleBaseline } from '../../src/core/missions/experiment.js';
function ready(){const files=Object.fromEntries(mission.stages.map(s=>[s.file,s.headings.map(h=>`## ${h}\nSynthetic completed text.\n`).join('\n')]));files['stage03-inputs.md']+='\nMASS_KG: 1 kg\nIY_KGM2: 1 kg*m^2\nSPEED_MPS: 1 m/s\nDENSITY_KGM3: 1 kg/m^3\nAREA_M2: 1 m^2\nCHORD_M: 1 m\nOTHER_MOMENT_NM: 1 N*m\nDELTA_CM: 1 1\nTARGET_ACCEL_RAD_S2: 1 rad/s^2\n';files['stage08-reference.md']+='\nM_REQUIRED_KNM: 1 kN*m\nM_AVAILABLE_KNM: 1 kN*m\nM_MARGIN_KNM: 1 kN*m\n';files['stage10-requirements.md']+='\n'+mission.implementationPaths.join('\n');files['stage11-implementation.md']=files['stage11-implementation.md'].replace('Synthetic completed text.','APPROVE ENGINEERING INTERPRETATION');files['stage12-decision.md']=files['stage12-decision.md'].replace('Synthetic completed text.','NARROW');return {files,sourceHash:'source',baselineHash:'baseline',protection:{passed:true,errors:[]},implemented:true,report:{sourceHash:'source',baselineHash:'baseline',reference:{passed:true},checks:Object.fromEntries(mission.requiredChecks.map(k=>[k,{passed:true}]))}};}
describe('weekly mission progression',()=>{
 it('keeps blank stages and controls locked',()=>{const s=validateMission({files:{}});expect(s.complete).toBe(0);expect(s.flightUnlocked).toBe(false);expect(s.elevatorUnlocked).toBe(false);});
 it('requires headings, content, finite fields and correct units',()=>{expect(validateDocument(mission.stages[0],'## Mission event\n<!-- STUDENT COMPLETE -->')).not.toHaveLength(0);const d=ready();d.files['stage03-inputs.md']=d.files['stage03-inputs.md'].replace('1 kg*m^2','1 lb');expect(validateMission(d).complete).toBe(2);});
 it('walks sequentially and unlocks controls before implementation',()=>{const d=ready();d.implemented=false;const s=validateMission(d);expect(s.complete).toBe(10);expect(s.elevatorUnlocked).toBe(true);expect(s.flightUnlocked).toBe(false);});
 it('unlocks current verified physics but waits for challenge evidence',()=>{const s=validateMission(ready());expect(s.complete).toBe(11);expect(s.flightUnlocked).toBe(true);expect(s.achievements.decision).toBe(false);});
 it('invalidates stale source and baseline reports',()=>{const d=ready();expect(verificationCurrent(d.report,'other','baseline')).toBe(false);d.baselineHash='changed';expect(validateMission(d).flightUnlocked).toBe(false);});
 it('rejects failed independent tests and absent providers',()=>{const d=ready();d.report.checks['independent-verification'].passed=false;expect(validateMission(d).flightUnlocked).toBe(false);d.implemented=false;expect(validateMission(d).flightUnlocked).toBe(false);});
 it('does not treat predictions as Git history proof',()=>expect(validateMission(ready()).history).toContain('not verified'));
 it('detects previous module edits, deletion, rename and protected additions',()=>{const baseline={'src/student/physics/old.js':'a','src/core/app.js':'b'};const current={'src/student/physics/renamed.js':'a','src/core/app.js':'bad','scripts/new.js':'x'};const errors=protectedDiff(baseline,current);expect(errors).toHaveLength(4);expect(errors[2]).toContain('PREVIOUS-STAGE');});
 it('allows exactly the mission and its three implementation files',()=>{const current=Object.fromEntries([...mission.implementationPaths,`${mission.directory}/stage01-question.md`].map(p=>[p,'a']));expect(protectedDiff({},current)).toEqual([]);expect(protectedDiff({}, {...current,'src/student/physics/unlisted.js':'a'})).toHaveLength(1);});
 it('fails closed on baseline violations',()=>{const d=ready();d.protection={passed:false,errors:['PROTECTED SYSTEM MODIFIED']};expect(validateMission(d).complete).toBe(0);});
});
const entry={feature:{contractVersion:4,id:'synthetic',providesCapabilities:['control.pitch.authority']},model:{kind:'derived',evaluate:()=>({values:{requiredMomentNm:1,availableMomentNm:2,marginNm:1,commandedMomentNm:2,actualAccelerationRadS2:.01}})}};
describe('generic mission response integration',()=>{
 it('needs only the declared authority provider',()=>expect(authorityProvider([entry])).not.toBeNull());
 it('keeps missing prerequisites locked',()=>{expect(authorityProvider([])).toBeNull();expect(authorityProvider([{...entry,feature:{...entry.feature,requiresCapabilities:['missing']}}])).toBeNull();});
 it('replays identical controls at a fixed step',()=>{const p=authorityProvider([entry]),limits={durationS:.1,maxPitchRad:1};let s=beginAuthority(p,{pitchInertiaKgM2:1});while(s.status!=='complete')s=advanceAuthority(p,{pitchInertiaKgM2:1},s,1,limits);expect(replayAuthority(p,{...s,aircraft:{pitchInertiaKgM2:1}},limits).history).toEqual(s.history);});
 it('stops invalid model output without corrupting the last sample',()=>{const p=authorityProvider([entry]),s=beginAuthority(p,{pitchInertiaKgM2:1});const bad=authorityProvider([{...entry,model:{kind:'derived',evaluate:()=>({values:{}})}}]);const stopped=advanceAuthority(bad,{pitchInertiaKgM2:1},s,1,{durationS:.1,maxPitchRad:1});expect(stopped.status).toBe('stopped');expect(stopped.history).toBe(s.history);});
 it('requires matching configuration provenance for upstream evidence',()=>{expect(compatibleBaseline(null,{configurationId:'x'})).toBe(false);expect(compatibleBaseline({configurationId:'old',source:'verified-week05',capabilityId:'stability.pitch.cm-alpha'},{configurationId:'new'})).toBe(false);});
});

it('consumes compatible upstream evidence without transferring mismatched conditions',async()=>{
 const {week05Evidence}=await import('../../src/core/missions/experiment.js');
 const upstream={feature:{id:'upstream',contractVersion:4,providesCapabilities:['stability.pitch.cm-alpha']},model:{kind:'derived',evaluate:()=>({values:{syntheticEvidence:3}})}};
 const baseline={configurationId:'same',source:'verified-week05',capabilityId:'stability.pitch.cm-alpha',aircraft:{}};
 expect(week05Evidence([upstream],baseline,{configurationId:'same'}).reusable.values.syntheticEvidence).toBe(3);
 const mismatch=week05Evidence([upstream],baseline,{configurationId:'different'});expect(mismatch.retained.values.syntheticEvidence).toBe(3);expect(mismatch.reusable).toBeNull();
});
