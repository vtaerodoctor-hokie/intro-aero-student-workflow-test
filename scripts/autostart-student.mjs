import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
const root=new URL('../',import.meta.url);
// The onboarding release includes its own protected-file inventory.
async function ready(){try{return (await fetch('http://127.0.0.1:5173/',{signal:AbortSignal.timeout(1500)})).ok;}catch{return false;}}
if(await ready()){console.log('Aircraft lab is already listening on port 5173.');process.exit(0);}
const log=openSync('/tmp/aircraft-lab.log','a');
const child=spawn(process.execPath,['scripts/start-student.mjs'],{cwd:root,detached:true,stdio:['ignore',log,log]});
child.unref();closeSync(log);
for(let attempt=0;attempt<30;attempt++){if(await ready()){console.log('Aircraft lab is ready. Open port 5173 in the Ports panel.');process.exit(0);}await setTimeout(1000);}
console.error('Aircraft lab did not become ready. Read /tmp/aircraft-lab.log, or run npm run student in a terminal.');process.exit(1);
