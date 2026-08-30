#!/usr/bin/env node
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCadencePlan } from "./lib/assurance-fabric/cadence-plan.mjs";
import { runCadencePlan } from "./lib/assurance-fabric/cadence-runner.mjs";
import { validateAssuranceManifest } from "./lib/assurance-fabric/manifest.mjs";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";
import suiteLeaseModule from "./lib/suite-run-lease.cjs";

const { acquireSuiteLease } = suiteLeaseModule;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);
const CONVERSION_QUEUE_ID = "audit:conversion-queue";
const CONVERSION_QUEUE_COMMAND = Object.freeze(["node", "scripts/conversion-queue.mjs", "--check"]);
const CONVERSION_QUEUE_BINDING_CODE = "ASSURANCE-CONVERSION-QUEUE-BINDING";
const CONVERSION_QUEUE_OPTIONS = Object.freeze([
  ["--project-corpus-receipt", "projectCorpusReceipt"],
  ["--git-executable", "gitExecutable"],
  ["--git-digest", "gitDigest"],
]);
const CONVERSION_QUEUE_OPTION_FIELDS = new Map(CONVERSION_QUEUE_OPTIONS);
const NODE_QUEUE_LOAD_OPTIONS = Object.freeze([
  "--import",
  "--require",
  "--loader",
  "--experimental-loader",
]);
const NODE_INLINE_OPTIONS = Object.freeze(["--eval", "--print"]);

function parseArguments(argv) {
  const result = {
    root: DEFAULT_ROOT,
    cadence: "normal",
    json: false,
    reportOnly: false,
    projectCorpusReceipt: null,
    gitExecutable: null,
    gitDigest: null,
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (seen.has(arg)) throw new Error(`duplicate option ${arg}`);
    seen.add(arg);
    if (arg === "--json") result.json = true;
    else if (arg === "--report-only") result.reportOnly = true;
    else if (arg === "--root" || arg === "--cadence" || arg === "--tier") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      if (arg === "--root") result.root = resolve(value);
      else if (arg === "--cadence") result.cadence = value;
      else result.cadence = value === "phase-close" ? "normal" : value;
      index += 1;
    } else if (CONVERSION_QUEUE_OPTION_FIELDS.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      result[CONVERSION_QUEUE_OPTION_FIELDS.get(arg)] = value;
      index += 1;
    } else throw new Error(`unknown option ${arg}`);
  }
  if (seen.has("--cadence") && seen.has("--tier")) throw new Error("--cadence and --tier are mutually exclusive");
  if (!CADENCES.has(result.cadence)) throw new Error("cadence is outside the closed vocabulary");
  return result;
}

function refuseConversionQueueBinding(detail) {
  throw Object.assign(new Error(detail), { code: CONVERSION_QUEUE_BINDING_CODE });
}

function hasExactConversionQueueCommand(entry) {
  const command = entry?.execution?.command;
  return Array.isArray(command)
    && command.length === CONVERSION_QUEUE_COMMAND.length
    && command.every((token, index) => token === CONVERSION_QUEUE_COMMAND[index]);
}

function normalizeFileIdentityPath(value) {
  let normalized = value;
  if (process.platform === "win32") {
    if (normalized.startsWith("\\\\?\\UNC\\")) normalized = `\\\\${normalized.slice(8)}`;
    else if (normalized.startsWith("\\\\?\\")) normalized = normalized.slice(4);
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

function resolveCommandPathToken(token, base) {
  if (/^file:/i.test(token)) {
    try {
      return { kind: "path", value: fileURLToPath(token) };
    } catch {
      return { kind: "refused" };
    }
  }
  if (process.platform === "win32" && token.startsWith("\\\\?\\")) {
    return { kind: "path", value: token };
  }
  return { kind: "path", value: resolve(base, token.replace(/[\\/]+/g, sep)) };
}

function hasStableFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.ino !== 0n;
}

function isMissingPathError(error) {
  return error && typeof error === "object" && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

function tokenTargetsConversionQueue(token, base, reserved) {
  const candidate = resolveCommandPathToken(token, base);
  if (candidate.kind === "refused") return true;
  if (normalizeFileIdentityPath(candidate.value) === normalizeFileIdentityPath(reserved)) return true;

  let candidateStat;
  try {
    candidateStat = statSync(candidate.value, { bigint: true });
  } catch (error) {
    return !isMissingPathError(error);
  }

  let reservedStat;
  try {
    reservedStat = statSync(reserved, { bigint: true });
  } catch {
    return true;
  }
  if (hasStableFileIdentity(candidateStat, reservedStat)) return true;

  try {
    const candidateRealPath = realpathSync.native(candidate.value);
    const reservedRealPath = realpathSync.native(reserved);
    return normalizeFileIdentityPath(candidateRealPath) === normalizeFileIdentityPath(reservedRealPath);
  } catch {
    return true;
  }
}

function conversionQueuePathContext(entry, root) {
  const cwd = typeof entry?.cwd === "string" ? entry.cwd : ".";
  return {
    base: resolve(root, cwd.replace(/[\\/]+/g, sep)),
    reserved: resolve(root, "scripts", "conversion-queue.mjs"),
  };
}

function hasConversionQueueScriptPath(entry, root) {
  const command = entry?.execution?.command;
  if (!Array.isArray(command)) return false;
  const { base, reserved } = conversionQueuePathContext(entry, root);
  return command.some((token) => typeof token === "string"
    && tokenTargetsConversionQueue(token, base, reserved));
}

function normalizeNodeLongOptionName(token) {
  if (!token.startsWith("--")) return null;
  const equalsIndex = token.indexOf("=");
  const name = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
  return name.replaceAll("_", "-");
}

function hasNodeQueueControl(entry) {
  const command = entry?.execution?.command;
  if (!Array.isArray(command)) return false;
  return command.some((token) => {
    if (typeof token !== "string") return false;
    const longOption = normalizeNodeLongOptionName(token);
    return (longOption !== null
        && (NODE_INLINE_OPTIONS.includes(longOption) || NODE_QUEUE_LOAD_OPTIONS.includes(longOption)))
      || token === "-e"
      || token === "-p"
      || token === "-r"
      || (token.length > 2 && !token.startsWith("--")
        && (token.startsWith("-e") || token.startsWith("-p") || token.startsWith("-r")));
  });
}

function hasEmbeddedConversionQueueAuthority(entry) {
  const command = entry?.execution?.command;
  return Array.isArray(command) && command.some((token) => typeof token === "string"
    && CONVERSION_QUEUE_OPTIONS.some(([option]) => token === option || token.startsWith(`${option}=`)));
}

function bindConversionQueueRuntime(raw, options) {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  const queueIdEntries = entries.filter((entry) => entry?.id === CONVERSION_QUEUE_ID);
  const queueCommandEntries = entries.filter(hasExactConversionQueueCommand);
  const queueScriptEntries = entries.filter((entry) => hasConversionQueueScriptPath(entry, options.root)
    || hasNodeQueueControl(entry)
    || hasEmbeddedConversionQueueAuthority(entry));
  const runtimeValues = CONVERSION_QUEUE_OPTIONS.map(([, field]) => options[field]);
  const suppliedCount = runtimeValues.filter((value) => value !== null).length;
  if (queueIdEntries.length === 0 && queueScriptEntries.length === 0) {
    if (suppliedCount !== 0) {
      refuseConversionQueueBinding("conversion queue authority was supplied without its exact manifest entry");
    }
    return raw;
  }
  if (queueIdEntries.length !== 1
      || queueCommandEntries.length !== 1
      || queueScriptEntries.length !== 1
      || queueIdEntries[0] !== queueCommandEntries[0]
      || queueIdEntries[0] !== queueScriptEntries[0]) {
    refuseConversionQueueBinding("conversion queue ID and command do not identify the same unique entry");
  }
  if (suppliedCount !== runtimeValues.length) {
    refuseConversionQueueBinding("conversion queue requires exact PROJECT and pinned Git authority inputs");
  }
  const queueEntry = queueIdEntries[0];
  if (queueEntry?.execution?.kind !== "process" || queueEntry?.cwd !== ".") {
    refuseConversionQueueBinding("conversion queue execution kind or working directory drifted from its admitted base");
  }
  const bound = structuredClone(raw);
  const boundQueueEntry = bound.entries.find((entry) => entry.id === CONVERSION_QUEUE_ID);
  boundQueueEntry.execution.command = [
    ...CONVERSION_QUEUE_COMMAND,
    ...CONVERSION_QUEUE_OPTIONS.flatMap(([option, field]) => [option, options[field]]),
  ];
  return bound;
}

function emit(report, status, json) {
  if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else if (report.verdict === "PASS") process.stdout.write("phase-close: all blocking gates passed; no release authority granted.\n");
  else process.stderr.write(`phase-close: ${report.verdict}: ${report.detail ?? report.failed.join(", ")}\n`);
  process.exitCode = status;
}

function refusal(options, code, detail) {
  emit({
    tool: "run-phase-close", schemaVersion: 2, root: options.root,
    cadence: options.cadence, verdict: "REFUSED", authorizing: false,
    releaseVerdict: "UNKNOWN", code, detail, failed: [],
    totals: { checks: 0, passed: 0, failed: 0 }, results: [],
  }, options.reportOnly ? 0 : 1, options.json);
}

let options;
try {
  options = parseArguments(process.argv.slice(2));
  options.root = realpathSync(options.root);
  if (!statSync(options.root).isDirectory()) throw new Error("root is not a directory");
} catch (error) {
  const fallback = options ?? { root: DEFAULT_ROOT, cadence: "normal", json: process.argv.includes("--json"), reportOnly: false };
  refusal(fallback, "ASSURANCE-ARGUMENT-REFUSED", error instanceof Error ? error.message : String(error));
}

if (options) {
  try {
    const manifestBytes = readFileSync(join(options.root, "governance", "phase-close-commands.json"));
    const raw = parseStrictJsonBytes(manifestBytes, {
      label: "governed phase-close manifest", maxBytes: 67_108_864,
    });
    const boundRaw = bindConversionQueueRuntime(raw, options);
    const admitted = validateAssuranceManifest(boundRaw, options.root);
    if (admitted.kind !== "accepted") throw Object.assign(new Error(admitted.detail), { code: admitted.code });
    const planned = buildCadencePlan(admitted.value, { cadence: options.cadence, platform: process.platform });
    if (planned.kind !== "accepted") throw Object.assign(new Error(planned.detail), { code: planned.code });
    const suiteLease = acquireSuiteLease({ root: options.root, commandClass: "phase-close" });
    let results;
    try {
      results = runCadencePlan(planned.value, { root: options.root, suiteLease });
    } finally {
      suiteLease.release();
    }
    const failed = results.filter((item) => !item.ok && item.result.tag === "BLOCKING_FAIL");
    const baseVerdict = failed.length === 0 ? "PASS" : "FAIL";
    const verdict = options.reportOnly
      ? baseVerdict === "PASS" ? "REPORT_ONLY_PASS" : "REPORT_ONLY_FAILED"
      : baseVerdict;
    const report = {
      tool: "run-phase-close", schemaVersion: 2, root: options.root,
      cadence: options.cadence, verdict, authorizing: false, releaseVerdict: "UNKNOWN",
      failed: failed.map((item) => item.name),
      totals: { checks: results.length, passed: results.length - failed.length, failed: failed.length },
      discharged: planned.value.discharged,
      results,
    };
    emit(report, failed.length > 0 && !options.reportOnly ? 1 : 0, options.json);
  } catch (error) {
    refusal(options, error?.code ?? "ASSURANCE-MANIFEST-REFUSED", error instanceof Error ? error.message : String(error));
  }
}
