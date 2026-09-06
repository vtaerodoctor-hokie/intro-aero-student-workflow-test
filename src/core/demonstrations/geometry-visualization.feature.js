function rectangularPlanform(spanM, chordM) {
  return [-spanM / 2, -spanM / 4, 0, spanM / 4, spanM / 2].map((stationM) => ({ x: stationM, y: chordM }));
}

export const feature = {
  contractVersion: 2,
  learningMode: "aircraft",
  topicId: "wing-geometry",
  id: "geometry-visualization",
  title: "Wing geometry",
  category: "Geometry · Core demonstration",
  description: "A visualization-only teaching example: a rectangular-wing assumption connects span and chord to the displayed shape without changing the stored wing-area input.",
  inputKeys: ["wingSpanM", "meanChordM", "wingAreaM2"],

  analyze(aircraft) {
    const rectangularAreaM2 = aircraft.wingSpanM * aircraft.meanChordM;
    const areaDifferenceM2 = rectangularAreaM2 - aircraft.wingAreaM2;
    return {
      results: [
        { label: "Rectangular area from b × c", value: rectangularAreaM2, unit: "m²", precision: 3, emphasis: true },
        { label: "Stored aircraft wing area", value: aircraft.wingAreaM2, unit: "m²", precision: 3 },
        { label: "Difference", value: areaDifferenceM2, unit: "m²", precision: 3, note: "This demo exposes the assumption; it does not silently overwrite aircraft state." },
      ],
      verificationCases: [
        { label: "Positive span and chord produce positive rectangular area", passed: rectangularAreaM2 > 0 },
        { label: "Doubling span doubles rectangular area", passed: 2 * aircraft.wingSpanM * aircraft.meanChordM === 2 * rectangularAreaM2 },
        { label: "Zero chord would produce zero rectangular area", passed: aircraft.wingSpanM * 0 === 0 },
      ],
      decision: {
        question: "Is a rectangular planform assumption consistent with the stored wing area?",
        interpretation: Math.abs(areaDifferenceM2) < 0.01
          ? "The displayed rectangular planform is consistent with the stored area to within 0.01 m². This is a geometry consistency check, not an aerodynamic conclusion."
          : "The rectangular span × chord area differs from the independently stored wing area. Decide which geometry assumption the lesson should use before downstream analysis.",
        status: Math.abs(areaDifferenceM2) < 0.01 ? "pass" : "caution",
      },
      scene: {
        caption: "The core renderer changes the same airplane as span and chord change. Green arrows show the modeled wingspan.",
        overlays: [
          { type: "arrow", origin: { x: 0, y: 0, z: 0.09 }, vector: { x: 0, y: aircraft.wingSpanM / 2, z: 0 }, color: "#dce9ad" },
          { type: "arrow", origin: { x: 0, y: 0, z: 0.09 }, vector: { x: 0, y: -aircraft.wingSpanM / 2, z: 0 }, color: "#dce9ad" },
        ],
      },
      plots: [{
        id: "rectangular-planform",
        title: "Chord across the wingspan",
        xLabel: "Span station, y (m)",
        yLabel: "Chord, c (m)",
        series: [{ label: "Rectangular assumption", color: "#ff5a36", points: rectangularPlanform(aircraft.wingSpanM, aircraft.meanChordM) }],
      }],
    };
  },
};
