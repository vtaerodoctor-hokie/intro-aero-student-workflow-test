import {runMission,reflectionChecks} from '../../src/core/onboarding/engine.js';
export function reviewSubmission(mission,work){
 if(!work?.answer)return {status:'not attempted',checks:[]};
 const current=work.attempt?.missionVersion===mission.version&&work.attempt?.answerSnapshot===JSON.stringify(work.answer);
 const result=runMission(mission,work.answer);
 return {status:!current?'stale or not run':!result.runnable?'needs inputs':!result.passed?'revise':mission.codeCases?'code review required':reflectionChecks(work.reflection)?'checks passed; review reasoning':'reflection needed',checks:result.checks.filter(c=>!c.passed).map(c=>({message:c.message,actual:c.actual,expected:c.expected,error:c.error})),attempts:work.attempts?.length||0,answer:work.answer,reflection:work.reflection,at:work.attempt?.at,reportedCodeChecks:mission.codeCases&&Array.isArray(work.attempt?.result?.checks)?work.attempt.result.checks.slice(0,30):null,codeEvidence:mission.codeCases?'Student-browser results are not independent grading.':null};
}
