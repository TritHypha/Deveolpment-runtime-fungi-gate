#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ownedProcessTree from "./lib/owned-process-tree.cjs";
import {
  compareResultSets,
  normalizeLegacyReport,
} from "./lib/assurance-fabric/differential.mjs";
import { buildCadencePlan } from "./lib/assurance-fabric/cadence-plan.mjs";
import { runCadencePlan } from "./lib/assurance-fabric/cadence-runner.mjs";
import { validateAssuranceManifest } from "./lib/assurance-fabric/manifest.mjs";
import { createUnsafeObservationIntake } from "./lib/assurance-fabric/unsafe-observation.mjs";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";
import suiteLeaseModule from "./lib/suite-run-lease.cjs";

const { runOwnedProcessSync } = ownedProcessTree;
const { acquireSuiteLease } = suiteLeaseModule;
const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const LEGACY_PHASE_CLOSE = join(SCRIPT_ROOT, "run-phase-close-legacy.mjs");
const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);
const GIT_HEAD = /^[a-f0-9]{40}$/u;

function admittedHostEnvironment() {
  const admitted = {};
  const sourceEntries = Object.entries(process.env);
  const copy = (canonical, aliases) => {
    const match = sourceEntries.find(([key, value]) => aliases.includes(key.toLowerCase())
      && typeof value === "string" && value.length > 0);
    if (match) admitted[canonical] = match[1];
  };
  copy("PATH", ["path"]);
  if (process.platform === "win32") {
    copy("SystemRoot", ["systemroot"]);
    copy("WINDIR", ["windir"]);
    copy("ComSpec", ["comspec"]);
    copy("PATHEXT", ["pathext"]);
    copy("TEMP", ["temp"]);
    copy("TMP", ["tmp"]);
  } else {
    copy("TMPDIR", ["tmpdir"]);
    copy("LANG", ["lang"]);
    copy("LC_ALL", ["lc_all"]);
  }
  admitted.GIT_CONFIG_NOSYSTEM = "1";
  admitted.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  admitted.NPM_CONFIG_USERCONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
  admitted.NO_UPDATE_NOTIFIER = "1";
  return Object.freeze(admitted);
}

const HOST_ENVIRONMENT = admittedHostEnvironment();
const ENVIRONMENT_DIGEST = `sha256:${createHash("sha256")
  .update(JSON.stringify({
    analyzerEnvironment: [],
    hostEnvironment: Object.entries(HOST_ENVIRONMENT).sort(([left], [right]) => left.localeCompare(right)),
  }))
  .digest("hex")}`;

class ShadowRefusal extends Error {
  constructor(reason, detail, buildPoint = Object.freeze({ kind: "absent", reason: "not observed" })) {
    super(detail);
    this.reason = reason;
    this.buildPoint = buildPoint;
  }
}

function parseArguments(argv) {
  const parsed = { json: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--root", "--manifest", "--cadence", "--json"].includes(argument)) {
      throw new ShadowRefusal("ARGUMENT_REFUSED", `unknown option ${argument}`);
    }
    if (seen.has(argument)) throw new ShadowRefusal("ARGUMENT_REFUSED", `duplicate option ${argument}`);
    seen.add(argument);
    if (argument === "--json") {
      parsed.json = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new ShadowRefusal("ARGUMENT_REFUSED", `${argument} requires a value`);
    }
    parsed[argument.slice(2)] = value;
    index += 1;
  }
  if (!parsed.root || !parsed.manifest || !parsed.cadence || !parsed.json) {
    throw new ShadowRefusal("ARGUMENT_REFUSED", "--root, --manifest, --cadence and --json are required");
  }
  if (!CADENCES.has(parsed.cadence)) {
    throw new ShadowRefusal("ARGUMENT_REFUSED", "cadence is outside the closed vocabulary");
  }
  return Object.freeze(parsed);
}

function pathInside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../"));
}

function samePath(left, right) {
  const a = resolve(left);
  const b = resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function runOwned(command, args, cwd, timeoutMs = 30_000, maxOutputBytes = 67_108_864) {
  const output = runOwnedProcessSync({
    command,
    args,
    cwd,
    timeoutMs,
    maxOutputBytes,
    env: HOST_ENVIRONMENT,
    windowsHide: true,
  });
  if (output.owned === null || output.error || output.signal !== null || !Number.isSafeInteger(output.status)) {
    throw new ShadowRefusal("OWNED_PROCESS_REFUSED", "owned process boundary did not return exact terminal evidence");
  }
  return output;
}

function gitText(root, args, label) {
  const output = runOwned("git", args, root, 30_000, 1_048_576);
  if (output.status !== 0) throw new ShadowRefusal("GIT_REFUSED", `${label} was not available`);
  const value = output.stdout.trim();
  if (value.length === 0) throw new ShadowRefusal("GIT_REFUSED", `${label} was empty`);
  return value;
}

function gitHead(root) {
  const head = gitText(root, ["rev-parse", "HEAD"], "Git HEAD");
  if (!GIT_HEAD.test(head)) throw new ShadowRefusal("GIT_REFUSED", "Git HEAD was not an exact commit digest");
  return head;
}

function tierForCadence(cadence) {
  return cadence === "exhaustive" ? "exhaustive" : "phase-close";
}

function emit(report, status) {
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = status;
}

function observedStatus(value, reason) {
  return Number.isSafeInteger(value)
    ? Object.freeze({ kind: "present", value })
    : Object.freeze({ kind: "absent", reason });
}

function observedSignal(value) {
  return typeof value === "string" && value.length > 0
    ? Object.freeze({ kind: "present", value })
    : Object.freeze({ kind: "absent", reason: "process signal was not observed" });
}

function candidateObservation(observation, intake) {
  const stdout = typeof observation.output.stdout === "string" ? observation.output.stdout : "";
  const stderr = typeof observation.output.stderr === "string" ? observation.output.stderr : "";
  const stdoutHandle = intake.capture(Buffer.from(stdout, "utf8"), `${observation.entry.id}:stdout`);
  const stderrHandle = intake.capture(Buffer.from(stderr, "utf8"), `${observation.entry.id}:stderr`);
  return Object.freeze({
    id: observation.entry.id,
    acceptedExitCodes: observation.entry.acceptedExitCodes,
    result: observation.result,
    stdoutHandle,
    stderrHandle,
    stdoutState: intake.stateOf(stdoutHandle),
    stderrState: intake.stateOf(stderrHandle),
    exitStatus: observedStatus(observation.output.status, "numeric exit status was not observed"),
    signalStatus: observedSignal(observation.output.signal),
    processControl: Object.freeze({ ...observation.processControl }),
  });
}

function unknownReport(error) {
  return Object.freeze({
    tool: "run-assurance-shadow",
    schemaVersion: 1,
    verdict: "SHADOW_UNKNOWN",
    authorizing: false,
    reason: error instanceof ShadowRefusal ? error.reason : "UNCLASSIFIED_REFUSAL",
    detail: error instanceof Error ? error.message : "unknown refusal",
    buildPoint: error instanceof ShadowRefusal
      ? error.buildPoint
      : Object.freeze({ kind: "absent", reason: "not observed" }),
    environmentDigest: ENVIRONMENT_DIGEST,
  });
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = realpathSync(resolve(options.root));
  if (!statSync(root).isDirectory()) throw new ShadowRefusal("ROOT_REFUSED", "root is not a directory");
  const gitRoot = realpathSync(gitText(root, ["rev-parse", "--show-toplevel"], "Git root"));
  if (!samePath(root, gitRoot)) throw new ShadowRefusal("ROOT_REFUSED", "root is not the exact Git worktree root");

  const manifestPath = resolve(root, options.manifest);
  if (!pathInside(root, manifestPath)) throw new ShadowRefusal("MANIFEST_ROOT_ESCAPE", "manifest escapes root");
  if (!statSync(manifestPath).isFile()) throw new ShadowRefusal("MANIFEST_REFUSED", "manifest is not a regular file");
  const manifestBytes = readFileSync(manifestPath);
  if (manifestBytes.byteLength < 1 || manifestBytes.byteLength > 67_108_864) {
    throw new ShadowRefusal("MANIFEST_REFUSED", "manifest byte length is outside the closed bounds");
  }

  const intake = createUnsafeObservationIntake({ maxBytes: 67_108_864 });
  const manifestHandle = intake.capture(manifestBytes, "candidate-manifest");
  if (intake.stateOf(manifestHandle) !== "boundary-untrusted") {
    throw new ShadowRefusal("MANIFEST_REFUSED", "manifest did not retain boundary-untrusted state");
  }
  let manifestValue;
  try {
    manifestValue = parseStrictJsonBytes(manifestBytes, {
      label: "candidate manifest",
      maxBytes: 67_108_864,
    });
  } catch (error) {
    throw new ShadowRefusal(
      "MANIFEST_REFUSED",
      error instanceof Error ? error.message : "candidate manifest JSON refused",
    );
  }
  const manifestResult = validateAssuranceManifest(manifestValue, root);
  if (manifestResult.kind !== "accepted") {
    throw new ShadowRefusal(manifestResult.code, manifestResult.detail);
  }

  const preHead = gitHead(root);
  const buildPoint = Object.freeze({ kind: "present", value: `git:${preHead}` });
  const liveManifestPath = join(root, "governance", "phase-close-commands.json");
  const legacyArgs = [LEGACY_PHASE_CLOSE];
  if (samePath(manifestPath, liveManifestPath)) legacyArgs.push("--static-oracle");
  legacyArgs.push("--root", root, "--tier", tierForCadence(options.cadence), "--json");
  const legacy = runOwned(
    process.execPath,
    legacyArgs,
    root,
    3_600_000,
    67_108_864,
  );
  const legacyStdoutHandle = intake.capture(Buffer.from(legacy.stdout, "utf8"), "legacy-phase-close:stdout");
  const legacyStderrHandle = intake.capture(Buffer.from(legacy.stderr, "utf8"), "legacy-phase-close:stderr");
  if (intake.stateOf(legacyStdoutHandle) !== "boundary-untrusted"
      || intake.stateOf(legacyStderrHandle) !== "boundary-untrusted") {
    throw new ShadowRefusal("LEGACY_BOUNDARY_REFUSED", "legacy output lost boundary-untrusted state", buildPoint);
  }
  let legacyValue;
  try {
    legacyValue = parseStrictJsonBytes(Buffer.from(legacy.stdout, "utf8"), {
      label: "legacy phase-close report",
      maxBytes: 67_108_864,
    });
  } catch (error) {
    throw new ShadowRefusal(
      "LEGACY_REPORT_MALFORMED",
      error instanceof Error ? error.message : "legacy phase-close JSON refused",
      buildPoint,
    );
  }
  let normalizedLegacy;
  try {
    normalizedLegacy = normalizeLegacyReport(legacyValue, root);
  } catch (error) {
    throw new ShadowRefusal("LEGACY_REPORT_REFUSED", error.message, buildPoint);
  }
  const postLegacyHead = gitHead(root);
  if (postLegacyHead !== preHead) {
    throw new ShadowRefusal("BUILD_POINT_DRIFT", "Git HEAD changed during the legacy run", buildPoint);
  }

  const planned = buildCadencePlan(manifestResult.value, {
    cadence: options.cadence,
    platform: process.platform,
  });
  if (planned.kind !== "accepted") {
    throw new ShadowRefusal(planned.code, planned.detail, buildPoint);
  }
  const candidateRecords = [];
  const suiteLease = acquireSuiteLease({ root, commandClass: "phase-close" });
  try {
    runCadencePlan(planned.value, {
      root,
      suiteLease,
      observe: (observation) => candidateRecords.push(candidateObservation(observation, intake)),
    });
  } finally {
    suiteLease.release();
  }
  const postCandidateHead = gitHead(root);
  if (postCandidateHead !== preHead) {
    throw new ShadowRefusal("BUILD_POINT_DRIFT", "Git HEAD changed during the candidate run", buildPoint);
  }
  const comparison = compareResultSets(normalizedLegacy.results, candidateRecords);
  const report = Object.freeze({
    tool: "run-assurance-shadow",
    schemaVersion: 1,
    verdict: comparison.verdict,
    authorizing: false,
    cadence: options.cadence,
    buildPoint: `git:${preHead}`,
    environmentDigest: ENVIRONMENT_DIGEST,
    legacyClaim: normalizedLegacy.legacyClaim,
    mismatches: comparison.mismatches,
    missingCandidateIds: comparison.missingCandidateIds,
    candidateOnlyIds: comparison.candidateOnlyIds,
  });
  const status = comparison.verdict === "SHADOW_AGREEMENT_NON_AUTHORIZING"
    ? 0
    : comparison.verdict === "SHADOW_MISMATCH"
      ? 1
      : 3;
  emit(report, status);
}

try {
  main();
} catch (error) {
  emit(unknownReport(error), 3);
}
