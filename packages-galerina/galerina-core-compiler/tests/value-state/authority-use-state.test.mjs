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

  it("cannot hide authority in a nested list argument", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow nestedDuplicate(lease: Lease) -> Bool {
  consume.wrapper([lease, lease])
  return true
}`).includes("FUNGI-AFFINE-004"));
  });
});

describe("Authority<Tag> persistence boundary", () => {
  const expectPersistenceRefusal = (statement) => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow persist(lease: Lease) -> Bool {
  ${statement}
  return true
}`).includes("FUNGI-AFFINE-003"));
  };

  it("refuses JSON serialization", () => {
    expectPersistenceRefusal("json.encode(lease)");
  });

  it("refuses a nested authority value at serialization", () => {
    expectPersistenceRefusal("json.encode([lease])");
  });

  it("refuses database persistence", () => {
    expectPersistenceRefusal("database.write(lease)");
  });

  it("refuses vault persistence", () => {
    expectPersistenceRefusal("Vault.write(lease)");
  });

  it("refuses audit persistence", () => {
    expectPersistenceRefusal("AuditLog.write(lease)");
  });

  it("does not treat a forbidden persistence attempt as a valid transfer", () => {
    const result = codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow refuseThenTransfer(lease: Lease) -> Bool {
  json.encode(lease)
  consume.primary(lease)
  consume.secondary(lease)
  return true
}`);
    assert.ok(result.includes("FUNGI-AFFINE-003"));
    assert.equal(result.filter((code) => code === "FUNGI-AFFINE-002").length, 1);
  });
});

describe("Authority<Tag> containment boundary", () => {
  it("refuses an authority field in an ordinary record declaration", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
record Envelope { lease: Lease }
`).includes("FUNGI-AFFINE-004"));
  });

  it("refuses an authority nested in a list binding", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow wrap(lease: Lease) -> Bool {
  let envelope = [lease]
  return true
}
`).includes("FUNGI-AFFINE-004"));
  });

  it("refuses an authority nested in a record literal", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow wrap(lease: Lease) -> Bool {
  let envelope = { lease: lease }
  return true
}
`).includes("FUNGI-AFFINE-004"));
  });
});
