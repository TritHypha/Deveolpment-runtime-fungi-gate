import { createHash } from "node:crypto";
import { resolve } from "node:path";

import ownedProcessModule from "./owned-process-tree.cjs";

const { runOwnedProcess: defaultRunOwnedProcess } = ownedProcessModule;

function validCommand(entry) {
  return entry !== null
    && typeof entry === "object"
    && !Array.isArray(entry)
    && typeof entry.id === "string"
    && entry.id !== ""
    && Array.isArray(entry.command)
    && entry.command.length > 0
    && entry.command.every((part) => typeof part === "string" && part !== "");
}

function outputEvidence(value) {
  const text = typeof value === "string" ? value : "";
  return {
    bytes: Buffer.byteLength(text),
    digest: `sha256:${createHash("sha256").update(text).digest("hex")}`,
    tail: text.slice(-4096),
  };
}

export async function executeImpactPlan(plan, options = {}) {
  const root = resolve(options.root ?? ".");
  const runOwnedProcess = options.runOwnedProcess ?? defaultRunOwnedProcess;
  const base = {
    tool: "run-impact-check",
    schemaVersion: 1,
    authorizing: false,
    planDigest: typeof plan?.planDigest === "string" ? plan.planDigest : null,
    results: [],
  };
  if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
    return { ...base, ok: false, code: "IMPACT-PLAN-MALFORMED" };
  }
  if (plan.fullRequired === true || plan.status === "FULL_REQUIRED") {
    return { ...base, ok: false, code: "IMPACT-FULL-REQUIRED" };
  }
  if (!Array.isArray(plan.commands) || plan.commands.some((entry) => !validCommand(entry))) {
    return { ...base, ok: false, code: "IMPACT-COMMAND-MALFORMED" };
  }
  if (typeof runOwnedProcess !== "function") {
    return { ...base, ok: false, code: "IMPACT-PROCESS-BOUNDARY-MISSING" };
  }
  const results = [];
  for (const entry of plan.commands) {
    const started = Date.now();
    const executable = entry.command[0] === "node" ? process.execPath : entry.command[0];
    const childEnvironment = { ...process.env };
    delete childEnvironment.NODE_TEST_CONTEXT;
    const child = await runOwnedProcess({
      command: executable,
      args: entry.command.slice(1),
      cwd: root,
      env: childEnvironment,
      timeoutMs: 1_800_000,
      maxOutputBytes: 64 * 1024 * 1024,
      windowsHide: true,
    });
    const ok = child !== null
      && typeof child === "object"
      && child.status === 0
      && child.signal === null
      && child.timedOut === false
      && child.outputLimitExceeded === false
      && child.spawnError === null
      && !(child.cleanupAttempted && !child.cleanupAcknowledged);
    results.push({
      id: entry.id,
      ok,
      exitCode: Number.isInteger(child?.status) ? child.status : null,
      signal: child?.signal ?? null,
      durationMs: Date.now() - started,
      stdout: outputEvidence(child?.stdout),
      stderr: outputEvidence(child?.stderr),
      processControl: {
        cleanupAttempted: child?.cleanupAttempted === true,
        cleanupAcknowledged: child?.cleanupAcknowledged === true,
        timedOut: child?.timedOut === true,
      },
    });
  }
  const ok = results.every((result) => result.ok);
  return {
    ...base,
    ok,
    code: ok ? "IMPACT-PASS" : "IMPACT-FAILED",
    results,
  };
}
