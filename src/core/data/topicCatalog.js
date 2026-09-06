const capability = (id, version = 1) => ({ id, version });

const stabilityModules = [
  {
    id: "force-moment", stage: 1, learningMode: "concept",
    title: "External force and pitch moment",
    description: "Connect force magnitude, application point, and CG location to a net pitching moment.",
    parameterKeys: ["externalForceN", "externalForceXM", "cgM", "pitchInertiaKgM2"],
    requiresCapabilities: [], providesCapabilities: [capability("loads.pitch.external-moment")],
  },
  {
    id: "static-restoring-moment", stage: 2, learningMode: "concept",
    title: "Static restoring tendency",
    description: "Compare stable, neutral, and unstable responses produced by aerodynamic restoring tendency.",
    parameterKeys: ["densityKgM3", "speedMps", "wingAreaM2", "meanChordM", "cmAlphaPerRad", "disturbanceAlphaDeg"],
    requiresCapabilities: [capability("loads.pitch.external-moment")], providesCapabilities: [capability("aero.pitch.static-restoring")],
  },
  {
    id: "moment-contributions", stage: 3, learningMode: "aircraft",
    title: "Longitudinal moment contributions",
    description: "Assemble wing, tail, thrust, and external contributions about the shared CG.",
    parameterKeys: ["wingLiftN", "wingForceXM", "tailForceN", "tailPositionM", "thrustN", "thrustLineZM", "cgM"],
    requiresCapabilities: [capability("loads.pitch.external-moment"), capability("aero.pitch.static-restoring")], providesCapabilities: [capability("loads.pitch.component-sum")],
  },
  {
    id: "trim-response", stage: 4, learningMode: "concept",
    title: "Live Cm–alpha relationship and trim",
    description: "Relate angle of attack to pitching-moment coefficient, trim, and disturbance tendency.",
    parameterKeys: ["cm0", "cmAlphaPerRad", "angleOfAttackDeg", "disturbanceAlphaDeg"],
    requiresCapabilities: [capability("loads.pitch.component-sum")], providesCapabilities: [capability("stability.pitch.cm-alpha")],
  },
  {
    id: "static-margin", stage: 5, learningMode: "concept",
    title: "CG, neutral point, and static margin",
    description: "Connect geometry-derived static margin to the aircraft pitching-moment tendency.",
    parameterKeys: ["cgM", "neutralPointM", "meanChordM"],
    requiresCapabilities: [capability("stability.pitch.cm-alpha")], providesCapabilities: [capability("stability.longitudinal.static-margin")],
  },
  {
    id: "tail-elevator-contribution", stage: 6, learningMode: "aircraft",
    title: "Tail contribution and elevator authority",
    description: "Connect horizontal-tail geometry and elevator deflection to stability and pitch control.",
    parameterKeys: ["tailAreaM2", "tailArmM", "wingAreaM2", "meanChordM", "elevatorDeflectionDeg", "elevatorEffectiveness"],
    requiresCapabilities: [capability("stability.longitudinal.static-margin")], providesCapabilities: [capability("control.pitch.tail-elevator")],
  },
  {
    id: "stick-free-effect", stage: 7, learningMode: "aircraft",
    title: "Stick-fixed and stick-free response",
    description: "Represent how elevator freedom changes the effective tail and control contribution.",
    parameterKeys: ["elevatorEffectiveness", "stickFreeFactor"],
    requiresCapabilities: [capability("control.pitch.tail-elevator")], providesCapabilities: [capability("control.pitch.stick-free")],
  },
  {
    id: "cg-loading", stage: 8, learningMode: "aircraft",
    title: "Payload loading and loaded CG",
    description: "Propagate payload position through CG, static margin, pitching moment, and response.",
    parameterKeys: ["massKg", "airframeCgM", "payloadKg", "payloadPositionM", "neutralPointM", "meanChordM"],
    requiresCapabilities: [capability("control.pitch.stick-free")], providesCapabilities: [capability("mass.cg.loaded")],
  },
  {
    id: "lateral-static-stability", stage: 9, learningMode: "concept",
    title: "Lateral-directional static response",
    description: "Connect sideslip to rolling and yawing moment tendencies.",
    parameterKeys: ["sideslipDeg", "clBetaPerRad", "cnBetaPerRad", "wingSpanM", "wingAreaM2", "speedMps", "densityKgM3"],
    requiresCapabilities: [capability("mass.cg.loaded")], providesCapabilities: [capability("stability.lateral.static")],
  },
  {
    id: "pitch-dynamic-response", stage: 10, learningMode: "concept",
    title: "Pitch dynamics and damping",
    description: "Connect net pitch moment, inertia, and pitch-rate damping to response histories.",
    parameterKeys: ["pitchInertiaKgM2", "cmQPerRad", "pitchRateRadS", "simulationDurationS"],
    requiresCapabilities: [capability("loads.pitch.component-sum")], providesCapabilities: [capability("dynamics.longitudinal.pitch")],
  },
  {
    id: "longitudinal-modes", stage: 11, learningMode: "concept",
    title: "Short-period and phugoid modes",
    description: "Build and interpret separately validated reduced-order longitudinal state models.",
    parameterKeys: ["speedMps", "angleOfAttackDeg", "pitchRateRadS", "simulationDurationS"],
    requiresCapabilities: [capability("dynamics.longitudinal.pitch")], providesCapabilities: [capability("dynamics.longitudinal.modes")],
  },
  {
    id: "dynamic-mode", stage: 12, learningMode: "concept",
    title: "Lateral-directional modes",
    description: "Interpret roll subsidence, Dutch roll, and spiral behavior using reduced-order states.",
    parameterKeys: ["dutchRollRealPartPerS", "dutchRollImagPartRadS", "rollRateRadS", "yawRateRadS", "bankAngleDeg", "simulationDurationS"],
    requiresCapabilities: [capability("stability.lateral.static")], providesCapabilities: [capability("dynamics.lateral.modes")],
  },
  {
    id: "stability-trade-study", stage: 13, learningMode: "design",
    title: "Stability, control, and handling trade study",
    description: "Evaluate configuration changes against stability, authority, response, and mission requirements.",
    parameterKeys: ["cgM", "tailAreaM2", "tailArmM", "elevatorEffectiveness", "minimumStaticMargin"],
    requiresCapabilities: [capability("dynamics.longitudinal.modes"), capability("dynamics.lateral.modes")], providesCapabilities: [capability("design.stability-control.trade")],
  },
  {
    id: "mission-loading", stage: 14, learningMode: "design",
    title: "Evidence and model defensibility",
    description: "Record configuration, loading, response evidence, assumptions, and model limitations for a qualified decision.",
    parameterKeys: ["initialPayloadPositionM", "missionPayloadPositionM", "forwardCgLimitM", "aftCgLimitM", "minimumStaticMargin"],
    requiresCapabilities: [capability("design.stability-control.trade")], providesCapabilities: [capability("evidence.model-report")],
  },
];

export const topicCatalog = [
  { id: "foundations", title: "Foundations", shortTitle: "Foundations", description: "Installed introductory and uncatalogued legacy analyses.", modules: [] },
  { id: "stability", title: "Stability", shortTitle: "Stability", description: "A cumulative force-to-response stability sequence.", modules: stabilityModules },
  { id: "control", title: "Control", shortTitle: "Control", description: "Control-effectiveness and authority modules can be added without changing the shell.", modules: [] },
  { id: "lift", title: "Lift", shortTitle: "Lift", description: "Lift-generation analyses for the persistent aircraft.", modules: [{ id: "lift", title: "Lift analysis", description: "Compare modeled lift and weight.", learningMode: "concept", parameterKeys: ["massKg", "payloadKg", "speedMps", "densityKgM3", "wingAreaM2", "cl"], requiresCapabilities: [], providesCapabilities: [] }] },
  { id: "drag", title: "Drag", shortTitle: "Drag", description: "Future drag buildup and performance modules.", modules: [] },
  { id: "performance", title: "Performance", shortTitle: "Performance", description: "Future aircraft performance and mission modules.", modules: [] },
];

export const plannedModuleSlots = topicCatalog.flatMap((topic) => topic.modules.map((module) => ({
  ...module,
  topicId: topic.id,
  inputKeys: module.parameterKeys,
  category: `${topic.title} · Planned student module`,
  planned: true,
})));

export function topicForFeature(feature) {
  const explicit = topicCatalog.find((topic) => topic.id === feature?.topicId);
  if (explicit) return explicit.id;
  const catalogued = topicCatalog.find((topic) => topic.modules.some((module) => module.id === feature?.id));
  return catalogued?.id || "foundations";
}
