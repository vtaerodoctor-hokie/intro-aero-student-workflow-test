import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { collect,gitHistoryVerified } from './mission-state.mjs';
const root=process.cwd();
if(process.argv.includes('--verify')){
 const before=collect(root);
 const report={schemaVersion:1,sourceHash:before.sourceHash,baselineHash:before.baselineHash,createdAt:new Date().toISOString(),checks:{},historyVerified:gitHistoryVerified(root)};
 const run=(key,args)=>{try{execFileSync('npm',args,{cwd:root,stdio:'inherit',timeout:120000});report.checks[key]={passed:true};}catch{report.checks[key]={passed:false,message:'See command output.'};}};
 try{
  const verifier=await import(pathToFileURL(path.join(root,'student-work/verification/week06.mjs')).href);
  report.reference=verifier.verifyReference(before.files);
  try { report.checks['independent-verification']=await verifier.verifyImplementation(root); }
  catch(error){report.checks['independent-verification']={passed:false,message:error.message};}
 }catch(error){report.reference={passed:false,message:error.message};report.checks['independent-verification']={passed:false,message:error.message};}
 run('student-tests',['exec','--','vitest','run','tests/student/rotation-authority.test.js']);
 run('complete-suite',['test']);run('production-build',['run','build']);
 if(collect(root).sourceHash!==before.sourceHash)throw new Error('Source changed during verification. Run again.');
 fs.mkdirSync(path.join(root,'.instructor/private'),{recursive:true});
 fs.writeFileSync(path.join(root,'.instructor/private/mission-verification.json'),JSON.stringify(report,null,2)+'\n');
 // Embed the newly issued verification in the preview, after proving the source builds.
 if(Object.values(report.checks).every(check=>check.passed)&&report.reference.passed){
  run('production-build',['run','build']);
  if(!report.checks['production-build'].passed)fs.writeFileSync(path.join(root,'.instructor/private/mission-verification.json'),JSON.stringify(report,null,2)+'\n');
 }
}
const data=collect(root);
console.log(JSON.stringify({week:'week06',...data.status,protection:data.protection},null,2));
if(process.argv.includes('--protected'))process.exitCode=data.protection.passed?0:1;
else if(process.argv.includes('--verify'))process.exitCode=data.status.verified?0:1;
else if(process.argv.includes('--complete'))process.exitCode=data.status.complete===12?0:1;
