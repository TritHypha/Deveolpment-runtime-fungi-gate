#!/usr/bin/env node
// =============================================================================
// audit-sink-tri-parity.mjs — do the THREE sink recognisers agree?
// =============================================================================
// THE FAIL-OPEN CLASS THIS PREVENTS (found 2026-08-06, tick 207):
//   Galerina decides "is this call a sink?" three separate times, in three
//   different notations:
//
//     taint       taint-checker.ts        INJECTION_SINKS (+ _LC, + SINK_SHAPES)
//     value-state value-state-checker.ts  SINK_REQUIREMENTS + isGovernedSink arms
//     effects     stdlib-registry.ts      STDLIB_CAPABILITY_MAP
//                 effect-checker.ts       EFFECTFUL_MODULE_BROAD_EFFECT
//
//   Measured across the sixteen INJECTION_SINKS spellings at production
//   strictness: ONE call (Database.query) is known to all three. NINE are known
//   to taint alone. And it runs both ways — http.post, fs.write, FileSystem.write,
//   AuditLog.write and audit.write draw value-state and effect diagnostics but no
//   taint check at all, so the sets are not even nested.
//
//   A sink governed by one subsystem is governed on one axis. Db.query is
//   checked for injection and is subject to NO effect declaration and NO
//   governed-sink gate; Shell.exec needs no process effect declared. Nothing
//   is wrong with any one recogniser — each is correct about the set it knows.
//   The defect is in the space between them, which no single-list check can see.
//
// WHY THE EXISTING AUDIT CANNOT CATCH THIS — the important part.
//   scripts/audit-sink-canonicality.mjs already guards "the stdlib surface grows
//   → the sink lists must keep up". Its acceptance rule is that a sink appears
//   in AT LEAST ONE sink list. That rule is SATISFIED by exactly the state
//   described above: Db.query is in one list, and the audit passes.
//
//   This audit is deliberately a SIBLING rather than an edit to that one. That
//   audit answers a different and still-valid question, and tightening its rule
//   in place would silently change what a long-green gate means.
//
// THE RULE HERE
//   Every callee any recogniser treats as a sink should be known to all three,
//   or carry a reasoned exemption. A payment charge is plausibly not an
//   injection sink; an audit write plausibly needs no taint check. Those are
//   architectural judgements, so they are recorded as exemptions with reasons —
//   not assumed by the tool.
//
// RATCHET, NOT A CLIFF
//   Today's single-governed sinks are a pre-existing state, and a gate that
//   fails the build on its first run gets disabled rather than fixed. So the
//   baseline in scripts/fixtures/sink-tri-parity-baseline.txt records what is
//   single-governed TODAY, and this audit blocks only when a NEW one appears —
//   the same shape as audit-auto-erasure-ratchet.mjs. The baseline is a visible,
//   reviewable artifact: entries without a stated reason are counted and
//   reported every run, so it cannot quietly become permanent.
//
// Run:  node scripts/audit-sink-tri-parity.mjs
//       node scripts/audit-sink-tri-parity.mjs --json
//       node scripts/audit-sink-tri-parity.mjs --strict      (any gap blocks)
//       node scripts/audit-sink-tri-parity.mjs --write-baseline
//       node scripts/audit-sink-tri-parity.mjs --self-test
// =============================================================================
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const rootIdx = process.argv.indexOf("--root");
const ROOT = rootIdx !== -1 ? process.argv[rootIdx + 1] : join(HERE, "..");
const SRC = join(ROOT, "packages-ts/galerina-core-compiler/src");
const TAINT = join(SRC, "taint-checker.ts");
const VALUE_STATE = join(SRC, "value-state-checker.ts");
const EFFECT = join(SRC, "effect-checker.ts");
const STDLIB = join(SRC, "stdlib-registry.ts");
const BASELINE = join(HERE, "fixtures/sink-tri-parity-baseline.txt");

const AS_JSON = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");
const SELF_TEST = process.argv.includes("--self-test");
const WRITE_BASELINE = process.argv.includes("--write-baseline");

// ── extractors — regex over TS source, as every audit-*.mjs here does ────────

/** Slice a named declaration to its balanced closing bracket, opening from the
 *  `=` so a type annotation containing `[]` cannot open the wrong bracket. */
function sliceBlock(src, declName) {
  const start = src.indexOf(declName);
  if (start === -1) return null;
  const eq = src.indexOf("=", start);
  const from = eq === -1 ? start : eq;
  const bi = src.indexOf("[", from), ci = src.indexOf("{", from);
  const openIdx = bi === -1 ? ci : ci === -1 ? bi : Math.min(bi, ci);
  if (openIdx === -1) return null;
  const openCh = src[openIdx], closeCh = openCh === "[" ? "]" : "}";
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === openCh) depth++;
    else if (src[i] === closeCh) { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  return null;
}
/** First-of-pair keys in a `new Map([ ["k", V], … ])` block. */
const mapKeys = (b) => (b ? [...b.matchAll(/\[\s*"([^"]+)"\s*,/g)].map((m) => m[1]) : []);

const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
const tSrc = read(TAINT), vSrc = read(VALUE_STATE), eSrc = read(EFFECT), sSrc = read(STDLIB);

// AXIS 1 — taint. Exact keys only; the _LC and SHAPES tables are derived from
// these or are shape patterns, and counting them would double-count a spelling.
const TAINT_SINKS = mapKeys(sliceBlock(tSrc, "INJECTION_SINKS: ReadonlyMap"));

// AXIS 2 — value-state. Exact keys PLUS the isGovernedSink arms, because half
// this surface is expressed as patterns; a name-only read reports AuditLog.write
// and FileSystem.write as ungoverned when both are enforced by an arm.
const VS_EXACT = mapKeys(sliceBlock(vSrc, "SINK_REQUIREMENTS: ReadonlyMap"));

/** Lift the pattern arms out of a named function body.
 *
 *  TWO functions must be read, not one. `isGovernedSink` ends with
 *  `if (getSinkRequirement(fullName) !== undefined) return true;` — a
 *  deliberate superset arm (audit VSC-001) — and `getSinkRequirement` carries
 *  EIGHT more patterns of its own, including
 *  `(?:\w*DB|[Dd]atabase)\.(insert|update|delete|write|query|find|select)$`.
 *
 *  Reading only `isGovernedSink` makes this audit under-model the value-state
 *  axis, and an under-modelled axis manufactures FALSE "single-governed"
 *  reports: `Database.query` matches the `[Dd]atabase\.` arm and is governed,
 *  but the narrower read says it is not. That was caught by disagreeing with an
 *  execution-verified result — the static tool was wrong and the execution was
 *  right, which is the standing order of precedence.
 *
 *  Both bodies are bounded by brace balance rather than a fixed character
 *  budget, so a future edit that lengthens either one cannot silently truncate
 *  the scan back into the same defect. */
function liftArms(src, fnName, paramName) {
  const start = src.indexOf(`function ${fnName}`);
  if (start === -1) return { regexes: [], exact: [], found: false };
  // Balance braces from the function's opening `{` to find its true end.
  const open = src.indexOf("{", start);
  let depth = 0, end = src.length;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(start, end);
  const regexes = [];
  const testRe = new RegExp("\\/[^/\\n]+?\\/i?\\.test\\(" + paramName + "\\)", "g");
  for (const m of body.matchAll(testRe)) {
    const lit = m[0].slice(0, m[0].lastIndexOf("/.test(") + 1) || m[0].slice(0, m[0].lastIndexOf("/i.test(") + 2);
    const lastSlash = m[0].lastIndexOf("/", m[0].indexOf(".test("));
    const flags = m[0].slice(lastSlash + 1, m[0].indexOf(".test(")); // "" or "i"
    try { regexes.push(new RegExp(m[0].slice(1, lastSlash), flags)); } catch { /* unparseable arm — the self-test counts arms, so a drop shows up there */ }
  }
  const exact = [...body.matchAll(new RegExp(paramName + ' === "([^"]+)"', "g"))].map((m) => m[1]);
  return { regexes, exact, found: true };
}
const ARM_A = liftArms(vSrc, "isGovernedSink", "fullName");
const ARM_B = liftArms(vSrc, "getSinkRequirement", "fullCallName");
const ARMS = {
  regexes: [...ARM_A.regexes, ...ARM_B.regexes],
  exact: [...ARM_A.exact, ...ARM_B.exact],
  found: ARM_A.found && ARM_B.found,
};

// AXIS 3 — effects. A call is on this axis if the capability map names it (so a
// declared effect is required) or its module is in the broad-effect table.
const CAP_KEYS = mapKeys(sliceBlock(sSrc, "STDLIB_CAPABILITY_MAP: ReadonlyMap"));
const BROAD_MODULES = mapKeys(sliceBlock(eSrc, "EFFECTFUL_MODULE_BROAD_EFFECT: ReadonlyMap"));

// ── membership predicates, one per axis ─────────────────────────────────────
const lc = (s) => s.toLowerCase();
const taintSet = new Set(TAINT_SINKS.map(lc));
const vsExactSet = new Set([...VS_EXACT, ...ARMS.exact].map(lc));
const capSet = new Set(CAP_KEYS.map(lc));
const broadSet = new Set(BROAD_MODULES.map(lc));

const onTaint = (name) => taintSet.has(lc(name));
const onValueState = (name) => vsExactSet.has(lc(name)) || ARMS.regexes.some((re) => re.test(name));
const onEffect = (name) => capSet.has(lc(name)) || broadSet.has(lc(name.split(".")[0]));

// ── the universe: every callee ANY recogniser treats as a sink ───────────────
// Capability-map keys are excluded from the universe: that table is the whole
// stdlib surface, not a sink list, and folding it in would ask "why is
// String.length not a taint sink?" — noise that would bury the real answer.
const UNIVERSE = [...new Set([...TAINT_SINKS, ...VS_EXACT, ...ARMS.exact])].sort();

function classify() {
  const rows = UNIVERSE.map((name) => {
    const axes = { taint: onTaint(name), valueState: onValueState(name), effect: onEffect(name) };
    const count = Number(axes.taint) + Number(axes.valueState) + Number(axes.effect);
    return { name, ...axes, count };
  });
  return rows;
}

// ── baseline ────────────────────────────────────────────────────────────────
/** Parse `name  # reason` lines. A line with no `#` is an entry awaiting a
 *  reason — counted and reported every run so the baseline cannot fossilise. */
function readBaseline() {
  if (!existsSync(BASELINE)) return { entries: new Map(), present: false };
  const entries = new Map();
  for (const raw of readFileSync(BASELINE, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const hash = line.indexOf("#");
    const name = (hash === -1 ? line : line.slice(0, hash)).trim();
    const reason = hash === -1 ? "" : line.slice(hash + 1).trim();
    if (name) entries.set(lc(name), reason);
  }
  return { entries, present: true };
}

// ── self-test ───────────────────────────────────────────────────────────────
// Proves the predicates discriminate, on synthetic inputs whose answers are
// known. Real-repo output cannot prove a predicate works: "everything agrees"
// is also what a broken extractor returns.
if (SELF_TEST) {
  const cases = [];
  const check = (label, ok, detail) => cases.push({ label, ok: !!ok, detail: detail ?? "" });

  check("taint sink list extracted", TAINT_SINKS.length > 0, `${TAINT_SINKS.length} names`);
  check("value-state exact list extracted", VS_EXACT.length > 0, `${VS_EXACT.length} names`);
  check("BOTH value-state functions were found", ARMS.found,
    `isGovernedSink=${ARM_A.found} getSinkRequirement=${ARM_B.found}`);
  check("isGovernedSink arms extracted", ARM_A.regexes.length > 0, `${ARM_A.regexes.length} patterns`);
  check("getSinkRequirement arms extracted", ARM_B.regexes.length > 0, `${ARM_B.regexes.length} patterns`);
  // The regression guard for the under-modelling that produced a false positive:
  // Database.query is governed only via getSinkRequirement's [Dd]atabase arm.
  check("value-state axis models the superset arm (Database.query)", onValueState("Database.query"),
    "governed by getSinkRequirement's [Dd]atabase pattern, not by isGovernedSink alone");
  check("capability map extracted", CAP_KEYS.length > 0, `${CAP_KEYS.length} keys`);
  check("broad-effect modules extracted", BROAD_MODULES.length > 0, `${BROAD_MODULES.length} modules`);
  check("the sink universe is non-empty", UNIVERSE.length > 0, `${UNIVERSE.length} callees`);

  // Predicate discrimination — each must say yes to something and no to something.
  check("onValueState matches via a PATTERN arm (AuditLog.write)", onValueState("AuditLog.write"));
  check("onValueState matches via a PATTERN arm (FileSystem.write)", onValueState("FileSystem.write"));
  check("onValueState says NO to a plainly non-sink name", !onValueState("Totally.NotASink"));
  check("onTaint says NO to a plainly non-sink name", !onTaint("Totally.NotASink"));
  check("onEffect says NO to a plainly non-sink name", !onEffect("Totally.NotASink"));

  // The audit's whole reason for existing: it must find at least one sink that
  // is NOT known to all three. If this ever passes trivially, the gap closed —
  // which is the good outcome, and the self-test says so rather than silently
  // reporting green for a dead check.
  const rows = classify();
  const single = rows.filter((r) => r.count === 1);
  const all3 = rows.filter((r) => r.count === 3);
  check("the classifier separates single- from fully-governed sinks",
    single.length + all3.length > 0, `${single.length} single-governed, ${all3.length} on all three`);

  // Baseline hygiene.
  const bl = readBaseline();
  check("a baseline exists (or is honestly reported absent)", true,
    bl.present ? `${bl.entries.size} entries` : "absent — every gap will report as new");

  console.log("\n=== audit-sink-tri-parity --self-test ===");
  let failed = 0;
  for (const c of cases) { if (!c.ok) failed++; console.log(`   ${c.ok ? "✅" : "❌"} ${c.label}${c.detail ? "   (" + c.detail + ")" : ""}`); }
  console.log(`\n=== ${cases.length - failed}/${cases.length} self-test cases pass ===`);
  process.exit(failed ? 1 : 0);
}

// ── run ─────────────────────────────────────────────────────────────────────
const rows = classify();
const single = rows.filter((r) => r.count === 1);
const partial = rows.filter((r) => r.count === 2);
const full = rows.filter((r) => r.count === 3);

if (WRITE_BASELINE) {
  // Written with REASON-NEEDED markers, never with invented justifications:
  // whether an audit write should be a taint sink is an architectural call, and
  // a tool that answers it for you has laundered a decision into a config file.
  const lines = [
    "# sink-tri-parity baseline — sinks known to ONE recogniser as of this write.",
    "# Format:  <callee>  # <reason it is legitimately single-governed>",
    "# An entry with no reason is reported every run until one is written.",
    "# This file is a RATCHET: a NEW single-governed sink blocks; these do not.",
    "",
    ...single.map((r) => `${r.name}  # REASON-NEEDED (axis: ${r.taint ? "taint" : r.valueState ? "value-state" : "effect"} only)`),
    "",
  ];
  writeFileSync(BASELINE, lines.join("\n"));
  console.log(`[audit-sink-tri-parity] baseline written: ${single.length} entries -> ${BASELINE}`);
  process.exit(0);
}

const baseline = readBaseline();
const unbaselined = single.filter((r) => !baseline.entries.has(lc(r.name)));
const unreasoned = single.filter((r) => baseline.entries.get(lc(r.name)) === "" ||
  (baseline.entries.get(lc(r.name)) ?? "").includes("REASON-NEEDED"));

const findings = [];
if (unbaselined.length) {
  findings.push({
    check: "T1 new-single-governed-sink",
    detail: "a sink is recognised by ONE subsystem only and is not in the baseline — it is governed on one axis, and the other two do not know it exists",
    items: unbaselined.map((r) => `${r.name}  (only: ${r.taint ? "taint" : r.valueState ? "value-state" : "effect"})`),
  });
}
if (!baseline.present) {
  findings.push({ check: "T0 baseline-absent", detail: `no baseline at ${BASELINE} — run --write-baseline once, then supply a reason per entry`, items: [] });
}

// Reported always, never blocking: the debt the baseline is carrying.
const advisories = [];
if (unreasoned.length) {
  advisories.push({
    check: "T2 baseline-entry-unreasoned",
    detail: "a baselined single-governed sink has no stated reason — the ratchet is holding it, but nobody has said why it is acceptable",
    items: unreasoned.map((r) => r.name),
  });
}

const blocking = STRICT ? [...findings, ...(single.length ? [{ check: "T3 strict-any-gap", detail: "--strict: every sink must be known to all three recognisers", items: single.map((r) => r.name) }] : [])] : findings;

if (AS_JSON) {
  console.log(JSON.stringify({
    totals: { universe: rows.length, allThree: full.length, two: partial.length, one: single.length },
    rows, findings, advisories, strict: STRICT, blockingCount: blocking.length,
  }, null, 2));
  process.exit(blocking.length ? 1 : 0);
}

console.log(`\n=== sink tri-parity audit (taint · value-state · effects)${STRICT ? " [--strict]" : ""} ===`);
console.log(`   universe: ${rows.length} callees some recogniser treats as a sink`);
console.log(`   all three: ${full.length}   ·   two: ${partial.length}   ·   ONE: ${single.length}`);
if (single.length) {
  console.log(`\n   single-governed:`);
  for (const r of single) {
    console.log(`      ${r.name.padEnd(26)} only ${r.taint ? "taint" : r.valueState ? "value-state" : "effect"}` +
      (baseline.entries.has(lc(r.name)) ? "   [baselined]" : "   ** NEW **"));
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
if (findings.length === 0 && advisories.length === 0) console.log(`\n   ✅ no new single-governed sinks`);
printGroup("❌ BLOCKING", findings);
printGroup("⚠️  ADVISORY", advisories);
console.log(`\n=== ${findings.length} blocking + ${advisories.length} advisory; ${blocking.length} block this run ===`);
process.exit(blocking.length ? 1 : 0);
