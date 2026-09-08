import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
if(!process.env.CODESPACE_NAME){console.error('Open a Codespace on the instructor-owned test repository, then run npm run instructor:setup there.');process.exit(1);}
const domain=process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN||'app.github.dev';
if(domain!=='app.github.dev')throw Error('This pilot supports github.dev forwarded ports only.');
const classroom=`https://${process.env.CODESPACE_NAME}-5180.${domain}`,setup=`https://${process.env.CODESPACE_NAME}-5181.${domain}`;
const owner=execFileSync('gh',['api','user','--jq','.login'],{encoding:'utf8'}).trim();
const state=randomBytes(32).toString('hex'),directory=path.join(root,'.instructor/private/onboarding'),file=path.join(directory,'config.json');
if(fs.existsSync(file)){console.log('Classroom connection is already configured. Run npm run instructor.');process.exit(0);}
const manifest={name:`Aircraft Classroom ${owner} ${Date.now().toString(36)}`,url:classroom,redirect_url:setup+'/registered',callback_urls:[classroom+'/callback'],setup_url:classroom,description:'Read submitted aircraft engineering work and return instructor feedback during class.',public:true,default_permissions:{contents:'read',metadata:'read'},default_events:['push'],request_oauth_on_install:true,hook_attributes:{url:classroom+'/webhook',active:true}};
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');let finished=false;
http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');const url=new URL(req.url,setup);
 if(url.pathname==='/registered'){
  if(finished||url.searchParams.get('state')!==state||!url.searchParams.get('code')){res.writeHead(403);return res.end('Setup expired. Restart the setup command.');}
  try{const code=url.searchParams.get('code');if(!/^[a-zA-Z0-9]+$/.test(code))throw Error('Invalid setup code.');const r=await fetch(`https://api.github.com/app-manifests/${code}/conversions`,{method:'POST',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('GitHub could not complete the registration. Restart setup.');const app=await r.json();if(!app.client_id||!app.client_secret||!app.webhook_secret)throw Error('GitHub returned incomplete configuration.');if(app.owner?.login!==owner)throw Error('The App was created on a different account. Use the instructor account for setup.');
   fs.mkdirSync(directory,{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify({INSTRUCTOR_URL:classroom,INSTRUCTOR_GITHUB_LOGIN:owner,INSTRUCTOR_SECRET:randomBytes(48).toString('hex'),GITHUB_APP_CLIENT_ID:app.client_id,GITHUB_APP_CLIENT_SECRET:app.client_secret,GITHUB_WEBHOOK_SECRET:app.webhook_secret,GITHUB_APP_INSTALL_URL:app.html_url+'/installations/new'},null,2),{mode:0o600,flag:'wx'});finished=true;
   return res.end(`<h1>Classroom connection created</h1><p>Credentials were saved privately in this instructor Codespace.</p><ol><li>Run <code>npm run instructor</code> in another terminal.</li><li>In Ports, forward <b>5180</b> and make that port public. The classroom service requires GitHub sign-in; keep port 5173 private.</li><li>Open <a href="${classroom}">your instructor dashboard</a>.</li></ol><p>Students install the read-only connection for their course fork only, then enroll through this dashboard address.</p>`);
  }catch(e){res.statusCode=400;return res.end(escape(e.message));}
 }
 if(url.pathname!=='/'){res.statusCode=404;return res.end('Not found');}
 res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connect your classroom</title><style>body{max-width:680px;margin:60px auto;padding:25px;font:18px system-ui;line-height:1.6;color:#173b40}button{font:inherit;padding:15px;background:#d1ecdf;border:1px solid #27614c;border-radius:8px}</style><h1>Connect your classroom to GitHub</h1><p>This lets the instructor dashboard read submitted work from students who enroll. It cannot edit their repositories. It uses no AI service.</p><p>Continue signed in as <b>${escape(owner)}</b>. GitHub will ask you to approve creating the connection. Students later choose their own course fork when installing it.</p><form action="https://github.com/settings/apps/new?state=${state}" method="post"><input type="hidden" name="manifest" value="${escape(JSON.stringify(manifest))}"><button>Review read-only connection on GitHub</button></form><p>Keep this setup port private. Credentials stay in this instructor Codespace and are excluded from Git.</p>`);
}).listen(5181,'0.0.0.0',()=>console.log(`Open the private setup port 5181: ${setup}`));
