/**
 * RD-0528 I-3 — self-hosted FUNCTIONAL-correctness corpus (tranche 1: type-correctness;
 * tranche 2: parse-correctness — the parser's own FUNGI-PARSE-00x fail-closed reporting;
 * tranche 3: governance-correctness — parse -> verifyGovernance/checkBodyGovernance, the REAL
 * pipeline, distinct from the hand-built-record self-hosted-governance-verifier.test.mjs;
 * tranche 4: effect-correctness — parse -> checkFlowEffects/checkBodyEffects, the full
 * FUNGI-EFFECT-001..009 charter incl. transitive body reconciliation, distinct from the
 * hand-built-record self-hosted-effect-checker tests).
 *
 * Owner ruling 2026-07-22: I-3 (the oracle that must hold before the .ts compiler can be
 * retired) is FUNCTIONAL correctness — the self-hosted pipeline accepts correct programs and
 * REJECTS incorrect ones — NOT byte-identity with the retiring .ts intermediates (the
 * self-hosted compiler is a separate, internally-coherent implementation; measured token/AST
 * divergences from .ts are design conventions, not bugs — see the I-1 evidence pack).
 *
 * Owner riders (this file honours #1; #2/#3 tracked below):
 *   1. NON-VACUOUS — a corpus that can only pass proves nothing. This corpus carries known-bad
 *      inputs that MUST be rejected, and a meta-check asserts the must-fail set is non-empty and
 *      that every member actually rejects. Every expected code below was MEASURED, not guessed.
 *   2. BOOTSTRAP FIXPOINT (stage0-compiled compiler recompiles itself byte-identically) — NOT
 *      yet buildable: the self-hosted stages are a front-end + checkers + interpreter with NO
 *      WAT/WASM backend (that is still .ts), so the self-hosted compiler cannot emit its own
 *      binary. Deferred until a self-hosted backend exists.
 *   3. STRICTLY PRE-AUTHORITY — this is a test only: no ledger entry, no signed seed hash, no
 *      .ts touched. The flip stays owner-gated (I-4).
 *
 * Reach: the self-hosted pipeline composes lex -> parse -> {type-check | effect-check | govern}.
 * Tranche 4 (2026-07-24) drives the effect-checker (both lanes: checkFlowEffects declaration
 * charter + checkBodyEffects body-derived/transitive reconciliation) across its entire 9-code
 * FUNGI-EFFECT-001..009 charter. Still future: the runtime stage (needs an execution-value
 * oracle, not a diagnostics one) and — once a self-hosted backend exists — end-to-end
 * compilation to correct governed WASM.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { parseProgram, resolveSymbols, checkTypes, executeFlow } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
function load(name) {
  let s = readFileSync(join(__dir, "../src/self-hosted/", name), "utf8");
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  const p = parseProgram(s, name);
  resolveSymbols(p.ast);
  checkTypes(p.ast);
  return p;
}

let lexer, parser, checker, gov, effectChecker;
before(() => {
  lexer = load("lexer.fungi");
  parser = load("parser.fungi");
  checker = load("type-checker.fungi");
  gov = load("governance-verifier.fungi");
  effectChecker = load("effect-checker.fungi");
});

const vStr = (s) => ({ __tag: "string", value: s });
const readDiags = (res) =>
  (res.value ?? res).fields.get("diagnostics").items.map((d) => {
    const x = d.value ?? d;
    return { code: x.fields.get("code").value, flowName: x.fields.get("flowName").value };
  });

/**
 * Run a source string through lex -> parse and return the self-hosted parser's OWN error
 * codes (FUNGI-PARSE-00x). This is the reject-bad oracle at the PARSE stage — distinct from
 * typecheck(), which REFUSES to run when the parser reported errors (driver fail-closed). A
 * malformed program must be caught here, before the type-checker ever sees it.
 */
async function parseErrorCodes(source) {
  const lexRes = await executeFlow("tokenize", new Map([["source", vStr(source)]]), lexer.ast);
  let tokensVal = lexRes.value ?? lexRes;
  if (tokensVal.__tag === "ok") tokensVal = tokensVal.value;
  const parseRes = await executeFlow("parseFlows", new Map([["tokens", tokensVal]]), parser.ast);
  const prRec = parseRes.value ?? parseRes;
  const errs = prRec.fields.get("errors");
  const items = errs?.__tag === "list" ? errs.items : [];
  return items.map((e) => {
    const s = (e.value ?? e).value ?? (e.value ?? e);
    const m = typeof s === "string" ? s.match(/^(FUNGI-PARSE-\d+)/) : null;
    return m ? m[1] : String(s);
  });
}

/** Run a source string through the self-hosted lex -> parse -> type-check pipeline. */
async function typecheck(source) {
  const lexRes = await executeFlow("tokenize", new Map([["source", vStr(source)]]), lexer.ast);
  let tokensVal = lexRes.value ?? lexRes;
  if (tokensVal.__tag === "ok") tokensVal = tokensVal.value;
  const parseRes = await executeFlow("parseFlows", new Map([["tokens", tokensVal]]), parser.ast);
  const prRec = parseRes.value ?? parseRes;
  // Driver refusal (R&D 0050 / FUNGI-PARSE fail-closed): refuse to type-check flows when the
  // parser reported errors — an unread error array is the same fail-open one level up.
  const prErrs = prRec.fields.get("errors");
  assert.deepEqual(
    prErrs?.__tag === "list" ? prErrs.items.map((e) => e.value ?? e) : ["<missing errors list>"],
    [],
    "self-hosted parser reported errors — typecheck driver refuses (FUNGI-PARSE fail-closed)",
  );
  const flowsVal = prRec.fields.get("flows");
  const checkRes = await executeFlow("checkFlows", new Map([["flows", flowsVal]]), checker.ast);
  const bodyRes = await executeFlow("checkFlowBodies", new Map([["flows", flowsVal]]), checker.ast);
  return [...readDiags(checkRes), ...readDiags(bodyRes)];
}

/** Parse a source string and return the parser's `flows` list value (for the governance runners). */
async function parseToFlows(source) {
  const lexRes = await executeFlow("tokenize", new Map([["source", vStr(source)]]), lexer.ast);
  let tokensVal = lexRes.value ?? lexRes;
  if (tokensVal.__tag === "ok") tokensVal = tokensVal.value;
  const parseRes = await executeFlow("parseFlows", new Map([["tokens", tokensVal]]), parser.ast);
  return (parseRes.value ?? parseRes).fields.get("flows");
}

/**
 * Run a source string through parse -> a governance-verifier flow (verifyGovernance or
 * checkBodyGovernance) and return its diagnostic codes. This is the I-3 value over the existing
 * self-hosted-governance-verifier.test.mjs, which drives these checkers with HAND-BUILT FlowDecl
 * records: driving from the PARSER's output proves the parser extracts the governance-relevant
 * shape (the `secure` kind, the body call-exprs) that the rules enforce.
 */
async function govCodes(source, flowName) {
  const flows = await parseToFlows(source);
  const r = await executeFlow(
    flowName, new Map([["flows", flows]]), gov.ast, gov.flows,
    undefined, undefined, { pureFastPath: false },
  );
  const rec = r.value ?? r;
  const d = rec.fields.get("diagnostics");
  return d?.__tag === "list" ? d.items.map((x) => (x.value ?? x).fields.get("code").value) : [];
}

/**
 * Run a source string through parse -> an effect-checker flow (checkFlowEffects or
 * checkBodyEffects) and return its {code, flowName} diagnostics. Tranche 4's runner —
 * same shape as govCodes, driving the self-hosted effect-checker from the PARSER's output.
 */
async function effectDiags(source, flowName) {
  const flows = await parseToFlows(source);
  const r = await executeFlow(
    flowName, new Map([["flows", flows]]), effectChecker.ast, effectChecker.flows,
    undefined, undefined, { pureFastPath: false },
  );
  const rec = r.value ?? r;
  const d = rec.fields.get("diagnostics");
  return d?.__tag === "list"
    ? d.items.map((x) => {
        const f = (x.value ?? x).fields;
        return { code: f.get("code").value, flowName: f.get("flowName").value };
      })
    : [];
}

// ── The corpus (measured 2026-07-22) ───────────────────────────────────────────

// Correct programs: the self-hosted type-checker MUST accept (zero diagnostics).
const MUST_PASS = [
  { label: "param return", src: `pure flow add(a: Int, b: Int) -> Int { return a }` },
  { label: "Int literal return", src: `pure flow answer() -> Int { return 42 }` },
  { label: "String literal return", src: `pure flow greet() -> String { return "hi" }` },
  { label: "two independent clean flows", src: `pure flow g(a: Int) -> Int { return a }\npure flow h(b: Int) -> Int { return b }` },
  // TYPE-033 silence controls (the other half of the non-vacuity pair): a Bool-literal condition and
  // a compare condition must NOT emit — and an UNINFERABLE condition (bare param ref) must stay
  // silent too, mirroring Stage-A's `t !== undefined` conservatism.
  { label: "if true (Bool literal condition) — no TYPE-033", src: `pure flow okc() -> Int { if true { return 1 } return 2 }` },
  { label: "if bare param ref (uninferable condition) — conservative, no TYPE-033", src: `pure flow okd(a: Int) -> Int { if a { return 1 } return 2 }` },
];

// Known-bad programs: the self-hosted type-checker MUST reject, with this exact diagnostic.
const MUST_FAIL = [
  { label: "String returned where Int declared", src: `pure flow bad() -> Int { return "hello" }`, expect: { code: "FUNGI-TYPE-008", flowName: "bad" } },
  { label: "Int returned where String declared", src: `pure flow bad2() -> String { return 42 }`, expect: { code: "FUNGI-TYPE-008", flowName: "bad2" } },
  { label: "Int returned where Bool declared", src: `pure flow bad3() -> Bool { return 42 }`, expect: { code: "FUNGI-TYPE-008", flowName: "bad3" } },
  { label: "unknown return type", src: `pure flow bad4() -> Nope { return 1 }`, expect: { code: "FUNGI-TYPE-001", flowName: "bad4" } },
  { label: "unknown param type", src: `pure flow bad5(a: Nope) -> Int { return 1 }`, expect: { code: "FUNGI-TYPE-001", flowName: "bad5" } },
  { label: "one bad flow beside a good one — only the bad flagged", src: `pure flow bad6() -> String { return 42 }\npure flow ok(a: Int) -> Int { return a }`, expect: { code: "FUNGI-TYPE-008", flowName: "bad6" } },
  // TYPE-033 non-vacuity pair (the twin mirror's §5a fixture, measured 2026-07-24): a known non-Bool
  // condition MUST emit; the Bool-literal + compare controls in MUST_PASS below MUST stay silent.
  { label: "if branches on an Int literal (non-Bool condition)", src: `pure flow bad7() -> Int { if 42 { return 1 } return 2 }`, expect: { code: "FUNGI-TYPE-033", flowName: "bad7" } },
  { label: "while branches on a String literal (non-Bool condition)", src: `pure flow bad8() -> Int { while "x" { return 1 } return 2 }`, expect: { code: "FUNGI-TYPE-033", flowName: "bad8" } },
];

// Tranche 2 — parse-correctness. Malformed programs the self-hosted PARSER must reject with a
// FUNGI-PARSE-00x code (all MEASURED 2026-07-23). Several of these previously fell through to an
// accidental FUNGI-TYPE-001 catch or FAILED OPEN silently; the landed parser fail-closed reporting
// (FUNGI-PARSE-001..004) now catches them at the parse stage, and typecheck()'s driver refusal
// stops any of them reaching the type-checker. Each asserts the errors list CONTAINS the expected
// code (a missing brace legitimately raises two: "no body" + a stray top-level token).
const MUST_FAIL_PARSE = [
  { label: "garbage tokens at top level", src: `!!! @@@ ###`, contains: "FUNGI-PARSE-001" },
  { label: "trailing non-grammar token after a valid flow", src: `pure flow f() -> Int { return 1 } zzz`, contains: "FUNGI-PARSE-001" },
  { label: "qualifier not followed by 'flow'", src: `pure zzz f() -> Int { return 1 }`, contains: "FUNGI-PARSE-002" },
  { label: "dangling 'flow' keyword at EOF (no name)", src: `pure flow`, contains: "FUNGI-PARSE-003" },
  { label: "unclosed params, no body brace", src: `pure flow f(a: Int -> Int { return 1 }`, contains: "FUNGI-PARSE-004" },
  { label: "flow header with no body block", src: `pure flow f() -> Int return 1`, contains: "FUNGI-PARSE-004" },
];

// The false-positive guard: well-formed input — INCLUDING a comment-only file, which is
// legitimately empty (R&D 0050: an empty program is not a parse error) — must yield ZERO parse errors.
const MUST_PASS_PARSE = [
  { label: "a valid flow", src: `pure flow f() -> Int { return 1 }` },
  { label: "comment-only (legitimately empty, not a parse error)", src: `// just a comment` },
];

// Tranche 3 — governance-correctness via the REAL pipeline (parse -> governance checker), all
// MEASURED. Reachable rules: verifyGovernance FUNGI-GOV-002 (a secure flow must declare >=1 effect);
// checkBodyGovernance FUNGI-VAL-001 (a secure flow must CALL audit in its body); and — since finding
// (d) (d6b27b64) taught the parser to extract classification + deterministic from the value{}/safety{}
// contract sub-blocks — the classification-based safety_critical checks verifyGovernance
// FUNGI-VAL-001/002 now fire END-TO-END from source (GOV_SAFETY below). Still NOT pipeline-reachable:
// the declared-effect checks needing usedEffects (still body-decomposed, left empty by the parser).
const GOV_VERIFY = [
  { label: "secure flow with no effects -> GOV-002", src: `secure flow charge() -> Int { return 1 }`, expect: "FUNGI-GOV-002" },
  { label: "pure flow -> passes governance", src: `pure flow add(a: Int) -> Int { return a }`, expect: null },
  { label: "plain flow -> passes governance", src: `flow orchestrate() -> Int { return 1 }`, expect: null },
];
const GOV_BODY = [
  { label: "secure flow whose body calls auditWrite -> passes", src: `secure flow charge() -> Int { auditWrite() return 1 }`, expect: null },
  { label: "secure flow whose body has no audit call -> VAL-001", src: `secure flow charge() -> Int { doThing() return 1 }`, expect: "FUNGI-VAL-001" },
  { label: "non-secure (pure) flow needs no audit -> passes", src: `pure flow compute() -> Int { doThing() return 1 }`, expect: null },
];
// Tranche 3b — safety_critical governance END-TO-END, unlocked by finding (d). The parser now extracts
// classification (value{}) + deterministic (safety{}), so verifyGovernance's FUNGI-VAL-001 (no audit
// effect) / VAL-002 (not deterministic) fire from real SOURCE, not just hand-built records. `contains`
// is a list because a safety_critical flow can trip both at once. All MEASURED.
const GOV_SAFETY = [
  { label: "safety_critical, no audit + not deterministic -> VAL-001 + VAL-002", src: `guarded flow fire() -> Int\ncontract { value { classification safety_critical } effects { hw.write } } { return 1 }`, contains: ["FUNGI-VAL-001", "FUNGI-VAL-002"] },
  { label: "safety_critical, audit + deterministic -> passes", src: `guarded flow fire() -> Int\ncontract { value { classification safety_critical } effects { audit.write } safety { require deterministic_execution } } { return 1 }`, contains: [] },
  { label: "safety_critical, audit but NOT deterministic -> VAL-002", src: `guarded flow fire() -> Int\ncontract { value { classification safety_critical } effects { audit.write } } { return 1 }`, contains: ["FUNGI-VAL-002"] },
  { label: "standard classification -> no safety_critical checks (passes)", src: `guarded flow ok() -> Int\ncontract { value { classification standard } effects { hw.write } } { return 1 }`, contains: [] },
];

// Tranche 4 — effect-correctness via the REAL pipeline (parse -> effect-checker), all MEASURED
// 2026-07-24. TWO LANES with DIFFERENT reach (measured; load-bearing for reading these cases):
//   · checkFlowEffects (DECL lane) validates the DECLARED effect list only — it does NOT see body
//     usage, so ANY known declared effect reports 007 OVERDECLARED there, even one the body uses.
//     Its charter: pure-boundary (003), registry (004), aliases (005/009), deny-only (006),
//     overdeclared (007), privileged-on-plain (008).
//   · checkBodyEffects (BODY lane) DERIVES usedEffects from the body call-graph (the effectOfCall
//     builtin registry: dbRead/dbWrite/netGet/netPost/readFile/writeFile/auditWrite), including
//     TRANSITIVE helper calls, and reconciles used-vs-declared: undeclared use (001), transitive
//     undeclared (002), pure-uses-effect (003). Full reconciliation lives HERE — so the
//     accept-with-effects control (declares AND uses audit.write -> clean) is a BODY-lane case.
// Together the two lanes exercise the effect twin's ENTIRE 9-code charter (001..009) end-to-end.
const EFFECT_DECL = [
  { label: "pure flow declaring an effect -> 003 boundary violation", src: `pure flow p() -> Int\ncontract { effects { audit.write } } { return 1 }`, contains: ["FUNGI-EFFECT-003"] },
  { label: "unrecognised effect name -> 004", src: `secure flow s() -> Int\ncontract { effects { bogus.effect } } { return 1 }`, contains: ["FUNGI-EFFECT-004"] },
  { label: "broad alias 'network' -> 005", src: `secure flow s() -> Int\ncontract { effects { network } } { return 1 }`, contains: ["FUNGI-EFFECT-005"] },
  { label: "deny-only 'memory.spill' -> 006", src: `secure flow s() -> Int\ncontract { effects { memory.spill } } { return 1 }`, contains: ["FUNGI-EFFECT-006"] },
  { label: "declared-but-unobserved effect -> 007 (decl lane cannot see body use)", src: `secure flow s() -> Int\ncontract { effects { audit.write } } { return 1 }`, contains: ["FUNGI-EFFECT-007"] },
  { label: "privileged effect on a PLAIN flow -> 008 (alongside its 007)", src: `flow f() -> Int\ncontract { effects { secret.read } } { return 1 }`, contains: ["FUNGI-EFFECT-008"] },
  { label: "non-broad alias 'http.get' -> 009", src: `secure flow s() -> Int\ncontract { effects { http.get } } { return 1 }`, contains: ["FUNGI-EFFECT-009"] },
  { label: "clean pure flow (no effects) -> passes", src: `pure flow p(a: Int) -> Int { return a }`, contains: [] },
];
const EFFECT_BODY = [
  { label: "body dbWrite() with only audit.write declared -> 001 undeclared use", src: `secure flow s() -> Int\ncontract { effects { audit.write } } { dbWrite() auditWrite() return 1 }`, contains: [{ code: "FUNGI-EFFECT-001", flowName: "s" }] },
  { label: "TRANSITIVE: caller reaches database.write via helper, declares only audit.write -> 002", src: `secure flow helper() -> Int\ncontract { effects { database.write } } { dbWrite() return 1 }\nsecure flow s() -> Int\ncontract { effects { audit.write } } { helper() auditWrite() return 1 }`, contains: [{ code: "FUNGI-EFFECT-002", flowName: "s" }] },
  { label: "pure flow whose body dbRead()s -> 003 boundary + 001 undeclared", src: `pure flow p() -> Int { dbRead() return 1 }`, contains: [{ code: "FUNGI-EFFECT-003", flowName: "p" }, { code: "FUNGI-EFFECT-001", flowName: "p" }] },
  { label: "accept-with-effects control: declares AND uses audit.write -> clean", src: `secure flow s() -> Int\ncontract { effects { audit.write } } { auditWrite() return 1 }`, contains: [] },
  { label: "clean pure flow (pure body) -> passes", src: `pure flow p(a: Int) -> Int { return a }`, contains: [] },
];

describe("RD-0528 I-3 functional corpus (tranche 1: type-correctness) — MUST-PASS", () => {
  for (const c of MUST_PASS) {
    it(`accepts: ${c.label}`, async () => {
      const diags = await typecheck(c.src);
      assert.deepEqual(diags, [], `expected zero diagnostics, got ${JSON.stringify(diags)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 1: type-correctness) — MUST-FAIL (non-vacuous)", () => {
  for (const c of MUST_FAIL) {
    it(`rejects: ${c.label} -> ${c.expect.code}`, async () => {
      const diags = await typecheck(c.src);
      assert.ok(diags.length > 0, `NON-VACUITY LEAK: a known-bad program produced no diagnostic (${c.label})`);
      assert.ok(
        diags.some((d) => d.code === c.expect.code && d.flowName === c.expect.flowName),
        `expected ${JSON.stringify(c.expect)}, got ${JSON.stringify(diags)}`,
      );
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 2: parse-correctness) — MUST-FAIL (fail-closed)", () => {
  for (const c of MUST_FAIL_PARSE) {
    it(`parser rejects: ${c.label} -> ${c.contains}`, async () => {
      const codes = await parseErrorCodes(c.src);
      assert.ok(codes.length > 0, `NON-VACUITY LEAK: a malformed program produced no parse error (${c.label})`);
      assert.ok(codes.includes(c.contains), `expected ${c.contains} among parse errors, got ${JSON.stringify(codes)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 2: parse-correctness) — MUST-PASS (no false alarm)", () => {
  for (const c of MUST_PASS_PARSE) {
    it(`parser accepts: ${c.label}`, async () => {
      const codes = await parseErrorCodes(c.src);
      assert.deepEqual(codes, [], `expected zero parse errors, got ${JSON.stringify(codes)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 3: governance-correctness) — verifyGovernance (parse -> govern)", () => {
  for (const c of GOV_VERIFY) {
    it(`${c.expect ? "rejects" : "accepts"}: ${c.label}`, async () => {
      const codes = await govCodes(c.src, "verifyGovernance");
      if (c.expect) assert.ok(codes.includes(c.expect), `expected ${c.expect}, got ${JSON.stringify(codes)}`);
      else assert.deepEqual(codes, [], `expected clean governance, got ${JSON.stringify(codes)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 3: governance-correctness) — checkBodyGovernance (parse -> body audit)", () => {
  for (const c of GOV_BODY) {
    it(`${c.expect ? "rejects" : "accepts"}: ${c.label}`, async () => {
      const codes = await govCodes(c.src, "checkBodyGovernance");
      if (c.expect) assert.ok(codes.includes(c.expect), `expected ${c.expect}, got ${JSON.stringify(codes)}`);
      else assert.deepEqual(codes, [], `expected clean governance, got ${JSON.stringify(codes)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 3b: safety_critical VAL via parse->classification, finding d)", () => {
  for (const c of GOV_SAFETY) {
    it(`${c.contains.length ? "rejects" : "accepts"}: ${c.label}`, async () => {
      const codes = await govCodes(c.src, "verifyGovernance");
      for (const code of c.contains) assert.ok(codes.includes(code), `expected ${code}, got ${JSON.stringify(codes)}`);
      if (c.contains.length === 0) assert.deepEqual(codes, [], `expected clean governance, got ${JSON.stringify(codes)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 4: effect-correctness) — checkFlowEffects (decl lane)", () => {
  for (const c of EFFECT_DECL) {
    it(`${c.contains.length ? "rejects" : "accepts"}: ${c.label}`, async () => {
      const diags = await effectDiags(c.src, "checkFlowEffects");
      const codes = diags.map((d) => d.code);
      for (const code of c.contains) assert.ok(codes.includes(code), `expected ${code}, got ${JSON.stringify(diags)}`);
      if (c.contains.length === 0) assert.deepEqual(diags, [], `expected clean effect check, got ${JSON.stringify(diags)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus (tranche 4: effect-correctness) — checkBodyEffects (body lane, transitive)", () => {
  for (const c of EFFECT_BODY) {
    it(`${c.contains.length ? "rejects" : "accepts"}: ${c.label}`, async () => {
      const diags = await effectDiags(c.src, "checkBodyEffects");
      for (const want of c.contains) {
        assert.ok(
          diags.some((d) => d.code === want.code && d.flowName === want.flowName),
          `expected ${JSON.stringify(want)}, got ${JSON.stringify(diags)}`,
        );
      }
      if (c.contains.length === 0) assert.deepEqual(diags, [], `expected clean effect check, got ${JSON.stringify(diags)}`);
    });
  }
});

describe("RD-0528 I-3 functional corpus — non-vacuity guard", () => {
  it("the corpus carries known-bad cases (a corpus that can only pass proves nothing)", () => {
    assert.ok(MUST_FAIL.length >= 5, "the type must-fail set must be non-trivial");
    assert.ok(MUST_PASS.length >= 3, "the type must-pass set must be non-trivial");
    assert.ok(MUST_FAIL_PARSE.length >= 4, "the parse must-fail set must be non-trivial");
    assert.ok(GOV_VERIFY.some((c) => c.expect) && GOV_BODY.some((c) => c.expect), "the governance corpus must carry reject cases");
    assert.ok(GOV_SAFETY.some((c) => c.contains.length > 0), "the safety_critical governance corpus must carry reject cases");
  });
  it("the parse corpus exercises every FUNGI-PARSE code (001..004), not just one path", () => {
    const covered = new Set(MUST_FAIL_PARSE.map((c) => c.contains));
    for (const code of ["FUNGI-PARSE-001", "FUNGI-PARSE-002", "FUNGI-PARSE-003", "FUNGI-PARSE-004"]) {
      assert.ok(covered.has(code), `the parse corpus must exercise ${code}`);
    }
  });
  it("the governance corpus exercises every reachable pipeline code (GOV-002 · VAL-001 · VAL-002)", () => {
    const covered = new Set([...GOV_VERIFY, ...GOV_BODY].map((c) => c.expect).filter(Boolean));
    for (const c of GOV_SAFETY) for (const code of c.contains) covered.add(code);
    assert.ok(covered.has("FUNGI-GOV-002"), "must exercise FUNGI-GOV-002 (verifyGovernance secure-no-effects)");
    assert.ok(covered.has("FUNGI-VAL-001"), "must exercise FUNGI-VAL-001 (body-audit + safety_critical no-audit)");
    assert.ok(covered.has("FUNGI-VAL-002"), "must exercise FUNGI-VAL-002 (safety_critical not-deterministic, unlocked by finding d)");
  });
  it("the effect corpus exercises the effect twin's ENTIRE 9-code charter (001..009), both lanes, with accept controls", () => {
    const covered = new Set();
    for (const c of EFFECT_DECL) for (const code of c.contains) covered.add(code);
    for (const c of EFFECT_BODY) for (const w of c.contains) covered.add(w.code);
    for (let n = 1; n <= 9; n++) {
      const code = `FUNGI-EFFECT-00${n}`;
      assert.ok(covered.has(code), `the effect corpus must exercise ${code}`);
    }
    assert.ok(EFFECT_DECL.some((c) => c.contains.length === 0), "the decl lane must carry an accept control");
    assert.ok(EFFECT_BODY.some((c) => c.contains.length === 0), "the body lane must carry an accept control");
    assert.ok(EFFECT_BODY.some((c) => c.contains.some((w) => w.code === "FUNGI-EFFECT-002")), "the body lane must carry a TRANSITIVE reject (the 002 class a decl-only corpus cannot see)");
  });
});
