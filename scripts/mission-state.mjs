import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mission } from '../src/core/missions/manifest.js';
import { validateMission } from '../src/core/missions/validation.js';
export const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
export function sourceFiles(root){
 const skip=new Set(['.git','node_modules','dist','.instructor','.cache','.vite']);
 const files={};function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const full=path.join(dir,ent.name),rel=path.relative(root,full).split(path.sep).join('/');if(ent.isSymbolicLink()){files[rel]=`symlink:${fs.readlinkSync(full)}`;continue;}if(ent.isDirectory())walk(full);else files[rel]=digest(fs.readFileSync(full));}}walk(root);return files;
}
export function allowed(p){return p.startsWith(mission.directory+'/')||mission.implementationPaths.includes(p);}
export function protectedDiff(baseline,current){return [...new Set([...Object.keys(baseline),...Object.keys(current)])].filter(p=>!allowed(p)&&baseline[p]!==current[p]).sort().map(p=>`${p.startsWith('src/student/')||p.startsWith('tests/student/')||p.startsWith('student-work/')?'PROTECTED PREVIOUS-STAGE FILE MODIFIED':'PROTECTED SYSTEM MODIFIED'}: ${p}`);}
export function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
export function publicBaseline(root){
 try{
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024}).trim();
  const revision=git(['rev-list','--max-parents=0','HEAD']).split('\n')[0];
  const files={};
  for(const name of git(['ls-tree','-r','--name-only',revision]).split('\n'))if(name&&!name.startsWith('.instructor/'))files[name]=digest(execFileSync('git',['show',`${revision}:${name}`],{cwd:root,maxBuffer:10*1024*1024}));
  return {revision,files,provenance:'Initial test-repository commit. This protects the starting files; it is not verification of Week 5 physics.'};
 }catch{return null;}
}
export function collect(root){
 const current=sourceFiles(root),baseline=readJson(path.join(root,'.instructor/private/week05-baseline.json'))||publicBaseline(root);
 const baselineHash=baseline?digest(JSON.stringify(baseline)):null;
 const errors=baseline?protectedDiff(baseline.files,current):['Baseline unavailable. Instructor must establish the private Week 5 baseline.'];
 const files=Object.fromEntries(mission.stages.map(s=>[s.file,fs.existsSync(path.join(root,mission.directory,s.file))?fs.readFileSync(path.join(root,mission.directory,s.file),'utf8'):'']));
 // Final decisions and recorded evidence may be added without invalidating the experiment they describe.
 const relevant=Object.entries(current).filter(([p])=>p!==`${mission.directory}/stage12-decision.md`&&!p.startsWith(`${mission.directory}/evidence/`));
 const sourceHash=digest(JSON.stringify(relevant.sort(([a],[b])=>a.localeCompare(b))));
 const report=readJson(path.join(root,'.instructor/private/mission-verification.json'));
 const records=readJson(path.join(root,mission.directory,'evidence/records.json'),[]);
 const data={files,sourceHash,baselineHash,protection:{passed:errors.length===0,errors},implemented:mission.implementationPaths.every(p=>fs.existsSync(path.join(root,p))),report,records:Array.isArray(records)?records:[],baseline:baseline?{week:'week05',revision:baseline.revision,provenance:baseline.provenance}:null};
 return {...data,status:validateMission(data)};
}
export function gitHistoryVerified(root){
 try{
  const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  if(git(['status','--porcelain','--',mission.directory,...mission.implementationPaths]))return false;
  const prediction=git(['log','-1','--format=%H','--',`${mission.directory}/stage07-predictions.md`]);
  const first=git(['log','--reverse','--diff-filter=A','--format=%H','--',...mission.implementationPaths]).split('\n')[0];
  if(!prediction||!first||prediction===first)return false;
  execFileSync('git',['merge-base','--is-ancestor',prediction,first],{cwd:root});return true;
 }catch{return false;}
}
