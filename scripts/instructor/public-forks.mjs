import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
export const templateRepo='vtaerodoctor-hokie/intro-aero-student-workflow-test';
export async function publicGithub(endpoint){
 // gh uses the instructor's existing GitHub login; no App or student authorization.
 // This process reads JSON only. It never clones or executes student repositories.
 try{const {stdout}=await run('gh',['api',endpoint,'--hostname','github.com'],{timeout:20000,maxBuffer:4*1024*1024});return JSON.parse(stdout);}catch(e){throw Error('GitHub read failed. Check gh auth status and the account rate limit. '+(String(e.stderr||'').includes('404')?'404: file not present.':''));}
}
export async function discoverPublicForks(){const found=[];for(let page=1;page<=10;page++){const rows=await publicGithub(`/repos/${templateRepo}/forks?per_page=100&page=${page}&sort=newest`);for(const r of rows)if(!r.private)found.push({repo:r.full_name,login:r.owner.login});if(rows.length<100)break;}return found;}
