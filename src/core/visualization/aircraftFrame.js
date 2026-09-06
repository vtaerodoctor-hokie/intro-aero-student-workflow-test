function finiteVector(vector, label) {
  const value = { x: vector?.x ?? 0, y: vector?.y ?? 0, z: vector?.z ?? 0 };
  if (![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new TypeError(`${label} must contain finite x, y, and z values.`);
  }
  return value;
}

// Course body frame: +x forward, +y right wing, +z down.
// Three.js scene geometry uses +z up, so polar-vector z is reflected.
export function bodyVectorToScene(vector) {
  const value = finiteVector(vector, "Body vector");
  return { x: value.x, y: value.y, z: value.z === 0 ? 0 : -value.z };
}

// Angular velocity is an axial vector. Under the z reflection, roll and
// pitch change sign while yaw retains its sign.
export function bodyAttitudeToScene(attitude = {}) {
  const rollRad = attitude.rollRad ?? 0;
  const pitchRad = attitude.pitchRad ?? 0;
  const yawRad = attitude.yawRad ?? 0;
  if (![rollRad, pitchRad, yawRad].every(Number.isFinite)) {
    throw new TypeError("Body attitude must contain finite angles.");
  }
  return { rollRad: -rollRad, pitchRad: -pitchRad, yawRad };
}

export const aircraftCameraPresets = Object.freeze([
  { id: "iso", label: "Iso", directionLabel: "isometric", positionBody: { x: 1, y: -1.1, z: -0.65 }, upBody: { x: 0, y: 0, z: -1 } },
  { id: "side-negative-y", label: "Side −Y", directionLabel: "looking in the −y direction", positionBody: { x: 0, y: 1, z: 0 }, upBody: { x: 0, y: 0, z: -1 } },
  { id: "side-positive-y", label: "Side +Y", directionLabel: "looking in the +y direction", positionBody: { x: 0, y: -1, z: 0 }, upBody: { x: 0, y: 0, z: -1 } },
  { id: "top", label: "Top +Z", directionLabel: "looking in the +z direction", positionBody: { x: 0, y: 0, z: -1 }, upBody: { x: 1, y: 0, z: 0 } },
  { id: "bottom", label: "Bottom −Z", directionLabel: "looking in the −z direction", positionBody: { x: 0, y: 0, z: 1 }, upBody: { x: 1, y: 0, z: 0 } },
  { id: "front", label: "Front −X", directionLabel: "looking in the −x direction", positionBody: { x: 1, y: 0, z: 0 }, upBody: { x: 0, y: 0, z: -1 } },
  { id: "rear", label: "Rear +X", directionLabel: "looking in the +x direction", positionBody: { x: -1, y: 0, z: 0 }, upBody: { x: 0, y: 0, z: -1 } },
]);

export function cameraPresetToScene(presetId, distance) {
  const preset = aircraftCameraPresets.find(({ id }) => id === presetId);
  if (!preset) throw new RangeError(`Unknown aircraft camera preset: ${presetId}`);
  if (!Number.isFinite(distance) || distance <= 0) throw new RangeError("Camera distance must be positive and finite.");
  const magnitude = Math.hypot(preset.positionBody.x, preset.positionBody.y, preset.positionBody.z);
  const position = bodyVectorToScene({
    x: preset.positionBody.x * distance / magnitude,
    y: preset.positionBody.y * distance / magnitude,
    z: preset.positionBody.z * distance / magnitude,
  });
  return { position, up: bodyVectorToScene(preset.upBody) };
}
