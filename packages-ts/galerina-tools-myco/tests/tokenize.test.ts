import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_INDEX_TERM_LENGTH } from "../src/graph/index-contract.ts";
import { countTerms } from "../src/ingest/tokenize.ts";
import { foldCase } from "../src/util/normalize.ts";

test("countTerms folds case and counts occurrences", () => {
  const counts = countTerms("Hello hello HELLO world");
  assert.equal(counts.get("hello"), 3);
  assert.equal(counts.get("world"), 1);
  assert.equal(counts.get("Hello"), undefined); // only the folded form is stored
});

test("countTerms splits on non-word characters, keeps underscores", () => {
  const counts = countTerms("foo_bar foo-bar foo.bar");
  assert.equal(counts.get("foo_bar"), 1); // underscore is a word char
  assert.equal(counts.get("foo"), 2); // the hyphen and dot split
  assert.equal(counts.get("bar"), 2);
});

test("foldCase normalizes case but preserves accents", () => {
  assert.equal(foldCase("CAFÉ"), "café");
  assert.notEqual(foldCase("café"), foldCase("cafe")); // accent is significant
});

test("countTerms handles Unicode letters", () => {
  const counts = countTerms("naïve café Ω_omega");
  assert.equal(counts.get("naïve"), 1);
  assert.equal(counts.get("café"), 1);
  assert.equal(counts.get("ω_omega"), 1);
});

test("countTerms omits over-limit terms without dropping admitted neighbors", () => {
  const exactLimit = "a".repeat(MAX_INDEX_TERM_LENGTH);
  const overLimit = "b".repeat(MAX_INDEX_TERM_LENGTH + 1);
  const report = { omittedOverlongTerms: 0 };
  const counts = countTerms(`alpha ${exactLimit} ${overLimit} omega`, report);

  assert.equal(counts.get("alpha"), 1);
  assert.equal(counts.get(exactLimit), 1);
  assert.equal(counts.has(overLimit), false);
  assert.equal(counts.get(overLimit.slice(0, MAX_INDEX_TERM_LENGTH)), undefined);
  assert.equal(counts.get("omega"), 1);
  assert.equal(report.omittedOverlongTerms, 1);
});
