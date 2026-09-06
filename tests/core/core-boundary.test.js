import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectChangedPaths,
  parseNameStatus,
  protectedChanges,
} from "../../scripts/core-boundary-lib.mjs";

const protectedPrefixes = ["src/student/", "tests/student/", "student-work/"];

describe("core ownership boundary", () => {
  it("detects additions, modifications, and deletions in every student prefix", () => {
    const paths = parseNameStatus([
      "A", "src/student/physics/lift.js",
      "M", "tests/student/lift.test.js",
      "D", "student-work/specs/lift.md",
      "M", "src/core/App.jsx",
      "",
    ].join("\0"));

    expect(protectedChanges(paths, protectedPrefixes)).toEqual([
      "src/student/physics/lift.js",
      "student-work/specs/lift.md",
      "tests/student/lift.test.js",
    ]);
  });

  it("checks both sides of a rename", () => {
    const paths = parseNameStatus([
      "R100", "src/student/features/lift.feature.js", "src/core/demonstrations/lift.feature.js", "",
    ].join("\0"));

    expect(protectedChanges(paths, protectedPrefixes)).toEqual([
      "src/student/features/lift.feature.js",
    ]);
  });

  it("treats an untracked student path as protected", () => {
    expect(protectedChanges(["src/student/models/wing.model.js"], protectedPrefixes)).toEqual([
      "src/student/models/wing.model.js",
    ]);
  });

  it("finds modified, deleted, renamed, and untracked student files in Git", () => {
    const repository = mkdtempSync(join(tmpdir(), "intro-aero-boundary-"));
    const git = (args) => execFileSync("git", args, { cwd: repository, stdio: "ignore" });
    const write = (path, contents) => {
      mkdirSync(join(repository, path, ".."), { recursive: true });
      writeFileSync(join(repository, path), contents);
    };

    try {
      git(["init", "-b", "main"]);
      git(["config", "user.name", "Boundary Test"]);
      git(["config", "user.email", "boundary@example.invalid"]);
      write("src/student/physics/lift.js", "baseline\n");
      write("tests/student/lift.test.js", "baseline\n");
      write("student-work/specs/lift.md", "baseline\n");
      write("src/core/App.jsx", "baseline\n");
      git(["add", "."]);
      git(["commit", "-m", "baseline"]);

      write("src/student/physics/lift.js", "modified\n");
      rmSync(join(repository, "tests/student/lift.test.js"));
      git(["mv", "student-work/specs/lift.md", "student-work/specs/renamed.md"]);
      write("src/student/models/wing.model.js", "untracked\n");
      write("src/core/App.jsx", "allowed core change\n");

      expect(protectedChanges(collectChangedPaths(repository, "main"), protectedPrefixes)).toEqual([
        "src/student/models/wing.model.js",
        "src/student/physics/lift.js",
        "student-work/specs/lift.md",
        "student-work/specs/renamed.md",
        "tests/student/lift.test.js",
      ]);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
