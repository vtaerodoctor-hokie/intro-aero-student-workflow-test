# Feature Name

Complete Sections 1–12. Do not edit the implementation contract at the end.

## Learning Mode

Write exactly one: `concept`, `aircraft`, or `design`.

- `concept` — isolate the governing mathematical relationship with very few inputs.
- `aircraft` — calculate supplied coefficients from aircraft geometry, component behavior, and assumptions.
- `design` — evaluate design variables against quantitative requirements and constraints.

State the topic ID used to connect related modules, for example `lift` or `stability`.

## 1. Engineering Question

What engineering question should this feature help answer?

## 2. Physics Model

List the governing equation or relationships.

For Aircraft or Design mode, list any earlier aircraft capabilities this feature consumes. Give each instructor-assigned capability ID, minimum version, inputs, units, and expected output. The core injects these results at runtime so the new feature does not copy or directly import an earlier equation. Write `No prior capability dependency` if none.

For Design mode, requirements do not replace physics. State the model used to evaluate every requirement and the sweep, search, or comparison method.

## 3. Inputs and Units

List each required input and its units.

In Aircraft mode, distinguish measured/supplied aircraft data from derived values. In Design mode, distinguish fixed scenario data, design variables, and requirements.

## 4. Outputs and Units

List each calculated output and its units.

Aircraft mode should expose useful intermediate contributions. Design mode should include requirement margins or feasibility, not only a pass/fail label.

## 5. Assumptions

What assumptions are embedded in the model?

## 6. Validity Limits

When should this model NOT be trusted?

## 7. Expected Physical Behavior

Describe qualitative relationships that must hold.

## 8. Reference Calculation

Manually calculate at least one known case. Include inputs, expected output, and units.

## 9. Verification Cases

Define at least one numerical case, one behavioral case, and one boundary or sanity case before implementation.

## 10. Feature Requirements

List the results and engineering interpretation the dashboard must display.

If a plot helps answer the engineering question, define its x-variable, y-variable, units, series, and the range or points to calculate. Otherwise write `No plot`.

For Design mode, define any acceptable region with numerical `xMin`, `xMax`, `yMin`, and `yMax` limits. Define requirement lines by axis and value. Do not ask ChatGPT to choose unstated limits.

If a visual marker helps, request only one or more data overlays: a point at an aircraft-relative `{x, y, z}` position or an arrow with an origin and vector, all in meters. Otherwise write `No 3D overlay`. Do not specify colors, layout, HTML, CSS, Three.js, or chart code.

## 11. Files to Create

Replace `[feature-id]` with a short kebab-case name. Create exactly these three new files:

- `src/student/physics/[feature-id].js`
- `src/student/features/[feature-id].feature.js`
- `tests/student/[feature-id].test.js`

If the instructor assigned a dashboard feature ID, use that exact ID and filename so the feature appears in the intended lesson block.

## 12. Engineering Decision Enabled

What design question should the completed feature help answer?

---

# Fixed AI Implementation Contract — Do Not Edit

This interaction has two mandatory phases. Do not skip Phase 1 even if the student asks you to generate the files immediately.

## Phase 1 — Engineering interpretation and approval

On the first response, do **not** generate code, pseudocode, file contents, or implementation snippets. Respond only with:

```text
## Implementation Interpretation

I will implement:

1. Engineering question
   [the exact question the feature will answer]

2. Governing equations
   [each equation exactly as interpreted, with every symbol defined]

3. Conditions and classifications
   [pass/fail, stable/neutral/unstable, requirement limits, tolerances, and sign conventions]

4. Inputs and units
   [each input and its SI unit]

5. Outputs and units
   [each output and its SI unit]

6. Expected physical behavior
   [the directional and limiting behavior the implementation must preserve]

7. Assumptions and validity limits
   [what the calculation assumes and when it should not be trusted]

8. Verification approach
   [the numerical, behavioral, and boundary cases that will become tests]

9. Files that will be created
   [exactly the three paths from Section 11]

No code has been generated yet.
Reply exactly `APPROVE ENGINEERING INTERPRETATION` to authorize code generation, or describe the engineering correction needed.
```

Use only the completed specification when writing the interpretation. Do not silently repair, complete, or invent missing physics. If information conflicts or is missing, identify the issue inside the interpretation and state that approval cannot proceed until it is resolved.

If the student requests a correction, return a complete revised Implementation Interpretation and request approval again. Do not generate code in the correction response.

## Phase 2 — Code generation after approval

Generate code only after the student replies with the exact approval phrase `APPROVE ENGINEERING INTERPRETATION` in the same conversation. Approval authorizes implementation of the displayed interpretation only. It is not evidence that the model is correct or valid.

After approval, generate the complete contents of exactly the three new files named in Section 11. Do not request repository files or additional implementation instructions from the student.

## Application contract

- The application uses Vite, React, plain JavaScript, and Vitest.
- Put all engineering equations in the `src/student/physics` file as exported pure functions.
- Physics files have no React imports and no browser dependencies.
- Use SI units internally and reject obviously invalid numeric inputs.
- Concisely comment input units, output units, and important assumptions.
- Do not add dependencies or modify existing files.
- The application automatically discovers `src/student/features/*.feature.js` files.
- The feature file contains no React, JSX, HTML, CSS, class names, or inline styles. The application formats its structured data automatically.

The shared `aircraft` object provides:

```javascript
{
  massKg,
  payloadKg,
  speedMps,
  densityKgM3,
  wingSpanM,
  wingAreaM2,
  meanChordM,
  cl,
  cgM,
  neutralPointM,
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
  airframeCgM,
  payloadPositionM,
  initialPayloadPositionM,
  missionPayloadPositionM,
  forwardCgLimitM,
  aftCgLimitM,
  dutchRollRealPartPerS,
  dutchRollImagPartRadS,
  pitchInertiaKgM2,
  rollInertiaKgM2,
  yawInertiaKgM2,
  externalForceN,
  externalForceXM,
  wingLiftN,
  wingForceXM,
  tailForceN,
  tailPositionM,
  thrustN,
  thrustLineZM,
  tailAreaM2,
  tailArmM,
  elevatorDeflectionDeg,
  elevatorEffectiveness,
  stickFreeFactor,
  sideslipDeg,
  clBetaPerRad,
  cnBetaPerRad,
  cmQPerRad,
  rollRateRadS,
  pitchRateRadS,
  yawRateRadS,
  bankAngleDeg,
  minimumStaticMargin,
  simulationDurationS
}
```

If a required aircraft input is not listed, stop and identify the missing field. Do not create a contradictory local copy.

## Feature data contract

The `*.feature.js` file imports functions from its new physics file and exports one object with this exact shape:

```javascript
export const feature = {
  contractVersion: 4,
  id: "unique-kebab-case-id",
  title: "Feature title",
  description: "One-sentence engineering purpose",
  category: "Course topic",
  learningMode: "concept",
  topicId: "topic-id",
  inputKeys: ["speedMps", "wingAreaM2"],
  requiresCapabilities: [],
  providesCapabilities: [{ id: "topic.new-capability", version: 1 }],
  assumptions: ["Short, model-specific assumption"],
  validityLimits: ["Condition outside which this model should not be trusted"],
  simulation: {
    display: "response",
    durationS: 12,
    initialState: { pitchRad: 0, pitchRateRadS: 0 },
    controls: {},
    disturbance: {},
    plotStateKeys: ["pitchRad"]
  },

  analyze(aircraft, capabilityContext) {
    // Call imported physics functions. Do not repeat governing equations here.

    return {
      results: [
        {
          label: "Result label",
          value: 12.34,
          unit: "N",
          precision: 2,
          emphasis: true,
          note: "Optional short engineering context"
        }
      ],
      verificationCases: [
        { label: "Known-case description", passed: trueOrFalse }
      ],
      decision: {
        question: "Engineering question this feature answers",
        interpretation: "Qualified interpretation based on the current results",
        status: "pass"
      },
      plots: [
        {
          id: "unique-plot-id",
          title: "Physical relationship",
          xLabel: "Input name (unit)",
          yLabel: "Output name (unit)",
          series: [
            {
              label: "Series label",
              color: "#ff5a36",
              points: [{ x: 0, y: 0 }, { x: 1, y: 2 }]
            }
          ],
          regions: [
            {
              label: "Acceptable region",
              xMin: 0.22,
              xMax: 0.37,
              yMin: 0.05,
              yMax: 0.20,
              color: "#dce9ad"
            }
          ],
          referenceLines: [
            { axis: "y", value: 0.05, label: "Minimum requirement" }
          ]
        }
      ],
      scene: {
        caption: "What this overlay represents",
        overlays: [
          {
            type: "arrow",
            origin: { x: 0, y: 0, z: 0 },
            vector: { x: 0, y: 0, z: 1 },
            color: "#dce9ad"
          }
        ]
      }
    };
  }
};

export const model = {
  // Use exactly one: "derived", "load", or "state-model".
  kind: "derived",

  evaluate(runtimeContext) {
    // Call the new pure physics functions. Read earlier results from
    // runtimeContext.capabilities; do not repeat or import their equations.
    return { values: { derivedQuantity: 0 } };
  }
};
```

Contract rules:

- `results` contains one object per displayed result.
- `contractVersion` is `4`; older Version 1–3 files and files that omit the version remain compatible as analysis-only modules.
- `learningMode` exactly matches the completed Learning Mode section. `topicId` connects the three levels of one engineering topic.
- `inputKeys` contains only canonical aircraft fields actually used by this module. The core uses it to show focused controls.
- `requiresCapabilities` lists only assigned earlier capability IDs and minimum versions. Use `[]` when there are no dependencies.
- `providesCapabilities` lists at least one unique, instructor-assigned capability ID and positive integer version.
- `assumptions` and `validityLimits` contain concise evidence statements used by the print-ready report.
- `value` is a finite number or short text; `unit` is always a string, including `""` for dimensionless values.
- `precision` is a non-negative integer for numeric display.
- Use `emphasis: true` only for the primary result.
- `verificationCases` implements every case from Section 9 using the physics functions.
- `passed` is a Boolean expression, not hard-coded `true`.
- `decision.status` is `"pass"`, `"caution"`, or `"neutral"`.
- Include `plots: []` when Section 10 says no plot. Plot points must be calculated from the physics functions, not typed as unexplained display values.
- Include `regions: []` and `referenceLines: []` when no design constraints are plotted. Every displayed limit must come from the completed specification.
- Include `scene: null` when Section 10 says no 3D overlay. Supported overlays are data-only `point`, `marker`, `arrow`, `line`, and `moment-arm` objects. Coordinates use the standard aircraft body frame: +x forward, +y right wing, +z down.
- Do not include a component property or import React/shared UI components.
- Export one `model` object from the feature file. A `derived` model returns `values`; a `load` model returns body-axis `forcesBodyN`, `momentsBodyNm`, and optional `values`; a `state-model` returns `derivatives` keyed by the declared reduced-order states.
- `model.evaluate(runtimeContext)` receives `aircraft`, `state`, `timeS`, `controls`, `disturbance`, `derived`, `capabilities`, `forcesBodyN`, and `momentsBodyNm`. It must return finite data and must not mutate the context.
- Use `simulation.display: "response"` when the lesson needs run controls, aircraft animation, and response histories. Use `"analysis-only"` when a Version 4 model must provide a capability but a time response would exceed or confuse the lesson's stated scope.
- Use the standard right-handed aircraft body frame: `+x` forward, `+y` right wing, and `+z` down. Positive pitch and positive angle of attack are nose-up. The core owns fixed-step RK4 integration, prescribed disturbance phases, animation, run controls, logging, and evidence export.

Mode rules:

- Concept mode must keep the model intentionally small and must not introduce unrequested aircraft-detail equations.
- Aircraft mode must calculate the requested aggregate behavior from the listed aircraft parameters and expose component contributions where specified.
- Design mode must evaluate only the stated variables, model, requirements, and limits. It must not silently perform an optimizer search or invent a design criterion.
- A feature consumes earlier model results only through the assigned capability context. Do not request earlier source files, import earlier student modules, or duplicate their equations.

The application owns the feature header, result grid, units, verification styling, decision styling, error presentation, and responsive layout.

## Test contract

- Use Vitest and import pure functions directly from the new physics file.
- Implement every numerical, behavioral, and boundary or sanity case in Section 9.
- Do not claim passing tests proves model validity or real-world validation.

## Required response format

Before approval, follow Phase 1 and return no code. After approval, briefly restate that the approved interpretation is being implemented, then provide the complete contents of each file in separately labeled code blocks. If new missing or conflicting engineering information becomes apparent, stop and return a revised interpretation for approval instead of inventing a model.
