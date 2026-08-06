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
import { parseGateV3, verifyGateV3Structure } from "../dist/index.js";

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
