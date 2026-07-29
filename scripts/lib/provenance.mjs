// provenance.mjs — TASK-BLD-003 / #216: a build-provenance stamp for generated artifacts so "what produced this,
// at what git commit, when" is auditable + freshness is checkable. Generators (code-index/gen-code-registry/kb-index)
// write a sidecar `provenance.json` next to their artifact via writeProvenance(); audit-provenance.mjs reads it.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isDeepStrictEqual } from "node:util";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCommit(value) {
  return value === null
    || (typeof value === "string" && /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(value));
}

function validTimestamp(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

export function validGeneratedProvenance(value) {
  return isRecord(value)
    && typeof value.tool === "string"
    && value.tool.length > 0
    && validCommit(value.gitCommit)
    && validTimestamp(value.builtAt)
    && typeof value.node === "string"
    && /^v\d+\.\d+\.\d+/.test(value.node);
}

/**
 * Compare a generated output without making a generated-artifact commit stale.
 *
 * `gitCommit` names the source snapshot used to generate the artifact, so it is
 * expected to lag HEAD after that artifact is committed. `builtAt` is likewise
 * informational. Both fields remain mandatory and structurally validated; all
 * other provenance fields and every non-provenance output remain exact.
 */
export function generatedOutputMatches(path, actual, expected) {
  if (basename(path) !== "provenance.json") return actual === expected;
  let actualBlock;
  let expectedBlock;
  try {
    actualBlock = JSON.parse(actual);
    expectedBlock = JSON.parse(expected);
  } catch {
    return false;
  }
  if (
    !validGeneratedProvenance(actualBlock)
    || !validGeneratedProvenance(expectedBlock)
  ) {
    return false;
  }
  if (
    (actualBlock.gitCommit === null) !== (expectedBlock.gitCommit === null)
  ) {
    return false;
  }
  const {
    builtAt: _actualBuiltAt,
    gitCommit: _actualGitCommit,
    ...actualStable
  } = actualBlock;
  const {
    builtAt: _expectedBuiltAt,
    gitCommit: _expectedGitCommit,
    ...expectedStable
  } = expectedBlock;
  return isDeepStrictEqual(actualStable, expectedStable);
}

/**
 * Reuse the published source snapshot during a non-mutating check.
 *
 * Generated outputs may legitimately embed the source snapshot time or
 * commit. After those outputs are committed, HEAD points at the artifact
 * commit rather than the source commit they describe. Reusing only the two
 * validated volatile fields prevents self-staleness; current tool and Node
 * identity still come from this process and all generator-specific stable
 * fields are derived again by the caller.
 */
export function provenanceForCheck(tool, root, path, check) {
  const current = provenance(tool, root);
  if (!check) return current;
  try {
    const published = JSON.parse(readFileSync(path, "utf8"));
    if (
      validGeneratedProvenance(published)
      && published.tool === tool
      && (published.gitCommit === null) === (current.gitCommit === null)
    ) {
      return {
        ...current,
        gitCommit: published.gitCommit,
        builtAt: published.builtAt,
      };
    }
  } catch {
    // Missing or malformed published provenance is compared and refused by
    // the caller; never invent a successful prior snapshot here.
  }
  return current;
}

export function gitCommit(root = process.cwd()) {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; }
}

/**
 * A reproducible `builtAt` so the provenance sidecar stops byte-churning on every regen (#133).
 * Precedence: SOURCE_DATE_EPOCH (reproducible-builds convention, as in generate-sbom.mjs) → the HEAD
 * commit date (deterministic given the commit `gitCommit` already records) → wall-clock (non-git fallback).
 * `builtAt` is INFORMATIONAL — audit-provenance.mjs keys freshness on exact
 * generator checks and validates the stamp structurally, never compares this
 * field to wall-clock time. A real source change still changes generated
 * semantics or the source snapshot recorded on the next publication.
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
