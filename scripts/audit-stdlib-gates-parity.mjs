#!/usr/bin/env node
// =============================================================================
// audit-stdlib-gates-parity.mjs — the CANONICAL REGISTRY half of the effect /
//                                  sink source-of-truth (completes the trio)
// =============================================================================
// THE FAIL-OPEN CLASS THIS PREVENTS (found 2026-08-06, ticks 207-208):
//   value-state-checker.ts carries this comment above isGovernedSink:
//
//     "Canonical registry (source of truth): ../ZTF-Knowledge-Bases/
//      stdlib-gates.yaml §sinks. When adding a new sink, update
//      stdlib-gates.yaml first, then mirror here."
//
//   That file therefore OUTRANKS the compiler tables in the documented
//   hierarchy — and no audit in this repo reads it. Measured: 163 scripts in
//   scripts/, zero mentions of stdlib-gates.yaml. Consequence, verified by
//   execution at production strictness:
//
//     • 6 of the 10 effect names the registry declares in `required_effects:`
//       are REJECTED by the compiler with FUNGI-EFFECT-004 (error):
//       shell.exec (the compiler's name is shell.execute), filesystem.read,
//       filesystem.write, log.write, console.write, governance.declassify —
//       three of those families do not exist in CANONICAL_EFFECTS at all.
//     • The registry's own ai_guidance.safe_example — the snippet it publishes
//       for code generators — draws FUNGI-VALUESTATE-006, because
//       validate.email() yields a `protected` value and the registry's
//       `transitions:` block never models `protected` as a validation output.
//
//   So an author (human or AI) who follows the file the compiler calls its
//   source of truth writes a contract that DOES NOT BUILD. That is the same
//   plausible-but-non-compiling failure class audit-effect-canonicality.mjs
//   and audit-corpus-effect-names.mjs already guard for the compiler's own
//   tables and for the .fungi corpus — this audit closes the third side.
//
//   The trio, once this lands:
//     audit-effect-canonicality.mjs  → compiler TABLES agree with each other
//     audit-corpus-effect-names.mjs  → the .fungi CORPUS agrees with them
//     audit-stdlib-gates-parity.mjs  → the CANONICAL REGISTRY agrees with them
//
// CHECKS
//   R1  every effect name in stdlib-gates.yaml (`required_effects:` items and
//       `effect:` scalars) is canonical, a known alias, or a broad alias.
//   R2  every `diagnostic_on_reject:` code is a code the compiler can actually
//       emit (present in the compiler source) — a registry that names a
//       diagnostic nothing emits is documenting a gate that does not exist.
//   R3  every state named in `accepts_states` / `rejects_states` /
//       `transitions` is a state the value-state checker knows. This is the
//       check that catches the `protected` omission: the registry models
//       validation as unsafe -> validated|sanitized|safe and the compiler adds
//       a fourth outcome the registry does not list.
//   R4  every sink `id` whose `kind: function`/`method` names a concrete
//       callee is recognised by at least one compiler recogniser. A registry
//       entry no checker implements is an unenforced policy.
//
// SEVERITY
//   R1 and R2 are BLOCKING: they make published guidance non-compiling, and
//   they are mechanical to fix. R3 and R4 are reported and block only under
//   --strict, because closing them may require a deliberate modelling decision
//   rather than a rename.
//
// The registry lives OUTSIDE this repo (IP separation), exactly like the KB
// registry in audit-effect-canonicality.mjs C5. Resolve via GALERINA_KB_DIR,
// default sibling. ABSENCE IS NOT A PASS: a skipped check that prints green is
// the failure mode this whole family exists to prevent, so a missing registry
// is reported as a finding under --strict and warned about always.
//
// Run:  node scripts/audit-stdlib-gates-parity.mjs
//       node scripts/audit-stdlib-gates-parity.mjs --json
//       node scripts/audit-stdlib-gates-parity.mjs --strict
//       node scripts/audit-stdlib-gates-parity.mjs --self-test   (proves it fires)
// =============================================================================
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// --root <dir> overrides the repo root (used by the self-test); default = repo.
const rootIdx = process.argv.indexOf("--root");
const ROOT = rootIdx !== -1 ? process.argv[rootIdx + 1] : join(HERE, "..");
const SRC = join(ROOT, "packages-ts/galerina-core-compiler/src");
const EFFECT_CHECKER = join(SRC, "effect-checker.ts");
const VALUE_STATE = join(SRC, "value-state-checker.ts");
const TAINT_CHECKER = join(SRC, "taint-checker.ts");
// The canonical registry lives outside the repo (IP separation) — same
// resolution rule as audit-effect-canonicality.mjs C5.
const KB_DIR = process.env.GALERINA_KB_DIR || join(ROOT, "../ZTF-Knowledge-Bases");
// --registry <file> lets the self-test point at a crafted fixture.
const regIdx = process.argv.indexOf("--registry");
const REGISTRY = regIdx !== -1 ? process.argv[regIdx + 1] : join(KB_DIR, "stdlib-gates.yaml");

const JSON_OUT = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");
const SELF_TEST = process.argv.includes("--self-test");

// ── source extractors — regex over TS source, the approach every audit-*.mjs
//    in this directory uses, so there is no build or cross-package import. ────

/** Slice a named declaration block to its balanced closing bracket, starting
 *  from the `=` so a type annotation containing `[]` cannot open the wrong
 *  bracket. Lifted deliberately from audit-effect-canonicality.mjs: the three
 *  audits must read the tables identically or they can disagree about what the
 *  source of truth even says. */
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

/** Every double-quoted effect-ish token in a block. */
const quoted = (b) => (b ? [...b.matchAll(/"([a-zA-Z][\w.]*)"/g)].map((m) => m[1]) : []);

// ── the compiler's vocabulary (the thing the registry must agree with) ───────
const ecSrc = readFileSync(EFFECT_CHECKER, "utf8");
const vsSrc = existsSync(VALUE_STATE) ? readFileSync(VALUE_STATE, "utf8") : "";
const tcSrc = existsSync(TAINT_CHECKER) ? readFileSync(TAINT_CHECKER, "utf8") : "";

const CANONICAL = new Set(quoted(sliceBlock(ecSrc, "CANONICAL_EFFECTS = new Set")));
const ALIASES = new Map(
  [...(sliceBlock(ecSrc, "EFFECT_NAME_ALIASES") || "")
    .matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)].map((m) => [m[1], m[2]])
);
const BROAD_ALIASES = new Set(quoted(sliceBlock(ecSrc, "BROAD_EFFECT_ALIASES")));
/** Recognised = the compiler will accept this name in an `effects { }` block. */
const isKnownEffect = (e) => CANONICAL.has(e) || ALIASES.has(e) || BROAD_ALIASES.has(e);

/** The WHOLE compiler source, concatenated once. R2 and R3 ask "can the
 *  compiler do X anywhere?", and scoping that question to three files is an
 *  instrument limit masquerading as a fact about the subject: FUNGI-GOV-003 is
 *  emitted by the governance verifier, and the value-state vocabulary is
 *  declared in a types module — neither is in the three checker files, so a
 *  narrow scan reports both as missing when both exist. Read the directory. */
function allCompilerSource(dir) {
  let out = "";
  const walk = (d, depth) => {
    if (depth > 3 || !existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const f = join(d, e.name);
      if (e.isDirectory()) walk(f, depth + 1);
      else if (e.name.endsWith(".ts")) out += readFileSync(f, "utf8") + "\n";
    }
  };
  walk(dir, 0);
  return out;
}
const ALL_SRC = allCompilerSource(SRC);

/** Every FUNGI-* diagnostic code the compiler can actually EMIT.
 *
 *  NOT "every code that appears somewhere". A code can appear only in a
 *  catalogue constant, a comment, or a doc example and never be emitted —
 *  measured here: 365 codes appear in `src/`, but only 349 sit in an
 *  emit-shaped position, so 16 are catalogue-only.
 *
 *  R2 exists to catch a registry that names a diagnostic nothing emits. Crediting
 *  mere appearance would let R2 PASS exactly the case it was built to fail — the
 *  catalogue-vs-emitter conflation this repo has hit before.
 *
 *  An emit-shaped position: the code sits within a few lines of a `severity:`,
 *  a `push(`, a diagnostic-object return, or a known emit helper. That window is
 *  deliberately generous — the failure direction that matters is crediting a
 *  code that cannot fire, not missing one that can. */
const EMITTABLE_CODES = (() => {
  const out = new Set();
  const lines = ALL_SRC.split("\n");
  lines.forEach((ln, i) => {
    const m = ln.match(/"(FUNGI-[A-Z0-9-]+)"/);
    if (!m) return;
    const window = lines.slice(Math.max(0, i - 3), i + 6).join(" ");
    if (/severity\s*:|push\(|return\s*\{|diagnostics\.|makeDiag|emit\(/.test(window)) out.add(m[1]);
  });
  return out;
})();
/** Codes present in source but NOT in an emit position — reported by R2 so the
 *  distinction is visible rather than silently applied. */
const CATALOGUE_ONLY = new Set(
  [...ALL_SRC.matchAll(/"(FUNGI-[A-Z0-9-]+)"/g)].map((m) => m[1]).filter((c) => !EMITTABLE_CODES.has(c))
);

/** The value-states the checker actually knows. Read from the compiler's own
 *  state-literal vocabulary across the whole package, so this audit cannot
 *  itself become the next drifted mirror — a hand-list here would be exactly
 *  the defect the audit exists to catch. */
const KNOWN_STATES = new Set(
  [...ALL_SRC.matchAll(/"(unsafe|safe|validated|sanitized|redacted|protected|unknown)"/g)].map((m) => m[1])
);

/** Sink names the compiler's recognisers know by EXACT name. */
const RECOGNISED_SINK_NAMES = new Set([
  ...quoted(sliceBlock(tcSrc, "INJECTION_SINKS")),
  ...quoted(sliceBlock(vsSrc, "SINK_REQUIREMENTS")),
].map((s) => s.toLowerCase()));

/** The regex arms inside isGovernedSink. Half the value-state sink surface is
 *  expressed as patterns, not names — `AuditLog.write` and `FileSystem.write`
 *  are matched by arms, so a name-only comparison reports both as unimplemented
 *  when both are enforced. Lift the literals out of the function body and test
 *  against them, so R4 measures the recogniser rather than measuring itself. */
function governedSinkPatterns(src) {
  const start = src.indexOf("function isGovernedSink");
  if (start === -1) return { regexes: [], exact: new Set() };
  // Bound the scan to the function body so a neighbouring regex cannot leak in.
  const body = src.slice(start, start + 3000);
  const regexes = [];
  for (const m of body.matchAll(/\/\^?([^/\n]+?)\$?\/\.test\(fullName\)/g)) {
    try { regexes.push(new RegExp(m[0].slice(1, m[0].lastIndexOf("/")))); } catch { /* unparseable arm — ignored, counted below */ }
  }
  const exact = new Set(
    [...body.matchAll(/fullName === "([^"]+)"/g)].map((m) => m[1].toLowerCase())
  );
  return { regexes, exact };
}
const GOVERNED = governedSinkPatterns(vsSrc);

/** True when ANY compiler recogniser would treat this callee as a sink —
 *  exact name in either hand-list, an exact arm, or a pattern arm. */
const isRecognisedSink = (name) =>
  RECOGNISED_SINK_NAMES.has(name.toLowerCase()) ||
  GOVERNED.exact.has(name.toLowerCase()) ||
  GOVERNED.regexes.some((re) => re.test(name));

// ── the registry (a small, purpose-built YAML reader) ────────────────────────
// The repo has no YAML dependency and adding one for an audit is not worth a
// supply-chain edge. stdlib-gates.yaml is machine-generated-shaped: fixed
// two-space indents, list items, block scalars. Read exactly the shapes needed
// and report anything unparseable rather than guessing — a parser that
// silently reads nothing is the "skipped check prints green" failure again.

/** Names that mean "this operation has NO effect" rather than naming one.
 *  `effect: pure` appears on all seven validation/sanitisation gates in the
 *  `gates:` section — judging it against CANONICAL_EFFECTS reports a tier
 *  marker as a drifted effect name. Excluded by meaning, not by exception. */
const NO_EFFECT_SENTINELS = new Set(["pure", "none"]);

/** Top-level sections whose entries register a SINK. `name:` appears in
 *  `gates:` and `unsafe_sources:` too — harvesting those as sinks reported
 *  `print`, `redact`, `constantTimeEquals` and the decoders as unimplemented
 *  sinks, which they are not: they are gates and sources. Scope by section. */
const SINK_SECTIONS = new Set(["sinks", "response_sinks"]);

/** Parse the registry into { effects, codes, states, sinkNames, parsed }.
 *
 *  The repo has no YAML dependency and adding one for an audit is not worth a
 *  supply-chain edge, so this reads exactly the shapes stdlib-gates.yaml uses:
 *  fixed two-space indents, `- item` lists, `key: value` scalars. It tracks the
 *  current TOP-LEVEL section, because the same key means different things in
 *  different sections — the distinction that separates a real finding from
 *  noise. Anything unrecognised is ignored and counted, never guessed at. */
function readRegistry(text) {
  const out = {
    effects: new Set(),    // required_effects: items and `effect:` scalars (minus sentinels)
    codes: new Set(),      // diagnostic_on_reject: values
    states: new Set(),     // accepts_states / rejects_states / transitions / output_state
    sinkNames: new Set(),  // `name:` under a sinks/response_sinks entry ONLY
    sinkIds: new Set(),    // `- id:` values in a sink section
    section: null,         // last top-level key seen
    parsed: 0,             // lines that matched a known shape — the liveness signal
  };
  let section = null;      // current top-level section
  let listContext = null;  // which key's list we are currently inside
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line || /^\s*#/.test(line)) continue;
    let m;
    // A top-level `key:` at column 0 opens a new section and closes any list.
    if ((m = line.match(/^([a-z][\w]*):\s*$/))) { section = m[1]; listContext = null; continue; }
    if (/^[a-z][\w]*:/.test(line)) { section = line.split(":")[0]; listContext = null; continue; }
    // A `key:` with no value opens a list context that later `- item` lines belong to.
    if ((m = line.match(/^\s+(required_effects|accepts_states|rejects_states|accepts|to):\s*$/))) {
      listContext = m[1]; out.parsed++; continue;
    }
    // `- item` — attribute it to whichever list context is open.
    if ((m = line.match(/^\s+- ([A-Za-z][\w.]*)\s*$/))) {
      const v = m[1];
      if (listContext === "required_effects") {
        if (!NO_EFFECT_SENTINELS.has(v)) out.effects.add(v);
        out.parsed++;
      } else if (listContext) { out.states.add(v); out.parsed++; }
      continue;
    }
    // Scalars. Each closes any open list context, because a `key: value` line
    // is a sibling of the list key, never a member of it.
    if ((m = line.match(/^\s+effect: ([A-Za-z][\w.]*)\s*$/))) {
      if (!NO_EFFECT_SENTINELS.has(m[1])) out.effects.add(m[1]);
      listContext = null; out.parsed++; continue;
    }
    if ((m = line.match(/^\s+diagnostic_on_reject: (FUNGI-[A-Z0-9-]+)\s*$/))) { out.codes.add(m[1]); listContext = null; out.parsed++; continue; }
    if ((m = line.match(/^\s+(?:from|output_state|success): ([A-Za-z]\w*)\s*$/))) { out.states.add(m[1]); listContext = null; out.parsed++; continue; }
    if ((m = line.match(/^\s+- id: ([\w.]+)\s*$/))) {
      if (SINK_SECTIONS.has(section)) out.sinkIds.add(m[1]);
      listContext = null; out.parsed++; continue;
    }
    if ((m = line.match(/^\s+name: "([^"]+)"\s*$/))) {
      if (SINK_SECTIONS.has(section)) out.sinkNames.add(m[1]);
      listContext = null; out.parsed++; continue;
    }
    // Any other `key: value` closes the list context without contributing.
    if (/^\s+[a-z_]+:/.test(line)) listContext = null;
  }
  out.section = section;
  return out;
}

// ── self-test ────────────────────────────────────────────────────────────────
// A gate never seen to go red is a hypothesis, not a gate (ZT-42/43). This
// drives the real extractors and predicates over crafted registry text whose
// answers are known, proving BOTH directions: a drifted registry must be
// caught, and a clean one must pass. It runs entirely in memory and writes
// nothing. If a future refactor guts an extractor, this fails here instead of
// printing green for ever — which is the failure mode this whole audit family
// exists to prevent.
if (SELF_TEST) {
  // A deliberately drifted registry. Every fault is one the real file has had.
  const DIRTY = [
    "sinks:",
    "  - id: shell_exec",
    "    kind: function",
    '    name: "shell.exec"',
    "    accepts_states:",
    "      - safe",
    "      - notAValueState",          // R3: a state the checker cannot produce
    "    required_effects:",
    "      - shell.exec",              // R1: real name is shell.execute
    "      - not.arealeffect",         // R1: no such family
    // code-catalog-reference: deliberately unemittable R2 mutation fixture.
    "    diagnostic_on_reject: FUNGI-NOT-A-REAL-CODE",  // R2: unemittable
    "  - id: nowhere_sink",
    "    kind: function",
    '    name: "Totally.Unrecognised"', // R4: no recogniser matches
    "    required_effects:",
    "      - audit.write",             // canonical — must NOT be reported
    "gates:",
    "  - id: a_pure_gate",
    "    effect: pure",                // must NOT be reported (tier marker)
    '    name: "validate.email"',      // must NOT be reported (not a sink section)
    "",
  ].join("\n");
  // A clean registry: everything present must be recognised.
  const CLEAN = [
    "sinks:",
    "  - id: audit_log_write",
    "    kind: method",
    '    name: "AuditLog.write"',      // matched by an isGovernedSink arm
    "    accepts_states:",
    "      - safe",
    "    required_effects:",
    "      - audit.write",
    "    diagnostic_on_reject: FUNGI-VALUESTATE-003",
    "",
  ].join("\n");

  const evaluate = (text) => {
    const r = readRegistry(text);
    return {
      parsed: r.parsed,
      badEffects: [...r.effects].filter((e) => !isKnownEffect(e)).sort(),
      badCodes: [...r.codes].filter((c) => !EMITTABLE_CODES.has(c)).sort(),
      badStates: [...r.states].filter((s) => !KNOWN_STATES.has(s)).sort(),
      badSinks: [...r.sinkNames].filter((n) => !isRecognisedSink(n)).sort(),
    };
  };
  const dirty = evaluate(DIRTY), clean = evaluate(CLEAN);

  // Each case names the exact condition and why a violation would matter.
  const cases = [
    ["extractors are alive (CANONICAL_EFFECTS parsed)", CANONICAL.size > 0],
    ["extractors are alive (value-states parsed)", KNOWN_STATES.size > 0],
    ["extractors are alive (emittable codes parsed)", EMITTABLE_CODES.size > 0],
    ["extractors are alive (isGovernedSink arms parsed)", GOVERNED.regexes.length > 0],
    ["registry reader is alive on the dirty fixture", dirty.parsed > 0],
    ["R1 fires on a near-miss effect name (shell.exec)", dirty.badEffects.includes("shell.exec")],
    ["R1 fires on an absent family (not.arealeffect)", dirty.badEffects.includes("not.arealeffect")],
    ["R1 does NOT fire on `effect: pure` (a tier marker)", !dirty.badEffects.includes("pure")],
    ["R1 does NOT fire on a canonical name (audit.write)", !dirty.badEffects.includes("audit.write")],
    // code-catalog-reference: assertion for the deliberately unemittable R2 fixture.
    ["R2 fires on an unemittable diagnostic code", dirty.badCodes.includes("FUNGI-NOT-A-REAL-CODE")],
    // The catalogue-vs-emitter guard: a code that EXISTS in source but only as a
    // catalogue entry must still be reported. Crediting mere appearance would let
    // R2 pass the exact case it was built to fail.
    ["R2 distinguishes emittable from merely-present codes",
      EMITTABLE_CODES.size > 0 && CATALOGUE_ONLY.size > 0 &&
      [...CATALOGUE_ONLY].every((c) => !EMITTABLE_CODES.has(c)),
      `${EMITTABLE_CODES.size} emittable, ${CATALOGUE_ONLY.size} catalogue-only`],
    ["the emit-position detector is not vacuous", EMITTABLE_CODES.size > 100,
      `${EMITTABLE_CODES.size} codes found in emit positions`],
    ["R3 fires on an unknown value-state", dirty.badStates.includes("notAValueState")],
    ["R3 does NOT fire on a real value-state (safe)", !dirty.badStates.includes("safe")],
    ["R4 fires on an unrecognised sink name", dirty.badSinks.includes("Totally.Unrecognised")],
    ["R4 ignores `name:` outside a sink section (validate.email)", !dirty.badSinks.includes("validate.email")],
    ["the CLEAN fixture reports nothing at all",
      clean.badEffects.length === 0 && clean.badCodes.length === 0 &&
      clean.badStates.length === 0 && clean.badSinks.length === 0],
    ["R4 matches a PATTERN arm, not just exact names (AuditLog.write)", isRecognisedSink("AuditLog.write")],
  ];
  console.log("\n=== audit-stdlib-gates-parity --self-test ===");
  let failed = 0;
  for (const [label, ok] of cases) {
    if (!ok) failed++;
    console.log(`   ${ok ? "✅" : "❌"} ${label}`);
  }
  console.log(`\n=== ${cases.length - failed}/${cases.length} self-test cases pass ===`);
  process.exit(failed ? 1 : 0);
}

// ── run the checks ───────────────────────────────────────────────────────────
const findings = [];
const add = (check, detail, items) => findings.push({ check, detail, items });

// The extractor must have found the compiler's own vocabulary, or every check
// below is vacuous and would pass an empty registry against an empty table.
if (CANONICAL.size === 0) {
  add("BOOTSTRAP", `could not parse CANONICAL_EFFECTS from ${EFFECT_CHECKER} — extractor/source mismatch`, []);
}
if (KNOWN_STATES.size === 0) {
  add("BOOTSTRAP", `could not parse any value-state literal from ${VALUE_STATE} — R3 would be vacuous`, []);
}

let reg = null;
if (!existsSync(REGISTRY)) {
  // Absence is NOT a pass. Report it; block under --strict.
  add("R0 registry-absent",
    `the canonical registry named by value-state-checker.ts was not found — set GALERINA_KB_DIR. Without it R1-R4 do not run, and a skipped check must never read as green — ${REGISTRY}`, []);
} else {
  reg = readRegistry(readFileSync(REGISTRY, "utf8"));
  if (reg.parsed === 0) {
    add("BOOTSTRAP", `registry parsed to zero facts — the reader and ${REGISTRY} have diverged in shape`, []);
  }

  // R1 — effect names the compiler will reject.
  {
    const bad = [...reg.effects].filter((e) => !isKnownEffect(e)).sort();
    if (bad.length) add("R1 registry-effect⊄canonical",
      "the canonical registry declares required_effects the compiler REJECTS with FUNGI-EFFECT-004 — an author following the registry writes a contract that does not build",
      bad.map((e) => {
        // A near-miss inside the same family is the actionable case (shell.exec
        // vs shell.execute), so name the neighbour rather than only the error.
        const family = e.split(".")[0];
        const near = [...CANONICAL].filter((c) => c.split(".")[0] === family);
        return near.length ? `${e}  (compiler has: ${near.join(", ")})` : `${e}  (no ${family}.* family exists)`;
      }));
  }

  // R2 — diagnostics the registry promises but nothing emits.
  {
    const bad = [...reg.codes].filter((c) => !EMITTABLE_CODES.has(c)).sort();
    if (bad.length) add("R2 registry-code-unemittable",
      "the registry names a diagnostic_on_reject code with no EMIT site in the compiler — a documented gate with no implementation",
      // Say which kind of absence it is: catalogued-but-never-emitted is a
      // different (and more misleading) defect than wholly absent.
      bad.map((c) => c + (CATALOGUE_ONLY.has(c)
        ? "   (present in source but only as a catalogue/comment entry — never emitted)"
        : "   (absent from the compiler source entirely)")));
  }

  // R3 — value-states the registry models that the checker does not, and the
  //      reverse: states the checker produces that the registry never lists.
  {
    const unknown = [...reg.states].filter((s) => !KNOWN_STATES.has(s)).sort();
    if (unknown.length) add("R3 registry-state-unknown",
      "the registry names a value-state the checker does not know", unknown);
    const unmodelled = [...KNOWN_STATES].filter((s) => !reg.states.has(s)).sort();
    if (unmodelled.length) add("R3 registry-state-unmodelled",
      "the checker can produce a value-state the registry's accepts/rejects/transitions never model — this is how the registry's own safe_example came to draw FUNGI-VALUESTATE-006 (validate.email yields `protected`, which the transitions block does not list as a validation output)", unmodelled);
  }

  // R4 — registry sink entries no recogniser implements.
  {
    const bad = [...reg.sinkNames].filter((n) => !isRecognisedSink(n)).sort();
    if (bad.length) add("R4 registry-sink-unimplemented",
      "the registry registers a sink that no compiler recogniser matches — by exact name in INJECTION_SINKS/SINK_REQUIREMENTS, or by any isGovernedSink arm. An unenforced policy entry: the registry says this call is governed and no checker agrees", bad);
  }
}

// ── severity, output, exit ───────────────────────────────────────────────────
// BLOCKING by default: R1 (non-compiling published guidance), R2 (a promised
// gate that cannot fire) and any BOOTSTRAP failure (a vacuous audit).
// R0/R3/R4 report always and block only under --strict.
const sevOf = (f) => (/^(R1|R2|BOOTSTRAP)\b/.test(f.check) ? "blocking" : "reported");
const blockingFindings = findings.filter((f) => sevOf(f) === "blocking");
const reported = findings.filter((f) => sevOf(f) === "reported");
const blocking = STRICT ? findings : blockingFindings;

if (JSON_OUT) {
  console.log(JSON.stringify({
    registry: REGISTRY, registryPresent: existsSync(REGISTRY),
    canonicalCount: CANONICAL.size, aliasCount: ALIASES.size,
    registryEffects: reg ? [...reg.effects].sort() : [],
    strict: STRICT, blocking: blockingFindings, reported, blockingCount: blocking.length,
  }, null, 2));
  process.exit(blocking.length ? 1 : 0);
}

console.log(`\n=== stdlib-gates parity audit (registry vs compiler)${STRICT ? " [--strict]" : ""} ===`);
console.log(`   registry : ${REGISTRY}${existsSync(REGISTRY) ? "" : "   ** NOT FOUND **"}`);
console.log(`   compiler : ${CANONICAL.size} canonical effects | ${ALIASES.size} aliases | ${KNOWN_STATES.size} value-states | ${EMITTABLE_CODES.size} emittable codes`);
if (reg) console.log(`   registry : ${reg.effects.size} effect names | ${reg.sinkIds.size} sinks | ${reg.codes.size} diagnostics | ${reg.parsed} facts parsed`);
const printGroup = (label, group) => {
  if (group.length === 0) return;
  console.log(`\n   ${label}:`);
  for (const f of group) {
    console.log(`   [${f.check}] ${f.detail}`);
    for (const it of f.items) console.log(`        • ${it}`);
  }
};
if (findings.length === 0) console.log(`   ✅ the canonical registry agrees with the compiler`);
printGroup("❌ BLOCKING", blockingFindings);
printGroup(`${STRICT ? "❌" : "⚠️ "} REPORTED (${STRICT ? "blocking under --strict" : "not blocking"})`, reported);
console.log(`\n=== ${blockingFindings.length} blocking + ${reported.length} reported finding(s); ${blocking.length} block this run ===`);
process.exit(blocking.length ? 1 : 0);
