import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const COMPILER = "packages-ts/galerina-core-compiler";
const SCHEMA = "galerina.compiler-build-evidence.v1";

function gitPaths(root, compiler, args) {
  const result = spawnSync(
    "git",
    ["-C", root, ...args, "-z", "--", `${compiler}/src`, `${compiler}/tests`],
    { encoding: "utf8", timeout: 30_000 },
  );
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`cannot enumerate compiler inputs: ${result.stderr || result.error?.message || "git failed"}`);
  }
  return result.stdout.split("\0").filter(Boolean).sort();
}

export function createBuildEvidence(root = ROOT, compiler = COMPILER) {
  const trackedInputs = gitPaths(root, compiler, ["ls-files"]);
  if (trackedInputs.length === 0) {
    throw new Error("refusing empty compiler build evidence: no tracked src/tests inputs");
  }
  const untrackedInputs = gitPaths(
    root,
    compiler,
    ["ls-files", "--others", "--exclude-standard"],
  );
  if (untrackedInputs.length > 0) {
    throw new Error(`refusing compiler build evidence with untracked inputs: ${untrackedInputs.join(", ")}`);
  }

  const hash = createHash("sha256");
  for (const path of trackedInputs) {
    hash.update(path);
    hash.update("\0");
    hash.update(readFileSync(join(root, path)));
    hash.update("\0");
  }
  return {
    schema: SCHEMA,
    algorithm: "sha256",
    trackedInputs,
    inputDigest: hash.digest("hex"),
  };
}

export function writeBuildEvidence(
  root = ROOT,
  compiler = COMPILER,
  output = join(root, compiler, "dist", "build-evidence.json"),
) {
  const evidence = createBuildEvidence(root, compiler);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const output = join(ROOT, COMPILER, "dist", "build-evidence.json");
    const evidence = writeBuildEvidence(ROOT, COMPILER, output);
    process.stdout.write(`compiler build evidence: ${evidence.trackedInputs.length} inputs -> ${output}\n`);
  } catch (error) {
    process.stderr.write(`compiler build evidence refused: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
