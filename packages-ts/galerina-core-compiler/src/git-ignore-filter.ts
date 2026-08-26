// =============================================================================
// Galerina — git-ignore filter for ref-vs-worktree tools
//
// A worktree-walking tool that compares against a git ref must not treat
// git-IGNORED files (build artifacts, stranded test fixtures) as real inputs:
// an ignored file can never exist at any ref, so it reads as "added" on every
// run — e.g. a leftover build/*.fungi fixture declaring network.outbound kept
// the governance:diff gate permanently at "EXPANSION ⚠ WIDENS AUTHORITY",
// desensitizing review of the one gate meant to catch real authority widening.
//
// Untracked-but-not-ignored files are KEPT: a genuinely new source file is
// review signal, not noise.
// =============================================================================

import { spawnSync } from "node:child_process";

/**
 * Drop the git-IGNORED entries from a list of absolute file paths.
 *
 * One batched `git check-ignore --stdin` call (array args, no shell — OWASP F1).
 * If git is unavailable or cwd is not a repository, the list is returned
 * unchanged — the caller's ref-side lookups already degrade the same way.
 */
export function excludeGitIgnored(files: readonly string[], cwd: string): string[] {
  if (files.length === 0) return [];
  const rel = files.map(f => toRepoRel(f, cwd));
  const result = spawnSync("git", ["check-ignore", "--stdin"], {
    cwd,
    input: rel.join("\n"),
    encoding: "utf8",
    timeout: 15_000,
  });
  // check-ignore exit codes: 0 = some ignored, 1 = none ignored.
  // Anything else (128 = not a repo, spawn error = no git) → filter nothing.
  if (result.error !== undefined || (result.status !== 0 && result.status !== 1)) {
    return [...files];
  }
  const ignored = new Set(
    (result.stdout ?? "").split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0),
  );
  return files.filter((f, i) => !ignored.has(rel[i]!));
}

/** cwd-relative, forward-slashed path — the form check-ignore echoes back. */
function toRepoRel(file: string, cwd: string): string {
  return file
    .replace(cwd + "\\", "")
    .replace(cwd + "/", "")
    .replace(/\\/g, "/");
}
