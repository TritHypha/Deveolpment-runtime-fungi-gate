import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");

const vStr = (value) => ({ __tag: "string", value });
const vInt = (value) => ({ __tag: "int", value });
const vBool = (value) => ({ __tag: "bool", value });
const vList = (items) => ({ __tag: "list", items });
const vRecord = (entries) => ({ __tag: "record", fields: new Map(entries) });

const emptyList = vList([]);
const rtValue = (ty, { i = 0, b = false, s = "" } = {}) =>
  vRecord([
    ["ty", vStr(ty)],
    ["i", vInt(i)],
    ["b", vBool(b)],
    ["s", vStr(s)],
    ["tag", vStr("")],
    ["payload", emptyList],
    ["fields", emptyList],
  ]);
const rtInt = (value) => rtValue("Int", { i: value });
const rtBool = (value) => rtValue("Bool", { b: value });
const rtVerdict = (value) => rtValue("Verdict", { i: value });

let lexer;
let parser;
let gir;
let runtime;

async function loadStage(filename) {
  const source = await readFile(join(SELF_HOSTED, filename), "utf8");
  const parsed = parseProgram(source, filename, { requireVersionHeader: true });
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `${filename}: ${JSON.stringify(errors)}`);
  return parsed;
}

before(async () => {
  [lexer, parser, gir, runtime] = await Promise.all([
    loadStage("lexer.fungi"),
    loadStage("parser.fungi"),
    loadStage("gir-emitter.fungi"),
    loadStage("runtime.fungi"),
  ]);
});

async function tokenize(source) {
  const result = await executeFlow(
    "tokenize",
    new Map([["source", vStr(source)]]),
    lexer.ast,
    lexer.flows,
  );
  const value = result.value ?? result;
  return value.__tag === "ok" ? value.value : value;
}

async function parseSelfHosted(source) {
  const tokens = await tokenize(source);
  const result = await executeFlow(
    "parseFlows",
    new Map([["tokens", tokens]]),
    parser.ast,
    parser.flows,
  );
  const parsed = result.value ?? result;
  assert.equal(parsed.__tag, "record");
  assert.deepEqual(
    parsed.fields.get("errors").items.map((error) => error.value ?? error),
    [],
    "the self-hosted parser must refuse before a downstream stage receives erroneous flows",
  );
  return parsed;
}

async function buildTable(source) {
  const parsed = await parseSelfHosted(source);
  const result = await executeFlow(
    "buildFlowTable",
    new Map([["flows", parsed.fields.get("flows")]]),
    gir.ast,
    gir.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
  return { parsed, table: result.value ?? result };
}

async function run(source, args) {
  const { table } = await buildTable(source);
  return executeFlow(
    "runProgram",
    new Map([
      ["flows", table],
      ["entryName", vStr("slideK3CheckedAddProbe")],
      ["args", vList(args)],
    ]),
    runtime.ast,
    runtime.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function applyBinop(op, left, right) {
  return executeFlow(
    "applyBinop",
    new Map([
      ["op", vStr(op)],
      ["a", left],
      ["b", right],
    ]),
    runtime.ast,
    runtime.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

function unwrapRunValue(result) {
  const runResult = result.value ?? result;
  assert.equal(runResult.__tag, "record");
  return runResult.fields.get("retVal");
}

function readTagged(value) {
  assert.equal(value.__tag, "record");
  assert.equal(value.fields.get("ty").value, "tag");
  const payload = value.fields.get("payload").items;
  assert.equal(payload.length, 1);
  return {
    tag: value.fields.get("tag").value,
    payload: payload[0],
  };
}

const COMPLETE_SOURCE = `
pure flow slideK3CheckedAddProbe(
  left: Int,
  right: Int,
  admission: Verdict,
) -> Result<Int,String>
{
  check(admission) {
    deny: { return Err("SLIDE_PROBE_DENIED") }
    ambig: { return Err("SLIDE_PROBE_INDETERMINATE") }
    if: { return Ok(left + right) }
  }
}
`;

describe("self-hosted K3 prerequisite for SLIDE R1", () => {
  it("lexes check as a keyword while keeping arm labels contextual", async () => {
    const tokens = await tokenize("check(admission) { deny: {} ambig: {} if: {} }");
    const rows = tokens.items
      .map((token) => token.value ?? token)
      .map((token) => ({
        kind: token.fields.get("kind").name ?? token.fields.get("kind").value,
        value: token.fields.get("value").value,
      }));
    assert.deepEqual(rows.find((row) => row.value === "check"), {
      kind: "Keyword",
      value: "check",
    });
    assert.equal(rows.find((row) => row.value === "deny").kind, "Identifier");
    assert.equal(rows.find((row) => row.value === "ambig").kind, "Identifier");
  });

  it("preserves the full generic return type and all three source-order K3 arms", async () => {
    const parsed = await parseSelfHosted(COMPLETE_SOURCE);
    const flow = parsed.fields.get("flows").items[0];
    assert.equal(flow.fields.get("returnType").value, "Result<Int,String>");
    const check = flow.fields.get("body").items[0];
    assert.equal(check.fields.get("kind").value, "check");
    assert.equal(check.fields.get("expr").items[0].fields.get("value").value, "admission");
    assert.deepEqual(
      check.fields.get("body").items.map((arm) => arm.fields.get("name").value),
      ["deny", "ambig", "if"],
    );
  });

  it("emits one explicit check_k3 node with three labelled successor bodies", async () => {
    const { table } = await buildTable(COMPLETE_SOURCE);
    const check = table.items[0].fields.get("body").items[0];
    assert.equal(check.fields.get("op").value, "check_k3");
    assert.equal(check.fields.get("expr").items[0].fields.get("op").value, "load");
    assert.deepEqual(
      check.fields.get("body").items.map((arm) => arm.fields.get("name").value),
      ["deny", "ambig", "if"],
    );
    assert.ok(
      check.fields.get("body").items.every(
        (arm) => arm.fields.get("body").items[0].fields.get("op").value === "ret",
      ),
    );
  });

  for (const [name, verdict, expectedTag, expectedPayload] of [
    ["ALLOW", 1, "Ok", 3],
    ["DENY", -1, "Err", "SLIDE_PROBE_DENIED"],
    ["INDETERMINATE", 0, "Err", "SLIDE_PROBE_INDETERMINATE"],
  ]) {
    it(`executes the distinct ${name} successor`, async () => {
      const result = await run(COMPLETE_SOURCE, [rtInt(1), rtInt(2), rtVerdict(verdict)]);
      const tagged = readTagged(unwrapRunValue(result));
      assert.equal(tagged.tag, expectedTag);
      if (typeof expectedPayload === "number") {
        assert.equal(tagged.payload.fields.get("ty").value, "Int");
        assert.equal(tagged.payload.fields.get("i").value, expectedPayload);
      } else {
        assert.equal(tagged.payload.fields.get("ty").value, "String");
        assert.equal(tagged.payload.fields.get("s").value, expectedPayload);
      }
    });
  }

  it("traps a forged fourth Verdict value at the check_k3 use site", async () => {
    const result = await run(COMPLETE_SOURCE, [rtInt(1), rtInt(2), rtVerdict(2)]);
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /FUNGI-INV-000/);
    assert.equal(result.audit.result, "error");
  });

  it("traps a non-Verdict subject instead of coercing it", async () => {
    const result = await run(COMPLETE_SOURCE, [rtInt(1), rtInt(2), rtBool(true)]);
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /FUNGI-INV-000/);
  });

  it("traps a missing K3 successor before executing any arm", async () => {
    const source = COMPLETE_SOURCE.replace(
      '    ambig: { return Err("SLIDE_PROBE_INDETERMINATE") }\n',
      "",
    );
    const result = await run(source, [rtInt(1), rtInt(2), rtVerdict(1)]);
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /FUNGI-INV-000/);
  });

  it("traps duplicate and extra K3 successors before dispatch", async () => {
    const source = COMPLETE_SOURCE.replace(
      '    if: { return Ok(left + right) }\n',
      '    if: { return Ok(left + right) }\n    if: { return Ok(0) }\n',
    );
    const result = await run(source, [rtInt(1), rtInt(2), rtVerdict(1)]);
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /FUNGI-INV-000/);
  });

  it("traps a DENY arm that does not leave the current flow", async () => {
    const source = COMPLETE_SOURCE.replace(
      '    deny: { return Err("SLIDE_PROBE_DENIED") }\n',
      "    deny: { let observed: Int = 1 }\n",
    );
    const result = await run(source, [rtInt(1), rtInt(2), rtVerdict(-1)]);
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /ERR_K3_NON_TERMINAL/);
  });

  it("propagates checked Int32 overflow from the ALLOW successor", async () => {
    const result = await run(
      COMPLETE_SOURCE,
      [rtInt(2147483647), rtInt(1), rtVerdict(1)],
    );
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /overflow/i);
  });

  it("does not evaluate protected arithmetic on the DENY successor", async () => {
    const result = await run(
      COMPLETE_SOURCE,
      [rtInt(2147483647), rtInt(1), rtVerdict(-1)],
    );
    const tagged = readTagged(unwrapRunValue(result));
    assert.equal(tagged.tag, "Err");
    assert.equal(tagged.payload.fields.get("s").value, "SLIDE_PROBE_DENIED");
  });

  it("hard-traps missing and surplus SLIDE entry evidence", async () => {
    const missing = await run(
      COMPLETE_SOURCE,
      [rtInt(1), rtInt(2)],
    );
    const surplus = await run(
      COMPLETE_SOURCE,
      [rtInt(1), rtInt(2), rtVerdict(1), rtInt(99)],
    );
    assert.equal(missing.value.__tag, "runtimeError");
    assert.match(missing.value.message, /ERR_ARGUMENT_COUNT/);
    assert.equal(surplus.value.__tag, "runtimeError");
    assert.match(surplus.value.message, /ERR_ARGUMENT_COUNT/);
  });

  for (const [name, op, left, right, trapKind] of [
    ["addition overflow", "add", 2147483647, 1, "ERR_I32_OVERFLOW"],
    ["addition underflow", "add", -2147483648, -1, "ERR_I32_OVERFLOW"],
    ["subtraction overflow", "sub", 2147483647, -1, "ERR_I32_OVERFLOW"],
    ["subtraction underflow", "sub", -2147483648, 1, "ERR_I32_OVERFLOW"],
    ["multiplication overflow", "mul", 2147483647, 2, "ERR_I32_OVERFLOW"],
    ["division overflow", "div", -2147483648, -1, "ERR_I32_OVERFLOW"],
    ["division by zero", "div", 1, 0, "ERR_DIV_BY_ZERO"],
  ]) {
    it(`hard-traps ${name} with a stable trap kind`, async () => {
      const result = await applyBinop(op, rtInt(left), rtInt(right));
      assert.equal(result.value.__tag, "runtimeError");
      assert.match(result.value.message, new RegExp(trapKind));
      assert.equal(result.audit.result, "error");
    });
  }

  it("refuses an out-of-range operand before arithmetic", async () => {
    const result = await applyBinop("add", rtInt(2147483648), rtInt(0));
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /ERR_I32_RANGE/);
  });

  it("retains valid Int32 boundary arithmetic", async () => {
    const max = await applyBinop("add", rtInt(2147483647), rtInt(0));
    const min = await applyBinop("sub", rtInt(-2147483648), rtInt(0));
    assert.equal(max.value.fields.get("i").value, 2147483647);
    assert.equal(min.value.fields.get("i").value, -2147483648);
  });
});
