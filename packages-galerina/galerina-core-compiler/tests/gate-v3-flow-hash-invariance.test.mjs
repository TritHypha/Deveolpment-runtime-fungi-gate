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
});

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

test("★ the hash is stable across repeated emission, not just repeated hashing", () => {
  // Hashing one object twice proves the hash function is pure. Emitting twice
  // and hashing both proves the EMITTER is deterministic — the property the
  // goldens actually depend on.
  const a = computeGIRHash(girOf(CORPUS["two-flows"].source, "two-flows"));
  const b = computeGIRHash(girOf(CORPUS["two-flows"].source, "two-flows"));
  assert.equal(a, b);
  assert.equal(a, CORPUS["two-flows"].girHash);
});
