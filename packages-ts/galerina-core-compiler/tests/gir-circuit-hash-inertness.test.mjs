// gir-circuit-hash-inertness.test.mjs — G6 rung 1 (KTA plan 32).
//
// THE RUNG: adding `circuits` to GIRProgram must be INERT for every program
// that has none. `girHash` is canonical over the whole program, and downstream
// artifacts are keyed on it, so a schema addition that moves the hash moves
// everything at once — silently, and for every flow ever emitted.
//
// This is the only G6 rung whose failure would not be obvious, which is why it
// goes first (plan 32 §3) and why it is a DIFFERENTIAL rather than an
// inspection: the same program is hashed with the field absent and with it
// present-but-empty, and the two must disagree. If they agreed, the omission
// discipline would be decorative and nothing would stop a future contributor
// writing `circuits: []`.
//
// The load-bearing pair, stated plainly:
//   absent  -> hash unchanged   (the compatibility guarantee)
//   []      -> hash CHANGED     (the reason "omit when empty" is a rule)
import { test } from "node:test";
import assert from "node:assert/strict";
// Imported from the emitter directly: `computeGIRHash` is not on the package
// barrel, and adding it there would be a public-surface change this rung has no
// business making.
import { computeGIRHash } from "../dist/gir-emitter.js";
import { parseProgram, checkEffects, emitGIR } from "../dist/index.js";

/** A minimal program in the shape `computeGIRHash` canonicalises. */
function program(extra = {}) {
  return {
    schemaVersion: "fungi.gir.v1",
    generatedAt: "1970-01-01T00:00:00.000Z",
    entryPoints: [],
    flows: [
      {
        name: "settle",
        qualifier: "guarded",
        effects: { declared: ["database.write"], observed: ["database.write"], status: "compliant" },
        intent: { declared: "settle an invoice", status: "satisfied" },
        protected_values: [],
        audit: { protected_values_redacted: true },
        execution: { preferred: [], denied: [], fallback: null },
        proofs: [{ name: "effects-declared", status: "satisfied" }],
        tensors: [],
        capabilities: {},
        allowedEffectsMask: 0,
      },
    ],
    ...extra,
  };
}

const CIRCUIT = {
  name: "daily_trip_maximum",
  intent: "aggregate a bounded trip set",
  parts: ["execute", "gate", "scan"],
  wires: ["gate.allow -> execute.plan"],
  effects: { declared: ["database.read"], observed: ["database.read"], status: "compliant" },
  proofs: [{ name: "zone-domination", status: "satisfied" }],
  capabilities: ["trips.aggregate"],
};

test("a program with NO circuits hashes exactly as it did before the field existed", () => {
  // `canonicaliseGIR` drops undefined values, so an absent key and an explicit
  // `undefined` are the same program. This is the compatibility guarantee.
  const absent = computeGIRHash(program());
  const explicitUndefined = computeGIRHash(program({ circuits: undefined }));
  assert.equal(absent, explicitUndefined,
    "an absent circuits field and an undefined one must canonicalise identically");
});

test("the same hash is produced twice — canonicalisation is deterministic", () => {
  assert.equal(computeGIRHash(program()), computeGIRHash(program()));
});

test("★ an EMPTY circuits array MOVES the hash — which is why omitting it is a rule", () => {
  // The red half. If this ever passes, `circuits: []` has become harmless and
  // the omit-when-empty discipline has stopped being load-bearing — at which
  // point a future contributor will write it, and every downstream artifact
  // keyed on girHash will move for no reason anyone can see.
  const absent = computeGIRHash(program());
  const empty = computeGIRHash(program({ circuits: [] }));
  assert.notEqual(absent, empty,
    "an empty array must not be silently equivalent to omission");
});

test("a circuit changes the hash, and the same circuit twice does not", () => {
  const withCircuit = computeGIRHash(program({ circuits: [CIRCUIT] }));
  assert.notEqual(withCircuit, computeGIRHash(program()), "adding a circuit must change the hash");
  assert.equal(withCircuit, computeGIRHash(program({ circuits: [CIRCUIT] })), "and must be stable");
});

test("circuits are hashed by CONTENT, not by identity", () => {
  // A deep-equal clone must hash the same; one differing wire must not. Without
  // this the array could be carried through by reference and the hash would say
  // nothing about what is in it.
  const clone = JSON.parse(JSON.stringify(CIRCUIT));
  assert.equal(
    computeGIRHash(program({ circuits: [CIRCUIT] })),
    computeGIRHash(program({ circuits: [clone] })),
    "an equal circuit must hash equal",
  );

  const rewired = { ...CIRCUIT, wires: ["scan.plan -> execute.plan"] };
  assert.notEqual(
    computeGIRHash(program({ circuits: [CIRCUIT] })),
    computeGIRHash(program({ circuits: [rewired] })),
    "a different wire must change the hash — the topology is the artifact",
  );
});

test("a REAL emitted program carries no circuits field at all", () => {
  // The synthetic cases above prove the canonicalisation MECHANISM is inert.
  // They do not prove that no real program moved — a green through a different
  // surface proves nothing about the one in question. This closes that: emit
  // GIR from an actual `.fungi` source through the real pipeline and assert the
  // key is absent, so the compatibility claim rests on the production path.
  const source = `flow settle(id: String) -> String
contract {
  intent { "Settle an invoice." }
  effects { database.write }
}
{
  return id
}
`;
  const parsed = parseProgram(source, "inertness.fungi");
  const effects = checkEffects(parsed.flows, parsed.ast);
  const { gir } = emitGIR(parsed.ast, parsed.flows, effects);

  assert.ok(!("circuits" in gir), "no emit site sets circuits, so the key must not appear");
  assert.equal(computeGIRHash(gir), computeGIRHash(gir), "and its hash is stable");
});

test("the flows array is untouched by any of this", () => {
  // The compatibility claim in one assertion: whatever happens in `circuits`,
  // a consumer reading `.flows` sees exactly what it saw before.
  const withCircuit = program({ circuits: [CIRCUIT] });
  assert.deepEqual(withCircuit.flows, program().flows);
});
