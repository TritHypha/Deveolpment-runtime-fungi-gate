// gate-v3-flow-hash-invariance.test.mjs — G7.5 (KTA 37 §5; doc 34 §3.6).
//
// THE OBLIGATION: flow-only `.fungi` programs must keep their existing GIR
// hashes when G7 wiring lands. If a `.fungi` hash moves because gate work
// touched the flow path, G7 has leaked into a path it must not touch, and
// every downstream artifact keyed on that hash — receipts, manifests, the
// proof-graph spine — silently disagrees with its history.
//
// ★ BUILT BEFORE G7.4, ON PURPOSE. The linking gate is the riskiest wiring in
// the programme, and a detector written afterwards cannot fail on the change
// that introduced the leak — it would simply bless whatever the new code
// produced as the baseline. The plan lists G7.5 last; the plan is wrong about
// the order, and this is the correction (recorded in KTA cycle 0134).
//
// ★ WHY LITERAL HASHES, NOT recompute-and-compare. Asserting that today's
// pipeline agrees with today's pipeline is a tautology that passes through any
// leak affecting both sides. A known-answer test needs the answer written
// down: these three strings were computed on 2026-08-07, at the G7.3 commit,
// with `circuits` verified ABSENT from every one of them.
//
// ⚠ WHEN A GOLDEN FAILS, DIAGNOSE BEFORE UPDATING. Two very different causes
// produce one red:
//   • gate/G7 work perturbed the flow path — a DEFECT, and exactly what this
//     file exists to catch. Fix the leak; never touch the constants.
//   • the flow emitter was changed deliberately (a new GIRFlow field, a schema
//     revision). Then the hashes SHOULD move: update them in one commit that
//     says which change moved them and why, so the next reader can tell an
//     intentional move from a silent one.
// Updating the constants to make a red go away, with no recorded reason, is
// the one response that destroys the test's value entirely.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProgram, checkEffects, emitGIR } from "../dist/index.js";
import { computeGIRHash } from "../dist/gir-emitter.js";

// Sources are INLINE, not fixture files: a golden whose input can be edited
// elsewhere pins nothing. These three cover the shapes whose hashes matter —
// a pure flow, a flow with declared effects, and a multi-flow program (which
// also pins flow ORDER, since reordering flows would move the hash).
const CORPUS = Object.freeze({
  "pure-vat": {
    source: `
pure flow calculateVat(price: Money<GBP>) -> Money<GBP> {
  return price
}
`,
    girHash: "sha256:171524addda5a5b6eecc764d5b965a73b910733f07ad056a36275ccf239a3104",
    flows: 1,
  },
  "guarded-save": {
    source: `
guarded flow saveOrder(order: Order) -> Result<Order, Error>
contract { effects { database.write } }
{
  OrdersDB.insert(order)
  return Ok(order)
}
`,
    girHash: "sha256:73cfa5e47c5853b32930c5658cc70107de2ca69cefae08395b3eccae362240a6",
    flows: 1,
  },
  "two-flows": {
    source: `
pure flow addOne(n: Int) -> Int {
  return n
}

pure flow double(n: Int) -> Int {
  return n
}
`,
    girHash: "sha256:2a03b297e3d63eed0698f26d2096b5275effaf46273b64ef08ce5843a83e3371",
    flows: 2,
  },
  // ★ Added cycle 0141, and it is the ONLY addition that earned a place. The
  // exit review called the 3-program corpus a GAP, so three candidates were
  // measured against the fields the corpus already exercises — not chosen on
  // plausibility. Two were rejected by that measurement:
  //
  //   `secure flow … intent "…"`     → adds NOTHING: `qualifier` and `intent`
  //                                     are already exercised. A different
  //                                     qualifier VALUE is not a new field, and
  //                                     a flow-path leak does not care which
  //                                     keyword a flow was declared with.
  //   multi-effect `contract { … }`  → adds NOTHING: `contract` and `effects`
  //                                     already exercised.
  //
  // Both "felt" governance-adjacent, which is exactly why they were measured
  // rather than trusted. Adding them would have been three more magic numbers
  // pinning nothing new.
  "protected-value": {
    source: `
flow collectEmail() -> String {
  let email: protected Email = "a@example.com"
  return "ok"
}
`,
    girHash: "sha256:722b2464a4e01e6e4da8b6c0b3628a5c77b5efffc44f4f6d7ac9517b8eafdfe3",
    flows: 1,
  },
  // ★ Added cycle 0142, closing one of the five declared gaps. Cycle 0141
  // recorded `faultHandlers` as unreachable because no `on_*_fault` source
  // existed anywhere in tests or docs/examples to copy — that was a fact about
  // the CORPUS, not about the language. Reading `extractDeclaredFaultHandlers`
  // gave the real shape: a `resilience { … }` block inside `contract { … }`.
  //
  // ⚠ The field is emitted ONLY when at least one handler is `declared`; a flow
  // with no resilience block omits it entirely (same omitted-when-empty
  // discipline as `circuits` and `proofs`). So this golden is also the pin that
  // the whole 4-signal matrix is carried — the three undeclared signals appear
  // with `source: "inferred-default"`, which is what lets an auditor tell "the
  // author chose halt" from "nobody said, so halt".
  "declared-fault-handler": {
    source: `
guarded flow readLedger(id: String) -> Result<String, Error>
contract {
  effects { database.read }
  resilience { on_substrate_fault halt }
}
{
  return Ok(id)
}
`,
    girHash: "sha256:9e2560f5caa50ee197bca24c7e646bf6e843575d23acded6fb37b7834e8b99b2",
    flows: 1,
  },
  // ★ Added cycle 0143. ONE program closes THREE declared gaps — `tensors`,
  // `typedArrayLoweringPlan` and `target_affinity` — because the last is
  // inferred from the first. It is deliberately the COMBINED case: a
  // photonic-compatible tensor AND the `ai.inference` effect, so the affinity
  // is the merged value (`photonic` unshifted in front of `npu, gpu, cpu`).
  // Either trigger alone would pin a simpler shape; the merge exercises both
  // branches of `inferTargetAffinity` and their ordering in one hash.
  //
  // An `ai.inference`-only source was measured and NOT added: it introduces no
  // field this one lacks, and cycle 0141's rule stands — a golden that widens
  // no coverage is a magic number.
  "tensor-and-inference": {
    source: `
guarded flow embedAndClassify(text: String) -> Result<Int, Error>
contract { effects { ai.inference } }
{
  let embedding: Tensor<Float32, [1, 768]> = EmbeddingModel.embed(text)
  return Ok(1)
}
`,
    girHash: "sha256:841cb4eba06a519026b3cc9bef149e96c834cbf79e03e4bccda301fbfcba8f82",
    flows: 1,
  },
});

// ★ The corpus's own scope, declared. Without this a golden could be deleted
// and coverage would shrink silently — the corpus would still be "all green"
// while guarding less. Pinning the set means narrowing it is a deliberate act,
// and a NEW GIRFlow field arriving is visible here too.
const EXERCISED_FIELDS = Object.freeze([
  "allowedEffectsMask", "audit", "capabilities", "contract", "effects",
  "execution", "faultHandlers", "intent", "name", "paramTypes",
  "protected_values", "proofs", "qualifier", "target_affinity", "tensors",
  "typedArrayLoweringPlan",
].sort());

// ⚠ ONE field remains uncovered, and it is OUT OF SCOPE BY DESIGN rather than
// missing — verified at the enforcement point (cycle 0143), not inferred from
// its absence:
//   executionPlan  — `buildExecutionPlan` is a SEPARATE exported stage
//                    (gir-emitter.ts) called by `runtime.ts`, never by
//                    `emitGIR`. No source reaching this corpus can populate it,
//                    because it belongs to a later pipeline stage. A golden
//                    here could not guard it; a runtime-stage test must.
// Recorded so the hole is a known hole. Closing any of them is a real task.
//
// ✅ `faultHandlers` was on this list in cycle 0141 and came OFF it in 0142.
// The entry said no source existed "anywhere in tests or docs/examples to
// copy" — true, and it described the CORPUS rather than the language. Reading
// the extractor gave the syntax in one step. A gap recorded as "unreachable"
// deserves one look at the enforcement point before it is believed.

function girOf(source, name) {
  const parsed = parseProgram(source, `${name}.fungi`);
  const effects = checkEffects(parsed.flows, parsed.ast);
  return emitGIR(parsed.ast, parsed.flows, effects).gir;
}

for (const [name, expected] of Object.entries(CORPUS)) {
  test(`flow-hash invariance: '${name}' still hashes to its recorded value`, () => {
    const gir = girOf(expected.source, name);
    assert.equal(gir.flows.length, expected.flows, "fixture check: the program emitted the flows it should");
    assert.equal(computeGIRHash(gir), expected.girHash,
      `'${name}' GIR hash MOVED. If gate/G7 work touched the flow path this is the leak G7.5 exists to catch — ` +
      `fix the leak, do not edit the constant. If the flow emitter changed deliberately, update it in a commit that says why.`);
  });

  test(`flow-hash invariance: '${name}' carries NO circuits field`, () => {
    // Option C's omitted-when-empty rule is what MAKES the hashes stable: an
    // empty `circuits: []` would be a present field and would move every one
    // of them. Asserted per program, because "absent" is the claim.
    assert.equal("circuits" in girOf(expected.source, name), false,
      "a flow-only program must not carry `circuits` at all — omitted, never []");
  });
}

// ── the non-vacuity legs ─────────────────────────────────────────────────────
// Three constants that always match prove nothing unless the comparison can
// FAIL. These pin that the hash is sensitive to exactly the leak shapes G7
// could introduce, and insensitive to exactly the two fields canonicalisation
// strips on purpose.

test("★ non-vacuity: each G7 leak shape MOVES the hash", () => {
  const base = girOf(CORPUS["pure-vat"].source, "pure-vat");
  const baseHash = computeGIRHash(base);
  const mutated = (fn) => {
    const copy = JSON.parse(JSON.stringify(base));
    fn(copy);
    return computeGIRHash(copy);
  };

  assert.notEqual(mutated((g) => { g.circuits = []; }), baseHash,
    "an EMPTY circuits array must move the hash — this is why option C omits the field");
  assert.notEqual(mutated((g) => { g.circuits = [{ name: "c", intent: "i", parts: [], wires: [], effects: [], capabilities: [] }]; }), baseHash,
    "a lowered circuit landing in a flow-only program must move the hash");
  assert.notEqual(mutated((g) => { g.admission = { verdict: "admitted" }; }), baseHash,
    "a new top-level field (e.g. an admission record) must move the hash");
  assert.notEqual(mutated((g) => { g.flows[0].admission = true; }), baseHash,
    "a field added INSIDE a flow must move the hash — the leak need not be top-level");
});

test("★ the two fields canonicalisation strips are the ONLY ones that may move freely", () => {
  // Deliberate blindness, not a gap: `generatedAt` and `girHash` are stripped
  // by `canonicaliseGIR`, which is what makes the hash reproducible across
  // runs at all. Pinned so that a change to the stripping rules — which would
  // silently invalidate every golden above — has to land here first.
  const base = girOf(CORPUS["pure-vat"].source, "pure-vat");
  const baseHash = computeGIRHash(base);
  const withStripped = { ...base, generatedAt: "2030-01-01T00:00:00.000Z", girHash: `sha256:${"0".repeat(64)}` };
  assert.equal(computeGIRHash(withStripped), baseHash,
    "generatedAt and girHash must be stripped before hashing, or no golden could ever be stable");
});

test("★ the corpus's field coverage is pinned — narrowing it must be deliberate", () => {
  // What the whole corpus actually exercises, measured the same way the
  // expansion decision was: a field counts only if PRESENT and non-empty.
  const covered = new Set();
  for (const [name, entry] of Object.entries(CORPUS)) {
    for (const flow of girOf(entry.source, name).flows) {
      for (const [key, value] of Object.entries(flow)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (value instanceof Map && value.size === 0) continue;
        if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Map)
          && Object.keys(value).length === 0) continue;
        if (value === 0 || value === "" || value === false) continue;
        covered.add(key);
      }
    }
  }
  assert.deepEqual([...covered].sort(), EXERCISED_FIELDS,
    "the corpus now exercises a different field set. If a golden was removed, coverage SHRANK — say why. " +
    "If a new GIRFlow field appeared, decide whether a golden should carry it before adding it here.");
});

test("★ the hash is stable across repeated emission, not just repeated hashing", () => {
  // Hashing one object twice proves the hash function is pure. Emitting twice
  // and hashing both proves the EMITTER is deterministic — the property the
  // goldens actually depend on.
  const a = computeGIRHash(girOf(CORPUS["two-flows"].source, "two-flows"));
  const b = computeGIRHash(girOf(CORPUS["two-flows"].source, "two-flows"));
  assert.equal(a, b);
  assert.equal(a, CORPUS["two-flows"].girHash);
});
