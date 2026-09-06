import { calculateWeight } from "../physics/example.js";

export const feature = {
  contractVersion: 1,
  learningMode: "concept",
  topicId: "forces",
  id: "weight-demo",
  title: "Weight demonstration",
  description: "A deliberately small example showing the separation between an engineering equation, structured results, verification, and interpretation.",

  analyze(aircraft) {
    const totalMassKg = aircraft.massKg + aircraft.payloadKg;
    const weightN = calculateWeight(totalMassKg);

    return {
      results: [
        {
          label: "Total mass",
          value: totalMassKg,
          unit: "kg",
          precision: 2,
          note: "Aircraft mass + payload mass",
        },
        {
          label: "Calculated weight",
          value: weightN,
          unit: "N",
          precision: 2,
          emphasis: true,
          note: "Using g = 9.81 m/s²",
        },
      ],
      verificationCases: [
        { label: "1.00 kg produces 9.81 N", passed: calculateWeight(1) === 9.81 },
        { label: "Zero mass produces zero weight", passed: calculateWeight(0) === 0 },
        { label: "Doubling mass doubles weight", passed: calculateWeight(2) === 2 * calculateWeight(1) },
      ],
      decision: {
        question: "What vertical force must steady, level flight balance?",
        interpretation: `At this design state, an aerodynamic model would need to predict about ${weightN.toFixed(2)} N of lift to balance weight.`,
        status: "neutral",
      },
    };
  },
};
