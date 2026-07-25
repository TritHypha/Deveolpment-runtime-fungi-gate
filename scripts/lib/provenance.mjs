// provenance.mjs — TASK-BLD-003 / #216: a build-provenance stamp for generated artifacts so "what produced this,
// at what git commit, when" is auditable + freshness is checkable. Generators (code-index/gen-code-registry/kb-index)
// write a sidecar `provenance.json` next to their artifact via writeProvenance(); audit-provenance.mjs reads it.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function gitCommit(root = process.cwd()) {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; }
}

/**
 * A reproducible `builtAt` so the provenance sidecar stops byte-churning on every regen (#133).
 * Precedence: SOURCE_DATE_EPOCH (reproducible-builds convention, as in generate-sbom.mjs) → the HEAD
 * commit date (deterministic given the commit `gitCommit` already records) → wall-clock (non-git fallback).
 * `builtAt` is INFORMATIONAL — audit-provenance.mjs keys freshness on file mtimes and stamping on
 * `gitCommit`, never on this field — so pinning it changes nothing a gate reads. A real source change
 * still moves the commit + `gitCommit`.
 */
export function builtAtStamp(root = process.cwd()) {
  const sde = process.env.SOURCE_DATE_EPOCH;
  let epoch = sde && /^\d+$/.test(sde) ? Number(sde) : NaN;
  if (!Number.isFinite(epoch)) {
    try { epoch = Number(execFileSync("git", ["show", "-s", "--format=%ct", "HEAD"], { cwd: root, encoding: "utf8" }).trim()); } catch { epoch = NaN; }
  }
  return Number.isFinite(epoch) ? new Date(epoch * 1000).toISOString() : new Date().toISOString();
}

/** Build the provenance block: tool name, the HEAD commit at generation time, a deterministic timestamp, and the node version. */
export function provenance(tool, root = process.cwd()) {
  return { tool, gitCommit: gitCommit(root), builtAt: builtAtStamp(root), node: process.version };
}

/** Write `<outDir>/provenance.json` for a generated artifact. Called by each generator after it writes its artifact. */
export function writeProvenance(outDir, tool, root = process.cwd()) {
  const block = provenance(tool, root);
  writeFileSync(join(outDir, "provenance.json"), JSON.stringify(block, null, 2) + "\n");
  return block;
}
