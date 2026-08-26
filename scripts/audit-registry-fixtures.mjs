#!/usr/bin/env node
// =============================================================================
// audit-registry-fixtures.mjs — RUN the canonical registry's own known-answer tests
// =============================================================================
// THE GAP THIS CLOSES (found 2026-08-06, ticks 208-210):
//   ZTF-Knowledge-Bases/stdlib-gates.yaml — the file value-state-checker.ts names
//   as its source of truth for sinks — ships a `test_fixtures:` block:
//
//       accepted:  3 sources the registry says are CORRECT
//       rejected:  3 sources the registry says are WRONG, each labelled with the
//                  `expected_diagnostic` it must draw
//
//   The vendor wrote the known-answer tests, with the answers in the margin, and
//   NOTHING RUNS THEM. Measured: 0 of 163 scripts in scripts/ mention
//   `test_fixtures`, and 0 mention `stdlib-gates.yaml` at all.
//
//   What that costs, verified by executing them:
//     • `ai_guidance.safe_example` — the snippet the registry publishes FOR CODE
//       GENERATORS, and duplicated as the `validate_before_insert` accepted
//       fixture — draws FUNGI-VALUESTATE-006. `validate.email()` returns a
//       `protected` value (correctly: an email is PII) and the registry's
//       `transitions:` block never models `protected` as a validation output.
//       The published "do it this way" example does not compile.
//     • `direct_secret_equality` cannot fire its own expected diagnostic: it
//       compares two UNDECLARED identifiers, so nothing marks them secret. Bind
//       them through env.secret() and FUNGI-SECRET-002 fires correctly — the
//       vector is at fault, not the checker.
//
// SECOND GAP, closed as a side effect:
//   This is the FIRST audit in the repo to execute `runProductionSecurityGate` —
//   the gate that stands between a defect and a signed artifact. 0 of 163 do
//   today. Every other gate reasons about source; this one runs the thing.
//
// WHAT IS JUDGED, AND ON WHICH AXIS
//   The fixtures are flow BODIES, not whole files: the registry supplies no
//   contract, so this audit must synthesise one. An empty `effects { }` block
//   makes every fixture that touches an effectful call draw FUNGI-EFFECT-001 —
//   which measures the WRAPPER, not the fixture. (I made exactly that mistake
//   first and threw the run away.)
//
//   So each fixture is judged only on the axis it is about:
//     rejected → does its `expected_diagnostic` appear?  (presence: sound under
//                any contract, because extra diagnostics cannot hide one)
//     accepted → does any GOVERNANCE diagnostic appear — value-state, secret,
//                taint, governance? The effect-declaration family is excluded by
//                name, because its presence is an artifact of the synthesised
//                contract rather than a property of the fixture.
//   That exclusion is stated in the output every run, so nobody mistakes this
//   for a full production compile of the fixture.
//
// HONEST SKIPS
//   This audit needs the built compiler (dist/). When it is absent, every case
//   reports SKIPPED and the run exits 0 with the skip stated loudly — a check
//   that could not run must never print as passed. Under --strict a skip blocks.
//
// Run:  node scripts/audit-registry-fixtures.mjs
//       node scripts/audit-registry-fixtures.mjs --json
//       node scripts/audit-registry-fixtures.mjs --strict
//       node scripts/audit-registry-fixtures.mjs --self-test
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const rootIdx = process.argv.indexOf("--root");
const ROOT = rootIdx !== -1 ? process.argv[rootIdx + 1] : join(HERE, "..");
const DIST = join(ROOT, "packages-ts/galerina-core-compiler/dist/index.js");
const KB_DIR = process.env.GALERINA_KB_DIR || join(ROOT, "../ZTF-Knowledge-Bases");
const regIdx = process.argv.indexOf("--registry");
const REGISTRY = regIdx !== -1 ? process.argv[regIdx + 1] : join(KB_DIR, "stdlib-gates.yaml");

const AS_JSON = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");
const SELF_TEST = process.argv.includes("--self-test");

/** Diagnostic families that describe the CONTRACT this audit synthesised, not
 *  the fixture under test. Excluded from the accepted-arm verdict, and the
 *  exclusion is printed every run so it is never silently applied. */
const CONTRACT_ARTIFACT_CODES = /^FUNGI-(EFFECT|STDLIB)-/;

/** Individual codes that are contract-shaped despite living in a judged family.
 *
 *  Family names are not mechanisms. `FUNGI-GOV-002` — "writes to a database but
 *  declares no audit.write effect" — is a property of the CONTRACT this audit
 *  synthesises, exactly like the EFFECT family, even though it sits in GOV.
 *
 *  It does not fire today because the synthesised contract declares `effects {}`
 *  and the effect subsystem reports first. That is incidental: the moment this
 *  audit declares any effect, GOV-002 would be counted as a fixture property.
 *  Named individually rather than excluding the whole GOV family, because
 *  GOV-003 IS about the fixture — it is the response-sink rejection the registry
 *  itself specifies in `response_sinks[].diagnostic_on_reject`. */
const CONTRACT_SHAPED_CODES = new Set(["FUNGI-GOV-002"]);

/** Families that DO describe the fixture: the governance axes. */
const GOVERNANCE_CODES = /^FUNGI-(VALUESTATE|SECRET|TAINT|GOV)-/;

/** A code is judged against the fixture only if its family is a governance axis
 *  AND it is not one of the individually contract-shaped codes above. */
const judgesTheFixture = (code) => GOVERNANCE_CODES.test(code) && !CONTRACT_SHAPED_CODES.has(code);

// ── read the fixtures out of the registry ───────────────────────────────────
/** Parse `test_fixtures:` — `- name:`, optional `expected_diagnostic:`, and a
 *  `source: |` block scalar at a fixed indent. Returns [] if the block is
 *  absent, and the caller treats zero fixtures as a finding rather than a pass:
 *  a reader that silently finds nothing is the failure mode this family exists
 *  to prevent. */
export function readFixtures(text) {
  const out = { accepted: [], rejected: [] };
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^test_fixtures:/.test(l));
  if (start === -1) return out;
  let bucket = null, cur = null, inSrc = false;
  for (let i = start + 1; i < lines.length; i++) {
    const ln = lines[i];
    // A new top-level key ends the block.
    if (/^[A-Za-z#]/.test(ln)) break;
    let m;
    if ((m = ln.match(/^ {2}(accepted|rejected):\s*$/))) { bucket = m[1]; cur = null; inSrc = false; continue; }
    if ((m = ln.match(/^ {4}- name: (.+)$/))) {
      cur = { name: m[1].trim(), expected: null, src: [] };
      if (bucket) out[bucket].push(cur);
      inSrc = false; continue;
    }
    if (!cur) continue;
    if ((m = ln.match(/^ {6}expected_diagnostic: (.+)$/))) { cur.expected = m[1].trim(); inSrc = false; continue; }
    if (/^ {6}source: \|\s*$/.test(ln)) { inSrc = true; continue; }
    if (inSrc) {
      if (/^ {8}/.test(ln)) cur.src.push(ln.slice(8));
      else if (ln.trim() === "") cur.src.push("");
      else inSrc = false;
    }
  }
  for (const bkt of ["accepted", "rejected"]) {
    for (const f of out[bkt]) { f.source = f.src.join("\n").replace(/\s+$/, ""); delete f.src; }
  }
  return out;
}

/** Wrap a fixture body in the smallest legal flow. `secure` tier, because
 *  `governed` flows cannot execute and `pure` forbids the effects every fixture
 *  needs. The contract is deliberately minimal — see the header note on which
 *  axis each arm is judged on. */
export function wrapFixture(body) {
  const indented = body.split("\n").map((l) => (l ? "  " + l : "")).join("\n");
  return [
    "@version 1", "",
    "secure flow registryFixture() -> Int", "",
    "contract {",
    '  intent { "canonical stdlib-gates.yaml known-answer fixture" }',
    "  effects {}",
    "}", "{", indented, "  return 0", "}", "",
  ].join("\n");
}

// ── self-test ───────────────────────────────────────────────────────────────
// Proves the reader and the wrapper work on inputs whose answers are known,
// WITHOUT needing dist/ — so the self-test stays green in a clean checkout and
// the meta-gate can always run it.
if (SELF_TEST) {
  const cases = [];
  const check = (label, ok, detail) => cases.push({ label, ok: !!ok, detail: detail ?? "" });

  const FIXTURE_YAML = [
    "test_fixtures:",
    "  accepted:",
    "    - name: good_one",
    "      source: |",
    "        let x: Int = 1",
    "  rejected:",
    "    - name: bad_one",
    "      expected_diagnostic: FUNGI-VALUESTATE-003",
    "      source: |",
    "        unsafe let raw: String = request.body.email",
    "        UsersDB.insert({ email: raw })?",
    "other_key:",
    "  - id: must_not_be_read",
    "",
  ].join("\n");
  const f = readFixtures(FIXTURE_YAML);
  check("reader finds the accepted arm", f.accepted.length === 1, `${f.accepted.length}`);
  check("reader finds the rejected arm", f.rejected.length === 1, `${f.rejected.length}`);
  check("reader captures expected_diagnostic", f.rejected[0]?.expected === "FUNGI-VALUESTATE-003");
  check("reader captures a multi-line block scalar", (f.rejected[0]?.source ?? "").split("\n").length === 2);
  check("reader stops at the next top-level key", !JSON.stringify(f).includes("must_not_be_read"));
  check("reader returns empty (not garbage) with no fixtures block", (() => {
    const e = readFixtures("sinks:\n  - id: x\n"); return e.accepted.length === 0 && e.rejected.length === 0;
  })());

  const w = wrapFixture("let x: Int = 1");
  check("wrapper emits a version pragma first", w.startsWith("@version 1"));
  check("wrapper emits a secure-tier flow", /^secure flow /m.test(w));
  check("wrapper emits a contract block", /contract \{/.test(w) && /intent \{/.test(w));
  check("wrapper indents the fixture body", /\n  let x: Int = 1/.test(w));

  check("contract-artifact filter excludes the effect family", CONTRACT_ARTIFACT_CODES.test("FUNGI-EFFECT-001") && CONTRACT_ARTIFACT_CODES.test("FUNGI-STDLIB-001"));
  check("contract-artifact filter does NOT exclude governance", !CONTRACT_ARTIFACT_CODES.test("FUNGI-VALUESTATE-003"));
  check("governance filter matches the four judged families",
    ["FUNGI-VALUESTATE-003", "FUNGI-SECRET-001", "FUNGI-TAINT-001", "FUNGI-GOV-002"].every((c) => GOVERNANCE_CODES.test(c)));
  check("governance filter does NOT match the effect family", !GOVERNANCE_CODES.test("FUNGI-EFFECT-001"));
  // A family name is not a mechanism: GOV-002 is contract-shaped, GOV-003 is not.
  check("GOV-002 excluded as contract-shaped", !judgesTheFixture("FUNGI-GOV-002"));
  check("GOV-003 still judged (it IS about the fixture)", judgesTheFixture("FUNGI-GOV-003"));
  check("the other governance families survive the exclusion",
    ["FUNGI-VALUESTATE-003", "FUNGI-SECRET-001", "FUNGI-TAINT-001"].every(judgesTheFixture));
  // Completeness, not a threshold: the reader must agree with an independent count.
  const fxSelf = readFixtures(FIXTURE_YAML);
  const declaredSelf = FIXTURE_YAML.split("\n").filter((l) => /^\s+- name:/.test(l)).length;
  check("reader count agrees with an independent `- name:` count",
    fxSelf.accepted.length + fxSelf.rejected.length === declaredSelf,
    `${fxSelf.accepted.length + fxSelf.rejected.length} parsed vs ${declaredSelf} declared`);

  // REGRESSION FIXTURE for the exhibited partial parse. A one-space indent drift on the
  // REJECTED items alone yields 1 of 2 here (3 of 6 on the real registry) — and F0, which
  // fires only at zero, stays silent. Worse, the entries lost are the rejected arm: exactly
  // the fixtures carrying `expected_diagnostic`, so the audit would report a clean run having
  // tested nothing with an answer in the margin. This case pins that behaviour.
  const DRIFTED = FIXTURE_YAML.replace(/^ {4}- name: bad_one$/m, "     - name: bad_one");
  const fxDrift = readFixtures(DRIFTED);
  const driftCount = fxDrift.accepted.length + fxDrift.rejected.length;
  check("a PARTIAL parse is detectable (F0 alone would not fire)",
    driftCount > 0 && driftCount < declaredSelf,
    `${driftCount} of ${declaredSelf} — F0 fires only at 0, so it would stay silent`);
  check("the partial parse drops the REJECTED arm — the known-answer half",
    fxDrift.rejected.length < fxSelf.rejected.length,
    `rejected ${fxSelf.rejected.length} -> ${fxDrift.rejected.length}`);

  // Honesty about the environment, reported either way — never counted as pass.
  cases.push({ label: "built compiler present (dist/)", ok: true, skipped: !existsSync(DIST),
    detail: existsSync(DIST) ? "yes — the live arm can run" : "absent — the live arm reports SKIPPED, never passed" });
  cases.push({ label: "canonical registry present", ok: true, skipped: !existsSync(REGISTRY),
    detail: existsSync(REGISTRY) ? REGISTRY : "absent — set GALERINA_KB_DIR" });

  console.log("\n=== audit-registry-fixtures --self-test ===");
  let failed = 0;
  for (const c of cases) { if (!c.ok) failed++; console.log(`   ${c.skipped ? "➖" : c.ok ? "✅" : "❌"} ${c.label}${c.detail ? "   (" + c.detail + ")" : ""}`); }
  console.log(`\n=== ${cases.length - failed}/${cases.length} self-test cases pass ===`);
  process.exit(failed ? 1 : 0);
}

// ── importability ───────────────────────────────────────────────────────────
// Everything below runs ONLY when this file is executed directly. Without this
// guard, `import { readFixtures } from "./audit-registry-fixtures.mjs"` runs the
// whole audit and calls process.exit() — so no other tool can test this one, and
// a gate that cannot be tested by another gate is a gate nobody checks.
// Found while auditing this audit: the probe never ran; it got the audit's own
// output instead. The exported helpers above are the testable surface.
const INVOKED_DIRECTLY = process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;
if (!INVOKED_DIRECTLY) {
  // Imported: expose the helpers, run nothing.
} else {

// ── run ─────────────────────────────────────────────────────────────────────
const findings = [];
const add = (check, detail, items) => findings.push({ check, detail, items });
const results = [];
let skipped = null;

if (!existsSync(REGISTRY)) {
  skipped = `canonical registry not found — set GALERINA_KB_DIR (${REGISTRY})`;
} else if (!existsSync(DIST)) {
  skipped = `built compiler not found — this audit executes the signing gate and needs dist/ (${DIST})`;
} else {
  const registryText = readFileSync(REGISTRY, "utf8");
  const fixtures = readFixtures(registryText);
  const total = fixtures.accepted.length + fixtures.rejected.length;

  // COMPLETENESS, not a threshold. F0 alone fires only at ZERO, so a reader that
  // found 3 of 6 would report "all fixtures pass" on a subset and stay silent —
  // a vacuous check wearing a green tick. Count `- name:` entries in the block
  // independently of the reader and require agreement.
  const fxLines = registryText.split(/\r?\n/);
  const fxStart = fxLines.findIndex((l) => /^test_fixtures:/.test(l));
  let fxEnd = fxLines.length;
  if (fxStart !== -1) {
    for (let i = fxStart + 1; i < fxLines.length; i++) { if (/^[A-Za-z#]/.test(fxLines[i])) { fxEnd = i; break; } }
  }
  const declared = fxStart === -1 ? 0 : fxLines.slice(fxStart, fxEnd).filter((l) => /^\s+- name:/.test(l)).length;
  if (fxStart !== -1 && total !== declared) {
    add("F0b reader-incomplete",
      `the fixture reader returned ${total} fixtures but the block declares ${declared} — the reader and the registry have diverged in shape. Every verdict below is on a SUBSET and must not be read as a pass`,
      [`${total} parsed vs ${declared} declared`]);
  }

  if (total === 0) {
    add("F0 no-fixtures", `the registry has no parseable test_fixtures: block — the reader and ${REGISTRY} have diverged in shape, or the fixtures were removed`, []);
  } else {
    const m = await import(pathToFileURL(DIST).href);
    /** Compile a fixture through the SIGNING gate and return its codes. */
    const gate = (source, tag) => {
      const parsed = m.parseProgram(source, `${tag}.fungi`);
      const parseErrors = (parsed.diagnostics ?? []).filter((d) => d.severity === "error");
      if (parseErrors.length) return { parseErrors: parseErrors.map((d) => `${d.code}: ${String(d.message).slice(0, 70)}`) };
      const diags = m.runProductionSecurityGate(parsed.ast, parsed.flows, source, `${tag}.fungi`);
      return { codes: [...new Set(diags.map((d) => d.code))], diags };
    };

    // REJECTED — the expected diagnostic must appear.
    const missed = [];
    for (const f of fixtures.rejected) {
      const r = gate(wrapFixture(f.source), f.name);
      const row = { arm: "rejected", name: f.name, expected: f.expected, ...r };
      if (r.parseErrors) { row.verdict = "UNRUNNABLE"; missed.push(`${f.name}: does not parse — ${r.parseErrors[0]}`); }
      else if (r.codes.includes(f.expected)) row.verdict = "PASS";
      else { row.verdict = "FAIL"; missed.push(`${f.name}: expected ${f.expected}, got ${r.codes.length ? r.codes.join(", ") : "(nothing)"}`); }
      results.push(row);
    }
    if (missed.length) add("F1 rejected-fixture-does-not-fire",
      "a fixture the canonical registry marks REJECTED did not draw its own expected_diagnostic — either the checker regressed, or the vector cannot fire it (a fixture comparing undeclared identifiers has nothing to mark as secret)", missed);

    // ACCEPTED — no governance diagnostic may appear.
    const dirty = [];
    for (const f of fixtures.accepted) {
      const r = gate(wrapFixture(f.source), f.name);
      const row = { arm: "accepted", name: f.name, ...r };
      if (r.parseErrors) { row.verdict = "UNRUNNABLE"; dirty.push(`${f.name}: does not parse — ${r.parseErrors[0]}`); }
      else {
        const governance = r.codes.filter(judgesTheFixture);
        row.governance = governance;
        if (governance.length) { row.verdict = "BLOCKS"; dirty.push(`${f.name}: ${governance.join(", ")}`); }
        else row.verdict = "CLEAN";
      }
      results.push(row);
    }
    if (dirty.length) add("F2 accepted-fixture-blocks",
      "a fixture the canonical registry publishes as the CORRECT form draws a governance diagnostic — the registry is teaching code that does not compile, and ai_guidance points code generators at it", dirty);
  }
}

if (skipped) add("F9 could-not-run", skipped, []);
// A skip is never a pass. It does not block by default (a clean checkout has no
// dist/), but --strict treats an unrunnable safety check as a failure.
const blocking = STRICT ? findings : findings.filter((f) => f.check !== "F9 could-not-run");

if (AS_JSON) {
  console.log(JSON.stringify({ registry: REGISTRY, dist: DIST, skipped, results, findings, strict: STRICT, blockingCount: blocking.length }, null, 2));
  process.exit(blocking.length ? 1 : 0);
}

console.log(`\n=== canonical registry known-answer fixtures${STRICT ? " [--strict]" : ""} ===`);
console.log(`   registry : ${REGISTRY}`);
console.log(`   compiler : ${existsSync(DIST) ? "dist/ present — executing runProductionSecurityGate" : "dist/ ABSENT"}`);
if (skipped) {
  console.log(`\n   ➖ SKIPPED — ${skipped}`);
  console.log(`      A check that could not run is reported as skipped, never as passed.`);
} else {
  console.log(`   note     : accepted fixtures are judged on the GOVERNANCE families only`);
  console.log(`              (VALUESTATE/SECRET/TAINT/GOV). EFFECT/STDLIB codes are artifacts of the`);
  console.log(`              contract this audit synthesises, not properties of the fixture.\n`);
  for (const r of results) {
    const mark = r.verdict === "PASS" || r.verdict === "CLEAN" ? "✅" : "❌";
    console.log(`   ${mark} [${r.arm}] ${r.name}`);
    if (r.expected) console.log(`        expected : ${r.expected}`);
    console.log(`        codes    : ${r.codes ? (r.codes.length ? r.codes.join(", ") : "(none)") : "PARSE ERROR"}`);
    console.log(`        verdict  : ${r.verdict}`);
  }
}
const printGroup = (label, group) => {
  if (!group.length) return;
  console.log(`\n   ${label}:`);
  for (const f of group) {
    console.log(`   [${f.check}] ${f.detail}`);
    for (const it of f.items) console.log(`        • ${it}`);
  }
};
if (findings.length === 0 && !skipped) console.log(`\n   ✅ every canonical fixture behaves as the registry says it should`);
printGroup("❌ FINDINGS", findings);
console.log(`\n=== ${findings.length} finding(s); ${blocking.length} block this run ===`);
process.exit(blocking.length ? 1 : 0);

} // end INVOKED_DIRECTLY
