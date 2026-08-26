// gate-v3-differential.test.mjs — Round-one G1 step 8: the reference differential,
// made PERMANENT.
//
// A differential test — same input, two independent implementations, compare —
// is the strongest evidence available short of a proof. This suite pins the
// Galerina v3 frontend against the verdicts of the independent reference
// implementation (ZT-Galerina-GRAPH-ASCII-v3) over its whole `.gate` corpus.
//
// The corpus is VENDORED into tests/fixtures/gate-v3 (filenames carry their
// origin path) and the reference's verdicts are frozen in REFERENCE-VERDICTS.json,
// captured by running the reference oracle. So this test needs no second
// checkout to run, cannot rot when the reference workspace moves, and any
// divergence surfaces as a named failure rather than a silent drift.
//
// A divergence is not automatically a defect in this implementation — it may be
// a deliberate, ruled improvement. Any such case must be listed in
// RULED_DIVERGENCES with its reason, so the exceptions stay visible and finite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseGateV3, verifyGateV3Structure, loadGateV3Registry, resolveGateV3, checkGateV3Liveness, verifyEffectEnvelope } from "../dist/index.js";

const FIXTURES = resolve(import.meta.dirname, "fixtures", "gate-v3");

/**
 * Fixtures where this implementation deliberately differs from the reference,
 * each with the ruling that authorises it. Empty today: the Galerina frontend
 * matches the reference verdict-for-verdict across the corpus.
 */
const RULED_DIVERGENCES = new Map();

test("differential: the vendored corpus and its golden verdicts are present", async () => {
  const files = (await readdir(FIXTURES)).filter((f) => f.endsWith(".gate"));
  assert.ok(files.length >= 20, `expected the full reference corpus, found ${files.length}`);
  const golden = JSON.parse(await readFile(resolve(FIXTURES, "REFERENCE-VERDICTS.json"), "utf8"));
  assert.equal(Object.keys(golden).length, files.length, "a golden verdict per fixture");
});

test("differential: Galerina's v3 frontend matches the reference verdict on every fixture", async () => {
  const golden = JSON.parse(await readFile(resolve(FIXTURES, "REFERENCE-VERDICTS.json"), "utf8"));
  const divergences = [];

  for (const [name, expected] of Object.entries(golden)) {
    const source = await readFile(resolve(FIXTURES, name), "utf8");
    const parsed = parseGateV3(source, name);
    const actual = parsed.ok
      ? { ok: true, codes: verifyGateV3Structure(parsed.circuit).map((d) => d.code).sort() }
      : { ok: false, codes: parsed.diagnostics.map((d) => d.code).sort() };

    const same = actual.ok === expected.ok
      && JSON.stringify(actual.codes) === JSON.stringify(expected.codes);

    if (!same && !RULED_DIVERGENCES.has(name)) {
      divergences.push(`${name}\n    reference: ${JSON.stringify(expected)}\n    galerina:  ${JSON.stringify(actual)}`);
    }
  }

  assert.deepEqual(divergences, [], `unruled divergence from the reference oracle:\n  ${divergences.join("\n  ")}`);
});

test("differential: every ruled divergence names a live fixture (no stale exemptions)", async () => {
  const files = new Set((await readdir(FIXTURES)).filter((f) => f.endsWith(".gate")));
  for (const name of RULED_DIVERGENCES.keys()) {
    assert.ok(files.has(name), `ruled divergence '${name}' names a fixture that no longer exists`);
  }
});

// ── G2: registry-mode differential ──────────────────────────────────────────
// The reference has its own registry checker, so this is a genuine
// second-implementation comparison. My resolver is DELIBERATELY stricter in
// ruled ways, so divergence here is expected and must be classified, never
// waved through: an unclassified difference fails the suite.

/**
 * Codes the reference emits that this implementation does not (yet).
 * Each needs a reason and a gate where it lands — an entry here is a scope
 * statement, not an excuse.
 */
// G4 cleared the two REFERENCE_ONLY entries: the envelope is now checked, so
// the reference codes map to COUNT-MATCHED equivalents rather than scope gaps.
// Verdict parity is code-for-meaning, not code-for-spelling.
const REFERENCE_ONLY = new Map([
  // The reference folds TWO directions into one code: observed-not-declared
  // (error) and declared-not-observed (WARNING). G4 implements the error
  // direction as SEM-009/010 (see EQUIVALENT). The warning direction is a
  // DELIBERATE design difference, not a gap: REQUIRES states an upper bound,
  // so an effect declared but not exercised is a budget, and demanding
  // exactness would push authors to trim envelopes reactively. Counts the
  // equivalence does not cover land here and stay visible.
  ["GATE-EFFECT-101", "reference also warns on declared-not-observed; ruled out of scope here — an over-broad envelope is legal"],
  ["GATE-EFFECT-102", "same, capability axis"],
]);
const EQUIVALENT = new Map([
  ["GATE-EFFECT-101", "GATE-SEM-009"],   // effect outside envelope
  ["GATE-EFFECT-102", "GATE-SEM-010"],   // capability outside envelope
]);

test("differential (registry mode): every difference from the reference is classified", async () => {
  const registryRaw = JSON.parse(await readFile(resolve(FIXTURES, "test__fixtures__registry.json"), "utf8"));
  const loaded = loadGateV3Registry(registryRaw, "reference-registry");
  assert.ok(loaded.ok, `the reference registry must load through the strict loader: ${loaded.diagnostics.map((d) => d.code)}`);

  const golden = JSON.parse(await readFile(resolve(FIXTURES, "REFERENCE-REGISTRY-VERDICTS.json"), "utf8"));
  const unclassified = [];

  for (const [name, referenceCodes] of Object.entries(golden)) {
    if (referenceCodes.includes("PARSE-REFUSED")) continue;   // parse-tier, covered above
    const parsed = parseGateV3(await readFile(resolve(FIXTURES, name), "utf8"), name);
    if (!parsed.ok) continue;
    const mine = [
      ...resolveGateV3(parsed.circuit, loaded.registry),
      ...checkGateV3Liveness(parsed.circuit, loaded.registry),
      ...verifyEffectEnvelope(parsed.circuit, loaded.registry),   // G4: the envelope joins the compared surface
    ].map((d) => d.code);

    // Anything the reference reports that I do not must be a classified
    // scope difference; anything I report that it does not must be a ruled
    // improvement (my stricter checks), which the codes below enumerate.
    const mineCounts = tally(mine);
    const refCounts = tally(referenceCodes);
    for (const [code, count] of refCounts) {
      const missing = count - (mineCounts.get(code) ?? 0);
      const equivalent = EQUIVALENT.get(code);
      const covered = equivalent !== undefined && (mineCounts.get(equivalent) ?? 0) >= count;
      if (missing > 0 && !REFERENCE_ONLY.has(code) && !covered) {
        unclassified.push(`${name}: reference emits ${code} x${missing} that this implementation does not`);
      }
    }
    for (const [code, count] of mineCounts) {
      const extra = count - (refCounts.get(code) ?? 0);
      const isEquivalentTarget = [...EQUIVALENT.values()].includes(code);
      if (extra > 0 && !STRICTER_BY_RULING.has(code) && !isEquivalentTarget) {
        unclassified.push(`${name}: this implementation emits ${code} x${extra} that the reference does not`);
      }
    }
  }

  assert.deepEqual(unclassified, [], `unclassified registry-mode divergence:\n  ${unclassified.join("\n  ")}`);
});

/** Codes this implementation emits by RULING that the reference cannot. */
const STRICTER_BY_RULING = new Set([
  "GATE-RESOLVE-109",  // GD-010: strict profile demands a type catalogue
  "GATE-RESOLVE-110",  // GD-012: required inputs must have a producer
  "GATE-RESOLVE-111",  // GD-008: contract-declared decision arms must be routed
  "GATE-RESOLVE-112",  // GD-023: argument range/integrality
  "GATE-LIVE-001",     // GD-007: orphan source (contract-decidable)
  "GATE-LIVE-002",     // GD-007: dead end (contract-decidable)
]);

function tally(codes) {
  const counts = new Map();
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return counts;
}
