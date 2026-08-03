import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  analyzeMillionReadLoopEnvelope,
  checkEffects,
  checkTypes,
  checkValueStates,
  parseProgram,
  verifyGovernance,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(
  HERE,
  "..",
  "..",
  "..",
  "docs",
  "examples",
  "VERIFIED-MILLION-ITERATION-LOOP.fungi",
);
const CHECKED_SOURCE = join(
  HERE,
  "..",
  "..",
  "..",
  "docs",
  "examples",
  "CHECKED-MILLION-ITERATION-LOOP.fungi",
);

const errors = (diagnostics) =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

let parsed;
let parsedChecked;

before(async () => {
  const source = await readFile(SOURCE, "utf8");
  parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
  const checkedSource = await readFile(CHECKED_SOURCE, "utf8");
  parsedChecked = parseProgram(checkedSource, CHECKED_SOURCE, {
    requireVersionHeader: true,
  });
});

describe("verified million-iteration developer example", () => {
  it("passes every production source gate", () => {
    assert.deepEqual(errors(parsed.diagnostics), []);
    assert.deepEqual(errors(checkTypes(parsed.ast).diagnostics), []);
    assert.deepEqual(
      errors(checkValueStates(parsed.ast, "production").diagnostics),
      [],
    );
    const effects = checkEffects(parsed.flows, parsed.ast);
    assert.deepEqual(errors(effects), []);
    assert.deepEqual(
      errors(
        verifyGovernance(
          parsed.ast,
          parsed.flows,
          effects,
          "production",
        ).diagnostics,
      ),
      [],
    );
  });

  it("derives only the exact non-authorizing loop proposal", () => {
    const proposal = analyzeMillionReadLoopEnvelope(
      parsed.ast,
      "readMillionValues",
    );
    assert.equal(proposal.candidate, true);
    assert.equal(proposal.verdict, 0);
    assert.equal(proposal.bound, 1000000);
    assert.deepEqual(proposal.failureIds, [
      "INDEPENDENT_VERIFIER_UNAVAILABLE",
    ]);
    assert.deepEqual(Object.values(proposal.facts), Array(13).fill(true));
    assert.equal(proposal.executionWhenNotAdmitted, "checked");
    assert.equal(proposal.proof?.exactTripCount, 1000000);
  });

  it("keeps the permission-absent twin valid on the checked path", () => {
    assert.deepEqual(errors(parsedChecked.diagnostics), []);
    assert.deepEqual(errors(checkTypes(parsedChecked.ast).diagnostics), []);
    assert.deepEqual(
      errors(checkValueStates(parsedChecked.ast, "production").diagnostics),
      [],
    );
    const effects = checkEffects(parsedChecked.flows, parsedChecked.ast);
    assert.deepEqual(errors(effects), []);
    assert.deepEqual(
      errors(
        verifyGovernance(
          parsedChecked.ast,
          parsedChecked.flows,
          effects,
          "production",
        ).diagnostics,
      ),
      [],
    );
    const proposal = analyzeMillionReadLoopEnvelope(
      parsedChecked.ast,
      "readMillionValues",
    );
    assert.equal(proposal.candidate, false);
    assert.equal(proposal.verdict, -1);
    assert.equal(proposal.executionWhenNotAdmitted, "checked");
    assert.deepEqual(proposal.failureIds, [
      "VERIFIED_NATIVE_PERMISSION_MISSING",
    ]);
  });
});
