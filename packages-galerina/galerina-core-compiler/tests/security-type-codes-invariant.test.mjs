/**
 * INVARIANT gate (S13 top assurance rung) — every governance/verdict code the TYPE-CHECKER emits must be
 * in galerina.mjs's SECURITY_TYPE_CODES fail-closed set. This makes the F1/F2/F3 fail-open class
 * UNREPRESENTABLE: a new FUNGI-K3-* / FUNGI-GOV-3VL-* code added to the type-checker that is NOT extracted
 * would silently ride the plain-`check` advisory bucket (and mint a signed build artifact) — the exact
 * recurrence this gate forbids. If you add such a code, either add it to SECURITY_TYPE_CODES (fail-closed,
 * the default) or — if it is deliberately advisory — record that decision in the ADVISORY_BY_DESIGN set
 * below with a reason. An unlisted governance code fails this test, forcing the choice to be made.
 *
 * Scope note: FUNGI-K3-* and FUNGI-GOV-3VL-* are the three-valued governance/verdict family. Ordinary
 * FUNGI-TYPE-* stays advisory by design (the ~150-baseline reason); TYPE-033 is in the set as the S1
 * control-flow fail-open but is NOT part of the family scanned here.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TC = fileURLToPath(new URL("../src/type-checker.ts", import.meta.url));
const CLI = fileURLToPath(new URL("../../../galerina.mjs", import.meta.url));

// Governance/verdict codes the type-checker EMITS: a makeTCDiag first-arg is always on its own line as
// `"FUNGI-...",` — match that exact shape so prose/comment mentions never count.
const emittedGovCodes = new Set();
for (const line of readFileSync(TC, "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^"(FUNGI-(?:K3|GOV-3VL)-\d+)",?$/);
  if (m) emittedGovCodes.add(m[1]);
}

// The fail-closed set, read from the single source of truth in galerina.mjs.
const setDecl = readFileSync(CLI, "utf8").match(/const SECURITY_TYPE_CODES = new Set\(\[([^\]]*)\]\)/);
const securitySet = new Set(
  setDecl ? [...setDecl[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [],
);

// Codes deliberately kept advisory (NONE today). Adding one here is an explicit, reviewed fail-OPEN
// decision — it must carry a reason in a comment. Keep empty unless a governance owner rules otherwise.
const ADVISORY_BY_DESIGN = new Set([]);

describe("SECURITY_TYPE_CODES invariant — no governance/verdict fail-open may hide in the advisory bucket", () => {
  it("found the set + a non-trivial number of emitted governance codes (self-test)", () => {
    assert.ok(securitySet.size >= 5, `SECURITY_TYPE_CODES not parsed from galerina.mjs (got ${securitySet.size})`);
    assert.ok(emittedGovCodes.size >= 3, `expected ≥3 FUNGI-K3-*/GOV-3VL-* codes in type-checker.ts, found ${emittedGovCodes.size}`);
  });

  it("every governance/verdict code the type-checker emits is fail-closed (in SECURITY_TYPE_CODES) or explicitly advisory-by-design", () => {
    const unlisted = [...emittedGovCodes]
      .filter((c) => !securitySet.has(c) && !ADVISORY_BY_DESIGN.has(c))
      .sort();
    assert.deepEqual(
      unlisted, [],
      `These governance/verdict codes are emitted by the type-checker but ride the plain-check advisory ` +
      `bucket (a fail-open that mints a signed build artifact). Add each to SECURITY_TYPE_CODES in ` +
      `galerina.mjs (fail-closed), or to ADVISORY_BY_DESIGN with a reason if a governance owner rules it ` +
      `advisory:\n  ${unlisted.join("\n  ")}`,
    );
  });

  it("ADVISORY_BY_DESIGN entries are actually emitted (no stale exceptions)", () => {
    const stale = [...ADVISORY_BY_DESIGN].filter((c) => !emittedGovCodes.has(c)).sort();
    assert.deepEqual(stale, [], `Stale ADVISORY_BY_DESIGN entries (no longer emitted) — remove:\n  ${stale.join("\n  ")}`);
  });
});
