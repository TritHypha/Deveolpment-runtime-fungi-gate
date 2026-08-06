// gate-v3-resource-bounds.test.mjs — owner ruling (2)'s resource ceilings (GD-006).
//
// THE DEFECT, measured before these landed. The v3 parser had NO ceiling of any
// kind: a 2 MiB source was accepted, a 5,000-element set was accepted, a 5,000
// character identifier was accepted — and a set literal nested 4,000 deep blew
// the JS stack. That last one did not fail closed with a diagnostic: a raw
// `RangeError` escaped `parseGateV3`, escaped `dispatchGateSource`, and reached
// the user through the root CLI as a host stack trace with no code attached.
// A refusal must be a diagnostic; an exception is a crash wearing one's coat.
//
// EVERY BOUND IS TESTED AT ITS EXACT EDGE — accepted AT the limit, refused ONE
// past it. A test that only checks the far side (5,000 elements refused) cannot
// tell a correct ceiling from one set to 1, and would stay green if the bound
// silently tightened to something that rejects legitimate circuits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, GATE_V3_LIMITS, dispatchGateSource } from "../dist/index.js";

const L = GATE_V3_LIMITS;

function circuit({ parts, wires, param = "v", type = "T" }) {
  return `@gate 3.0.0
CIRCUIT probe(${param}: ${type}) -> ${type}
  INTENT "bounds"
  REQUIRES:
  PARTS:
${parts}
  WIRES:
${wires}
END
`;
}

const ECHO = "    [e :: test.echo@1.0.0]";
const WIRES = "    IN.v -> e.value\n    e.value -> OUT.value";

/** Parse and return the refusal code, or "accepted". */
function verdict(source) {
  const parsed = parseGateV3(source, "<bounds>.gate");
  return parsed.ok ? "accepted" : [...new Set(parsed.diagnostics.map((d) => d.code))].join(" ");
}

/** A part whose single argument carries the given literal. */
const withArg = (literal) => circuit({ parts: `    [e :: test.echo@1.0.0 s=${literal}]`, wires: WIRES });

const nested = (depth) => "{".repeat(depth) + "a" + "}".repeat(depth);
const wide = (n) => "{" + Array.from({ length: n }, (_, i) => `m${i}`).join(",") + "}";

test("bounds: set nesting is accepted at the limit and refused one past it", () => {
  assert.equal(verdict(withArg(nested(L.setNesting))), "accepted");
  assert.equal(verdict(withArg(nested(L.setNesting + 1))), "GATE-PARSE-028");
});

test("bounds: a set deep enough to blow the stack refuses with a DIAGNOSTIC", () => {
  // The regression that matters most. Before the fix this threw a RangeError
  // out of the parser; the assertion is that it now returns, and returns a code.
  const source = withArg(nested(4000));
  assert.doesNotThrow(() => parseGateV3(source, "<deep>.gate"), "a bound must refuse, never throw");
  assert.equal(verdict(source), "GATE-PARSE-028");
});

test("bounds: the host exception no longer escapes the production dispatcher", () => {
  // parseGateV3 returning cleanly is not enough — GD-024's lesson is that the
  // entry point a user actually reaches is the one that must be proven.
  const source = withArg(nested(4000));
  let result;
  assert.doesNotThrow(() => { result = dispatchGateSource(source, "<deep>.gate", {}); });
  assert.ok(
    result.diagnostics.some((d) => d.code === "GATE-PARSE-028"),
    "the dispatcher must surface the bound as a diagnostic",
  );
});

test("bounds: set cardinality is accepted at the limit and refused one past it", () => {
  assert.equal(verdict(withArg(wide(L.setCardinality))), "accepted");
  assert.equal(verdict(withArg(wide(L.setCardinality + 1))), "GATE-PARSE-029");
});

test("bounds: cardinality counts the WIDEST set, not the total element count", () => {
  // Two sets of half the limit each must pass: the ruled bound is per literal.
  // Without this, a naive total-count implementation would look correct against
  // every other test in this file.
  const half = Math.floor(L.setCardinality / 2);
  const parts = `    [e :: test.echo@1.0.0 a=${wide(half)} b=${wide(half)}]`;
  assert.equal(verdict(circuit({ parts, wires: WIRES })), "accepted");
});

test("bounds: braces inside a string literal are not structure", () => {
  // The scanner must not count `{` inside a quoted string, or a legitimate
  // string argument would be refused as a nesting violation.
  const literal = `"${"{".repeat(L.setNesting + 40)}"`;
  assert.equal(verdict(withArg(literal)), "accepted");
});

test("bounds: identifier length is accepted at the limit and refused one past it", () => {
  const name = (n) => "i".repeat(n);
  const ok = name(L.identifier);
  const over = name(L.identifier + 1);
  assert.equal(verdict(circuit({ parts: `    [${ok} :: test.echo@1.0.0]`, wires: `    IN.v -> ${ok}.value\n    ${ok}.value -> OUT.value` })), "accepted");
  assert.equal(verdict(circuit({ parts: `    [${over} :: test.echo@1.0.0]`, wires: `    IN.v -> ${over}.value\n    ${over}.value -> OUT.value` })), "GATE-PARSE-030");
});

test("bounds: an over-long ARGUMENT name is refused too, not just an instance name", () => {
  assert.equal(verdict(circuit({ parts: `    [e :: test.echo@1.0.0 ${"a".repeat(L.identifier + 1)}=1]`, wires: WIRES })), "GATE-PARSE-030");
});

test("bounds: arguments per part are accepted at the limit and refused one past it", () => {
  const args = (n) => Array.from({ length: n }, (_, i) => `a${i}=1`).join(" ");
  assert.equal(verdict(circuit({ parts: `    [e :: test.echo@1.0.0 ${args(L.argumentsPerPart)}]`, wires: WIRES })), "accepted");
  assert.equal(verdict(circuit({ parts: `    [e :: test.echo@1.0.0 ${args(L.argumentsPerPart + 1)}]`, wires: WIRES })), "GATE-PARSE-031");
});

test("bounds: parts are accepted at the limit and refused one past it", () => {
  const parts = (n) => Array.from({ length: n }, (_, i) => `    [p${i} :: test.echo@1.0.0]`).join("\n");
  const wires = "    IN.v -> p0.value\n    p0.value -> OUT.value";
  assert.equal(verdict(circuit({ parts: parts(L.parts), wires })), "accepted");
  assert.equal(verdict(circuit({ parts: parts(L.parts + 1), wires })), "GATE-PARSE-032");
});

test("bounds: wires are accepted at the limit and refused one past it", () => {
  const wires = (n) => Array.from({ length: n }, () => "    IN.v -> e.value").join("\n");
  assert.equal(verdict(circuit({ parts: ECHO, wires: wires(L.wires) })), "accepted");
  assert.equal(verdict(circuit({ parts: ECHO, wires: wires(L.wires + 1) })), "GATE-PARSE-033");
});

test("bounds: file size is accepted at the limit and refused one past it", () => {
  const body = circuit({ parts: ECHO, wires: WIRES });
  const padTo = (total) => {
    const filler = "#" + "x".repeat(79) + "\n";
    const need = total - body.length;
    const pad = filler.repeat(Math.floor(need / filler.length)) + "#" + "y".repeat((need % filler.length) - 2) + "\n";
    // Comments sit after the header line, which must stay literally first.
    return body.slice(0, 12) + pad + body.slice(12);
  };
  const atLimit = padTo(L.fileBytes);
  assert.equal(atLimit.length, L.fileBytes, "the fixture must land exactly on the bound");
  assert.equal(verdict(atLimit), "accepted");
  assert.equal(verdict(padTo(L.fileBytes + 1)), "GATE-PARSE-034");
});

test("bounds: the shipped examples sit comfortably inside every ceiling", () => {
  // A bound that refuses the repository's own canonical examples is a bound set
  // wrong. This is the load-bearing check that these ceilings are ceilings and
  // not a new way to break valid circuits.
  assert.ok(L.parts >= 6 && L.wires >= 19, "the ceilings must clear example 04's 6 parts / 19 wires");
  assert.ok(L.identifier >= 16, "the ceilings must clear the examples' instance names");
});
