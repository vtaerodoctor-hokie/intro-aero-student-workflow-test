import { flightParameters, activeParameter } from './parameterRoles.js';

export const settingSections = [
  { id: 'next', label: 'Next flight configuration' },
  { id: 'all', label: 'All parameters & their roles' },
  { id: 'setup', label: 'Test setup' },
];

const categories = [
  ['Mass & balance', ['massKg', 'payloadKg', 'cgM', 'airframeCgM', 'payloadPositionM']],
  ['Wing & tail geometry', ['wingSpanM', 'wingAreaM2', 'meanChordM', 'wingForceXM', 'tailAreaM2', 'tailArmM', 'tailPositionM', 'neutralPointM']],
  ['Lift, pitch & elevator', ['cl', 'angleOfAttackDeg', 'cm0', 'cmAlphaPerRad', 'cmQPerRad', 'pitchInertiaKgM2', 'elevatorDeflectionDeg', 'elevatorEffectiveness', 'stickFreeFactor']],
  ['Roll & yaw', ['clBetaPerRad', 'cnBetaPerRad', 'rollInertiaKgM2', 'yawInertiaKgM2']],
  ['Flight condition & propulsion', ['speedMps', 'densityKgM3', 'thrustN', 'thrustLineZM']],
  ['Initial disturbances', ['disturbanceAlphaDeg', 'sideslipDeg', 'pitchRateRadS', 'rollRateRadS', 'yawRateRadS', 'bankAngleDeg']],
  ['Comparison criteria', ['minimumStaticMargin', 'forwardCgLimitM', 'aftCgLimitM']],
  ['Lesson demonstrations only', ['externalForceN', 'externalForceXM', 'wingLiftN', 'tailForceN', 'initialPayloadPositionM', 'missionPayloadPositionM', 'dutchRollRealPartPerS', 'dutchRollImagPartRadS']],
  ['Run duration', ['simulationDurationS']],
];
const definitions = new Map(flightParameters.map(d => [d.key, d]));
export const groupedFlightSettings = categories.map(([label, keys]) => ({
  label, settings: keys.map(key => ({ ...definitions.get(key), source: 'aircraft' })),
}));
const setupSettings = [
  { ...definitions.get('simulationDurationS'), source: 'aircraft', min: .02, max: 120 },
  { key: 'altitude', label: 'Starting altitude', unit: 'm', min: 10, max: 2000, step: 10, source: 'options', help: 'Height above the ground at launch. The aircraft starts airborne.' },
  { key: 'pulse', label: 'Pulse amplitude', unit: 'deg', min: -5, max: 5, step: .25, source: 'options', help: 'Elevator or rudder pulse from 1.0 to 1.5 seconds. Zero means no pulse.' },
  { key: 'speedKick', label: 'Initial speed change', unit: 'm/s', min: -5, max: 5, step: .1, source: 'options', help: 'Speed perturbation at launch in the speed / height exchange test.' },
];

export function settingIsActive(definition, options) {
  if (definition.key === 'pulse') return ['elevator', 'rudder'].includes(options.maneuver);
  if (definition.key === 'speedKick') return options.maneuver === 'phugoid';
  return definition.source === 'options' || activeParameter(definition, options);
}

export function settingGroups(section, options) {
  if (section === 'setup') return [{ label: 'Run settings', settings: setupSettings }];
  if (section === 'all') return groupedFlightSettings;
  const quick = new Set(['speedMps', 'cgM', 'payloadKg', 'payloadPositionM', 'cmAlphaPerRad', 'cmQPerRad', 'simulationDurationS']);
  const disturbanceKeys = {
    pitch: ['disturbanceAlphaDeg', 'pitchRateRadS'],
    elevator: ['elevatorDeflectionDeg', 'elevatorEffectiveness'],
    rudder: ['sideslipDeg', 'yawRateRadS', 'clBetaPerRad', 'cnBetaPerRad'],
    'short-period': ['pitchRateRadS', 'pitchInertiaKgM2'],
    roll: ['rollRateRadS', 'rollInertiaKgM2'],
    spiral: ['bankAngleDeg', 'clBetaPerRad', 'cnBetaPerRad'],
  };
  (disturbanceKeys[options.maneuver] || []).forEach(key => quick.add(key));
  return groupedFlightSettings.map(group => ({ ...group, settings: group.settings.filter(d => quick.has(d.key) && settingIsActive(d, options)) })).filter(group => group.settings.length);
}

export function inactiveSettingHelp(definition, options) {
  const key = definition.key;
  if (definition.role === 'lesson only') return 'This setting belongs to Explore & learn and is not used by the current flight model. Its value is shown here for reference.';
  if (['neutralPointM', 'cmAlphaPerRad', 'tailPositionM'].includes(key)) return 'Calculated from geometry in the current mode. Choose Resolve aircraft → Supplied coefficients to edit and use the supplied value.';
  if (['wingForceXM', 'tailArmM'].includes(key)) return 'Choose Resolve aircraft → Linked CG & tail geometry to use this setting.';
  if (key === 'cgM') return 'CG is currently calculated from loading. Turn off Resolve CG from payload to use a direct CG location.';
  if (['airframeCgM', 'payloadPositionM'].includes(key)) return 'Turn on Resolve CG from payload to use this setting.';
  if (key === 'stickFreeFactor') return 'Turn on Free elevator approximation to use this setting.';
  if (key === 'disturbanceAlphaDeg') return 'Choose Pitch disturbance & release to use this initial disturbance.';
  if (key === 'sideslipDeg') return 'Choose Rudder pulse to use this initial sideslip.';
  if (key === 'pulse') return 'Choose Elevator pulse or Rudder pulse to use this setting.';
  if (key === 'speedKick') return 'Choose Speed / height exchange to use this setting.';
  return `Not used by the selected ${options.maneuver} test.`;
}

export function editorDefinition(definition) {
  if (definition.key === 'simulationDurationS') return { ...definition, min: .02, max: 120 };
  if (definition.key.toLowerCase().includes('cg') || definition.key.includes('Position') || definition.key === 'neutralPointM') return { ...definition, min: undefined };
  return definition;
}
