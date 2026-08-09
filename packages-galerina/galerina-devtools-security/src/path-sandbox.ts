// =============================================================================
// @galerina/devtools-security — Path Sandbox
//
// Segment-safe lexical path checking.
// Extracted from stdlib.ts Security Audit F3 fix so it can be:
//   - used standalone in CI (no compiler dep)
//   - tested independently
//   - imported by other packages
//
// The key fix over the naive startsWith approach:
//   startsWith is bypassable:  /app/root2 passes when root = /app/root
//   path.relative is safe:     returns '..' when target escapes root
// =============================================================================

import { resolve, relative, isAbsolute } from "node:path";

// SECURITY SCOPE: this module compares normalized path strings only. It does
// not open a filesystem object and cannot prove confinement across symlinks,
// junctions, reparse points, mount changes, or rename races. Authority-bearing
// I/O must use retained filesystem identity and revalidate the opened object.

export interface PathCheckResult {
  readonly allowed:    boolean;
  readonly assurance:  "lexical-only";
  readonly reason?:    string;
  readonly resolvedTo: string;
  readonly rel:        string;
}

/**
 * Check whether `userPath` is lexically contained within `fsRoot`.
 *
 * Uses path.relative() for segment-safe confinement — the only correct approach.
 * startsWith() is bypassable when root = "/app/root" and path = "/app/root2/evil".
 *
 * This is a lexical precheck only. `allowed: true` is not evidence that a later
 * filesystem open reaches the same object or remains beneath the root.
 *
 * @param fsRoot   - The allowed root directory (absolute or relative to cwd)
 * @param userPath - The user-provided path to verify
 */
export function checkPathSandbox(fsRoot: string, userPath: string): PathCheckResult {
  const root       = resolve(fsRoot);
  const target     = resolve(root, userPath);
  const rel        = relative(root, target);
  const escapes    = rel.startsWith("..") || isAbsolute(rel);

  if (escapes) {
    return {
      allowed: false,
      assurance: "lexical-only",
      reason: `Path '${userPath}' escapes the allowed root '${fsRoot}' (resolved: '${target}')`,
      resolvedTo: target,
      rel,
    };
  }
  return { allowed: true, assurance: "lexical-only", resolvedTo: target, rel };
}

/**
 * Quick boolean: does this path escape the sandbox?
 * Returns true when the path is dangerous (should be BLOCKED).
 */
export function isPathEscape(fsRoot: string, userPath: string): boolean {
  return !checkPathSandbox(fsRoot, userPath).allowed;
}

/** Common test cases for path sandbox validation. */
export const PATH_SANDBOX_TEST_VECTORS = [
  { root: "/app", path: "subdir/file.txt",     expectBlocked: false, label: "normal nested path" },
  { root: "/app", path: "../etc/passwd",        expectBlocked: true,  label: "parent traversal" },
  { root: "/app", path: "/etc/passwd",          expectBlocked: true,  label: "absolute outside root" },
  { root: "/app", path: "/app2/evil",           expectBlocked: true,  label: "sibling prefix bypass" },
  { root: "/app", path: "../../../secret",        expectBlocked: true,  label: "multi-level traversal outside root" },
  { root: "/app", path: "a/b/c/d/file.json",   expectBlocked: false, label: "deep nested allowed" },
] as const;
