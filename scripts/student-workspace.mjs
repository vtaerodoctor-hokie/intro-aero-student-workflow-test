import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { mission } from '../src/core/missions/manifest.js';
import { digest, collect } from './mission-state.mjs';
const paths=[...mission.stages.map(s=>`${mission.directory}/${s.file}`),...mission.implementationPaths,`${mission.directory}/evidence/records.json`];
export const editablePaths=new Set(paths);
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024}).trim();
export function safeFile(root,name){
 if(!editablePaths.has(name))throw Error('This file is outside the active mission.');
 let current=root;
 for(const part of name.split('/')){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symbolic links cannot be edited.');}
 return current;
}
export function readFile(root,name){const file=safeFile(root,name);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';}
export function saveFile(root,{name,text,expectedHash}){
 if(typeof text!=='string'||Buffer.byteLength(text)>200000)throw Error('Answer exceeds the 200 KB file limit.');
 const file=safeFile(root,name),current=readFile(root,name);
 if(digest(current)!==expectedHash)throw Error('This file changed in another window. Reload before saving; your draft is still on this device.');
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return {hash:digest(text)};
}
export function repository(root){
 const remote=git(root,['remote','get-url','--push','origin']);
 const match=remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
 if(!match)throw Error('Origin must be a GitHub repository without embedded credentials.');
 const [,owner,repo]=match;
 if(owner.toLowerCase()==='chula-aero-engineering'||repo.toLowerCase().includes('instructor'))throw Error('Saving is disabled in instructor and shared course repositories. Open a Codespace from your personal fork.');
 return {owner,repo,url:`https://github.com/${owner}/${repo}`,branch:git(root,['branch','--show-current'])};
}
export function checkpoint(root,{name},run=git){
 safeFile(root,name);const info=repository(root);if(!info.branch)throw Error('Select a branch before saving a checkpoint.');
 const staged=run(root,['diff','--cached','--name-only']);if(staged)throw Error('Other changes are staged. Review them in source control before creating an app checkpoint.');
 run(root,['add','--',name]);
 if(run(root,['diff','--cached','--name-only']))run(root,['commit','-m',`Mission checkpoint: ${path.basename(name)}`]);
 run(root,['push','origin',`HEAD:refs/heads/${info.branch}`]);
 const revision=run(root,['rev-parse','HEAD']);return {revision,url:`${info.url}/commit/${revision}`};
}
export function studentWorkspacePlugin(){let root,busy=false;return {name:'student-workspace',configResolved(c){root=c.root;},configureServer(server){
 server.middlewares.use('/api/student',async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const reply=(code,value)=>{res.statusCode=code;res.end(JSON.stringify(value));};
  if(process.env.LAB_STUDENT_WORKSPACE!=='1')return reply(403,{error:'Open this lab using npm run student. Student saving is disabled in this preview.'});
  try{
   const info=repository(root);
   if(req.method==='GET'&&req.url==='/state')return reply(200,{repository:info,files:Object.fromEntries(paths.map(p=>[p,{text:readFile(root,p),hash:digest(readFile(root,p))}])),mission:collect(root)});
   const origin=req.headers.origin;
   if(req.method!=='POST'||!origin||new URL(origin).host!==req.headers.host||req.headers['x-student-workspace']!=='1')return reply(403,{error:'Only requests from this lab window can save work.'});
   if(busy)return reply(409,{error:'A save is already in progress. Please retry.'});
   busy=true;
   try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>220000)throw Error('Request too large.');}const input=JSON.parse(body);
    if(req.url==='/verify'){
     const run=promisify(execFile);const results=[];
     for(const command of ['test','build']){try{const {stdout,stderr}=await run('npm',['run',command],{cwd:root,timeout:120000,maxBuffer:2*1024*1024});results.push({command,passed:true,output:(stdout+stderr).slice(-16000)});}catch(e){results.push({command,passed:false,output:((e.stdout||'')+(e.stderr||'')||e.message).slice(-16000)});}}
     return reply(200,{results,notice:'Local checks only. Independent instructor verification is not installed in this test shell.'});
    }
    if(req.url==='/save')return reply(200,saveFile(root,input));
    if(req.url==='/checkpoint')return reply(200,checkpoint(root,input));
    return reply(404,{error:'Unknown action.'});
   }finally{busy=false;}
  }catch(error){reply(400,{error:error.message.split('\n')[0]});}
 });
 }};}
