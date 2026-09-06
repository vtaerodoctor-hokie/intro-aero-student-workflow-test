export const learningModes = [
  {
    id: "concept",
    number: "01",
    title: "Concept",
    description: "Isolate the governing relationship with very few variables.",
    question: "What does the mathematics mean?",
  },
  {
    id: "aircraft",
    number: "02",
    title: "Aircraft",
    description: "Replace supplied coefficients with geometry, aerodynamics, and component contributions.",
    question: "Where does the behavior come from physically?",
  },
  {
    id: "design",
    number: "03",
    title: "Design",
    description: "Explore requirements, constraints, feasible regions, and engineering tradeoffs.",
    question: "What configuration should we choose?",
  },
];

export function learningModeFor(feature) {
  const requestedMode = feature?.learningMode;
  return learningModes.some((mode) => mode.id === requestedMode) ? requestedMode : "concept";
}
