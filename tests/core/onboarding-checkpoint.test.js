import {it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {onboardingCheckpoint} from '../../scripts/student-workspace.mjs';
import {generate,protection} from '../../scripts/onboarding-protection.mjs';
import {digest} from '../../scripts/mission-state.mjs';
it('creates distinct local commits for changed submissions, preserves other work, and detects protection errors',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aircraft-checkpoint-'));
 const run=(root,args)=>args[0]==='push'?'':execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{run(root,['init','-b','main']);run(root,['config','user.name','Local test']);run(root,['config','user.email','local-test@example.invalid']);run(root,['remote','add','origin','https://github.com/local-test/course.git']);fs.mkdirSync(path.join(root,'.course'));fs.mkdirSync(path.join(root,'lessons/onboarding'),{recursive:true});const lesson=JSON.parse(fs.readFileSync(new URL('../../lessons/onboarding/mission01.json',import.meta.url)));fs.writeFileSync(path.join(root,'lessons/onboarding/mission01.json'),JSON.stringify(lesson));generate(root);run(root,['add','.']);run(root,['commit','-m','test baseline']);
 const name='student-work/onboarding/mission01.json',file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});let text=JSON.stringify({answer:{question:'First answer'},reflection:{}});fs.writeFileSync(file,text);
 const first=await onboardingCheckpoint(root,{id:'mission01',expectedHash:digest(text)},run);text=JSON.stringify({answer:{question:'Changed answer with spaces'},reflection:{}});fs.writeFileSync(file,text);const second=await onboardingCheckpoint(root,{id:'mission01',expectedHash:digest(text)},run);expect(first.revision).not.toBe(second.revision);expect((await onboardingCheckpoint(root,{id:'mission01',expectedHash:digest(text)},run)).revision).toBe(second.revision);expect(run(root,['log','--format=%s'])).toContain('Onboarding attempt: mission01');expect(fs.readFileSync(path.join(root,'student-work/onboarding/mission01.md'),'utf8')).toContain('Changed answer with spaces');
 fs.writeFileSync(path.join(root,'lessons/onboarding/mission01.json'),'tampered');expect(protection(root).passed).toBe(false);await expect(onboardingCheckpoint(root,{id:'mission01',expectedHash:digest(text)},run)).rejects.toThrow('PROTECTED SYSTEM');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
