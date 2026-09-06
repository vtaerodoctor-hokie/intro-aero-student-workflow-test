import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { collectChangedPaths, protectedChanges } from "./core-boundary-lib.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(repositoryRoot, ".course/ownership.json"), "utf8"));
const baseFlag = process.argv.indexOf("--base");
const base = baseFlag >= 0 ? process.argv[baseFlag + 1] : "main";

if (!base || base.startsWith("--")) {
  console.error("Usage: npm run verify:core-boundary -- --base <git-ref>");
  process.exit(2);
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  git(["rev-parse", "--verify", `${base}^{commit}`]);
} catch {
  console.error(`Core boundary check cannot resolve base ref: ${base}`);
  process.exit(2);
}

const changedPaths = collectChangedPaths(repositoryRoot, base);
const violations = protectedChanges(changedPaths, manifest.protectedStudentPrefixes);

if (violations.length > 0) {
  console.error("Core boundary check FAILED. Instructor core updates changed protected student artifacts:");
  violations.forEach((filePath) => console.error(`  - ${filePath}`));
  console.error("Restore these changes outside this script or move the work to a student branch. No files were modified by this check.");
  process.exit(1);
}

console.log(`Core boundary check passed against ${base}. No protected student artifacts changed.`);
