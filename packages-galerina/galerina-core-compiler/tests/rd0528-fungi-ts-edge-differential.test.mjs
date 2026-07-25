/**
 * RD-0528 · the `.fungi` ≡ `.ts` EDGE-DIFFERENTIAL gate (R&D bridge 0222/0225/0229/0232).
 *
 * The self-hosted stages' R3 parity proves `.fungi`-interp == `.fungi`-WASM (compile-faithfulness), and the
 * i3 functional corpus pins the `.fungi`'s OWN values — NEITHER compares the `.fungi` twin to its `.ts`
 * reference. That blind spot let a fail-open REGRESSION hide: `runtime.fungi` div0 returned a plausible-wrong
 * 0 while the LIVE `.ts` (BINARY_DISPATCH → i32DivChecked, i32-arith.ts, owner Fork-A TRAP) FAULTS. This gate
 * is the missing detector for that class.
 *
 * The contract (R&D 0232, accepted):
 *   - VALID inputs  → value-parity: `.ts` value === `.fungi` value, neither faults.
 *   - ERROR edges   → fault-parity: BOTH fault. `.ts` faults by RETURNING a `runtimeError`-tagged value
 *                     (the async walker; NOT a throw) — measured, not assumed. `.fungi` faults by returning
 *                     an `Err`-tagged RtValue (Galerina has no exceptions, so a returned Err is the faithful
 *                     no-throw model of the `.ts` trap). A subset-twin must fault where its `.ts` faults.
 *
 * Both sides run the SAME source: `.ts` via the production interpreter (executeFlow over the user AST +
 * parser-extracted flows); `.fungi` via the self-hosted pipeline (tokenize → parseFlows → buildFlowTable →
 * runProgram). Corpus starts at the runtime edges hardened this session (ed48dd0d/4cba01d1) + is designed to
 * absorb the lexer/parser malformed-input cascade R&D measured (bridge 0229) as those stages are hardened.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { parseProgram, resolveSymbols, checkTypes, executeFlow } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const vStr = (s) => ({ __tag: "string", value: s });
const vInt = (n) => ({ __tag: "int", value: n });
const tsInt = (n) => ({ __tag: "int", value: n });

// A .ts fault surfaces as a RETURNED runtimeError value (measured), not a throw — but catch throws too.
const TS_FAULT_TAGS = new Set(["runtimeError", "error"]);

function loadStage(name) {
  let s = readFileSync(join(__dir, "../src/self-hosted/", name), "utf8");
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  const p = parseProgram(s, name);
  resolveSymbols(p.ast);
  checkTypes(p.ast);
  return p;
}

let lexer, parser, gir, rt;
before(() => {
  lexer = loadStage("lexer.fungi");
  parser = loadStage("parser.fungi");
  gir = loadStage("gir-emitter.fungi");
  rt = loadStage("runtime.fungi");
});

/** Run `src`'s flow through the PRODUCTION .ts interpreter. Returns {faulted, tag, value}. */
async function tsExec(src, flowName, argNums, argNames) {
  const p = parseProgram(src, "edge.fungi");
  try { resolveSymbols(p.ast); checkTypes(p.ast); } catch { /* the differential is about EXECUTION, not check */ }
  const args = new Map(argNames.map((k, idx) => [k, tsInt(argNums[idx])]));
  try {
    const r = await executeFlow(flowName, args, p.ast, p.flows, undefined, undefined, { pureFastPath: false });
    const v = r?.value ?? r;
    return { faulted: TS_FAULT_TAGS.has(v?.__tag), tag: v?.__tag, value: v?.value };
  } catch (e) {
    return { faulted: true, tag: "throw", value: String(e?.message).slice(0, 80) };
  }
}

async function rtInt(n) {
  const r = await executeFlow("rtInt", new Map([["n", vInt(n)]]), rt.ast, rt.flows, undefined, undefined, { pureFastPath: false });
  return r.value ?? r;
}

/** Run `src`'s flow through the self-hosted .fungi pipeline. Returns {faulted, ty, tag, i}. */
async function fungiExec(src, flowName, argNums) {
  const lexRes = await executeFlow("tokenize", new Map([["source", vStr(src)]]), lexer.ast);
  let lx = lexRes.value ?? lexRes;
  const toks = lx.__tag === "ok" ? lx.value : lx;
  const pr = await executeFlow("parseFlows", new Map([["tokens", toks]]), parser.ast);
  const flows = (pr.value ?? pr).fields.get("flows");
  const tableRes = await executeFlow("buildFlowTable", new Map([["flows", flows]]), gir.ast, gir.flows, undefined, undefined, { pureFastPath: false });
  const table = tableRes.value ?? tableRes;
  const args = [];
  for (const n of argNums) args.push(await rtInt(n));
  const run = await executeFlow("runProgram", new Map([["flows", table], ["entryName", vStr(flowName)], ["args", { __tag: "list", items: args }]]), rt.ast, rt.flows, undefined, undefined, { pureFastPath: false });
  const rv = (run.value ?? run).fields.get("retVal");
  const f = (rv.value ?? rv).fields;
  const ty = f.get("ty").value, tag = f.get("tag").value, i = f.get("i").value;
  return { faulted: ty === "tag" && tag === "Err", ty, tag, i };
}

// ── VALID corpus: value-parity (neither faults; same computed value) ────────────
const VALID = [
  { label: "div 10/2 = 5",  src: `pure flow d(a: Int, b: Int) -> Int { return a / b }`, entry: "d", names: ["a", "b"], args: [10, 2], value: 5 },
  { label: "mul 6*7 = 42",  src: `pure flow m(a: Int, b: Int) -> Int { return a * b }`, entry: "m", names: ["a", "b"], args: [6, 7], value: 42 },
  { label: "sub 10-3 = 7",  src: `pure flow s(a: Int, b: Int) -> Int { return a - b }`, entry: "s", names: ["a", "b"], args: [10, 3], value: 7 },
];

// ── ERROR-edge corpus: fault-parity (BOTH must fault) ───────────────────────────
// div0 measured this session; hardened in applyBinop (ed48dd0d). NOTE (R&D 0229): the lexer/parser
// malformed-input cascade (unterminated string/char, bad escape, stray backtick, unterminated block)
// belongs here too — added as those stages are hardened; they currently fail-OPEN so they'd RED this
// gate today, which is the point (this gate is what forces the harden).
const ERROR_EDGE = [
  { label: "div-by-zero 10/0", src: `pure flow d(a: Int, b: Int) -> Int { return a / b }`, entry: "d", names: ["a", "b"], args: [10, 0] },
  // missing ENTRY flow: call a flow the program doesn't define. .ts → runtimeError value, .fungi → Err
  // (runProgram hardened, step 1b 4cba01d1). Measured both fault this session.
  { label: "missing entry flow (call undefined)", src: `pure flow d(a: Int, b: Int) -> Int { return a / b }`, entry: "nope", names: [], args: [] },
];

describe("RD-0528 .fungi ≡ .ts edge-differential — VALID inputs: value-parity", () => {
  for (const c of VALID) {
    it(`${c.label}`, async () => {
      const ts = await tsExec(c.src, c.entry, c.args, c.names);
      const fu = await fungiExec(c.src, c.entry, c.args);
      assert.equal(ts.faulted, false, `.ts unexpectedly faulted: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, false, `.fungi unexpectedly faulted: ${JSON.stringify(fu)}`);
      assert.equal(ts.value, c.value, `.ts value: ${JSON.stringify(ts)}`);
      assert.equal(fu.i, c.value, `.fungi value: ${JSON.stringify(fu)}`);
    });
  }
});

describe("RD-0528 .fungi ≡ .ts edge-differential — ERROR edges: fault-parity (both fault)", () => {
  for (const c of ERROR_EDGE) {
    it(`${c.label} → both fault`, async () => {
      const ts = await tsExec(c.src, c.entry, c.args, c.names);
      const fu = await fungiExec(c.src, c.entry, c.args);
      assert.equal(ts.faulted, true, `.ts did NOT fault on an error edge: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, true, `.fungi did NOT fault (fail-open regression) where .ts does: ${JSON.stringify(fu)}`);
    });
  }
});

// ── LEX-STAGE differential (2nd predicate family, R&D 0234) ─────────────────────
// The runtime rows above compare COMPUTED values / runtime faults; the lexer faults at a DIFFERENT layer,
// so it needs its own fault predicate: `.ts` faults = `parseProgram(src).diagnostics` non-empty (lex+parse
// diagnostics, measured — backtick→FUNGI-PARSE-001, unterminated→FUNGI-PARSE-003); `.fungi` faults =
// `tokenize(src)` returns `Err`. Locks the lexer harden (unterminated string/char `15bf1f54`/`4a2d2aef`,
// unexpected char `74f7d996`) into the differential so a fail-open regression there RED's this gate.
function tsLexFault(src) {
  const p = parseProgram(src, "edge-lex.fungi");
  const d = p.diagnostics ?? [];
  return { faulted: d.length > 0, codes: d.map((x) => x.code ?? x).slice(0, 2) };
}
async function fungiLexFault(src) {
  const r = await executeFlow("tokenize", new Map([["source", vStr(src)]]), lexer.ast);
  const v = r.value ?? r;
  return { faulted: v.__tag === "err" };
}

// PARSE-stage `.fungi` fault predicate (3rd family, R&D 0254). Distinct from lex: an unterminated flow
// BODY tokenizes CLEAN (the tokens are all valid) — the fault is in parseFlows' `errors` list, not
// tokenize's Err. So: tokenize (Ok) → parseFlows → `errors` non-empty. The `.ts` side reuses tsLexFault
// (`parseProgram(src).diagnostics` spans BOTH lex and parse — an unterminated body surfaces there as
// FUNGI-PARSE-001). Assert FAULT-PARITY only, never code-equality: `.ts` classifies it PARSE-001 (top-level
// unclosed), `.fungi` PARSE-003 (body-specific) — different detection points, both valid (R&D 0254 caveat).
async function fungiParseFault(src) {
  const lexRes = await executeFlow("tokenize", new Map([["source", vStr(src)]]), lexer.ast);
  const lv = lexRes.value ?? lexRes;
  const toks = lv.__tag === "ok" ? lv.value : lv;
  const pr = await executeFlow("parseFlows", new Map([["tokens", toks]]), parser.ast);
  const errs = (pr.value ?? pr).fields.get("errors");
  return { faulted: errs?.__tag === "list" && errs.items.length > 0 };
}

const LEX_VALID = [
  { label: "number + symbols", src: `pure flow f() -> Int { return 1 }` },
  { label: "string literal", src: `pure flow g() -> String { return "hi" }` },
  { label: "operators", src: `pure flow h(a: Int, b: Int) -> Int { return a + b }` },
  { label: "valid unicode escape \\u{41}", src: `pure flow g() -> String { return "\\u{41}" }` },
  { label: "valid lowercase unicode escape \\u{10ffff}", src: `pure flow g() -> String { return "\\u{10ffff}" }` },
];
const LEX_MALFORMED = [
  { label: "unterminated string", src: `pure flow f() -> String { return "hi }` },
  { label: "unterminated char", src: `pure flow f() -> Int { return 'a }` },
  { label: "stray backtick", src: "pure flow f() -> Int { return `y` }" },
  { label: "bitwise ^ (not a .fungi op)", src: `pure flow f() -> Int { return 1 ^ 2 }` },
  { label: "invalid unicode escape \\u{110000} (>max)", src: `pure flow g() -> String { return "\\u{110000}" }` },
  { label: "non-hex unicode escape \\u{ZZZ}", src: `pure flow g() -> String { return "\\u{ZZZ}" }` },
  { label: "non-hex 6th digit \\u{10FFFG}", src: `pure flow g() -> String { return "\\u{10FFFG}" }` },
];

// ── PARSE-stage corpus (R&D 0254): unterminated flow BODY block. Tokenizes clean, faults at parse. ──
const PARSE_VALID = [
  { label: "closed body", src: `pure flow f() -> Int { return 1 }` },
  { label: "closed nested if body", src: `pure flow f() -> Int { if true { return 1 } return 0 }` },
];
const PARSE_MALFORMED = [
  { label: "unterminated flow body (EOF before })", src: `pure flow f() -> Int { return 1` },
  { label: "unterminated nested block in flow body", src: `pure flow f() -> Int { if true { return 1 }` },
];

// ── SUBSET-REFUSAL corpus (R&D 0260 ruling — the 3rd .fungi≡.ts relationship) ────────────────────
// A first-class .ts operator the .fungi twin does NOT model: `.ts` is VALID (computes a value) while
// `.fungi` FAULTS fail-closed. NOT a fail-open (no silent wrong value), NOT both-fault. The `.fungi`
// fault surfaces at DIFFERENT stages, so the predicate differs per row: `%` at PARSE (FUNGI-PARSE-005 —
// the parser drops it) · `and`/`or` at RUNTIME (gir-emitter opcodeOf → op:"unknown" → applyBinop Err).
// Each row is a SAFETY LOCK: "the twin must fault on this operator" — if `%` ever regresses to fail-open
// (silent 5) or a botched "add support" silently mis-computes, the row RED's (R&D 0260).
const SUBSET_REFUSAL = [
  { label: "% (modulo) — refused at PARSE", src: `pure flow f() -> Int { return 5 % 2 }`, entry: "f", names: [], args: [], fungiFault: "parse" },
  { label: "and (logical) — refused at RUNTIME", src: `pure flow f() -> Bool { return true and false }`, entry: "f", names: [], args: [], fungiFault: "runtime" },
  { label: "or (logical) — refused at RUNTIME", src: `pure flow f() -> Bool { return true or false }`, entry: "f", names: [], args: [], fungiFault: "runtime" },
];

describe("RD-0528 .fungi ≡ .ts edge-differential — LEX stage: no-fault on valid, fault-parity on malformed", () => {
  for (const c of LEX_VALID) {
    it(`valid: ${c.label} → neither faults`, async () => {
      const ts = tsLexFault(c.src);
      const fu = await fungiLexFault(c.src);
      assert.equal(ts.faulted, false, `.ts lex faulted on valid input: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, false, `.fungi lex faulted on valid input: ${c.label}`);
    });
  }
  for (const c of LEX_MALFORMED) {
    it(`malformed: ${c.label} → both fault`, async () => {
      const ts = tsLexFault(c.src);
      const fu = await fungiLexFault(c.src);
      assert.equal(ts.faulted, true, `.ts did NOT fault on malformed lex input: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, true, `.fungi lex did NOT fault (fail-open regression) where .ts does: ${c.label}`);
    });
  }
});

describe("RD-0528 .fungi ≡ .ts edge-differential — PARSE stage: no-fault on valid, fault-parity on unterminated body", () => {
  for (const c of PARSE_VALID) {
    it(`valid: ${c.label} → neither faults`, async () => {
      const ts = tsLexFault(c.src); // parseProgram diagnostics span lex+parse — the .ts static-fault predicate
      const fu = await fungiParseFault(c.src);
      assert.equal(ts.faulted, false, `.ts faulted on valid parse input: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, false, `.fungi parseFlows faulted on valid input: ${c.label}`);
    });
  }
  for (const c of PARSE_MALFORMED) {
    it(`malformed: ${c.label} → both fault`, async () => {
      const ts = tsLexFault(c.src);
      const fu = await fungiParseFault(c.src);
      assert.equal(ts.faulted, true, `.ts did NOT fault on malformed parse input: ${JSON.stringify(ts)}`);
      assert.equal(fu.faulted, true, `.fungi parseFlows did NOT fault (fail-open regression) where .ts does: ${c.label}`);
    });
  }
});

describe("RD-0528 .fungi ≡ .ts edge-differential — SUBSET-REFUSAL: .ts valid, .fungi fault-closed-refuses (R&D 0260)", () => {
  for (const c of SUBSET_REFUSAL) {
    it(`${c.label} → .ts VALID, .fungi FAULTS`, async () => {
      const ts = await tsExec(c.src, c.entry, c.args, c.names);
      assert.equal(ts.faulted, false, `.ts unexpectedly faulted on an operator it models: ${JSON.stringify(ts)}`);
      // Predicate per row: `%` faults at parse (parseFlows errors), and/or at runtime (applyBinop Err).
      const fu = c.fungiFault === "parse" ? await fungiParseFault(c.src) : await fungiExec(c.src, c.entry, c.args);
      assert.equal(fu.faulted, true, `.fungi did NOT fault — the subset-refusal is lost (fail-open?) on ${c.label}: ${JSON.stringify(fu)}`);
    });
  }
  // Non-vacuity: a MODELED op must be VALID on BOTH sides, so "`.fungi` faults" can't pass vacuously.
  it("non-vacuity: a modeled op (+) is valid on BOTH sides (5 + 2 = 7), not a vacuous 'fungi faults'", async () => {
    const src = `pure flow f(a: Int, b: Int) -> Int { return a + b }`;
    const ts = await tsExec(src, "f", [5, 2], ["a", "b"]);
    const fu = await fungiExec(src, "f", [5, 2]);
    assert.equal(ts.faulted, false, ".ts should compute a+b");
    assert.equal(fu.faulted, false, `.fungi should compute a+b, not fault: ${JSON.stringify(fu)}`);
    assert.equal(fu.i, 7, ".fungi a+b value must be 7");
  });
});

// ── ESCAPE VALUE characterization (main 0341 / R&D 0342 + 0344) ──────────────────────────────────
// The LEX_VALID rows above already carry `\u{41}` and `\u{10ffff}`, but the LEX predicate returns
// `{ faulted }` ONLY — so they lock "neither side errors" and are VACUOUS on the VALUE. Both sessions
// then measured, independently and with identical numbers, that the values DIVERGE:
//
//   `\n` `\t` `\\` `\"`  SYMMETRIC — both twins retain the backslash (lexer.ts:601 / lexer.fungi:328-339)
//   `\u`                 ASYMMETRIC — .ts DECODES (:562/:587); lexer.fungi VALIDATES and keeps rawText
//                        (:340-348, appending scanUnicodeEscape's `rawText` element)
//
// This block is a CHARACTERIZATION, deliberately NOT a parity assertion: it pins what each side does
// TODAY so the divergence cannot drift silently, and it lands GREEN. A true value-parity row would red
// on arrival, and the fix is not a patch — it needs a hex->int in the twin, a `Char.fromCode` WASM
// lowering (R&D measured it as interpreter-only: WAT assembly refuses `$fromCode`), and an owner spec
// call on whether `\u{1F600}` is length 2 (UTF-16, matching .ts) or 1 (code point). When that lands,
// these rows convert to equality assertions.
//
// Severity, evidenced not assumed: LATENT. A scan of all 460 TRACKED `.fungi` sources found 17 `\u`
// occurrences, ALL inside lexer.fungi's own comments plus one `\\u` in a contract intent — ZERO live
// `\u` escapes anywhere in the corpus. Nothing compiled today consumes the divergent path.
const BS = String.fromCharCode(92); // build escapes at runtime — authoring-time decoding ate R&D's first probe

/** The `.ts` production parser's own value for a string literal (the node keeps its outer quotes). */
function tsLiteralValue(literal) {
  const p = parseProgram(`pure flow f() -> String { return "${literal}" }`, "escape-char.fungi");
  let found;
  const walk = (n) => {
    if (!n || typeof n !== "object" || found !== undefined) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.kind === "stringLiteral") { found = n.value; return; }
    for (const k of Object.keys(n)) if (k !== "parent") walk(n[k]);
  };
  walk(p.ast);
  if (typeof found === "string" && found.startsWith('"') && found.endsWith('"')) found = found.slice(1, -1);
  return found;
}

/** The `.fungi` twin's token value for the same literal (token `kind` is a variant, so select by position). */
async function fungiLiteralValue(literal) {
  const r = await executeFlow("tokenize", new Map([["source", vStr(`pure flow f() -> String { return "${literal}" }`)]]), lexer.ast);
  const lv = r.value ?? r;
  const toks = lv.__tag === "ok" ? lv.value : lv;
  const vals = (toks.items ?? []).map((t) => (t.value ?? t).fields?.get("value")?.value);
  const idx = vals.indexOf("return");
  return idx >= 0 ? vals[idx + 1] : undefined;
}

const ESCAPE_SYMMETRIC = [
  { label: "plain (CONTROL — proves both extractors read real values)", lit: "ab", len: 2 },
  { label: `${BS}n  retained by BOTH`, lit: `a${BS}nb`, len: 4 },
  { label: `${BS}t  retained by BOTH`, lit: `a${BS}tb`, len: 4 },
  { label: `${BS}${BS} retained by BOTH`, lit: `a${BS}${BS}b`, len: 4 },
  { label: `${BS}"  retained by BOTH (does not terminate the literal)`, lit: `a${BS}"b`, len: 4 },
];

describe("RD-0528 edge-differential — ESCAPE VALUES: symmetric pass-through (both twins agree)", () => {
  for (const c of ESCAPE_SYMMETRIC) {
    it(`${c.label} → same value on both sides`, async () => {
      const ts = tsLiteralValue(c.lit);
      const fu = await fungiLiteralValue(c.lit);
      assert.equal(ts, fu, `escape pass-through must stay symmetric: .ts=${JSON.stringify(ts)} .fungi=${JSON.stringify(fu)}`);
      assert.equal(ts.length, c.len, `measured length changed for ${c.label}: got ${ts.length}`);
    });
  }
});

describe("RD-0528 edge-differential — ESCAPE VALUES: \\u is ASYMMETRIC (CHARACTERIZATION, measured not blessed)", () => {
  it("\\u0041 — .ts DECODES to 'A' (1 char); the authoritative twin keeps the raw 6 chars", async () => {
    const lit = `${BS}u0041`;
    const ts = tsLiteralValue(lit);
    const fu = await fungiLiteralValue(lit);
    assert.equal(ts, "A", `.ts must decode \\u0041, got ${JSON.stringify(ts)}`);
    assert.equal(fu, `${BS}u0041`, `.fungi must still keep rawText, got ${JSON.stringify(fu)}`);
    assert.notEqual(ts, fu, "the divergence this row exists to pin has vanished — convert to a parity assertion");
  });

  it("\\u{1F600} — .ts DECODES to the astral char (length 2, UTF-16); the twin keeps the raw 9 chars", async () => {
    const lit = `${BS}u{1F600}`;
    const ts = tsLiteralValue(lit);
    const fu = await fungiLiteralValue(lit);
    assert.equal(ts.length, 2, `.ts astral decode is UTF-16 surrogate-pair (length 2), got ${ts.length}`);
    assert.equal(fu, `${BS}u{1F600}`, `.fungi must still keep rawText, got ${JSON.stringify(fu)}`);
    assert.notEqual(ts, fu, "the divergence this row exists to pin has vanished — convert to a parity assertion");
  });

  it("non-vacuity: the twin still REJECTS an invalid \\u fail-closed, so validity parity is intact", async () => {
    const bad = `pure flow g() -> String { return "${BS}u{110000}" }`;
    const fu = await fungiLexFault(bad);
    assert.equal(fu.faulted, true, "an out-of-range \\u must still fault in the twin — this is a VALUE divergence, not a fail-open");
  });
});

describe("RD-0528 edge-differential — non-vacuity", () => {
  it("has both a value-parity corpus and a fault-parity corpus, and the fault predicate distinguishes them", async () => {
    assert.ok(VALID.length >= 2, "value-parity corpus must be non-trivial");
    assert.ok(ERROR_EDGE.length >= 1, "must carry at least one error-edge fault-parity case");
    assert.ok(LEX_VALID.length >= 2 && LEX_MALFORMED.length >= 2, "the lex-stage corpus must carry both accept and reject rows");
    assert.ok(SUBSET_REFUSAL.length >= 3, "the subset-refusal corpus must carry the 3 unmodeled operators (%, and, or)");
    assert.ok(PARSE_VALID.length >= 2 && PARSE_MALFORMED.length >= 2, "the parse-stage corpus must carry both accept and reject rows");
    // Parse-stage positive control: an unterminated body must fault on .fungi via parseFlows, NOT via a
    // tokenize Err (else this would collapse into the lex family and prove nothing about the parser).
    const fu = await fungiParseFault(PARSE_MALFORMED[0].src);
    assert.equal(fu.faulted, true, "parse positive control: .fungi parseFlows must fault on an unterminated body");
    // The instrument's positive control: a VALID input must be observed as NON-faulting on both sides
    // (else 'both fault' would pass vacuously for any input).
    const ts = await tsExec(VALID[0].src, VALID[0].entry, VALID[0].args, VALID[0].names);
    assert.equal(ts.faulted, false, "positive control: .ts must NOT fault on a valid input");
  });
});
