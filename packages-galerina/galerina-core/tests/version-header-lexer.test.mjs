import assert from "node:assert/strict";
import { test } from "node:test";

import lexerModule from "../compiler/lexer.js";

const { lexSource } = lexerModule;

function lex(content) {
  return lexSource({
    content,
    relativePath: "fixture.fungi",
  });
}

test("legacy lexer admits only the exact supported first-line version header", () => {
  const result = lex("@version 1\npure flow main() -> Int { return 1 }\n");

  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.tokens[0]?.type, "directive");
  assert.equal(result.tokens[0]?.value, "@version 1");
  assert.equal(result.tokens[0]?.line, 1);
  assert.equal(result.tokens[0]?.column, 1);
});

test("legacy lexer refuses malformed, unsupported, and misplaced version headers", () => {
  const cases = [
    "@version 2\npure flow main() -> Int { return 1 }\n",
    "@version 1.0.0\npure flow main() -> Int { return 1 }\n",
    "\n@version 1\npure flow main() -> Int { return 1 }\n",
  ];

  for (const content of cases) {
    const result = lex(content);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0]?.errorType, "LexError");
    assert.match(result.diagnostics[0]?.problem ?? "", /version directive/i);
  }
});
