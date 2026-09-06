import { execFileSync } from "node:child_process";

export function parseNameStatus(output) {
  const tokens = output.split("\0").filter(Boolean);
  const paths = [];

  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    const pathCount = status.startsWith("R") || status.startsWith("C") ? 2 : 1;

    for (let pathIndex = 0; pathIndex < pathCount && index < tokens.length; pathIndex += 1) {
      paths.push(tokens[index++]);
    }
  }

  return paths;
}

export function protectedChanges(paths, protectedPrefixes) {
  return [...new Set(paths
    .map((filePath) => filePath.replaceAll("\\", "/").replace(/^\.\//, ""))
    .filter((filePath) => protectedPrefixes.some((prefix) => filePath.startsWith(prefix))))]
    .sort();
}

export function collectChangedPaths(repositoryRoot, base) {
  function git(args) {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  const trackedOutputs = [
    git(["diff", "--name-status", "-z", `${base}...HEAD`]),
    git(["diff", "--name-status", "-z", "--cached"]),
    git(["diff", "--name-status", "-z"]),
  ];
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);

  return [
    ...trackedOutputs.flatMap(parseNameStatus),
    ...untracked,
  ];
}
