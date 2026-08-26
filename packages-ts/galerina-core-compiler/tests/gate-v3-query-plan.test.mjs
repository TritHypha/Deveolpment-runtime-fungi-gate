// gate-v3-query-plan.test.mjs — G5 rung 2: the query vocabulary GD-R09 lists,
// exercised on the SQL exemplar it was derived from:
//
//   SELECT TIME_BUCKET(INTERVAL '1 day', started_at) AS day, MAX(total_amount)
//   FROM trips WHERE started_at >= ? AND started_at < ?
//   GROUP BY day ORDER BY day
//
// Two things are proven here, and the second is the reason the rung exists.
//
// 1. The clause set maps: every clause is a REGISTERED PLAN PART, never text.
//    time_bucket / aggregate_max / group_by / order_by / join_gated were the
//    named vocabulary gaps; they are ordinary components once declared, so the
//    "gap" was a registry-content gap and not a language gap. Admitting them
//    costs no language change, which is the claim this file makes executable.
//
// 2. ★ AUTHORITY AS A WIRED INPUT IS NOT DOMINATION. The shipped v3 reference
//    example (03-database-query/transaction-count.gate) wires `gate.allow ->
//    execute.authority` and lets the plan chain reach `execute` on a path that
//    never passes the gate. That reads as governed and is weaker than it looks:
//    a part that RECEIVES an authority token can, in principle, be reached
//    without one. GD-R09 asks for the stronger property in words — "execute
//    must sit entirely in the trusted zone on the ALLOW arm" — and GATE-SEM-014
//    is what makes the difference machine-visible. The reference shape is
//    reproduced verbatim below as the RED case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  loadGateV3Registry,
  verifyZoneDomination,
  dispatchGateSource,
  GATE_SEM_014,
} from "../dist/index.js";

const port = (name, type) => ({ name, type });
// Digests must be hex — the registry's DIGEST_RE says `[a-f0-9]{64}`, so a
// mnemonic seed letter like "v" or "t" is refused. Distinct per component so a
// shared digest never masks a mix-up between two entries.
let digestSeed = 0;
const digest = () => `sha256:${(digestSeed++).toString(16).padStart(2, "0").repeat(32)}`;

/** A plan part: opaque plan in, opaque plan out. These are the clause parts —
 *  they SHAPE a plan and never evaluate a field, so they stay in the untrusted
 *  zone by design and may legitimately run before the gate. */
const planPart = (id) => ({
  id, version: "1.0.0", status: "SHIPPED", implementationDigest: digest(),
  inputs: [port("plan", "Plan")], outputs: [port("plan", "Plan")],
  arguments: [], effects: [], capabilities: [],
});

/** `semantic` toggles the zone tag on the type `execute` consumes — the
 *  negative control needs the same drawings with no obligation declared. */
function registryFor({ semantic = true } = {}) {
  digestSeed = 0;                                   // deterministic across calls
  return {
    version: "1.0.0",
    types: [
      { id: "Raw", kind: "opaque", construction: "source" },
      { id: "Plan", kind: "opaque", construction: "source" },
      // The plan becomes SEMANTIC at the point real field values are evaluated.
      { id: "LivePlan", kind: "opaque", construction: "source", ...(semantic ? { zone: "semantic" } : {}) },
      { id: "Count", kind: "opaque", construction: "source" },
    ],
    components: [
      {
        id: "ql.validate", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("v"),
        inputs: [port("raw", "Raw")], outputs: [port("scope", "Raw"), port("plan", "Plan")],
        arguments: [], effects: [], capabilities: [],
      },
      {
        // The sanctioned opaque -> semantic transition.
        id: "ql.gate", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("g"),
        inputs: [port("subject", "Raw"), port("plan", "Plan")],
        outputs: [port("allow", "LivePlan"), port("deny", "Plan"), port("indeterminate", "Plan")],
        arguments: [], effects: [], capabilities: [],
        decision: true, arms: ["allow", "deny", "indeterminate"], zoneGate: true,
      },
      // ── the GD-R09 vocabulary, admitted as ordinary registered parts ──────
      planPart("ql.scan"),
      planPart("ql.filter_bound"),
      planPart("ql.time_bucket"),
      planPart("ql.aggregate_max"),
      planPart("ql.group_by"),
      planPart("ql.order_by"),
      planPart("ql.join_gated"),
      {
        // The semantic op: it evaluates the plan against real rows, and it can
        // only be handed a LivePlan — which only the gate's allow arm produces.
        id: "ql.execute", version: "1.0.0", status: "SHIPPED", implementationDigest: digest(),
        inputs: [port("plan", "LivePlan")], outputs: [port("value", "Count")],
        arguments: [], effects: ["database.read"], capabilities: [],
      },
      {
        // The reference's variant: it takes the plan on one port and an
        // AUTHORITY token on another. Still a semantic part (it names LivePlan),
        // but now reachable by a route that carries no authority at all.
        id: "ql.execute_authorized", version: "1.0.0", status: "SHIPPED", implementationDigest: digest(),
        inputs: [port("plan", "Plan"), port("authority", "LivePlan")],
        outputs: [port("value", "Count")],
        arguments: [], effects: ["database.read"], capabilities: [],
      },
    ],
  };
}

/** The exemplar drawn so the gate DOMINATES evaluation: clause parts shape an
 *  opaque plan, the gate converts it, and execute is reachable only from the
 *  allow arm. */
const DOMINATED = `@gate 3.0.0
CIRCUIT trips(caller: Raw) -> Count
  INTENT "Every clause is a part; evaluation happens only past the allow arm."
  REQUIRES:
    effect database.read
  PARTS:
    [validate :: ql.validate@1.0.0]
    [scan :: ql.scan@1.0.0]
    [filter :: ql.filter_bound@1.0.0]
    [bucket :: ql.time_bucket@1.0.0]
    [agg :: ql.aggregate_max@1.0.0]
    [grouped :: ql.group_by@1.0.0]
    [ordered :: ql.order_by@1.0.0]
    [gate :: ql.gate@1.0.0]
    [execute :: ql.execute@1.0.0]
  WIRES:
    IN.caller -> validate.raw
    validate.plan -> scan.plan
    scan.plan -> filter.plan
    filter.plan -> bucket.plan
    bucket.plan -> agg.plan
    agg.plan -> grouped.plan
    grouped.plan -> ordered.plan
    ordered.plan -> gate.plan
    validate.scope -> gate.subject
    gate.allow -> execute.plan
    gate.deny -> DENY.not_authorized
    gate.indeterminate -> DENY.authority_unknown
    execute.value -> OUT.value
END
`;

/** The shipped v3 reference's shape: the plan reaches execute directly and the
 *  gate contributes an authority WIRE. Governed-looking, and not dominated. */
const AUTHORITY_AS_INPUT = `@gate 3.0.0
CIRCUIT trips(caller: Raw) -> Count
  INTENT "Authority arrives as an input rather than as the only route."
  REQUIRES:
    effect database.read
  PARTS:
    [validate :: ql.validate@1.0.0]
    [scan :: ql.scan@1.0.0]
    [filter :: ql.filter_bound@1.0.0]
    [gate :: ql.gate@1.0.0]
    [execute :: ql.execute_authorized@1.0.0]
  WIRES:
    IN.caller -> validate.raw
    validate.plan -> scan.plan
    scan.plan -> filter.plan
    filter.plan -> execute.plan
    validate.scope -> gate.subject
    validate.plan -> gate.plan
    gate.allow -> execute.authority
    gate.deny -> DENY.not_authorized
    gate.indeterminate -> DENY.authority_unknown
    execute.value -> OUT.value
END
`;

function zoneCheck(source, options) {
  const parsed = parseGateV3(source, "<query>.gate");
  assert.equal(parsed.ok, true,
    `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => `${d.code} ${d.message}`).join(" | ")}`);
  const loaded = loadGateV3Registry(registryFor(options), "<query registry>");
  assert.equal(loaded.ok, true,
    `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.message).join(" | ")}`);
  return verifyZoneDomination(buildGateGraph(parsed.circuit, loaded.registry), loaded.registry);
}

test("the GD-R09 vocabulary loads as ordinary registered parts — the gap was registry content, not language", () => {
  const loaded = loadGateV3Registry(registryFor(), "<vocabulary>");
  assert.equal(loaded.ok, true);
  for (const id of ["ql.time_bucket", "ql.aggregate_max", "ql.group_by", "ql.order_by", "ql.join_gated"]) {
    assert.ok([...loaded.registry.components.values()].some((c) => c.id === id), `${id} must resolve`);
  }
});

test("the exemplar verifies when the gate dominates evaluation", () => {
  assert.deepEqual(zoneCheck(DOMINATED, {}), []);
});

test("★ authority as a wired INPUT is not domination — the reference shape REFUSES", () => {
  // `execute` receives `gate.allow`. It is still reachable by a path that never
  // touched the gate, so the authority token is an input it could be reached
  // without. This is the finding the rung exists to make executable.
  const found = zoneCheck(AUTHORITY_AS_INPUT, {});
  assert.equal(found.length, 1, "must refuse");
  assert.equal(found[0].code, GATE_SEM_014.code);
  assert.match(found[0].message, /not dominated/);
});

test("the SHIPPED example's clean resolution depends on the zone declaration, not on luck", () => {
  // `06-analytic-query.gate` resolves clean through the production dispatcher.
  // That is only evidence if the zone rule is what makes it so — otherwise the
  // example is merely well-drawn and the rule is along for the ride. Strip
  // `zoneGate` from the contract and the same circuit must refuse.
  const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
  const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");
  const source = readFileSync(join(EXAMPLES, "06-analytic-query.gate"), "utf8");
  const contract = JSON.parse(readFileSync(join(REGISTRIES, "06-analytic-query.registry.json"), "utf8"));

  const codes = (registry) =>
    dispatchGateSource(source, "06-analytic-query.gate", { registry })
      .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
      .map((d) => d.code);

  assert.deepEqual(codes(contract), [], "the unmutated pair must be clean, or nothing below is readable");

  const ungated = JSON.parse(JSON.stringify(contract));
  delete ungated.components.find((c) => c.id === "tritmesh.ql.gate").zoneGate;
  assert.ok(codes(ungated).includes(GATE_SEM_014.code),
    "with no declared transition, semantic evaluation must refuse");
});

test("NEGATIVE CONTROL — with no semantic zone declared, both drawings are silent", () => {
  // Proves the refusal above tracks the DECLARED obligation and not the shape.
  assert.deepEqual(zoneCheck(DOMINATED, { semantic: false }), []);
  assert.deepEqual(zoneCheck(AUTHORITY_AS_INPUT, { semantic: false }), []);
});
