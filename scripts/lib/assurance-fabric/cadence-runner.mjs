import { resolve } from "node:path";
import ownedProcessTree from "../owned-process-tree.cjs";
import {
  RESULT_TAG,
  SOURCE_CLASS,
  TRIT,
  makeAssuranceResult,
} from "./result-model.mjs";
import { isAcceptedCadencePlan } from "./cadence-plan.mjs";
import { parseStrictJsonBytes } from "./strict-json.mjs";

const { runOwnedProcessSync } = ownedProcessTree;
const GRAPH_CHILDREN = Object.freeze([
  "package graph", "project graph", "graph integrity", "KB graph",
  "dev-tool index", "Fungi source capability inventory", "semantic assurance graph",
]);

function childEnvironment() {
  const admitted = {};
  const entries = Object.entries(process.env);
  const copy = (name, aliases) => {
    const item = entries.find(([key, value]) => aliases.includes(key.toLowerCase())
      && typeof value === "string" && value.length > 0);
    if (item) admitted[name] = item[1];
  };
  copy("PATH", ["path"]);
  if (process.platform === "win32") {
    copy("SystemRoot", ["systemroot"]); copy("WINDIR", ["windir"]);
    copy("ComSpec", ["comspec"]); copy("PATHEXT", ["pathext"]);
    copy("TEMP", ["temp"]); copy("TMP", ["tmp"]);
  } else {
    copy("TMPDIR", ["tmpdir"]); copy("LANG", ["lang"]); copy("LC_ALL", ["lc_all"]);
  }
  const cacheRoot = admitted.TEMP ?? admitted.TMP ?? admitted.TMPDIR;
  if (cacheRoot) admitted.GOCACHE = resolve(cacheRoot, "galerina-go-build-cache");
  admitted.GIT_CONFIG_NOSYSTEM = "1";
  admitted.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  admitted.NPM_CONFIG_USERCONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
  admitted.NO_UPDATE_NOTIFIER = "1";
  return admitted;
}

function exactGraphReceipt(stdout, root) {
  const value = parseStrictJsonBytes(Buffer.from(stdout, "utf8"), {
    label: "graph-all semantic receipt",
    maxBytes: 1_048_576,
  });
  if (!value || typeof value !== "object" || Array.isArray(value)
      || value.tool !== "graph-all" || value.schemaVersion !== 1 || value.mode !== "check"
      || !Array.isArray(value.children) || value.children.length !== GRAPH_CHILDREN.length) return false;
  const names = new Set();
  for (const child of value.children) {
    if (!child || typeof child !== "object" || Array.isArray(child)
        || !GRAPH_CHILDREN.includes(child.name) || names.has(child.name)
        || !Array.isArray(child.args) || !Number.isSafeInteger(child.status)) return false;
    names.add(child.name);
  }
  const semantic = value.children.find((child) => child.name === "semantic assurance graph");
  return names.size === GRAPH_CHILDREN.length && semantic?.status === 0
    && JSON.stringify(semantic.args) === JSON.stringify([
      "scripts/gen-assurance-semantic-graph.mjs", "--root", root, "--check",
    ]);
}

function resultFor(entry, ok, detail) {
  if (ok) {
    return makeAssuranceResult({
      tag: RESULT_TAG.LEGACY_EXIT,
      trit: TRIT.UNKNOWN,
      sourceClass: SOURCE_CLASS.LEGACY_EXIT,
      subjectId: entry.id,
      detail,
    });
  }
  const advisory = entry.authorityClass === "advisory" || entry.authorityClass === "informational";
  return makeAssuranceResult({
    tag: advisory ? RESULT_TAG.ADVISORY_FINDINGS : RESULT_TAG.BLOCKING_FAIL,
    trit: TRIT.DISTRUSTED,
    sourceClass: SOURCE_CLASS.LEGACY_EXIT,
    subjectId: entry.id,
    detail,
  });
}

function summarise(entry, output, ok) {
  const text = `${output.stdout || ""}${output.stderr || ""}`;
  const explicit = text.match(/^SUMMARY:\s*(.+)$/m);
  if (explicit) return explicit[1].trim();
  const pass = text.match(/(?:^|\n)[^\n]*\bpass\s+(\d[\d,]*)/i);
  const fail = text.match(/(?:^|\n)[^\n]*\bfail\s+(\d+)/i);
  if (pass) return `${pass[1]} tests${fail && fail[1] !== "0" ? `, ${fail[1]} FAIL` : " pass"}`;
  return ok ? "ok" : Number.isSafeInteger(output.status) ? `FAILED (exit ${output.status})` : "missing numeric exit status";
}

export function runCadencePlan(plan, context) {
  if (!isAcceptedCadencePlan(plan)) throw new TypeError("an accepted cadence plan is required");
  const root = resolve(context.root);
  const outputs = new Map();
  const results = [];
  for (const entry of plan.entries) {
    const started = Date.now();
    process.stderr.write(`PHASE-CLOSE START ${entry.id}\n`);
    if (entry.execution.kind === "predecessor-receipt") {
      const predecessor = outputs.get(entry.execution.predecessorId);
      let ok = false;
      try {
        ok = predecessor !== undefined
          && entry.execution.verifierId === "graph-all-semantic-v1"
          && exactGraphReceipt(predecessor.stdout, root);
      } catch {
        ok = false;
      }
      const detail = ok ? "semantic coverage validated from exact graph-all result" : "predecessor receipt refused";
      const assuranceResult = resultFor(entry, ok, detail);
      const processControl = predecessor?.processControl ?? {
        ownedTree: false,
        cleanupAttempted: false,
        cleanupAcknowledged: false,
        timedOut: false,
        outputLimitExceeded: false,
      };
      results.push(Object.freeze({
        name: entry.id, ok, durationMs: Date.now() - started,
        exitCode: ok ? 0 : 1, signal: "ABSENT", detail,
        processControl,
        result: assuranceResult,
      }));
      if (typeof context.observe === "function") {
        context.observe(Object.freeze({
          entry,
          output: Object.freeze({ status: ok ? 0 : 1, signal: undefined, stdout: "", stderr: "" }),
          processControl,
          result: assuranceResult,
        }));
      }
      process.stderr.write(`PHASE-CLOSE END ${entry.id} ${ok ? "PASS" : "FAIL"} ${Date.now() - started}ms\n`);
      continue;
    }
    const [declaredExecutable, ...declaredArgs] = entry.execution.command;
    let command = declaredExecutable === "node" ? process.execPath : declaredExecutable;
    let args = declaredArgs;
    if (process.platform === "win32" && declaredExecutable === "npm") {
      command = process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe";
      args = ["/d", "/s", "/c", "npm.cmd", ...declaredArgs];
    }
    const baseEnv = childEnvironment();
    baseEnv.GALERINA_ASSURANCE_CADENCE = plan.cadence;
    const env = entry.leasePolicy === "suite-child"
      ? context.suiteLease.childEnvironment(baseEnv)
      : baseEnv;
    const output = runOwnedProcessSync({
      command, args, cwd: resolve(root, entry.cwd), env,
      timeoutMs: entry.timeoutMs, maxOutputBytes: entry.maxOutputBytes, windowsHide: true,
    });
    const ok = output.error === undefined && output.signal === null
      && Number.isSafeInteger(output.status) && entry.acceptedExitCodes.includes(output.status);
    const detail = output.error ? `spawn failed: ${output.error.message}`
      : output.signal ? `terminated by signal ${output.signal}`
        : Number.isSafeInteger(output.status) ? summarise(entry, output, ok)
          : "missing numeric exit status";
    const processControl = {
      ownedTree: output.owned !== null && output.owned.spawnError === null,
      cleanupAttempted: output.owned?.cleanupAttempted === true,
      cleanupAcknowledged: output.owned?.cleanupAcknowledged === true,
      timedOut: output.owned?.timedOut === true,
      outputLimitExceeded: output.owned?.outputLimitExceeded === true,
    };
    outputs.set(entry.id, { stdout: output.stdout || "", processControl });
    const assuranceResult = resultFor(entry, ok, detail);
    results.push(Object.freeze({
      name: entry.id, ok, durationMs: Date.now() - started,
      exitCode: Number.isSafeInteger(output.status) ? output.status : -1,
      signal: output.signal ?? "ABSENT", detail, processControl,
      result: assuranceResult,
    }));
    if (typeof context.observe === "function") {
      context.observe(Object.freeze({ entry, output, processControl, result: assuranceResult }));
    }
    process.stderr.write(`PHASE-CLOSE END ${entry.id} ${ok ? "PASS" : "FAIL"} ${Date.now() - started}ms\n`);
  }
  return Object.freeze(results);
}
