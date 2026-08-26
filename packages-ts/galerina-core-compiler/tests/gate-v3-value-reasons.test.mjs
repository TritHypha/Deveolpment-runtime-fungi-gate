// gate-v3-value-reasons.test.mjs — the null-erases-the-reason fix (audit 2026-08-07).
//
// `parseValue` used to return `GateV3Value | null` from SIX distinct failure
// paths, and the caller emitted ONE generic GATE-PARSE-025 for all of them.
// Strict null checks meant the null was never *unchecked* — so this was not
// Hoare's mistake in the memory-safety sense. It was the other half of it:
// **null erases the reason**. An author who wrote `$bad-name` and one who wrote
// `{a,,b}` were told the same thing.
//
// The code is unchanged (pinned, and still correct). What is asserted here is
// that the six causes now produce six DISTINGUISHABLE messages — and, in the
// last test, that they are distinguishable FROM EACH OTHER rather than merely
// non-empty. A per-case assertion set can all pass on one generic string if the
// substrings are loose enough; comparing the whole set is what rules that out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3 } from "../dist/index.js";

/** A circuit whose single part carries one argument — the value under test. */
const withArgument = (literal) => `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "argument value reasons"
  REQUIRES:
  PARTS:
    [e :: test.echo@1.0.0 arg=${literal}]
  WIRES:
    IN.v -> e.value
    e.value -> OUT.value
END
`;

function refusalFor(literal, code = "GATE-PARSE-025") {
  const parsed = parseGateV3(withArgument(literal), "reasons.gate");
  assert.equal(parsed.ok, false, `\`${literal}\` must refuse`);
  const found = parsed.diagnostics.find((d) => d.code === code);
  assert.ok(found, `expected ${code}, got ${parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return found.message;
}

test("🔴 REGRESSION: an unterminated string literal REFUSES — it used to be silently dropped", () => {
  // The defect this file found. `splitArguments` ended its scan with a
  // synthetic space; with the quote still open that sentinel was consumed
  // INSIDE the quote, so the token was never flushed and the caller's
  // per-argument validation never ran. The part parsed clean with the argument
  // simply ABSENT — a refusal rendering as an absence, which is the worst shape
  // a parser bug takes. A `fields={…}` on a privacy cut would have vanished.
  assert.match(refusalFor('"unterminated', "GATE-PARSE-020"), /unterminated string literal/);
});

test("🔴 REGRESSION: an unbalanced brace refuses too — the same scan state, the other construct", () => {
  assert.match(refusalFor("{a,b", "GATE-PARSE-020"), /unbalanced \{ \}/);
});

test("★ the dropped argument is not merely refused — it was never silently ABSENT", () => {
  // The control that names the actual failure mode. Before the fix this circuit
  // parsed OK with `args: []`. Asserting "refuses" alone would still pass if a
  // future change dropped the argument AND refused for some unrelated reason,
  // so this pins that a WELL-FORMED argument is present and counted.
  const parsed = parseGateV3(withArgument('"ok"'), "reasons.gate");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.circuit.parts[0].args.length, 1, "a well-formed argument must survive the split");
  assert.equal(parsed.circuit.parts[0].args[0].value.value, "ok");
});

test("a non-finite numeric literal says so — and the guard is reachable", () => {
  // ★ `1e999` does NOT reach this guard: the literal regex admits only plain
  // decimal digits, so exponent notation falls through to "unrecognised value".
  // The finiteness guard is reachable only by a literal long enough to overflow
  // a double — which is worth pinning, because a guard nobody can trigger is
  // indistinguishable from a guard that does not work.
  //
  // Not pedantry either: a non-finite argument would reach budget composition,
  // where Infinity absorbs every other cost without a word.
  assert.match(refusalFor("1".repeat(400)), /numeric literal is not finite/);
  assert.match(refusalFor("1e999"), /expected a quoted string/);
});

test("a malformed $reference says so", () => {
  assert.match(refusalFor("$bad-name"), /'\$' must be followed by a single identifier/);
});

test("an unrecognised value names what WAS expected", () => {
  assert.match(refusalFor("@nonsense"), /expected a quoted string, a number, a \$reference, a \{set\}, or a qualified name/);
});

test("★ a bad element inside a set names the ELEMENT and the inner reason", () => {
  // The recursive case, and the one a flattened null hurt most: three sets deep,
  // the author still needs to know which element and why.
  const message = refusalFor("{good,$bad-name}");
  assert.match(message, /set element '\$bad-name'/);
  assert.match(message, /must be followed by a single identifier/);
});

test("★ the six causes are distinguishable FROM EACH OTHER, not merely non-empty", () => {
  // The control. Every assertion above could pass against one generic message
  // if the substrings were loose enough. Distinctness is the property that
  // actually replaces what `null` threw away.
  const messages = ["1".repeat(400), "$bad-name", "@nonsense", "{good,$bad-name}", "{a,@b}"]
    .map((literal) => refusalFor(literal));
  assert.equal(new Set(messages).size, messages.length,
    `each cause must produce its own message, got:\n  ${messages.join("\n  ")}`);
});

// ------------------------------------------- no null, no NaN (owner question)

test("★ .gate admits NO null and NO NaN as a value — the union has no absence member", () => {
  // The structural claim, asserted over every shape the grammar admits: a
  // parsed value is a string, a finite number, a name, a reference or a set.
  // Nothing the parser can produce is null, undefined or NaN.
  for (const literal of ['"text"', "42", "-1.5", "$ref", "{a,b}", "{}", "some.qualified.name"]) {
    const parsed = parseGateV3(withArgument(literal), "reasons.gate");
    assert.equal(parsed.ok, true, `${literal} must parse`);
    const v = parsed.circuit.parts[0].args[0].value;
    assert.notEqual(v.value, null, `${literal} produced null`);
    assert.notEqual(v.value, undefined, `${literal} produced undefined`);
    if (typeof v.value === "number") {
      assert.ok(Number.isFinite(v.value), `${literal} produced a non-finite number`);
      assert.ok(!Object.is(v.value, -0), `${literal} produced negative zero`);
    }
    assert.ok(["string", "number", "object"].includes(typeof v.value));
  }
});

test("★ no non-finite number can enter at all", () => {
  for (const literal of ["-Infinity", "1e999", "1".repeat(400)]) {
    assert.equal(parseGateV3(withArgument(literal), "reasons.gate").ok, false, `${literal} must refuse`);
  }
  // -0 normalises rather than surviving: two zeroes that compare equal but
  // format differently is a distinction with no meaning in a circuit.
  const parsed = parseGateV3(withArgument("-0"), "reasons.gate");
  assert.equal(parsed.ok, true);
  assert.ok(!Object.is(parsed.circuit.parts[0].args[0].value.value, -0), "-0 must not survive as -0");
});

test("★ and the SPELLINGS are refused too — a name that reads as absence is not admitted", () => {
  // Before this guard, `arg=null` parsed as the NAME "null": a token that reads
  // as absence to every reviewer while being an ordinary string to the checker.
  // Verified zero uses across the shipped examples and every fixture registry
  // before refusing, so nothing legitimate was taken away.
  for (const spelling of ["null", "NaN", "Infinity", "undefined", "nil", "None", "NULL", "nan"]) {
    assert.match(refusalFor(spelling), /has no null and no NaN/, `${spelling} must refuse`);
  }
});

test("the refusal is on the VALUE, not the substring — legitimate names survive", () => {
  // The control. A ban implemented by substring would break `nullable_field`
  // or `annulment`, and the test above would not notice.
  for (const literal of ["nullable_field", "annulment", "NaNoSecond", "none_of_the_above"]) {
    assert.equal(parseGateV3(withArgument(literal), "reasons.gate").ok, true,
      `${literal} is an ordinary name and must still parse`);
  }
});

test("a VALID argument of each shape still parses — the fix did not narrow the language", () => {
  for (const literal of ['"text"', "42", "-1.5", "$ref", "{a,b}", "{}", "some.qualified.name"]) {
    const parsed = parseGateV3(withArgument(literal), "reasons.gate");
    assert.equal(parsed.ok, true, `\`${literal}\` must still parse, got ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  }
});
