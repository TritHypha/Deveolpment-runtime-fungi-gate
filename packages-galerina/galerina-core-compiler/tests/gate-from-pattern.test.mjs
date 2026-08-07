// gate-from-pattern.test.mjs — ratified order 2 (KTA 35, doc 34 §4).
//
// ★ THE CONSTRAINT THIS RUNG DISCOVERED. `.gate` v3 is SINGLE-ASSIGNMENT:
// `GATE-WIRE-002` refuses any consumer with more than one producer. Fan-OUT is
// admitted; fan-IN is not. So a drawing cannot CONVERGE — which removes
// alternation and every optional/ranged repetition from the expressible subset,
// and forces each refusal onto its own terminal reason.
//
// That is not a limitation of this generator. It is the language, measured; and
// the measurement corrected shipped documentation that had published
// convergent drawings which do not verify.
//
// Tested here: golden output for the admitted subset · the FULL pipeline
// (parser, structure, dispatcher against a real registry — a generator is not
// an admission authority) · refusal BY NAME for everything else · and doc 34's
// named mutation requirement.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateCircuitFromPattern,
  parseGateV3,
  verifyGateV3Structure,
  dispatchGateSource,
} from "../dist/index.js";

const port = (name, type) => ({ name, type });

/** A registry for the generated vocabulary. `reasons` from the generator feed
 *  the deny vocabulary, so the contract matches the drawing exactly. */
function registryFor(reasons) {
  return {
    version: "1.0.0",
    types: [
      { id: "RawText", kind: "opaque", construction: "source" },
      { id: "MatchedText", kind: "opaque", construction: "source" },
    ],
    components: [
      {
        id: "re.literal", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"a".repeat(64)}`,
        inputs: [port("subject", "RawText")],
        outputs: [port("match", "RawText"), port("no", "RawText")],
        arguments: [{ name: "value", type: "String", required: true }],
        effects: [], capabilities: [],
      },
      {
        id: "re.class", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"b".repeat(64)}`,
        inputs: [port("subject", "RawText")],
        outputs: [port("match", "RawText"), port("no", "RawText")],
        arguments: [{ name: "set", type: "Set<Name>", required: true }],
        effects: [], capabilities: [],
      },
      {
        id: "re.boundary", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"c".repeat(64)}`,
        inputs: [port("subject", "RawText")],
        outputs: [port("ok", "MatchedText"), port("more", "RawText")],
        arguments: [], effects: [], capabilities: [],
      },
    ],
    vocabularies: { deny: reasons },
  };
}

function generated(pattern, options = {}) {
  const result = generateCircuitFromPattern(pattern, { name: "probe", ...options });
  assert.equal(result.ok, true, `\`${pattern}\` must generate: ${result.ok ? "" : result.reason}`);
  return result;
}

function refusalOf(pattern, options = {}) {
  const result = generateCircuitFromPattern(pattern, { name: "probe", ...options });
  assert.equal(result.ok, false, `\`${pattern}\` must refuse`);
  return result.reason;
}

/** Parse + structure + the production dispatcher. */
function throughPipeline({ source, reasons }, label) {
  const parsed = parseGateV3(source, `${label}.gate`);
  assert.equal(parsed.ok, true,
    `${label}: must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => `${d.code} ${d.message}`).join(" | ")}`);
  const structural = verifyGateV3Structure(parsed.circuit).filter((d) => d.severity !== "warning");
  assert.deepEqual(structural.map((d) => d.code), [], `${label}: structure must verify`);
  const codes = dispatchGateSource(source, `${label}.gate`, { registry: registryFor(reasons) })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
    .map((d) => d.code);
  assert.deepEqual(codes, [], `${label}: must resolve clean through the dispatcher`);
}

// ── golden + the full pipeline ───────────────────────────────────────────────

test("GOLDEN: a digit/literal sequence generates the documented shape", () => {
  const result = generated("\\d{3}-\\d{2}");
  assert.equal(result.parts, 7, "3 digits + hyphen + 2 digits + boundary");
  assert.match(result.source, /\[p1 :: re\.class@1\.0\.0 set=\{digit\}\]/);
  assert.match(result.source, /\[p4 :: re\.literal@1\.0\.0 value="-"\]/);
  assert.match(result.source, /IN\.raw -> p1\.subject/);
  assert.match(result.source, /p6\.match -> end\.subject/);
  assert.match(result.source, /end\.ok -> OUT\.value/);
  throughPipeline(result, "ssn");
});

test("★ each refusal gets its OWN terminal — the language requires it, and it names WHICH position failed", () => {
  const { source, reasons } = generated("ab");
  assert.match(source, /p1\.no -> DENY\.no_match_at_1/);
  assert.match(source, /p2\.no -> DENY\.no_match_at_2/);
  assert.deepEqual(reasons, ["no_match_at_1", "no_match_at_2", "trailing_input"]);
  // The naive shape — every `no` into one `DENY.no_match` — is what
  // GATE-WIRE-002 refuses. Prove the generator does not emit it.
  assert.ok(!/DENY\.no_match\b/.test(source), "must not route two producers into one terminal");
});

test("every admitted construct survives the FULL pipeline", () => {
  for (const pattern of ["abc", "\\d\\w\\s", "a.c", "(ab)c", "a{3}", "^ab$", "\\.\\+\\\\"]) {
    throughPipeline(generated(pattern), pattern);
  }
});

test("determinism: identical input gives byte-identical output, twice", () => {
  assert.equal(generated("(a)b{2}").source, generated("(a)b{2}").source);
});

// ── refusals, each by name ───────────────────────────────────────────────────

test("★ MUTATION (doc 34): the bounded case is accepted; remove the bound and it refuses", () => {
  assert.equal(generated("a{4}").parts, 5);
  assert.match(refusalOf("a*"), /unbounded '\*' has no finite drawing/);
  assert.match(refusalOf("a+"), /unbounded '\+' has no finite drawing/);
  assert.match(refusalOf("a{2,}"), /open-ended '\{n,\}' has no finite drawing/);
});

test("★ CONVERGENT constructs refuse, naming the language rule rather than the tool", () => {
  // These are not "unsupported yet" — they need a second producer for one
  // consumer, which GATE-WIRE-002 refuses. The message says so.
  assert.match(refusalOf("a|b"), /alternation[\s\S]*GATE-WIRE-002, single assignment/);
  assert.match(refusalOf("ab?"), /skip edge[\s\S]*GATE-WIRE-002, single assignment/);
  assert.match(refusalOf("a{1,3}"), /skip edge[\s\S]*GATE-WIRE-002, single assignment/);
  // ★ No `--ceiling` option exists. Doc 34 §4 asked for one so that `*`/`+`
  // could be admitted under an explicit finite bound — but a bounded
  // repetition still needs a skip edge, so the option could not have admitted
  // anything. An option that cannot change an outcome is a lie in the
  // interface; it was removed rather than shipped inert.
  assert.equal("ceiling" in generateCircuitFromPattern("a", { name: "probe" }), false);
});

test("non-regular features refuse by name, never approximate", () => {
  assert.match(refusalOf("(a)\\1"), /backreferences are not regular/);
  assert.match(refusalOf("(?=a)b"), /'\(\?…' forms are not admitted/);
  assert.match(refusalOf("a\\bword"), /word-boundary assertions/);
  assert.match(refusalOf("[a-z]"), /bracket classes '\[…\]' are not admitted in v1/);
  assert.match(refusalOf("a\\q"), /unknown escape/);
  assert.match(refusalOf("(ab"), /unbalanced '\('/);
  assert.match(refusalOf("a^b"), /interior '\^' or '\$'/);
});

test("the ReDoS refusal: a drawing over the part ceiling refuses BEFORE expansion", () => {
  assert.match(refusalOf("(a{70}){70}"), /over the 4096 ceiling.*ReDoS refusal working/s);
});

test("bad inputs refuse with reasons, not defaults", () => {
  assert.match(refusalOf(""), /empty pattern/);
  assert.match(refusalOf("café"), /non-ASCII/);
  assert.match(refusalOf("a", { name: "bad-name" }), /not an identifier/);
  assert.match(refusalOf("a{0}"), /matches nothing and draws nothing/);
  assert.match(refusalOf("*a"), /nothing to repeat/);
  assert.match(refusalOf("(((((((a)))))))"), /group nesting exceeds/);
});

test("the pattern survives ONLY in INTENT — quotes and backslashes safely escaped", () => {
  const result = generated("\\d\\.\\\\x");
  throughPipeline(result, "escapes");
  assert.match(parseGateV3(result.source, "escapes.gate").circuit.intent, /Whole-input match of pattern/);
});
