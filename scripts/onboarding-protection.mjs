import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const hashBytes=value=>createHash('sha256').update(value).digest('hex');
export const baselinePath='.course/onboarding-baseline.json';
export function protection(root){
 const file=path.join(root,baselinePath);if(!fs.existsSync(file))return {passed:false,errors:['Onboarding baseline is missing. Restore the instructor release.']};
 const baseline=JSON.parse(fs.readFileSync(file,'utf8')),errors=[];
 for(const [name,hash] of Object.entries(baseline.files)){const p=path.join(root,name);if(!fs.existsSync(p)||fs.lstatSync(p).isSymbolicLink()||hashBytes(fs.readFileSync(p))!==hash)errors.push(`PROTECTED SYSTEM MODIFIED: ${name}`);}
 const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 for(const name of names)if(name&&name!==baselinePath&&!baseline.files[name]&&!/^student-work\/(onboarding|missions\/week06)\//.test(name)&&!['src/student/physics/rotation-authority.js','src/student/features/rotation-authority.feature.js','tests/student/rotation-authority.test.js'].includes(name))errors.push(`UNEXPECTED FILE: ${name}`);
 return {passed:!errors.length,errors,hash:hashBytes(JSON.stringify(baseline))};
}
export function generate(root){
 const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const files={},gitBlobs={};for(const name of [...new Set(names)].sort())if(name&&name!==baselinePath&&!name.startsWith('student-work/')&&!name.startsWith('src/student/')&&!name.startsWith('tests/student/')&&!name.startsWith('.instructor/')&&fs.existsSync(path.join(root,name))){const bytes=fs.readFileSync(path.join(root,name));files[name]=hashBytes(bytes);gitBlobs[name]=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');}
 fs.writeFileSync(path.join(root,baselinePath),JSON.stringify({version:1,files,gitBlobs},null,2)+'\n');
}
if(process.argv[1]?.endsWith('onboarding-protection.mjs')){if(process.argv.includes('--generate'))generate(process.cwd());else {const r=protection(process.cwd());console.log(JSON.stringify(r,null,2));process.exitCode=r.passed?0:1;}}
