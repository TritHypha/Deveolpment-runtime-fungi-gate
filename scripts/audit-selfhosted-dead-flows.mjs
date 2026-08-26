#!/usr/bin/env node
// =============================================================================
// audit-selfhosted-dead-flows.mjs — dead-flow detector for the RD-0528 self-hosted
// .fungi twins, accounting for TEST/CORPUS drivers (not just in-file dispatch).
// =============================================================================
// THE CLASS (2026-07-25 near-miss + 0277). A self-hosted .fungi flow can be
// "not dispatched by the module's own entry" yet still LIVE — the twin's TEST
// harness (wat-p9-*-parity R3 drivers + self-hosted-i3-functional-corpus) drives
// it directly by name (e.g. `govGuardCodes(src, "verifyGuardDecl", [...])`). Counting
// only IN-FILE call-sites reads such a flow as "dead" and invites deleting a LIVE
// governance check (verifyGuardDecl was one keystroke from deletion). This tool makes
// the liveness call mechanical AND fail-safe.
//
// LIVENESS (conservative — biased to KEEP, never to delete a live flow):
//   A flow F defined in a self-hosted .fungi file is LIVE iff F is referenced by
//   EITHER (a) a self-hosted .fungi NON-COMMENT line other than its own definition
//   (an in-.fungi call, incl. cross-module), OR (b) ANY reference in the compiler
//   package's tests/ (a whole-word match anywhere — including a string driver arg;
//   we do NOT try to distinguish a string driver from a test comment, because a
//   FALSE-LIVE only asks a human to look, whereas a FALSE-DEAD deletes live code).
//   Otherwise DEAD. The co-located .ts twin, dist/, build/ and .fungi-cache are
//   NEVER evidence: a same-named .ts method is the reference implementation, not a
//   consumer of the .fungi flow (counting it would be a false-LIVE the other way,
//   but that is the SAFE direction, so .ts is simply excluded to keep the signal clean).
//
// Usage: node scripts/audit-selfhosted-dead-flows.mjs [--self-test] [--json]
//        exit 0 always (report-only inventory); a phase-close gate can wrap it later.
// =============================================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SELF_HOSTED = join(ROOT, "packages-ts/galerina-core-compiler/src/self-hosted");
const TESTS = join(ROOT, "packages-ts/galerina-core-compiler/tests");

// ── pure core (self-tested, no I/O) ─────────────────────────────────────────

// A flow definition: an optional qualifier (pure|secure|guarded) then `flow NAME(`.
const FLOW_DEF = /^\s*(?:pure |secure |guarded )?flow\s+([A-Za-z_]\w*)\s*\(/;

/** Extract [{name, line}] flow definitions from one .fungi source. */
export function flowDefs(src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FLOW_DEF);
    if (m) out.push({ name: m[1], line: i + 1 });
  }
  return out;
}

/** Strip a `//` line comment (naive but sufficient: .fungi has no `//` inside strings in these twins). */
function stripComment(line) {
  const i = line.indexOf("//");
  return i === -1 ? line : line.slice(0, i);
}

/** Whole-word presence of `name` in `text`. */
export function referencesName(text, name) {
  return new RegExp(`\\b${name}\\b`).test(text);
}

/**
 * Decide liveness of flow `name` (defined at `defLine` in `defFile`) against evidence.
 * fungiSources: Map<file, src> of ALL self-hosted .fungi. testBlob: concatenated tests/ text.
 * Returns { live, where } — where ∈ {"in-fungi-call","test-harness",""}.
 */
export function isLive(name, defFile, defLine, fungiSources, testBlob) {
  // (a) an in-.fungi non-comment reference other than the definition line itself
  for (const [file, src] of fungiSources) {
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (file === defFile && i + 1 === defLine) continue; // skip the def line
      const code = stripComment(lines[i]);
      if (referencesName(code, name)) return { live: true, where: "in-fungi-call" };
    }
  }
  // (b) ANY reference in the test harness (conservative — string driver or otherwise)
  if (referencesName(testBlob, name)) return { live: true, where: "test-harness" };
  return { live: false, where: "" };
}

// ── I/O ──────────────────────────────────────────────────────────────────────
function readFungiSources(dir) {
  const m = new Map();
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return m; }
  for (const e of ents) {
    if (e.isFile() && e.name.endsWith(".fungi")) m.set(e.name, readFileSync(join(dir, e.name), "utf8"));
  }
  return m;
}
function readTestBlob(dir) {
  let blob = "";
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return blob; }
  for (const e of ents) {
    if (e.isFile() && /\.(mjs|cjs|js)$/.test(e.name)) blob += "\n" + readFileSync(join(dir, e.name), "utf8");
  }
  return blob;
}

// ── self-test — proves the exact near-miss failure mode is caught ────────────
if (process.argv.includes("--self-test")) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

  ok(flowDefs("pure flow foo(x: Int) -> Int\n{ return x }").some((d) => d.name === "foo"), "extracts a `pure flow` def");
  ok(flowDefs("guarded flow tokenize(s: String)\n").some((d) => d.name === "tokenize"), "extracts a `guarded flow` def");
  ok(flowDefs("// pure flow commented(x)\n").length === 0, "a def inside a // comment is not extracted");

  // THE near-miss scenario, synthetic. deadFlow: appears only as its def + a comment index.
  // liveByTest: same in-file shape (def only) BUT a test drives it by name (string arg).
  const fungi = new Map([["gov.fungi",
    "// index: 1. liveByTest  2. deadFlow\n" +
    "pure flow verifyGovernance(f)\n{ return checkBody(f) }\n" +
    "pure flow checkBody(f)\n{ return f }\n" +          // called in-fungi -> live
    "pure flow liveByTest(g)\n{ return g }\n" +          // NOT called in-fungi
    "pure flow deadFlow(g)\n{ return g }\n"]]);          // NOT called anywhere
  const defs = flowDefs(fungi.get("gov.fungi")).reduce((a, d) => (a[d.name] = d.line, a), {});
  const testBlob = `it("drives", async () => { const codes = await govCodes(src, "liveByTest"); });`;

  ok(isLive("checkBody", "gov.fungi", defs.checkBody, fungi, testBlob).live, "an IN-FUNGI-called flow is LIVE");
  ok(isLive("liveByTest", "gov.fungi", defs.liveByTest, fungi, testBlob).where === "test-harness",
     "★ a flow driven ONLY by a test STRING arg is LIVE (the near-miss: NOT dead despite 0 in-fungi callers)");
  ok(isLive("deadFlow", "gov.fungi", defs.deadFlow, fungi, testBlob).live === false,
     "a flow with NO in-fungi caller AND NO test reference is DEAD");
  ok(isLive("verifyGovernance", "gov.fungi", defs.verifyGovernance, fungi, testBlob).live === false,
     "an entry flow with no in-fungi caller and no test ref reads DEAD here (correct: this synthetic blob doesn't drive it)");

  console.log(`\n${fail === 0 ? "✅" : "❌"} dead-flow detector self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── main — inventory every self-hosted .fungi flow, flag the dead ────────────
if (!existsSync(SELF_HOSTED)) {
  console.error(`❌ dead-flows: ${SELF_HOSTED} not found`);
  process.exit(2);
}
const fungiSources = readFungiSources(SELF_HOSTED);
const testBlob = readTestBlob(TESTS);
const asJson = process.argv.includes("--json");

const dead = [];
let total = 0;
for (const [file, src] of fungiSources) {
  for (const d of flowDefs(src)) {
    total++;
    const v = isLive(d.name, file, d.line, fungiSources, testBlob);
    if (!v.live) dead.push({ file, name: d.name, line: d.line });
  }
}

if (asJson) {
  console.log(JSON.stringify({ tool: "selfhosted-dead-flows", total, dead }, null, 2));
} else {
  console.log(`self-hosted dead-flow inventory — ${total} flow(s) across ${fungiSources.size} .fungi; evidence = self-hosted .fungi (non-comment) + compiler-pkg tests/ (conservative: any test reference = LIVE; .ts twin/dist/build excluded).`);
  if (dead.length === 0) {
    console.log("  ✅ 0 dead flows (every self-hosted flow is called in-.fungi or driven by a test/corpus).");
  } else {
    for (const d of dead) console.log(`  ⚠ DEAD  ${d.file}:${d.line}  ${d.name}  — no in-.fungi caller AND no test/corpus reference`);
    console.log(`  ${dead.length} dead flow(s). Removal is safe ONLY after an independent re-verify (proposer≠verifier for governance code) — a false-dead here would delete a live flow.`);
  }
}
process.exit(0);
