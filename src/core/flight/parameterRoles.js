import { parameterDefinitions } from '../data/aircraft.js';
const roles = {
  massKg:['configuration','Airframe mass; payload is added once.'],payloadKg:['configuration','Payload mass; always contributes to total mass.'],
  speedMps:['configuration','Trim airspeed; live airspeed is a simulated state.'],densityKgM3:['configuration','Air density at the trim condition.'],
  wingSpanM:['configuration','Scales lateral moments and rate normalization.'],wingAreaM2:['configuration','Reference area for forces and moments.'],meanChordM:['configuration','Reference chord for pitch moments and rate normalization.'],
  cl:['configuration','Lift coefficient at the supplied reference angle of attack, before elevator trim.'],
  cgM:['configuration','Direct CG unless payload-resolved CG is selected.'],neutralPointM:['conditional','Derived from geometry in linked mode; supplied for margin reporting in coefficient mode.'],
  cm0:['configuration','Zero-angle pitching-moment coefficient; elevator and thrust contributions are added separately.'],cmAlphaPerRad:['conditional','Supplied in coefficient mode; derived from geometry and CG in linked mode.'],
  angleOfAttackDeg:['configuration','Reference angle for the supplied lift coefficient. Actual trim angle is solved.'],disturbanceAlphaDeg:['initial condition','Angle-of-attack perturbation in the pitch-release test only.'],
  airframeCgM:['conditional','Used when payload-resolved CG is selected.'],payloadPositionM:['conditional','Used when payload-resolved CG is selected.'],
  initialPayloadPositionM:['lesson only','Use the Loading lesson to select the initial station, then send that configuration to Flight Test.'],missionPayloadPositionM:['lesson only','Use the mission lesson to compare loading stations; no payload moves in flight.'],
  forwardCgLimitM:['criterion','Reported CG limit; does not create a force.'],aftCgLimitM:['criterion','Reported CG limit; does not create a force.'],
  dutchRollRealPartPerS:['lesson only','An isolated modal input in Explore & learn. Coupled flight uses aerodynamic derivatives.'],dutchRollImagPartRadS:['lesson only','An isolated modal input in Explore & learn. Coupled flight uses aerodynamic derivatives.'],
  pitchInertiaKgM2:['configuration','Pitch inertia supplied about the loaded CG; it is not automatically recomputed.'],rollInertiaKgM2:['configuration','Roll inertia supplied about the loaded CG.'],yawInertiaKgM2:['configuration','Yaw inertia supplied about the loaded CG; cross-inertia is neglected.'],
  externalForceN:['lesson only','A force-arm bench experiment; no external force is applied in free flight.'],externalForceXM:['lesson only','Force-arm bench experiment station.'],
  wingLiftN:['lesson only','Prescribed bench force; flight lift follows the aerodynamic model.'],wingForceXM:['conditional','Wing aerodynamic-center station used in linked geometry.'],tailForceN:['lesson only','Prescribed bench force; flight tail effect follows the aerodynamic model.'],tailPositionM:['conditional','Derived from wing station and tail arm in linked mode; supplied for the elevator arm in coefficient mode.'],
  thrustN:['configuration','Available full-throttle thrust; trim throttle is solved from drag.'],thrustLineZM:['configuration','Thrust moment uses M_y = z T with +z down.'],tailAreaM2:['configuration','Sets tail lift and elevator effectiveness.'],tailArmM:['conditional','Tail location and neutral point in linked geometry.'],
  elevatorDeflectionDeg:['control offset','Additional elevator offset relative to solved trim while a run is in progress. Zero preserves trim.'],elevatorEffectiveness:['configuration','Sets elevator force and moment effectiveness.'],stickFreeFactor:['conditional','Fixed/free blend, used only with Free elevator selected; 1 is fixed retention.'],
  sideslipDeg:['initial condition','Sideslip disturbance in the rudder test only.'],clBetaPerRad:['configuration','Sideslip-induced rolling moment derivative.'],cnBetaPerRad:['configuration','Sideslip-induced yawing moment derivative.'],cmQPerRad:['configuration','Pitch damping derivative, using q c/(2V).'],
  rollRateRadS:['initial condition','Initial roll rate in every run, including roll release.'],pitchRateRadS:['initial condition','Initial pitch rate in every run, including short-period excitation.'],yawRateRadS:['initial condition','Initial yaw rate in every run.'],bankAngleDeg:['initial condition','Initial bank in every run, including bank release.'],
  minimumStaticMargin:['criterion','Comparison threshold only; no stabilizing force is invented.'],simulationDurationS:['run setting','Run duration, limited to 120 s.'],
};
export const flightParameters=parameterDefinitions.map(d=>({...d,role:roles[d.key]?.[0]||'unmapped',help:roles[d.key]?.[1]||'Not mapped to flight.'}));
export function activeParameter(d, options){
  if(d.role==='lesson only')return false;
  if(['cgM'].includes(d.key))return !options.loading;
  if(['airframeCgM','payloadPositionM'].includes(d.key))return options.loading;
  if(['neutralPointM','cmAlphaPerRad','tailPositionM'].includes(d.key))return options.linkage==='coefficients';
  if(['wingForceXM','tailArmM'].includes(d.key))return options.linkage==='linked';
  if(d.key==='stickFreeFactor')return options.free;
  if(d.key==='disturbanceAlphaDeg')return options.maneuver==='pitch';
  if(d.key==='sideslipDeg')return options.maneuver==='rudder';
  return true;
}
