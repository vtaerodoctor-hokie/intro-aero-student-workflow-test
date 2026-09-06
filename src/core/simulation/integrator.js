function assertState(state) {
  if (!state || typeof state !== "object") throw new TypeError("Integrator state must be an object.");
  Object.entries(state).forEach(([key, value]) => {
    if (!Number.isFinite(value)) throw new TypeError(`State ${key} must be finite.`);
  });
}

function combine(state, derivative, scale) {
  return Object.fromEntries(Object.keys(state).map((key) => {
    const rate = derivative[key] ?? 0;
    if (!Number.isFinite(rate)) throw new TypeError(`Derivative ${key} must be finite.`);
    return [key, state[key] + rate * scale];
  }));
}

export function rk4Step(derivative, state, timeS, stepS) {
  assertState(state);
  if (typeof derivative !== "function") throw new TypeError("RK4 requires a derivative function.");
  if (!Number.isFinite(timeS) || !Number.isFinite(stepS) || stepS <= 0) throw new TypeError("RK4 time and step must be finite, with step > 0.");

  const k1 = derivative(state, timeS);
  const k2 = derivative(combine(state, k1, stepS / 2), timeS + stepS / 2);
  const k3 = derivative(combine(state, k2, stepS / 2), timeS + stepS / 2);
  const k4 = derivative(combine(state, k3, stepS), timeS + stepS);

  const next = {};
  Object.keys(state).forEach((key) => {
    const rate = ((k1[key] ?? 0) + 2 * (k2[key] ?? 0) + 2 * (k3[key] ?? 0) + (k4[key] ?? 0)) / 6;
    next[key] = state[key] + rate * stepS;
  });
  assertState(next);
  return next;
}
