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

const LEX_VALID = [
  { label: "number + symbols", src: `pure flow f() -> Int { return 1 }` },
  { label: "string literal", src: `pure flow g() -> String { return "hi" }` },
  { label: "operators", src: `pure flow h(a: Int, b: Int) -> Int { return a + b }` },
];
const LEX_MALFORMED = [
  { label: "unterminated string", src: `pure flow f() -> String { return "hi }` },
  { label: "unterminated char", src: `pure flow f() -> Int { return 'a }` },
  { label: "stray backtick", src: "pure flow f() -> Int { return `y` }" },
  { label: "bitwise ^ (not a .fungi op)", src: `pure flow f() -> Int { return 1 ^ 2 }` },
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

describe("RD-0528 edge-differential — non-vacuity", () => {
  it("has both a value-parity corpus and a fault-parity corpus, and the fault predicate distinguishes them", async () => {
    assert.ok(VALID.length >= 2, "value-parity corpus must be non-trivial");
    assert.ok(ERROR_EDGE.length >= 1, "must carry at least one error-edge fault-parity case");
    assert.ok(LEX_VALID.length >= 2 && LEX_MALFORMED.length >= 2, "the lex-stage corpus must carry both accept and reject rows");
    // The instrument's positive control: a VALID input must be observed as NON-faulting on both sides
    // (else 'both fault' would pass vacuously for any input).
    const ts = await tsExec(VALID[0].src, VALID[0].entry, VALID[0].args, VALID[0].names);
    assert.equal(ts.faulted, false, "positive control: .ts must NOT fault on a valid input");
  });
});
