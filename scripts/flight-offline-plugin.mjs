import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
export function flightOfflinePlugin(){
  let config, failed=false;
  return {name:'flight-offline-cache',apply:'build',configResolved(c){config=c;},buildEnd(error){failed=Boolean(error);},async closeBundle(){
    if(failed)return;
    const root=resolve(config.root,config.build.outDir);
    async function walk(path){const all=await readdir(path,{withFileTypes:true});const lists=await Promise.all(all.map(e=>e.isDirectory()?walk(resolve(path,e.name)):[resolve(path,e.name)]));return lists.flat();}
    const files=(await walk(root)).filter(p=>!p.endsWith('flight-sw.js')).sort();
    const hash=createHash('sha256');hash.update('flight-cache-protocol-v3-static-vary');for(const file of files)hash.update(await readFile(file));
    const names=files.map(p=>relative(root,p).split('\\').join('/'));
    const worker=`const FILES=${JSON.stringify(names)};\nconst CACHE='aero-flight-'+${JSON.stringify(hash.digest('hex').slice(0,16))};
const EVENTS=[];
const url=p=>new URL(p,self.registration.scope).href;
self.addEventListener('install',e=>e.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(url));}catch(error){await caches.delete(CACHE);throw error;}})()));
// No skipWaiting: a new version never replaces the worker in an open flight session.
self.addEventListener('activate',e=>e.waitUntil((async()=>{const older=(await caches.keys()).filter(key=>key.startsWith('aero-flight-')&&key!==CACHE);for(const key of older.slice(0,-2))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;const info={url:e.request.url,mode:e.request.mode,destination:e.request.destination};EVENTS.push(info);if(EVENTS.length>30)EVENTS.shift();e.respondWith((async()=>{const cache=await caches.open(CACHE);const target=e.request.mode==='navigate'?url('index.html'):e.request;const current=await cache.match(target,{ignoreVary:true});info.hit=Boolean(current);if(current)return current;if(e.request.mode!=='navigate'){for(const key of await caches.keys()){if(key.startsWith('aero-flight-')){const previous=await (await caches.open(key)).match(e.request,{ignoreVary:true});if(previous)return previous;}}}return fetch(e.request);})());});
self.addEventListener('message',e=>{if(e.data?.type==='diagnostics')e.ports[0]?.postMessage(EVENTS);if(e.data?.type==='verify')e.waitUntil((async()=>{const cache=await caches.open(CACHE);const present=await Promise.all(FILES.map(p=>cache.match(url(p))));e.ports[0]?.postMessage({ready:present.every(Boolean)});})());});`;
    await writeFile(resolve(root,'flight-sw.js'),worker);
  }};
}
