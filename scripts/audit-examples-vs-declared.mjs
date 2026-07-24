// =============================================================================
// audit-examples-vs-declared.mjs — teaching-corpus rot gate: an example's DECLARED
// diagnostics must match what `galerina check` ACTUALLY emits (RD examples-vs-standards
// audit 2026-07-24, owner-directed). House-standard port of R&D's read-only comparer:
// adds a self-test (the anti-fabricated-green requirement the bare comparer lacked — a
// classifier whose "clean" can't be falsified is exactly the hole flagged in bridge 0180)
// and a --strict-types second probe (splits NEG-STALE into strict-only vs truly-stale).
// =============================================================================
// THE CLASS. A `.fungi` example carries a DECLARED expectation (`/// expected_diagnostics:`
// header, `none` or a code list; or an `expected.diagnostics.txt` sidecar). If the checker
// evolves and the example is not updated, the teaching corpus silently lies: a "clean"
// example now REDs (POS-BROKEN), or a "should-fail" example now passes (NEG-STALE, the
// dangerous fail-open direction — it teaches a rule the compiler no longer enforces).
//
// CLASSES (per example):
//   POS-BROKEN  declared none, `check` exits non-zero            (a clean example rotted)
//   NEG-STALE   declared code(s), plain `check` exits 0          (fail-open teaching)
//     ├─ STRICT-ONLY  the declared FUNGI-TYPE-* fires under --strict-types (advisory by
//     │               design) → annotate the example, NOT a defect (glossary rule 10)
//     └─ TRULY-STALE  fires NOWHERE (plain AND strict) → the code was never implemented
//                     or the checker regressed (real: fix the header or the checker)
//   NEG-WRONG   declared code(s), exits non-zero but actual ∩ declared = ∅  (lesson drifted)
//   UNDECLARED  no header + no sidecar   (can't rot loudly — a new example should declare)
//   OK          declared matches actual
//
// SCOPE THIS PASS: classification + a surface-honest count, plus the strict-split. It does
// NOT yet gate (no shrink-only NAMED baseline of the known-legacy classes, no phase-close
// wiring) — that is the next increment, once the POS-BROKEN triage (example-rot vs checker
// misfire) is settled. Fail-closed only on a broken run (missing galerina.mjs / unreadable).
//
// Usage:
//   node scripts/audit-examples-vs-declared.mjs --self-test        # prove the classifier fires
//   node scripts/audit-examples-vs-declared.mjs                    # classify the corpus (plain probe)
//   node scripts/audit-examples-vs-declared.mjs --strict-split     # + second-probe each NEG-STALE
//   node scripts/audit-examples-vs-declared.mjs --json
// =============================================================================
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The three example roots (same as R&D's comparer). package-local examples/ are a future add.
const EXAMPLE_ROOTS = ["examples", join("docs", "examples"), join("docs", "reference", "examples")];

// ── pure core (self-tested, no I/O) ──────────────────────────────────────────

// Declared expectation from a header line + optional sidecar text. `none` → [] (declares
// clean); a code list → the codes; NEITHER present → null (UNDECLARED). Header and sidecar
// UNION when both exist (R&D's rule). A FUNGI code is the anchored token, so prose can't leak.
export function parseDeclared(headerSrc, sidecarSrc) {
  const m = headerSrc.match(/expected_diagnostics:\s*(.+)/);
  let declared = null;
  if (m) declared = m[1].trim().toLowerCase() === "none" ? [] : codesIn(m[1]);
  if (sidecarSrc != null) {
    const sc = codesIn(sidecarSrc);
    declared = declared === null ? sc : [...new Set([...declared, ...sc])];
  }
  return declared;
}
function codesIn(s) { return [...s.matchAll(/FUNGI-[A-Z0-9-]+/g)].map((x) => x[0]); }

// FUNGI codes in a `galerina check` output blob.
export function actualCodes(out) {
  return [...new Set([...out.matchAll(/FUNGI-[A-Z0-9-]+/g)].map((x) => x[0]))].sort();
}

// The classifier — the whole point, kept pure so the self-test can plant every class.
export function classify(declared, actual, exitCode) {
  if (declared === null) return "UNDECLARED";
  const d = new Set(declared);
  if (d.size === 0) return exitCode !== 0 ? "POS_BROKEN" : "OK";
  if (exitCode === 0) return "NEG_STALE";
  return actual.some((c) => d.has(c)) ? "OK" : "NEG_WRONG";
}

// Sub-classify a NEG-STALE by its strict-types re-probe: if a declared code now fires (or the
// run exits non-zero), it was advisory-by-design (STRICT_ONLY); if still nothing, TRULY_STALE.
export function strictSplit(declared, strictActual, strictExit) {
  const d = new Set(declared);
  if (strictExit !== 0 && strictActual.some((c) => d.has(c))) return "STRICT_ONLY";
  return "TRULY_STALE";
}

// ── self-test — plants one fixture per class; the classifier must fire correctly ──────────
if (process.argv.includes("--self-test")) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

  // parseDeclared
  ok(parseDeclared("/// expected_diagnostics: none", null)?.length === 0, "header 'none' → [] (declares clean)");
  ok(parseDeclared("expected_diagnostics: FUNGI-TYPE-004, FUNGI-EFFECT-003", null).join() === "FUNGI-TYPE-004,FUNGI-EFFECT-003", "header code list → the codes");
  ok(parseDeclared("no header here", null) === null, "no header + no sidecar → null (UNDECLARED)");
  ok(parseDeclared("no header", "FUNGI-VAL-001").join() === "FUNGI-VAL-001", "sidecar-only → sidecar codes");
  ok(new Set(parseDeclared("expected_diagnostics: FUNGI-A-1", "FUNGI-B-2")).size === 2, "header + sidecar UNION");
  ok(parseDeclared("we discuss FUNGI-TYPE-004 in prose", null) === null, "a FUNGI code in PROSE (no header key) is NOT a declaration — no false parse");

  // classify — one planted fixture per class, both directions
  ok(classify([], [], 1) === "POS_BROKEN", "★ declared none + non-zero exit → POS-BROKEN (a clean example rotted)");
  ok(classify([], [], 0) === "OK", "declared none + exit 0 → OK");
  ok(classify(["FUNGI-EVENT-001"], [], 0) === "NEG_STALE", "★ declared a code + exit 0 → NEG-STALE (fail-open teaching)");
  ok(classify(["FUNGI-TYPE-004"], ["FUNGI-EFFECT-003"], 1) === "NEG_WRONG", "★ declared + red but disjoint actual → NEG-WRONG (lesson drifted)");
  ok(classify(["FUNGI-TYPE-004"], ["FUNGI-TYPE-004"], 1) === "OK", "declared + red + actual contains declared → OK");
  ok(classify(null, ["FUNGI-X-1"], 1) === "UNDECLARED", "no declaration → UNDECLARED regardless of actual/exit");

  // strictSplit
  ok(strictSplit(["FUNGI-TYPE-004"], ["FUNGI-TYPE-004"], 1) === "STRICT_ONLY", "★ NEG-STALE whose code fires under --strict → STRICT-ONLY (advisory by design, not a defect)");
  ok(strictSplit(["FUNGI-EVENT-001"], [], 0) === "TRULY_STALE", "★ NEG-STALE firing NOWHERE (plain+strict) → TRULY-STALE (real: header bug or checker regression)");
  ok(strictSplit(["FUNGI-TYPE-004"], ["FUNGI-OTHER-1"], 1) === "TRULY_STALE", "strict red but on a DIFFERENT code → still truly-stale (declared code never fires)");

  console.log(`\n${fail === 0 ? "✅" : "❌"} examples-vs-declared self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── I/O ──────────────────────────────────────────────────────────────────────
function walkFungi(dir, acc) {
  let entries; try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walkFungi(p, acc);
    else if (e.endsWith(".fungi")) acc.push(p);
  }
  return acc;
}

function runCheck(file, strict) {
  const args = ["galerina.mjs", "check", file];
  if (strict) args.push("--strict-types");
  try { return { out: execFileSync("node", args, { cwd: ROOT, encoding: "utf8", timeout: 60000 }), code: 0 }; }
  catch (e) { return { out: (e.stdout ?? "") + (e.stderr ?? ""), code: e.status ?? 2 }; }
}

if (!existsSync(join(ROOT, "galerina.mjs"))) {
  console.error("❌ examples-vs-declared: galerina.mjs is ABSENT at repo root — cannot probe examples. Fail-closed.");
  process.exit(2);
}

const asJson = process.argv.includes("--json");
const doStrict = process.argv.includes("--strict-split");
const files = [];
for (const r of EXAMPLE_ROOTS) walkFungi(join(ROOT, r), files);

const counts = { OK: 0, POS_BROKEN: 0, NEG_STALE: 0, NEG_WRONG: 0, UNDECLARED: 0 };
const strictSub = { STRICT_ONLY: 0, TRULY_STALE: 0 };
const rows = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const src = readFileSync(f, "utf8");
  const sidecar = join(dirname(f), "expected.diagnostics.txt");
  const declared = parseDeclared(src, existsSync(sidecar) ? readFileSync(sidecar, "utf8") : null);
  const { out, code } = runCheck(f, false);
  const actual = actualCodes(out);
  const klass = classify(declared, actual, code);
  counts[klass]++;
  const row = { rel, klass, declared, actual, exit: code };
  if (klass === "NEG_STALE" && doStrict) {
    const s = runCheck(f, true);
    const sub = strictSplit(declared, actualCodes(s.out), s.code);
    strictSub[sub]++;
    row.strict = sub;
  }
  if (klass !== "OK") rows.push(row);
}

if (asJson) {
  console.log(JSON.stringify({ total: files.length, counts, strictSub: doStrict ? strictSub : null, rows }, null, 1));
  process.exit(0);
}

console.log(`\n  examples-vs-declared — ${files.length} .fungi example(s) across ${EXAMPLE_ROOTS.length} roots, each probed through 'galerina check'.`);
console.log(`  OK ${counts.OK} · POS-BROKEN ${counts.POS_BROKEN} · NEG-STALE ${counts.NEG_STALE}${doStrict ? ` (strict-only ${strictSub.STRICT_ONLY} · truly-stale ${strictSub.TRULY_STALE})` : ""} · NEG-WRONG ${counts.NEG_WRONG} · UNDECLARED ${counts.UNDECLARED}`);
for (const r of rows) {
  const tag = r.klass === "NEG_STALE" && r.strict ? `${r.klass}/${r.strict}` : r.klass;
  console.log(`  ${tag.padEnd(20)} ${r.rel} :: declared=[${(r.declared ?? []).join(",")}] exit=${r.exit} actual=[${r.actual.join(",")}]`);
}
console.log(`\n  NOTE: this pass CLASSIFIES; it does not yet gate (no shrink-only named baseline / phase-close wiring). Not a green/red verdict — a measurement.`);
process.exit(0);
