# Chapter 6 control-authority game

Release 2.0 replaces the earlier general-aerodynamics onboarding exercises. Each of the twelve class missions still has one missing engineering section and eleven visible supplied sections. Homework requires all twelve. Completed work from version 1 is preserved, but old results do not unlock the revised missions.

| Mission / missing section | Control-authority investigation | Chapter alignment |
|---|---|---|
| 1 — Question | Trainer initial pitch response and a measurable acceleration requirement | 6.1, 6.4, 6.9 |
| 2 — Model | Asymmetric-thrust yaw demand, perpendicular arm, and appropriate effector | 6.1, 6.2, 6.6; Transfer B |
| 3 — Inputs | Signed local effectiveness, radians versus degrees, usable elevator travel | 6.3; Worked Example A |
| 4 — Outputs | A synthetic aircraft that is trimmed and restoring but lacks control margin | 6.5, 6.11 |
| 5 — Assumptions | Local-flow sensitivity and the conditions behind available authority | 6.4, 6.6, 6.9 |
| 6 — Validity | Local tangent versus synthetic nonlinear control response and usable limits | 6.3, 6.6 |
| 7 — Predictions | Lower speed, increased inertia, opposing moment, and degraded effector | 6.4, 6.6, 6.11 |
| 8 — Manual reference | Trainer moment budget, signs, reference dimensions, and assumed-arm force scale | 6.1, 6.4, 6.9 |
| 9 — Verification | Wrong sign, wrong speed scaling, zero authority, invalid inertia | 6.7–6.8 |
| 10 — Requirements | Available versus applied moment, travel and actuator delivery time | 6.2–6.3, 6.6 |
| 11 — Implementation | Implement the trainer's signed pitch-authority margin and test failure cases | 6.7–6.9 |
| 12 — Decision | Conservative trainer and asymmetric-thrust uncertainty screens | 6.7–6.9 |
| 13 — Homework | Reopen the claim for crosswind; local rudder balance versus missing coupled evidence | 6.10, 6.12 |

## Source and teaching extensions

The course source is **Chapter 6 — Control Authority and Technical Review** in the instructor's Intro Aero course book. Section numbers appear in every mission. The new packets are intentionally supplied teaching material, not copies of private student solution files.

Chapter quantities reproduced: trainer conditions and nominal moment budget; Worked Example A's -1.05 per-radian derivative and -0.25 demand; the separate twin-aircraft 2.4 kN thrust loss, 3.1 m arm and 8.6 kN m yaw authority; rounded uncertainty comparisons; and the 6/20 wind-component geometry yielding a 16.7-degree crab angle.

Explicit teaching extensions: the insufficient-control trimmed/stable condition; local-flow factors; the ±10-degree fit interval and nonlinear observations in Mission 6; degraded coefficients, inertia/opposing-moment challenges; actuator slew/deadline values; and the homework's local yaw coefficients. These are labeled synthetic and do not supply measured aircraft evidence. In particular, the homework beta is an independent sideslip scenario, not the crab angle.

## What completion establishes

Students practice a traceable requirement, model, compatible inputs, reference check, prediction, verification, and bounded decision. Structured numerical/selection checks give deterministic feedback. Written reasoning—including stakeholder consequences and next-evidence choices—still requires instructor judgment. A successful experiment can correctly conclude **insufficient authority** or **insufficient model**.

The game does not validate actual takeoff or landing, solve complete trim/dynamics, model stall recovery, derive CG-to-moment relationships, model hinge moments or pilot forces, or implement full roll/yaw/ground-contact dynamics. The effector map introduces coupled and secondary effects; it is not an independent simulation of every surface. The crosswind homework makes these missing capabilities part of the decision instead of pretending pitch success proves crosswind capability.

## Release and migration

Only the separate public workflow-test repository is updated. Student JSON and Markdown answers remain untouched by the release. The app explicitly marks version-1 attempts stale; students can inspect their existing records before revising. Use the instructor dashboard to identify forks needing the new release. No Chapter 5 trim-response solution or original classroom-repository change is included.
