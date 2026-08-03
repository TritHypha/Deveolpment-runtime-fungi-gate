import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  checkEffects,
  checkTypes,
  checkValueStates,
  executeFlow,
  parseProgram,
  verifyGovernance,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "verified-loop-envelope.fungi",
);
const PACKAGE = join(HERE, "..", "package.json");
const ASSET = "src/self-hosted/verified-loop-envelope.fungi";

const FACT_NAMES = [
  "exactFlowShape",
  "exactCardinalityGate",
  "exactInductionInitialization",
  "exactLoopCondition",
  "exactIndexAccess",
  "exactOptionMatch",
  "exactInductionStep",
  "closedLoopBody",
];

const FAILURE_IDS = [
  "FLOW_SHAPE_NOT_EXACT",
  "CARDINALITY_GATE_NOT_EXACT",
  "INDUCTION_INITIALIZATION_NOT_EXACT",
  "LOOP_CONDITION_NOT_EXACT",
  "INDEX_ACCESS_NOT_EXACT",
  "OPTION_MATCH_NOT_EXACT",
  "INDUCTION_STEP_NOT_EXACT",
  "LOOP_BODY_NOT_CLOSED",
];

const errors = (diagnostics) =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

const boolValue = (value) => ({ __tag: "bool", value });

const factsValue = (mask) => ({
  __tag: "record",
  fields: new Map(
    FACT_NAMES.map((name, index) => [name, boolValue(Boolean(mask & (1 << index)))]),
  ),
});

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

let parsed;

before(async () => {
  const source = await readFile(SOURCE, "utf8");
  parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
});

async function propose(mask) {
  const result = await executeFlow(
    "verifiedLoopEnvelopePropose",
    new Map([["facts", factsValue(mask)]]),
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

describe("verified loop envelope .fungi authority model", () => {
  it("is a declared package asset and passes every production source gate", async () => {
    const packageDocument = JSON.parse(await readFile(PACKAGE, "utf8"));
    assert.ok(packageDocument.packageGraph.loadedAssets.includes(ASSET));

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

  it("executes all 256 fact combinations without ever granting authority", async () => {
    for (let mask = 0; mask < 256; mask += 1) {
      const proposal = await propose(mask);
      const candidate = field(proposal, "candidate");
      const verdict = field(proposal, "verdict");
      const failureId = field(proposal, "failureId");

      assert.equal(candidate.__tag, "bool");
      assert.equal(verdict.__tag, "verdict");
      assert.equal(failureId.__tag, "string");
      assert.notEqual(verdict.value, 1, `mask ${mask} granted authority`);

      if (mask === 255) {
        assert.equal(candidate.value, true);
        assert.equal(verdict.value, 0);
        assert.equal(failureId.value, "INDEPENDENT_VERIFIER_UNAVAILABLE");
        continue;
      }

      const firstMissing = FACT_NAMES.findIndex(
        (_name, index) => (mask & (1 << index)) === 0,
      );
      assert.equal(candidate.value, false);
      assert.equal(verdict.value, -1);
      assert.equal(failureId.value, FAILURE_IDS[firstMissing]);
    }
  });
});
