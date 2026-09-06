import {it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {flightOfflinePlugin} from '../../scripts/flight-offline-plugin.mjs';
it('caches a whole build, preserves transition assets, and refuses partial readiness',async()=>{
 const root=await mkdtemp(join(tmpdir(),'flight-cache-test-'));
 try{
  await mkdir(join(root,'dist/assets'),{recursive:true});await writeFile(join(root,'dist/index.html'),'<main>test</main>');await writeFile(join(root,'dist/assets/test.js'),'test');
  const plugin=flightOfflinePlugin();plugin.configResolved({root,build:{outDir:'dist'}});await plugin.closeBundle();
  const code=await readFile(join(root,'dist/flight-sw.js'),'utf8');
  const listeners={},stores=new Map([['aero-flight-previous',new Map([['https://test.invalid/app/assets/old.js','OLD']])]]);
  const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{
   if(!stores.has(key))stores.set(key,new Map());const store=stores.get(key);
   return {addAll:async urls=>urls.forEach(url=>store.set(url,`CACHED:${url}`)),match:async (r,options)=>typeof r!=='string'&&r.mode==='cors'&&!options?.ignoreVary?undefined:store.get(typeof r==='string'?r:r.url)};
  }};
  runInNewContext(code,{URL,caches,fetch:async()=>{throw Error('NETWORK OFFLINE');},self:{registration:{scope:'https://test.invalid/app/'},clients:{claim:async()=>{}},addEventListener:(type,callback)=>listeners[type]=callback}});
  const lifecycle=async type=>{let work;listeners[type]({waitUntil:p=>work=p});await work;};
  await lifecycle('install');await lifecycle('activate');
  let response;listeners.fetch({request:{method:'GET',url:'https://test.invalid/app/',mode:'navigate'},respondWith:p=>response=p});expect(await response).toBe('CACHED:https://test.invalid/app/index.html');
  listeners.fetch({request:{method:'GET',url:'https://test.invalid/app/assets/old.js',mode:'cors'},respondWith:p=>response=p});expect(await response).toBe('OLD');
  listeners.fetch({request:{method:'GET',url:'https://test.invalid/app/assets/test.js',mode:'cors',destination:'script'},respondWith:p=>response=p});expect(await response).toBe('CACHED:https://test.invalid/app/assets/test.js');
  let ready;let work;const verify=async()=>{listeners.message({data:{type:'verify'},ports:[{postMessage:r=>ready=r.ready}],waitUntil:p=>work=p});await work;return ready;};
  expect(await verify()).toBe(true);
  const current=[...stores.keys()].find(k=>k!=='aero-flight-previous');stores.get(current).delete('https://test.invalid/app/assets/test.js');expect(await verify()).toBe(false);
  expect(code).not.toContain('self.skipWaiting(');
 }finally{await rm(root,{recursive:true,force:true});}
});
