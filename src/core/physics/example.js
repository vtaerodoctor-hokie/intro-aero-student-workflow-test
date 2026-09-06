// Inputs: total mass in kg. Output: weight in N. Assumes g = 9.81 m/s².
export function calculateWeight(totalMassKg) {
  if (!Number.isFinite(totalMassKg) || totalMassKg < 0) {
    throw new RangeError("Total mass must be a non-negative number.");
  }

  return totalMassKg * 9.81;
}
