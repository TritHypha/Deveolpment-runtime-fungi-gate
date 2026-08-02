import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkValueStates, parseProgram } from "../../dist/index.js";

const codes = (source) => {
  const parsed = parseProgram(`@version 1\n${source}`, "authority-use-state.test.fungi");
  return checkValueStates(parsed.ast, "production").diagnostics.map((diagnostic) => String(diagnostic.code));
};

describe("Authority<Tag> use state", () => {
  it("refuses a second call transfer", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow useTwice(lease: Lease) -> Bool {
  consume.primary(lease)
  consume.secondary(lease)
  return true
}`).includes("FUNGI-AFFINE-002"));
  });

  it("moves on rebinding and refuses the consumed source", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow moveThenReuse(lease: Lease) -> Bool {
  let moved: Lease = lease
  consume.primary(moved)
  consume.secondary(lease)
  return true
}`).includes("FUNGI-AFFINE-002"));
  });

  it("does not mark an ordinary value as authority", () => {
    const affineCodes = codes(`
secure flow ordinary(value: String) -> Bool {
  consume.primary(value)
  consume.secondary(value)
  return true
}`).filter((code) => code === "FUNGI-AFFINE-002");
    assert.deepEqual(affineCodes, []);
  });

  it("refuses reuse after returning an authority value", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow returnThenReuse(lease: Lease) -> Lease {
  return lease
  consume.secondary(lease)
}`).includes("FUNGI-AFFINE-002"));
  });

  it("cannot hide a duplicate authority value in a nested list argument", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow nestedDuplicate(lease: Lease) -> Bool {
  consume.wrapper([lease, lease])
  return true
}`).includes("FUNGI-AFFINE-002"));
  });
});
