import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");

const vStr = (value) => ({ __tag: "string", value });

let lexer;
let parser;
let gir;
let adapter;

async function loadStage(filename) {
  const source = await readFile(join(SELF_HOSTED, filename), "utf8");
  const parsed = parseProgram(source, filename, { requireVersionHeader: true });
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `${filename}: ${JSON.stringify(errors)}`);
  return parsed;
}

async function loadAdapter() {
  const preflight = await readFile(join(SELF_HOSTED, "ctll-r1-preflight.fungi"), "utf8");
  const source = await readFile(join(SELF_HOSTED, "ctll-r1-adapter.fungi"), "utf8");
  const combined = `${preflight}\n${source.replace(/^@version 1\r?\n/, "")}`;
  const parsed = parseProgram(combined, "ctll-r1-adapter-combined.fungi", {
    requireVersionHeader: true,
  });
  const parseErrors = parsed.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  assert.deepEqual(parseErrors, [], JSON.stringify(parseErrors));
  const typeErrors = checkTypes(parsed.ast).diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  assert.deepEqual(typeErrors, [], JSON.stringify(typeErrors));
  return parsed;
}

before(async () => {
  [lexer, parser, gir, adapter] = await Promise.all([
    loadStage("lexer.fungi"),
    loadStage("parser.fungi"),
    loadStage("gir-emitter.fungi"),
    loadAdapter(),
  ]);
});

async function tokenize(source) {
  const result = await executeFlow(
    "tokenize",
    new Map([["source", vStr(source)]]),
    lexer.ast,
    lexer.flows,
  );
  return result.value?.__tag === "ok" ? result.value.value : result.value ?? result;
}

async function buildFlow(source) {
  const tokens = await tokenize(source);
  const parseResult = await executeFlow(
    "parseFlows",
    new Map([["tokens", tokens]]),
    parser.ast,
    parser.flows,
  );
  const parsed = parseResult.value ?? parseResult;
  assert.deepEqual(
    parsed.fields.get("errors").items.map((error) => error.value ?? error),
    [],
  );
  const tableResult = await executeFlow(
    "buildFlowTable",
    new Map([["flows", parsed.fields.get("flows")]]),
    gir.ast,
    gir.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
  return (tableResult.value ?? tableResult).items[0];
}

async function adaptFlow(flow) {
  return executeFlow(
    "adaptCTLLR1Fixture",
    new Map([["flowEntry", flow]]),
    adapter.ast,
    adapter.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function adapt(source) {
  return adaptFlow(await buildFlow(source));
}

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

const SOURCE = `
pure flow ctll_k3_checked_add_v1(
  left: Int,
  right: Int,
  admission: Verdict,
) -> Result<Int,String>
{
  check(admission) {
    deny: { return Err("CTLL_PROBE_DENIED") }
    ambig: { return Err("CTLL_PROBE_INDETERMINATE") }
    if: { return Ok(left + right) }
  }
}
`;

describe("CTLL R1 compiler-owned adapter", () => {
  it("enriches FlowEntry with compiler-derived signature and effect facts", async () => {
    const flow = await buildFlow(SOURCE);
    assert.equal(field(flow, "name").value, "ctll_k3_checked_add_v1");
    const derivedName = await executeFlow(
      "deriveCTLLR1FixtureName",
      new Map([["flowEntry", flow]]),
      adapter.ast,
      adapter.flows,
      undefined,
      undefined,
      { pureFastPath: false },
    );
    assert.equal(derivedName.value.value, "ctll_k3_checked_add_v1");
    assert.equal(field(flow, "qualifier").value, "pure");
    assert.deepEqual(
      field(flow, "paramTypes").items.map((value) => value.value),
      ["Int", "Int", "Verdict"],
    );
    assert.equal(field(flow, "returnType").value, "Result<Int,String>");
    assert.deepEqual(field(flow, "effects").items, []);
  });

  it("derives all facts and materializes the exact closed logical R1 program", async () => {
    const result = await adapt(SOURCE);
    assert.equal(result.audit.result, "ok");
    const adapted = result.value;
    const decision = field(adapted, "decision");
    assert.equal(
      field(adapted, "materialized").value,
      true,
      `${field(decision, "failureId").value}: ${field(decision, "reason").value}`,
    );
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "failureId").value, "NONE");

    const program = field(adapted, "program");
    assert.equal(field(program, "formatMajor").value, 1);
    assert.equal(
      field(program, "semanticProfileId").value,
      "ctll.semantic.galerina-gir.v1",
    );
    assert.equal(field(program, "fixtureName").value, "ctll_k3_checked_add_v1");
    assert.deepEqual(
      field(program, "parameterTypeIds").items.map((value) => value.value),
      [1, 1, 2],
    );
    assert.equal(field(program, "resultTypeId").value, 3);
    assert.equal(field(program, "blocks").items.length, 4);
    const entry = field(program, "blocks").items[0];
    assert.deepEqual(
      field(entry, "instructions").items.map((instruction) => [
        field(instruction, "resultId").value,
        field(instruction, "opcodeId").value,
        field(instruction, "typeId").value,
        field(instruction, "immediate").value,
      ]),
      [
        [0, 1, 1, 0],
        [1, 1, 1, 1],
        [2, 1, 2, 2],
      ],
    );
    const terminator = field(entry, "terminator");
    assert.equal(field(terminator, "terminatorId").value, 1);
    assert.deepEqual(
      field(terminator, "operands").items.map((value) => value.value),
      [2, 1, 2, 3],
    );
    assert.deepEqual(
      field(program, "failures").items.map((failure) => [
        field(failure, "failureId").value,
        field(failure, "classId").value,
        field(failure, "visibilityId").value,
        field(failure, "retryId").value,
        field(failure, "terminalActionId").value,
      ]),
      [
        [1, 2, 1, 1, 1],
        [2, 3, 1, 2, 1],
        [3, 4, 1, 2, 1],
      ],
    );
  });

  it("is deterministic for the same compiler-owned FlowEntry", async () => {
    const first = await adapt(SOURCE);
    const second = await adapt(SOURCE);
    assert.deepEqual(first.value, second.value);
  });

  it("refuses hidden K3 shell data instead of ignoring it", async () => {
    const flow = structuredClone(await buildFlow(SOURCE));
    flow.fields.get("body").items[0].fields.set("name", vStr("smuggled"));
    const result = await adaptFlow(flow);
    assert.equal(
      field(field(result.value, "decision"), "failureId").value,
      "CTLL-R1-EXPORT-008",
    );
    assert.equal(field(result.value, "materialized").value, false);
  });

  it("refuses a surplus derived type fact", async () => {
    const flow = structuredClone(await buildFlow(SOURCE));
    flow.fields.get("paramTypes").items.push(vStr("String"));
    const result = await adaptFlow(flow);
    assert.equal(
      field(field(result.value, "decision"), "failureId").value,
      "CTLL-R1-EXPORT-011",
    );
    assert.equal(field(result.value, "materialized").value, false);
  });

  for (const [name, mutate, expectedFailure] of [
    [
      "fixture identity",
      (source) => source.replace("ctll_k3_checked_add_v1", "another_fixture"),
      "CTLL-R1-EXPORT-001",
    ],
    [
      "qualifier",
      (source) => source.replace("pure flow", "secure flow"),
      "CTLL-R1-EXPORT-002",
    ],
    [
      "left type",
      (source) => source.replace("left: Int", "left: String"),
      "CTLL-R1-EXPORT-004",
    ],
    [
      "admission type",
      (source) => source.replace("admission: Verdict", "admission: Bool"),
      "CTLL-R1-EXPORT-006",
    ],
    [
      "return type",
      (source) => source.replace("Result<Int,String>", "Int"),
      "CTLL-R1-EXPORT-007",
    ],
    [
      "K3 successor set",
      (source) =>
        source.replace('    ambig: { return Err("CTLL_PROBE_INDETERMINATE") }\n', ""),
      "CTLL-R1-EXPORT-008",
    ],
    [
      "checked operation",
      (source) => source.replace("left + right", "left - right"),
      "CTLL-R1-EXPORT-009",
    ],
    [
      "negative terminal",
      (source) =>
        source.replace(
          'deny: { return Err("CTLL_PROBE_DENIED") }',
          "deny: { let observed: Int = 1 }",
        ),
      "CTLL-R1-EXPORT-010",
    ],
  ]) {
    it(`refuses a derived ${name} mismatch as ${expectedFailure}`, async () => {
      const result = await adapt(mutate(SOURCE));
      const adapted = result.value;
      assert.equal(field(adapted, "materialized").value, false);
      assert.equal(field(field(adapted, "decision"), "verdict").value, -1);
      assert.equal(
        field(field(adapted, "decision"), "failureId").value,
        expectedFailure,
      );
      assert.equal(field(field(adapted, "program"), "formatMajor").value, 0);
      assert.deepEqual(field(field(adapted, "program"), "blocks").items, []);
    });
  }
});
