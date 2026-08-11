#!/usr/bin/env node
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCadencePlan } from "./lib/assurance-fabric/cadence-plan.mjs";
import { runCadencePlan } from "./lib/assurance-fabric/cadence-runner.mjs";
import { validateAssuranceManifest } from "./lib/assurance-fabric/manifest.mjs";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";
import suiteLeaseModule from "./lib/suite-run-lease.cjs";

const { acquireSuiteLease } = suiteLeaseModule;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);

function parseArguments(argv) {
  const result = { root: DEFAULT_ROOT, cadence: "normal", json: false, reportOnly: false };
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
    } else throw new Error(`unknown option ${arg}`);
  }
  if (seen.has("--cadence") && seen.has("--tier")) throw new Error("--cadence and --tier are mutually exclusive");
  if (!CADENCES.has(result.cadence)) throw new Error("cadence is outside the closed vocabulary");
  return result;
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
    const admitted = validateAssuranceManifest(raw, options.root);
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
