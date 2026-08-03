import { test } from "node:test";
import assert from "node:assert/strict";

import {
  analyzeMillionReadLoopEnvelope,
  checkProfiles,
  parseProgram,
} from "../dist/index.js";

const VALID_SOURCE = `
secure flow readMillionValues(values: Array<Int>) -> Result<Int,String>
contract {
  intent { "Read exactly one million values through the checked semantic peer." }
  effects {}
  permissions {
    require verified_native_checked_read_loop_v1 on values
  }
}
{
  if values.count() != 1000000 {
    return Err("MILLION_LENGTH")
  }
  mut i: Int = 0
  mut last: Int = 0
  while i < 1000000 {
    let selected: Option<Int> = values.get(i)
    match selected {
      Some(value) => { last = value }
      None => return Err("MILLION_BOUNDS")
      _ => return Err("MILLION_OPTION")
    }
    i = i + 1
  }
  return Ok(last)
}
`;

function parse(source = VALID_SOURCE) {
  const parsed = parseProgram(source, "verified-million-loop.fungi");
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `parse errors: ${errors.map((error) => error.message).join("; ")}`);
  return parsed;
}

function analyze(source = VALID_SOURCE, flowName = "readMillionValues") {
  return analyzeMillionReadLoopEnvelope(parse(source).ast, flowName);
}

function expectRefusal(source, failureId) {
  const result = analyze(source);
  assert.equal(result.candidate, false);
  assert.equal(result.verdict, -1);
  assert.equal(result.proof, null);
  assert.ok(result.failureIds.includes(failureId), `${failureId} absent from ${result.failureIds.join(", ")}`);
}

test("exact million-read loop produces a non-authorizing proposal", () => {
  const result = analyze();

  assert.equal(result.schemaId, "galerina.verified-loop-envelope.proposal.v2");
  assert.equal(result.candidate, true);
  assert.equal(result.verdict, 0);
  assert.equal(result.flowName, "readMillionValues");
  assert.equal(result.collectionName, "values");
  assert.equal(result.inductionName, "i");
  assert.equal(result.bound, 1000000);
  assert.equal(result.executionWhenNotAdmitted, "checked");
  assert.equal(result.requiredPermission, "verified_native_checked_read_loop_v1");
  assert.equal(result.permissionTarget, "values");
  assert.equal(
    result.contractSuggestion,
    "permissions { require verified_native_checked_read_loop_v1 on values }",
  );
  assert.deepEqual(result.failureIds, ["INDEPENDENT_VERIFIER_UNAVAILABLE"]);
  assert.deepEqual(Object.values(result.facts), Array(13).fill(true));
  assert.deepEqual(result.proof, {
    arithmeticModelId: "galerina.int.checked.v1",
    initialValue: 0,
    step: 1,
    boundExclusive: 1000000,
    maximumAccessIndex: 999999,
    terminalValue: 1000000,
    exactTripCount: 1000000,
    invariant: "i(k)=k AND 0<=k<=1000000",
  });
  assert.equal(Object.isFrozen(result.proof), true);
});

test("missing flow refuses rather than manufacturing a default proposal", () => {
  const result = analyze(VALID_SOURCE, "absentFlow");
  assert.equal(result.candidate, false);
  assert.equal(result.verdict, -1);
  assert.deepEqual(result.failureIds, ["FLOW_NOT_FOUND"]);
});

test("flow signature drift refuses", () => {
  expectRefusal(VALID_SOURCE.replace("values: Array<Int>", "items: Array<Int>"), "FLOW_SHAPE_NOT_EXACT");
});

test("missing exact-cardinality gate refuses", () => {
  expectRefusal(
    VALID_SOURCE.replace(/\s+if values\.count\(\) != 1000000 \{[\s\S]*?\n  \}/, ""),
    "CARDINALITY_GATE_MISSING",
  );
});

test("missing permission keeps the valid checked path and refuses only optimization", () => {
  const result = analyze(VALID_SOURCE.replace(/\s+permissions \{[\s\S]*?\n  \}/, ""));
  assert.equal(result.candidate, false);
  assert.equal(result.verdict, -1);
  assert.equal(result.executionWhenNotAdmitted, "checked");
  assert.ok(result.failureIds.includes("VERIFIED_NATIVE_PERMISSION_MISSING"));
});

test("look-alike verified-native permission refuses", () => {
  expectRefusal(
    VALID_SOURCE.replace(
      "verified_native_checked_read_loop_v1",
      "verified_native_checked_read_loop_v2",
    ),
    "VERIFIED_NATIVE_PERMISSION_MISSING",
  );
});

test("permission scoped to a different value refuses", () => {
  expectRefusal(
    VALID_SOURCE.replace(
      "require verified_native_checked_read_loop_v1 on values",
      "require verified_native_checked_read_loop_v1 on items",
    ),
    "VERIFIED_NATIVE_PERMISSION_MISSING",
  );
});

test("non-canonical permissions syntax is rejected rather than ignored", () => {
  const source = VALID_SOURCE.replace(
    "require verified_native_checked_read_loop_v1",
    'requires: ["verified_native_checked_read_loop_v1"]',
  );
  const parsed = parseProgram(source, "malformed-permission.fungi");
  assert.ok(parsed.diagnostics.some(
    (diagnostic) => diagnostic.code === "FUNGI-CONTRACT-020",
  ));
});

test("cardinality gate after the loop refuses", () => {
  const gate = `  if values.count() != 1000000 {
    return Err("MILLION_LENGTH")
  }
`;
  const moved = VALID_SOURCE.replace(gate, "").replace("  return Ok(last)", `${gate}  return Ok(last)`);
  expectRefusal(moved, "CARDINALITY_GATE_MISSING");
});

test("duplicate cardinality gate refuses", () => {
  const gate = `  if values.count() != 1000000 {
    return Err("MILLION_LENGTH")
  }
`;
  expectRefusal(VALID_SOURCE.replace(gate, gate + gate), "CARDINALITY_GATE_MISSING");
});

test("changed induction initialization refuses", () => {
  expectRefusal(VALID_SOURCE.replace("mut i: Int = 0", "mut i: Int = 1"), "INDUCTION_INITIALIZATION_NOT_EXACT");
});

test("induction initialization after the loop refuses", () => {
  const moved = VALID_SOURCE
    .replace("  mut i: Int = 0\n", "")
    .replace("  return Ok(last)", "  mut i: Int = 0\n  return Ok(last)");
  expectRefusal(moved, "INDUCTION_INITIALIZATION_NOT_EXACT");
});

test("pre-loop collection mutation refuses the closed flow", () => {
  expectRefusal(
    VALID_SOURCE.replace("  mut i: Int = 0", "  values = [1]\n  mut i: Int = 0"),
    "LOOP_BODY_NOT_CLOSED",
  );
});

test("pre-loop call refuses the closed flow", () => {
  expectRefusal(
    VALID_SOURCE.replace("  mut i: Int = 0", "  observe(values)\n  mut i: Int = 0"),
    "LOOP_BODY_NOT_CLOSED",
  );
});

test("changed result initialization refuses the closed flow", () => {
  expectRefusal(VALID_SOURCE.replace("mut last: Int = 0", "mut last: Int = 1"), "LOOP_BODY_NOT_CLOSED");
});

test("changed terminal result refuses the closed flow", () => {
  expectRefusal(VALID_SOURCE.replace("return Ok(last)", "return Ok(i)"), "LOOP_BODY_NOT_CLOSED");
});

for (const [name, mutation] of [
  ["changed bound", (source) => source.replaceAll("1000000", "999999")],
  ["inclusive comparison", (source) => source.replace("while i < 1000000", "while i <= 1000000")],
]) {
  test(`${name} refuses the loop condition`, () => {
    expectRefusal(mutation(VALID_SOURCE), "LOOP_CONDITION_NOT_EXACT");
  });
}

for (const [name, mutation] of [
  ["offset index", (source) => source.replace("values.get(i)", "values.get(i + 1)")],
  ["second indexed read", (source) => source.replace("let selected: Option<Int> = values.get(i)", "let selected: Option<Int> = values.get(i)\n    let second: Option<Int> = values.get(i)")],
]) {
  test(`${name} refuses the exact index-access fact`, () => {
    expectRefusal(mutation(VALID_SOURCE), "INDEX_ACCESS_NOT_EXACT");
  });
}

test("non-exhaustive option decision refuses", () => {
  expectRefusal(
    VALID_SOURCE.replace('      _ => return Err("MILLION_OPTION")\n', ""),
    "OPTION_MATCH_NOT_EXACT",
  );
});

for (const [name, mutation] of [
  ["changed step", (source) => source.replace("i = i + 1", "i = i + 2")],
  ["conditional step", (source) => source.replace("    i = i + 1", "    if last >= 0 { i = i + 1 }")],
]) {
  test(`${name} refuses the induction-step fact`, () => {
    expectRefusal(mutation(VALID_SOURCE), "INDUCTION_STEP_NOT_EXACT");
  });
}

for (const [name, mutation] of [
  ["collection assignment", (source) => source.replace("    i = i + 1", "    values = [1]\n    i = i + 1")],
  ["extra call", (source) => source.replace("    i = i + 1", "    observe(last)\n    i = i + 1")],
  ["second loop", (source) => source.replace("  return Ok(last)", "  while i < 1000000 { i = i + 1 }\n  return Ok(last)")],
]) {
  test(`${name} refuses the closed-loop body`, () => {
    expectRefusal(mutation(VALID_SOURCE), "LOOP_BODY_NOT_CLOSED");
  });
}

test("legacy profile heuristic is not accepted as optimization authority", () => {
  const sourceWithoutStep = VALID_SOURCE.replace("    i = i + 1\n", "");
  const parsed = parse(sourceWithoutStep);
  assert.deepEqual(checkProfiles(parsed.ast, parsed.flows, ["strict"]), []);

  const result = analyzeMillionReadLoopEnvelope(parsed.ast, "readMillionValues");
  assert.equal(result.candidate, false);
  assert.equal(result.verdict, -1);
  assert.ok(result.failureIds.includes("INDUCTION_STEP_NOT_EXACT"));
});
