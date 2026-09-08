import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
function location(root){return path.resolve(root,execFileSync('git',['rev-parse','--git-path','classroom-connection.json'],{cwd:root,encoding:'utf8'}).trim());}
export function validateClassroomUrl(value){const u=new URL(value);if(u.protocol!=='https:'||!u.hostname.endsWith('.app.github.dev')||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error('Use the instructor’s HTTPS Codespace address.');return u.origin;}
export async function classroom(root,repo,input){const file=location(root);let config;
 if(input){config={url:validateClassroomUrl(input.url),token:String(input.token)};if(!/^[a-f0-9]{64}$/.test(config.token))throw Error('Paste the connection code from your classroom page.');}
 else {if(!fs.existsSync(file))return {connected:false,messages:[]};config=JSON.parse(fs.readFileSync(file,'utf8'));validateClassroomUrl(config.url);}
 const response=await fetch(config.url+'/api/feedback?repo='+encodeURIComponent(repo),{headers:{Authorization:'Bearer '+config.token},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Classroom unavailable or connection expired. Reconnect on the instructor’s classroom page.');const data=await response.json();
 if(input)fs.writeFileSync(file,JSON.stringify(config),{mode:0o600});return {connected:true,messages:data.messages,url:config.url};
}
