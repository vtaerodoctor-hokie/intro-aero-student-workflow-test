export async function offlineStatus() {
  if(!import.meta.env.PROD)return 'Offline caching is available in the production preview.';
  if(!('serviceWorker' in navigator))return 'Offline caching is not supported in this browser.';
  const registration=await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}flight-sw.js`,{scope:import.meta.env.BASE_URL});
  await navigator.serviceWorker.ready;
  const worker=registration.active;
  if(!worker)return 'Reload once to finish offline setup.';
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();const timeout=setTimeout(()=>reject(new Error('Offline cache verification timed out.')),15000);
    channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data.ready?'Ready offline · application and aircraft cached':'Offline cache incomplete · reconnect and reload');};
    worker.postMessage({type:'verify'},[channel.port2]);
  });
}
