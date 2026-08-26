import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkTypes, parseProgram } from "../dist/index.js";

const errors = (source) => {
  const parsed = parseProgram(`@version 1\n${source}`, "authority-type.test.fungi");
  return checkTypes(parsed.ast).diagnostics.filter((diagnostic) => diagnostic.severity === "error");
};

const codes = (source) => errors(source).map((diagnostic) => String(diagnostic.code));

describe("Authority<Tag> type family", () => {
  it("accepts a named authority alias with one closed tag", () => {
    assert.deepEqual(
      codes(`
type Lease = Authority<"slide.vok.lease.v1">
pure flow transfer(lease: Lease) -> Lease { return lease }
`),
      [],
    );
  });

  it("refuses Authority without its required tag", () => {
    assert.ok(codes("type Lease = Authority").includes("FUNGI-TYPE-009"));
  });

  it("refuses Authority with a surplus type argument", () => {
    assert.ok(
      codes('type Lease = Authority<String, "slide.vok.lease.v1">').includes("FUNGI-TYPE-009"),
    );
  });

  it("refuses an empty authority tag", () => {
    assert.ok(codes('type Lease = Authority<"">').includes("FUNGI-TYPE-035"));
  });

  it("refuses a non-ASCII authority tag", () => {
    assert.ok(codes('type Lease = Authority<"slide.vok.léase.v1">').includes("FUNGI-TYPE-035"));
  });
  it("refuses transfer between distinct authority tags", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
type AdmittedObject = Authority<"slide.vok.admitted-object.v1">
pure flow confuse(lease: Lease) -> AdmittedObject { return lease }
`).includes("FUNGI-TYPE-008"));
  });

  it("refuses direct transfer between distinct authority tags", () => {
    assert.ok(codes(`
pure flow confuse(
  lease: Authority<"slide.vok.lease.v1">,
) -> Authority<"slide.vok.admitted-object.v1"> { return lease }
`).includes("FUNGI-TYPE-008"));
  });

  it("refuses construction from an ordinary value", () => {
    assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
pure flow forge() -> Lease {
  let lease: Lease = "forged"
  return lease
}
`).includes("FUNGI-TYPE-002"));
  });
});
