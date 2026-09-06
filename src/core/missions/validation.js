import { mission } from './manifest.js';
export function sections(text='') {
 const result={};let key;
 for(const line of text.split(/\r?\n/)){const heading=line.match(/^##\s+(.+?)\s*$/);if(heading){key=heading[1];result[key]='';}else if(key)result[key]+=line+'\n';}
 return result;
}
export function numericField(text,key){const match=text.match(new RegExp(`^${key}:\\s*([-+]?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)\\s+(\\S+)\\s*$`,'im'));return match?{value:Number(match[1]),unit:match[2]}:null;}
export function validateDocument(stage,text='') {
 const errors=[],parts=sections(text);
 if(!text.trim())errors.push('File missing or empty.');
 if(/STUDENT (?:COMPLETE|SHOW)|\bTODO\b|\bTBD\b|\[placeholder\]/i.test(text))errors.push('Replace every student placeholder.');
 for(const heading of stage.headings){const content=(parts[heading]||'').replace(/<!--[\s\S]*?-->/g,'').trim();if(!content)errors.push(`Complete heading: ${heading}.`);}
 if(stage.id==='inputs')for(const [key,unit] of Object.entries({MASS_KG:'kg',IY_KGM2:'kg*m^2',SPEED_MPS:'m/s',DENSITY_KGM3:'kg/m^3',AREA_M2:'m^2',CHORD_M:'m',OTHER_MOMENT_NM:'N*m',DELTA_CM:'1',TARGET_ACCEL_RAD_S2:'rad/s^2'})){const f=numericField(text,key);if(!f||!Number.isFinite(f.value)||f.unit!==unit)errors.push(`Supply ${key}: number ${unit}.`);}
 if(stage.id==='reference')for(const key of ['M_REQUIRED_KNM','M_AVAILABLE_KNM','M_MARGIN_KNM']){const f=numericField(text,key);if(!f||f.unit!=='kN*m')errors.push(`Supply ${key}: number kN*m.`);}
 if(stage.id==='requirements')for(const path of mission.implementationPaths)if(!text.includes(path))errors.push(`Include permitted file: ${path}.`);
 if(stage.id==='implementation'&&!/APPROVE ENGINEERING INTERPRETATION/.test(parts['Interpretation approval']||''))errors.push('Record the engineering interpretation approval.');
 if(stage.id==='decision'&&!/^(RETAIN|NARROW|REVISE|WITHDRAW)$/m.test((parts.Decision||'').trim()))errors.push('Choose RETAIN, NARROW, REVISE, or WITHDRAW.');
 return errors;
}
export function verificationCurrent(report,sourceHash,baselineHash){return Boolean(report&&report.sourceHash===sourceHash&&report.baselineHash===baselineHash&&mission.requiredChecks.every(k=>report.checks?.[k]?.passed===true)&&report.reference?.passed===true);}
export function evidenceCurrent(r,sourceHash,baselineHash){
 return Boolean(r&&r.kind==='week06-authority'&&r.sourceHash===sourceHash&&r.baselineHash===baselineHash&&mission.challenges.includes(r.challenge)&&typeof r.prediction==='string'&&r.prediction.trim()&&Number.isFinite(r.predictedAt)&&Number.isFinite(r.startedAt)&&r.predictedAt<=r.startedAt&&r.status==='complete'&&Array.isArray(r.history)&&r.history.length>1&&Array.isArray(r.inputLog)&&r.inputLog.length===r.history.length-1&&r.history.every((row,i)=>row&&typeof row==='object'&&Object.values(row).every(Number.isFinite)&&(i===0?row.timeS===0:row.timeS>r.history[i-1].timeS)));
}
export function validateMission({files={},report,sourceHash,baselineHash,protection={passed:false,errors:['Baseline unavailable.']},implemented=false,records=[]}) {
 const verified=verificationCurrent(report,sourceHash,baselineHash)&&protection.passed;
 const eligibleRecords=records.filter(r=>evidenceCurrent(r,sourceHash,baselineHash));
 let prior=true;
 const stages=mission.stages.map(stage=>{
  const errors=validateDocument(stage,files[stage.file]);
  if(stage.id==='reference'&&!report?.reference?.passed)errors.push('Run independent reference verification.');
  if(stage.id==='reference'&&report?.sourceHash!==sourceHash)errors.push('Reference verification is stale or missing.');
  if(stage.id==='implementation'&&(!implemented||!verified))errors.push('Current implementation, independent verification, full tests and build must pass.');
  if(stage.id==='decision'&&mission.challenges.some(id=>!eligibleRecords.some(r=>r.challenge===id)))errors.push('Complete and save all six predicted challenge runs for this source revision.');
  if(!protection.passed)errors.push(...protection.errors);
  const status=!prior?'locked':errors.length?'available':'complete';prior=prior&&errors.length===0;
  return {...stage,status,errors};
 });
 const complete=stages.filter(s=>s.status==='complete').length;
 return {stages,complete,verified,elevatorUnlocked:complete>=7,flightUnlocked:complete>=11,sourceHash,baselineHash,
  achievements:{prediction:complete>=7,verification:verified,decision:complete===12},
  review:'Structural completion only. Engineering reasoning requires instructor review.',
  history:report?.historyVerified===true?'Git history verified':'Local draft · Git history not verified'};
}
