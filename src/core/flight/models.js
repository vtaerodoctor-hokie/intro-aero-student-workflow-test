// Optional preparation adapters. Public builds contain no private reference model.
const packages = import.meta.glob('../../../student-work/flight-test/*.flight.js', { eager:true });
export const adapters = Object.values(packages).map(m=>m.flightAdapter).filter(Boolean);
export function getAdapter(id) {
  const adapter=adapters.find(a=>a.id===id);
  if(!adapter)throw new Error('No compatible flight model is installed in this build. The guided lessons remain available.');
  return adapter;
}
