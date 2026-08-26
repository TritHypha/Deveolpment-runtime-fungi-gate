import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkLint,
  FUNGI_LINT_001,
} from "../dist/lint-checker.js";

function nestedBlock(depth, children = []) {
  let node = { kind: "block", children };
  for (let index = 0; index < depth; index += 1) {
    node = { kind: "block", children: [node] };
  }
  return node;
}

test("flow nesting lint has an identity distinct from generic-type nesting", () => {
  const err = () => ({
    kind: "callExpr",
    value: "Err",
    children: [{ kind: "identifier", value: "failure" }],
  });
  const body = nestedBlock(5, [err(), err(), err()]);
  const ast = {
    kind: "program",
    children: [{
      kind: "flowDecl",
      value: "nestedFlow",
      children: [body],
    }],
  };

  const diagnostics = checkLint(ast, [{ name: "nestedFlow" }]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "FUNGI-LINT-001");
  assert.equal(diagnostics[0].name, "FLOW_EXCESSIVE_NESTING");
  assert.equal(FUNGI_LINT_001.name, "FLOW_EXCESSIVE_NESTING");
});
