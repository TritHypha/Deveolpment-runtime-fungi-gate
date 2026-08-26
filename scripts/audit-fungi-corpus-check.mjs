#!/usr/bin/env node
// audit-fungi-corpus-check.mjs — fail-CLOSED gate: every positive `.fungi` in
// the repo must pass `galerina check`; every intentional negative must declare
// and continue to emit one exact diagnostic set.
//
// WHY THIS EXISTS (2026-07-15): the flagship `examples/auth-service/sovereignTransaction.fungi` had
// rotted to a HARD ERROR — `authority { }` nested inside `contract { }`, rejected deny-by-default
// (FUNGI-SYNTAX-011) — and NOTHING noticed. phase-close checks `tests/patterns/*.fungi` (9 files) and
// the twin audit covers the self-hosted twins, but the 447-file tracked `.fungi` corpus had no compile
// gate. An example that does not compile teaches broken syntax to everyone who copies it. The instance
// was fixed; THIS is the detector, so the class cannot recur.
//
// DESIGN
//  - FIND via myco (the graph-indexed finder — house rule: no glob/grep discovery), token query
//    `-f fungi` then an `.fungi`-extension filter (the dotted query `.fungi` under-matched: 283 of 447 —
//    caught by the git cross-check below). UNION with `git ls-files "*.fungi"` (git's index IS the
//    tracked-corpus source of truth); any tracked file myco missed is reported as FINDER DRIFT so a
//    finder hole can never silently shrink the gate.
//  - ADJUDICATE via the REAL `galerina check` (spawned per file — the CLI refuses directories), never a
//    re-implementation: a private copy of the pipeline would drift from the CLI and the gate would lie.
//  - CACHE by (size, mtimeMs) under build/fungi-corpus-check/ so only CHANGED files re-check: the first
//    sweep costs minutes, every later run seconds — cheap enough for the phase-close cadence.
//  - DELEGATE only docs/examples/** (audit-example-diagnostics.mjs owns that
//    corpus). Elsewhere, `/// expected_diagnostics: CODE` or an exact adjacent
//    `<file>.fungi.expected.diagnostics.txt` sidecar is validated, never skipped.
//  - RATCHET: the implicit baseline may only SHRINK. The update command refuses
//    growth; new failure, new code, stale ownership, or a fixed baseline row is RED.
//
// Usage:
//   node scripts/audit-fungi-corpus-check.mjs --self-test          # prove the detector fires (CI first)
//   node scripts/audit-fungi-corpus-check.mjs                      # enforce: exit 1 on NEW breakage
//   node scripts/audit-fungi-corpus-check.mjs --update-baseline    # re-record (deliberate; diff-reviewed)
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { compilerContentFingerprint } from "./lib/compiler-content-fingerprint.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(ROOT, "scripts", "baselines", "fungi-corpus-check.json");
const CACHE_DIR = join(ROOT, "build", "fungi-corpus-check");
const CACHE = join(CACHE_DIR, "cache.json");
const MYCO = resolve(ROOT, "packages-ts", "galerina-tools-myco", "dist", "cli.js");
// node/git are real executables — spawn them directly. `shell:true` would be needed only for .cmd
// shims (npm) and triggers Node's DEP0190 arg-concatenation warning; no shell = no concat hazard.
const SPAWN = { encoding: "utf8", shell: false };

// ── FIND ─────────────────────────────────────────────────────────────────────────────────────
function mycoFungi() {
  if (!existsSync(MYCO)) return { list: null, note: "myco dist not built (packages-ts/galerina-tools-myco — run `npm run build` there)" };
  const r = spawnSync("node", [MYCO, "-f", "fungi", ROOT, "--json", "--no-color", "-n", "9000"],
    { ...SPAWN, timeout: 180000 });
  const stdout = r.stdout ?? "";
  const jsonStart = stdout.indexOf("{"); // an index-refresh banner may precede the JSON — skip to it
  if (jsonStart < 0) return { list: null, note: `myco returned no JSON (exit ${r.status})` };
  try {
    const parsed = JSON.parse(stdout.slice(jsonStart));
    if (parsed.summary?.truncated) return { list: null, note: "myco result truncated — raise -n" };
    const list = [...new Set((parsed.matches ?? [])
      .map((m) => String(m.path ?? "").replace(/\\/g, "/"))
      .filter((p) => p.endsWith(".fungi")))];
    return { list, note: null };
  } catch (e) { return { list: null, note: `myco JSON parse failed: ${String(e).slice(0, 80)}` }; }
}
function gitFungi() {
  const r = spawnSync("git", ["ls-files", "*.fungi"], { ...SPAWN, cwd: ROOT, timeout: 60000 });
  return (r.stdout ?? "").split(/\r?\n/).map((s) => s.trim().replace(/\\/g, "/")).filter((s) => s.endsWith(".fungi"));
}
function findFungi() {
  const tracked = gitFungi();
  const { list: viaMyco, note } = mycoFungi();
  if (viaMyco === null) {
    // Degraded (myco unavailable): git's index still gives the full TRACKED corpus — the gate holds.
    return { files: tracked, finder: `git ls-files only (myco degraded: ${note})`, finderDrift: [] };
  }
  const union = [...new Set([...viaMyco, ...tracked])].sort();
  const finderDrift = tracked.filter((f) => !viaMyco.includes(f)); // tracked but missed by the graph finder
  return { files: union, finder: `myco graph finder (${viaMyco.length}) ∪ git index (${tracked.length})`, finderDrift };
}

// ── scope and explicit diagnostic ownership ────────────────────────────────────────────────
const ownedElsewhere = (rel) =>
  rel.startsWith("docs/examples/") // audit-example-diagnostics.mjs owns that corpus
  || rel.startsWith("build/");     // generated tree — no authored .fungi belongs there (incl. the self-test plants)
const DIAGNOSTIC_CODE = /^FUNGI-[A-Z][A-Z0-9]*-\d+[A-Za-z]?$/;
const EXACT_SIDECAR_SUFFIX = ".fungi.expected.diagnostics.txt";

function parseExpectedCodes(text, label) {
  const values = String(text)
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 1 && values[0].toLowerCase() === "none") {
    return { codes: [], error: null };
  }
  if (
    values.length === 0
    || values.some((value) => !DIAGNOSTIC_CODE.test(value))
    || new Set(values).size !== values.length
  ) {
    return {
      codes: [],
      error:
        `${label} must contain a non-empty, duplicate-free list of exact `
        + "FUNGI-*-NNN codes (or the single word none)",
    };
  }
  return { codes: values.sort(), error: null };
}

function diagnosticExpectation(rel) {
  let source;
  try {
    source = readFileSync(join(ROOT, rel), "utf8");
  } catch (error) {
    return { codes: [], error: `cannot read ${rel}: ${error.message}` };
  }
  const headers = [
    ...source.matchAll(/^\/\/\/\s*expected_diagnostics:\s*(.+)$/gim),
  ];
  const sidecar = `${join(ROOT, rel)}.expected.diagnostics.txt`;
  const hasSidecar = existsSync(sidecar);
  if (headers.length > 1 || (headers.length === 1 && hasSidecar)) {
    return {
      codes: [],
      error: `${rel} has ambiguous diagnostic ownership`,
    };
  }
  if (headers.length === 1) {
    return parseExpectedCodes(headers[0][1], `${rel} expected_diagnostics`);
  }
  if (hasSidecar) {
    return parseExpectedCodes(
      readFileSync(sidecar, "utf8"),
      relative(ROOT, sidecar).replace(/\\/g, "/"),
    );
  }
  return { codes: [], error: null };
}

function diagnosticOwnershipViolation(expectation, verdict) {
  if (expectation.error) return expectation.error;
  if (expectation.codes.length === 0) {
    return verdict.ok
      ? null
      : `positive source emitted ${verdict.codes.join(", ") || "an unclassified error"}`;
  }
  if (verdict.ok) {
    return `expected ${expectation.codes.join(", ")} but the fixture passed`;
  }
  const actual = [...verdict.codes].sort();
  return actual.join("\0") === expectation.codes.join("\0")
    ? null
    : `expected ${expectation.codes.join(", ")}; got ${actual.join(", ") || "no diagnostic code"}`;
}

function implicitBaselineGrowth(base, failing) {
  return Object.keys(failing).filter((rel) => !(rel in base));
}

function diagnosticSidecars() {
  const result = spawnSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      `*${EXACT_SIDECAR_SUFFIX}`,
    ],
    { ...SPAWN, cwd: ROOT, timeout: 60000 },
  );
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function orphanSidecars(sidecars, fungiFiles) {
  const corpus = new Set(fungiFiles);
  return sidecars.filter((sidecar) => {
    const owner = sidecar.slice(0, -".expected.diagnostics.txt".length);
    return !owner.endsWith(".fungi") || !corpus.has(owner);
  });
}

// ── ADJUDICATE (real CLI) + cache by (size, mtime) ───────────────────────────────────────────
function checkFile(rel, strictTypes = false) {
  const args = [join(ROOT, "galerina.mjs"), "check", rel];
  if (strictTypes) args.push("--strict-types");
  const r = spawnSync("node", args,
    { ...SPAWN, cwd: ROOT, timeout: 60000 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // A real code ends in a numeric segment (FUNGI-SYNTAX-011); the CLI's "+N FUNGI-TYPE-* advisory"
  // footer must not pollute the baseline's code lists.
  return { ok: r.status === 0, codes: [...new Set([...out.matchAll(/(FUNGI-[A-Z][A-Z0-9]*-\d+[A-Za-z]?)/g)].map((m) => m[1]))].sort() };
}
const loadJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; } };

// ── compiler-build fingerprint (cache invalidation) ───────────────────────────────────────────
// The per-file cache keys on the .fungi's (size, mtime) — but the ADJUDICATOR is `galerina.mjs check`,
// the COMPILED compiler. If the compiler changes (e.g. a new checker rule) while no .fungi changes, a
// pure (size, mtime) cache replays STALE verdicts and the gate silently trusts old results — a fail-OPEN
// (found 2026-07-16: a fresh tri-lint rule left every .fungi mtime untouched, so the gate never re-ran).
// So the whole cache is scoped to the exact executable content of the adjudicator (galerina.mjs +
// core-compiler dist). A content change invalidates every row, but a byte-identical rebuild does not.
// This is stronger than the old size/mtime proxy and avoids spending ~80s after every no-op rebuild.
const compilerFingerprint = () => compilerContentFingerprint(ROOT);

function sweep(candidates) {
  const fp = compilerFingerprint();
  const raw = loadJson(CACHE, { entries: {} });
  const cache = (raw.fingerprint === fp ? raw.entries : {}) ?? {}; // compiler changed => whole cache misses
  const fresh = {};
  const failing = {};
  let checked = 0, cached = 0;
  for (const rel of candidates) {
    let st; try { st = statSync(join(ROOT, rel)); } catch { continue; } // vanished between find and sweep
    const expectation = diagnosticExpectation(rel);
    const strictTypes = expectation.codes.length > 0;
    const key = `${st.size}:${Math.round(st.mtimeMs)}:${strictTypes ? "strict" : "plain"}`;
    const hit = cache[rel];
    let verdict;
    if (hit !== undefined && hit.key === key) { verdict = hit; cached++; }
    else {
      const { ok, codes } = checkFile(rel, strictTypes);
      verdict = { key, ok, codes };
      checked++;
    }
    fresh[rel] = verdict;
    if (!verdict.ok) failing[rel] = verdict.codes;
  }
  try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(CACHE, JSON.stringify({ generated: "audit-fungi-corpus-check", fingerprint: fp, entries: fresh }, null, 2)); } catch { /* cache is an optimisation, never a failure */ }
  return { failing, verdicts: fresh, checked, cached };
}

// ── SELF-TEST: a gate that cannot fail is worse than none ────────────────────────────────────
if (process.argv.includes("--self-test")) {
  const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
  const { files, finder, finderDrift } = findFungi();
  const tracked = gitFungi();
  ok(files.length >= tracked.length && tracked.length > 300, `corpus found: ${files.length} .fungi via ${finder}`);
  ok(finderDrift.length === 0, finderDrift.length === 0
    ? "graph finder covers the FULL tracked corpus (0 finder drift vs git index)"
    : `FINDER DRIFT: myco missed ${finderDrift.length} tracked .fungi (e.g. ${finderDrift[0]}) — fix the query/index`);
  // The detector must FIRE on a planted broken file…
  mkdirSync(join(ROOT, "build", "_selftest"), { recursive: true });
  const bad = "build/_selftest/broken-selftest.fungi";
  writeFileSync(join(ROOT, bad), `@version 1\npure flow x() -> Int\ncontract {\n  totally_unknown_block { level 1 }\n}\n{\n  return 1\n}\n`);
  const badRes = checkFile(bad);
  ok(!badRes.ok && badRes.codes.includes("FUNGI-SYNTAX-011"), `detector FIRES on a planted broken .fungi (${badRes.codes.join(",")})`);
  // …and stay SILENT on a clean one (non-vacuous both ways).
  const good = "build/_selftest/good-selftest.fungi";
  writeFileSync(join(ROOT, good), `@version 1\npure flow x() -> Int\ncontract {\n  intent { "ok" }\n}\n{\n  return 1\n}\n`);
  ok(checkFile(good).ok, "detector stays SILENT on a clean .fungi");
  ok(/^[0-9a-f]{16}$/.test(compilerFingerprint()) && compilerFingerprint() === compilerFingerprint(),
    "compiler fingerprint is a stable hash — cache is scoped to the compiler build (a new rule busts it)");
  ok(ownedElsewhere("docs/examples/Level-4-Security/169-secret-comparison/example.fungi"), "docs/examples/** deferred to audit-example-diagnostics");
  ok(
    implicitBaselineGrowth(
      { "held.fungi": ["FUNGI-TEST-001"] },
      {
        "held.fungi": ["FUNGI-TEST-001"],
        "new.fungi": ["FUNGI-TEST-002"],
      },
    ).join() === "new.fungi",
    "implicit baseline growth is refused",
  );
  ok(
    orphanSidecars(
      ["tests/orphan.fungi.expected.diagnostics.txt"],
      ["tests/owned.fungi"],
    ).length === 1,
    "orphan diagnostic sidecar is refused",
  );
  ok(
    diagnosticOwnershipViolation(
      { codes: ["FUNGI-TEST-001"], error: null },
      { ok: false, codes: ["FUNGI-TEST-002"] },
    )?.startsWith("expected FUNGI-TEST-001"),
    "stale exact diagnostic ownership is refused",
  );
  ok(
    diagnosticOwnershipViolation(
      { codes: [], error: null },
      { ok: false, codes: ["FUNGI-TEST-003"] },
    )?.startsWith("positive source emitted"),
    "positive source diagnostics are refused",
  );
  console.log(process.exitCode ? "  fungi-corpus-check self-test FAILED" : "  fungi-corpus-check self-test: finder coverage + detector verified ✅");
  process.exit(process.exitCode ?? 0);
}

// ── enforce / record ─────────────────────────────────────────────────────────────────────────
const { files, finder, finderDrift } = findFungi();
const candidates = files.filter((f) => !ownedElsewhere(f));
const { verdicts, checked, cached } = sweep(candidates);
const base = loadJson(BASELINE, { knownFailing: {} }).knownFailing ?? {};
const positiveFailing = {};
const ownershipProblems = [];
let explicitlyOwned = 0;
for (const rel of candidates) {
  const expectation = diagnosticExpectation(rel);
  const verdict = verdicts[rel] ?? { ok: false, codes: [] };
  if (expectation.error) {
    ownershipProblems.push(`${rel}: ${expectation.error}`);
  } else if (expectation.codes.length > 0) {
    explicitlyOwned += 1;
    const violation = diagnosticOwnershipViolation(expectation, verdict);
    if (violation) ownershipProblems.push(`${rel}: ${violation}`);
  } else if (!verdict.ok) {
    positiveFailing[rel] = verdict.codes;
  }
}
const orphanedSidecars = orphanSidecars(diagnosticSidecars(), files);
const baselineGrowth = implicitBaselineGrowth(base, positiveFailing);

if (process.argv.includes("--update-baseline")) {
  if (
    baselineGrowth.length > 0
    || ownershipProblems.length > 0
    || orphanedSidecars.length > 0
  ) {
    console.error(
      "  REFUSED: --update-baseline may only shrink existing implicit debt; "
      + "new failures or diagnostic-ownership errors must be fixed.",
    );
    process.exit(1);
  }
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, JSON.stringify({
    note: "Implicit known-failing positive .fungi (galerina check). RATCHET: may only SHRINK; intentional negatives require exact adjacent ownership.",
    generated: "audit-fungi-corpus-check",
    knownFailing: positiveFailing,
  }, null, 2) + "\n");
  console.log(`  baseline shrunk: ${Object.keys(positiveFailing).length} implicit failures of ${candidates.length} checked (${explicitlyOwned} explicit negatives; ${checked} fresh, ${cached} cached; ${finder}).`);
  process.exit(0);
}

const nowFailing = Object.keys(positiveFailing);
const NEW_BREAKS = baselineGrowth;
const NEW_CODES = nowFailing.filter((f) => f in base && positiveFailing[f].some((c) => !(base[f] ?? []).includes(c)))
  .map((f) => `${f}  new: ${positiveFailing[f].filter((c) => !(base[f] ?? []).includes(c)).join(", ")}`);
const FIXED = Object.keys(base).filter((f) => !(f in positiveFailing));

console.log(`  fungi-corpus-check: ${candidates.length} governed of ${files.length} .fungi (${finder}); ${checked} checked, ${cached} cached; ${explicitlyOwned} exact negative fixtures; ${nowFailing.length} implicit failures vs ${Object.keys(base).length} baselined.`);
if (finderDrift.length) console.log(`  ⚠️  finder drift: myco missed ${finderDrift.length} tracked .fungi (union with the git index kept the gate complete) — file on the myco roadmap.`);

const problems = [];
if (orphanedSidecars.length) problems.push(`ORPHAN diagnostic sidecar (${orphanedSidecars.length}):\n${orphanedSidecars.map((f) => `     ${f}`).join("\n")}`);
if (ownershipProblems.length) problems.push(`DIAGNOSTIC ownership violation (${ownershipProblems.length}):\n${ownershipProblems.map((f) => `     ${f}`).join("\n")}`);
if (NEW_BREAKS.length) problems.push(`NEW breakage (${NEW_BREAKS.length}):\n${NEW_BREAKS.map((f) => `     ${f}  [${positiveFailing[f].join(", ")}]`).join("\n")}`);
if (NEW_CODES.length) problems.push(`NEW diagnostic on a known-bad file (${NEW_CODES.length}):\n${NEW_CODES.map((s) => `     ${s}`).join("\n")}`);
if (FIXED.length) problems.push(`FIXED — remove from the baseline so it only shrinks (${FIXED.length}):\n${FIXED.map((f) => `     ${f}`).join("\n")}`);

if (problems.length) {
  console.error(`\n  ❌ fungi-corpus-check:\n\n  ${problems.join("\n\n  ")}\n`);
  console.error(`  Fix: every positive .fungi must pass \`node galerina.mjs check <file>\`.`);
  console.error(`  An intentional negative must carry an exact \`expected_diagnostics:\` header or`);
  console.error(`  adjacent \`<file>.fungi.expected.diagnostics.txt\` sidecar. --update-baseline may only shrink.`);
  process.exit(1);
}
console.log(`  ✅ fungi-corpus-check: explicit negatives exact; no new breakage (${nowFailing.length} implicit failures held at the shrink-only ratchet).`);
