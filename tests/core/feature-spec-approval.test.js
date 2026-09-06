import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const template = readFileSync(new URL("../../templates/FEATURE-SPEC.md", import.meta.url), "utf8");

describe("student engineering approval gate", () => {
  it("requires interpretation before code generation", () => {
    const interpretationIndex = template.indexOf("## Phase 1 — Engineering interpretation and approval");
    const generationIndex = template.indexOf("## Phase 2 — Code generation after approval");

    expect(interpretationIndex).toBeGreaterThan(-1);
    expect(generationIndex).toBeGreaterThan(interpretationIndex);
    expect(template).toContain("do **not** generate code, pseudocode, file contents, or implementation snippets");
  });

  it("requires an explicit approval phrase and a new review after corrections", () => {
    expect(template).toContain("APPROVE ENGINEERING INTERPRETATION");
    expect(template).toContain("return a complete revised Implementation Interpretation and request approval again");
    expect(template).toContain("Approval authorizes implementation of the displayed interpretation only");
  });
});
