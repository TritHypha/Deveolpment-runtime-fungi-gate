// gate-pattern-admission.test.mjs — ratified order 3 (KTA 35, doc 34 §5).
//
// THE SECURITY PROPERTY the shipped `07-pattern-admission.gate` claims:
//
//   No pattern can reach the matching operation unless an admitted compiler
//   produced the certificate consumed by that exact operation.
//
// A clean resolution is only EVIDENCE for that if the declarations are what
// produce it. Each mutation below removes exactly one of them and requires the
// circuit to refuse — otherwise the example is merely well-drawn and the
// property is along for the ride.
//
// ★ The first draft of this example wired `IN.subject` straight to the matcher
// and took only the certificate from the gate. GATE-SEM-014 refused it: the
// matcher was reachable from IN on a path that never passed the compiler, so
// the certificate was an INPUT IT RECEIVED rather than a route it had to take.
// The `bypass` case below reproduces that draft deliberately, because the
// mistake is the one this whole drawing exists to make impossible — and it is
// the same shape as the shipped v3 reference's 03-database-query.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dispatchGateSource } from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");
const FILE = "07-pattern-admission.gate";

const source = () => readFileSync(join(EXAMPLES, FILE), "utf8");
const contract = () => JSON.parse(readFileSync(join(REGISTRIES, "07-pattern-admission.registry.json"), "utf8"));

const codes = (registry, text = source()) =>
  dispatchGateSource(text, FILE, { registry })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
    .map((d) => d.code);

test("the shipped admission circuit resolves clean", () => {
  assert.deepEqual(codes(contract()), [], "the unmutated pair must be clean, or nothing below is readable");
});

test("★ strip the zone tag and the property is no longer proven", () => {
  // Without `zone: semantic` the matcher is an ordinary part and SEM-014 has no
  // obligation to check — the drawing would still LOOK governed.
  const unzoned = contract();
  unzoned.types.find((t) => t.id === "LiveRequest").zone = "opaque";
  // It goes SILENT rather than refusing, which is the point: the guarantee
  // came from the declaration, and removing it removes the guarantee quietly.
  assert.deepEqual(codes(unzoned), [], "no obligation is declared, so no refusal — and no proof either");
});

test("★ strip zoneGate and the circuit REFUSES — semantic work with no declared transition", () => {
  const ungated = contract();
  delete ungated.components.find((c) => c.id === "re.compile").zoneGate;
  assert.ok(codes(ungated).includes("GATE-SEM-014"),
    "a matcher consuming a semantic type with no declared gate must refuse");
});

test("★ THE BYPASS: route the subject straight to the matcher and it REFUSES", () => {
  // The first draft, reproduced. The matcher still receives the certificate —
  // it is simply also reachable without one.
  const bypassed = contract();
  bypassed.components.find((c) => c.id === "re.match").inputs.push({ name: "subject", type: "RawText", required: true });
  const text = source()
    .replace("    IN.subject -> compile.subject\n", "")
    .replace("    compile.certified -> run.request", "    IN.subject -> run.subject\n    compile.certified -> run.request");
  assert.notEqual(text, source(), "the mutation must actually change the source");
  assert.ok(codes(bypassed, text).includes("GATE-SEM-014"),
    "a matcher reachable from IN without passing the compiler must refuse");
});

test("★ THE REFUSAL ARM: hang the matcher off veto and it REFUSES", () => {
  // Domination alone would pass this — `run` IS dominated by `compile` here.
  // Only reading the arms catches work that passed the gate on the arm that
  // said no, which is why SEM-014 checks both.
  const text = source()
    .replace("    compile.veto -> DENY.pattern_refused\n", "")
    .replace("    compile.certified -> run.request", "    compile.veto -> run.request\n    compile.certified -> DENY.pattern_refused");
  assert.notEqual(text, source(), "the mutation must actually change the source");
  assert.ok(codes(contract(), text).includes("GATE-SEM-014"),
    "work reachable from a refusal arm must refuse");
});

test("the four outcomes stay four terminals — collapsing them is the fail-open", () => {
  // GATEREGEX.md §4: `pattern_refused` says NO INPUT ON THIS PATH HAS BEEN
  // CHECKED SINCE DEPLOY; `no_match` says this one input was rejected. They
  // need opposite responses, so they must not share a terminal.
  const text = source();
  for (const reason of ["pattern_refused", "compiler_unavailable", "no_match", "undecided"]) {
    assert.ok(text.includes(`DENY.${reason}`), `${reason} must have its own terminal`);
  }
  // And the vocabulary must admit exactly those — an undeclared reason refuses.
  const narrowed = contract();
  narrowed.vocabularies.deny = ["no_match"];
  assert.ok(codes(narrowed).includes("GATE-SEM-007"),
    "a reason outside the declared vocabulary must refuse");
});

test("the matcher's INTERIOR is not claimed — no part models the engine", () => {
  // .gate secures the perimeter of a component, never its interior. If a future
  // edit adds NFA states or class-membership parts here, this drawing has
  // started claiming something it cannot prove.
  const parts = source().split("\n").filter((l) => /^\s*\[/.test(l));
  assert.equal(parts.length, 2, `the boundary is exactly compile + run, found ${parts.length} parts`);
});
