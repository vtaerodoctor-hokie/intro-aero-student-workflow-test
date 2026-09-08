import { evaluate } from './expression.js';
export const sectionNames=['Engineering question','Physics model','Inputs','Outputs','Assumptions','Validity','Predictions','Manual reference','Verification cases','Feature requirements','Implementation','Decision'];
export function checkAnswer(mission,answer){
 const issues=[];
 for(const field of mission.fields){const value=answer[field.id];if(value===undefined||String(value).trim()===''){issues.push({field:field.id,message:`Supply ${field.label}.`,kind:'missing'});continue;}
 if(field.type==='number'&&!Number.isFinite(Number(value)))issues.push({field:field.id,message:`${field.label} must be a finite number.`,kind:'invalid'});
 if(field.type==='equation'){try{evaluate(value,mission.variables);}catch(e){issues.push({field:field.id,message:e.message,kind:'invalid'});}}
 }
 return issues;
}
export function runMission(mission,answer){
 const missing=checkAnswer(mission,answer);if(missing.length)return {runnable:false,checks:missing};
 const values={...mission.variables};for(const f of mission.fields)if(f.type==='number')values[f.id]=Number(answer[f.id]);
 const checks=mission.checks.map(c=>{let actual=answer[c.field],expected=c.expected;try{
 if(c.expression)actual=evaluate(c.expression,values);
 if(c.studentExpression)actual=evaluate(answer[c.studentExpression],{...values,...c.variables});
 if(c.referenceExpression)expected=evaluate(c.referenceExpression,{...values,...c.variables});
 const passed=typeof expected==='number'?Number.isFinite(Number(actual))&&Math.abs(Number(actual)-expected)<=Math.max(c.tolerance??1e-6,Math.abs(expected)*(c.relativeTolerance??0)):actual===expected;
 return {...c,actual,expected,passed};
 }catch(e){return {...c,passed:false,error:e.message};}});
 const traces=(mission.sweep?.values||[]).map((x,index)=>{const vars={...values,[mission.sweep.variable]:x};let supplied=null,reference=null;try{supplied=evaluate(answer[mission.sweep.studentField]||mission.sweep.expression,vars);}catch{}try{reference=evaluate(mission.sweep.reference,vars);}catch{}if(mission.sweep.referenceValues)reference=mission.sweep.referenceValues[index];return {x,supplied,reference};});
 return {runnable:true,passed:checks.every(c=>c.passed),checks,traces};
}
export function reflectionChecks(reflection={}){return Boolean(reflection.observation?.trim()&&reflection.change?.trim()&&reflection.limit?.trim()&&reflection.result==='supported');}
export function progress(missions,work,messages=[]){let previous=true;return missions.map(m=>{
 const w=work[m.id],current=Boolean(w?.attempt&&w.attempt.answerSnapshot===JSON.stringify(w.answer)&&w.attempt.missionVersion===m.version);
 const review=current?runMission(m,w.answer):null;
 const override=messages.some(f=>f.kind==='override'&&f.mission===m.id&&f.snapshot===JSON.stringify(w?.answer));
 const complete=Boolean(current&&reflectionChecks(w.reflection)&&(override||(review?.passed&&(!m.codeCases||w.attempt.result?.passed))));
 const state=previous?(complete?'complete':'available'):'locked';previous=previous&&complete;
 return {id:m.id,state,complete:state==='complete',stale:Boolean(w?.attempt&&!current),override};});}
export function markdown(mission,work){return `# ${mission.title}\n\n`+sectionNames.map((title,i)=>`## ${title}\n${mission.missing.includes(i)?Object.entries(work.answer||{}).filter(([k])=>mission.fields.find(f=>f.id===k)?.section===i).map(([k,v])=>`${k}: ${v}`).join('\n\n'):mission.supplied[i]}`).join('\n\n')+'\n\n## Student reflection\n'+Object.entries(work.reflection||{}).map(([k,v])=>`${k}: ${v}`).join('\n\n');}

export function implementationPrompt(mission,work){const base=`student-work/onboarding/implementation/${mission.id}`;return `Implement the specification below using function calculate(input), ${mission.codeContract?.description||'following the declared input/output contract.'} Work only in these three export files: ${base}/physics.js, ${base}/feature.json, ${base}/verification.json. Do not modify the application or supplied lesson. Keep units, assumptions, and limits explicit. This prompt can be used with an already available coding tool; no AI service is required. Paste the calculate function into the app code field to run the browser checks.\n\n${markdown(mission,work)}`;}
