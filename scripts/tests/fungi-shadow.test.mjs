import assert from "node:assert/strict";
import test from "node:test";

import {
  alphaFungiFingerprint,
  exactFungiFingerprint,
  findFungiCollision,
} from "../lib/fungi-shadow.mjs";

test("shared Fungi fingerprints preserve literals, types, operators and control flow", () => {
  const first = '@version 1\npure flow first(value: Bool) -> String { if value { return "one" } else { return "zero" } }\n';
  const renamed = '@version 1\npure flow second(flag: Bool) -> String { if flag { return "one" } else { return "zero" } }\n';
  const changedLiteral = '@version 1\npure flow third(flag: Bool) -> String { if flag { return "two" } else { return "zero" } }\n';
  const changedType = '@version 1\npure flow fourth(flag: Bool) -> Int { if flag { return 1 } else { return 0 } }\n';
  const changedOperator = '@version 1\npure flow fifth(value: Int) -> Bool { return value > 1 }\n';
  const otherOperator = '@version 1\npure flow sixth(input: Int) -> Bool { return input >= 1 }\n';
  const changedControl = '@version 1\npure flow seventh(flag: Bool) -> String { return "one" }\n';
  const boolIdentity = "@version 1\npure flow boolIdentity(value: Bool) -> Bool { return value }\n";
  const intIdentity = "@version 1\npure flow intIdentity(value: Int) -> Int { return value }\n";
  const whileShape = "@version 1\npure flow looping(value: Int) -> Int { while value > 0 { return value } return 0 }\n";
  const forShape = "@version 1\npure flow iterating(value: Int) -> Int { for value > 0 { return value } return 0 }\n";

  assert.notEqual(exactFungiFingerprint(first), exactFungiFingerprint(renamed));
  assert.equal(alphaFungiFingerprint(first), alphaFungiFingerprint(renamed));
  assert.notEqual(alphaFungiFingerprint(first), alphaFungiFingerprint(changedLiteral));
  assert.notEqual(alphaFungiFingerprint(first), alphaFungiFingerprint(changedType));
  assert.notEqual(alphaFungiFingerprint(changedOperator), alphaFungiFingerprint(otherOperator));
  assert.notEqual(alphaFungiFingerprint(first), alphaFungiFingerprint(changedControl));
  assert.notEqual(alphaFungiFingerprint(boolIdentity), alphaFungiFingerprint(intIdentity));
  assert.notEqual(alphaFungiFingerprint(whileShape), alphaFungiFingerprint(forShape));
});

test("shared corpus comparison reports exact and alpha-shadow collisions", () => {
  const first = '@version 1\npure flow first(value: Int) -> Int { return value + 7 }\n';
  const renamed = '@version 1\npure flow second(input: Int) -> Int { return input + 7 }\n';
  const distinct = '@version 1\npure flow third(input: Int) -> Int { return input + 8 }\n';
  const corpus = [{ path: "existing.fungi", source: first }];

  assert.deepEqual(findFungiCollision(first, corpus), { kind: "EXACT_DUPLICATE", path: "existing.fungi" });
  assert.deepEqual(findFungiCollision(renamed, corpus), { kind: "ALPHA_SHADOW", path: "existing.fungi" });
  assert.equal(findFungiCollision(distinct, corpus), undefined);
  assert.throws(() => alphaFungiFingerprint(""), /nonempty/u);
  assert.throws(() => alphaFungiFingerprint("// comments only\n"), /empty executable/u);
});
