import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  checkTypes,
  executeFlow,
  parseProgram,
  resolveSymbols,
} from "../dist/index.js";

const fixtureUrl = new URL("./fixtures/while-if-if-while-mutation.fungi", import.meta.url);

async function loadFixture() {
  const source = await readFile(fixtureUrl, "utf8");
  const parsed = parseProgram(source, "while-if-if-while-mutation.fungi");
  const parseErrors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(parseErrors, [], "the shared semantic fixture must parse without recovery");
  resolveSymbols(parsed.ast);
  const typeErrors = checkTypes(parsed.ast).diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  assert.deepEqual(typeErrors, [], "the shared semantic fixture must pass type checking");
  return { source, ast: parsed.ast };
}

async function execute(ast, flowName, enabled, innerEnabled) {
  const result = await executeFlow(
    flowName,
    new Map([
      ["enabled", { __tag: "bool", value: enabled }],
      ["innerEnabled", { __tag: "bool", value: innerEnabled }],
    ]),
    ast,
  );
  assert.deepEqual(result.diagnostics, [], `${flowName} must not emit runtime diagnostics`);
  return result.value;
}

describe("historical while-if-if-while mutation propagation", () => {
  it("keeps the exact historical control shape in the portable fixture", async () => {
    const { source } = await loadFixture();
    assert.match(
      source,
      /while outer < 1\s*\{\s*if enabled\s*\{\s*if innerEnabled\s*\{\s*mut inner: Int = 0\s*while inner < 1\s*\{/u,
      "the regression must retain while -> if -> if -> while rather than a shallower substitute",
    );
  });

  it("propagates the deep mutation and distinguishes both disabled controls", async () => {
    const { ast } = await loadFixture();
    assert.deepEqual(await execute(ast, "deepNestedMutation", true, true), { __tag: "int", value: 7 });
    assert.deepEqual(await execute(ast, "deepNestedMutation", false, true), { __tag: "int", value: 0 });
    assert.deepEqual(await execute(ast, "deepNestedMutation", true, false), { __tag: "int", value: 0 });
  });

  it("preserves the result as an explicit K3 decision without Boolean coercion", async () => {
    const { ast } = await loadFixture();
    assert.deepEqual(await execute(ast, "deepNestedMutationVerdict", true, true), { __tag: "verdict", value: 1 });
    assert.deepEqual(await execute(ast, "deepNestedMutationVerdict", false, true), { __tag: "verdict", value: -1 });
    assert.deepEqual(await execute(ast, "deepNestedMutationVerdict", true, false), { __tag: "verdict", value: -1 });
  });
});
