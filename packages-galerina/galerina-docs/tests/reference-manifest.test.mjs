import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReferenceManifest,
  ReferenceManifestError,
} from "../dist/index.js";

const BUILD_POINT = "5775a9fe9eba16a57133f5b2ba0adbe51d9df672";
const SOURCE = `@version 1
type Alias = Int
record Person { id: Int }
enum Color { Red, Blue }
guard Limit { permitted_effects { } }
static MAX = 1
bitfield Flags { read: 0, write: 1 }
pure flow choose(value: Int) -> Int
contract { intent { "reference" } }
{ return value }
`;

function moduleInput(overrides = {}) {
  return {
    packageName: "@galerina/reference-fixture",
    moduleName: "fixture",
    file: "packages-galerina/reference-fixture/src/reference.fungi",
    source: SOURCE,
    ...overrides,
  };
}

function build(modules = [moduleInput()]) {
  return buildReferenceManifest({ buildPoint: BUILD_POINT, modules });
}

test("checked AST emits every supported top-level declaration exactly once", () => {
  const manifest = build();
  assert.equal(manifest.schema, "galerina.reference-manifest.v1");
  assert.equal(manifest.buildPoint, BUILD_POINT);
  assert.deepEqual(
    manifest.declarations.map(({ kind, name }) => [kind, name]),
    [
      ["type", "Alias"],
      ["enum", "Color"],
      ["bitfield", "Flags"],
      ["guard", "Limit"],
      ["static", "MAX"],
      ["record", "Person"],
      ["flow", "choose"],
    ],
  );
  assert.equal(new Set(manifest.declarations.map((entry) => entry.qualifiedName)).size, 7);
  const flow = manifest.declarations.find((entry) => entry.kind === "flow");
  assert.deepEqual(flow.parameters, [{ name: "value", type: "Int" }]);
  assert.equal(flow.returnType, "Int");
  assert.equal(flow.qualifier, "pure");
  assert.deepEqual(flow.effects, []);
  assert.deepEqual(flow.contracts, [{ kind: "intent", values: ["reference"] }]);
  assert.equal(flow.locator.file, moduleInput().file);
  assert.ok(flow.locator.byteEnd > flow.locator.byteStart);
  assert.match(flow.locator.sourceSha256, /^[0-9A-F]{64}$/u);
  assert.doesNotMatch(JSON.stringify(manifest), /@version|C:\\|\/Users\//u);
});

test("nested local fn is private to its flow and is omitted", () => {
  const source = `@version 1
pure flow outer(value: Int) -> Int
contract { intent { "local helper" } }
{
  fn inner(item: Int) -> Int { return item }
  return inner(value)
}
`;
  const manifest = build([moduleInput({ source })]);
  assert.deepEqual(manifest.declarations.map((entry) => entry.name), ["outer"]);
  assert.ok(!JSON.stringify(manifest).includes("inner"));
});

test("invented private top-level syntax is rejected by the canonical parser", () => {
  const source = SOURCE.replace("type Alias", "private type Alias");
  assert.throws(() => build([moduleInput({ source })]), ReferenceManifestError);
});

test("duplicate and case-folded qualified names refuse", () => {
  assert.throws(
    () => build([moduleInput(), moduleInput()]),
    (error) => error instanceof ReferenceManifestError && error.code === "DUPLICATE_QUALIFIED_NAME",
  );
  assert.throws(
    () => build([
      moduleInput(),
      moduleInput({ moduleName: "Fixture", file: "packages-galerina/reference-fixture/src/reference-two.fungi" }),
    ]),
    (error) => error instanceof ReferenceManifestError && error.code === "CASE_COLLISION",
  );
});

test("broken type links and unsupported public AST nodes refuse", () => {
  const broken = SOURCE.replace("id: Int", "id: MissingReferenceType");
  assert.throws(() => build([moduleInput({ source: broken })]), ReferenceManifestError);

  const hallmark = `@version 1
hallmark Trusted of Int { decimals: 0 }
`;
  assert.throws(
    () => build([moduleInput({ source: hallmark })]),
    (error) => error instanceof ReferenceManifestError && error.code === "UNSUPPORTED_PUBLIC_AST",
  );
});

test("generation is byte deterministic and a signature byte changes authority", () => {
  const first = build();
  const second = build();
  assert.equal(JSON.stringify(first), JSON.stringify(second));

  const changed = build([moduleInput({ source: SOURCE.replace("value: Int", "input: Int").replace("return value", "return input") })]);
  assert.notEqual(changed.manifestSha256, first.manifestSha256);
  assert.notEqual(changed.sources[0].sourceSha256, first.sources[0].sourceSha256);
  assert.notEqual(
    changed.declarations.find((entry) => entry.kind === "flow").signature,
    first.declarations.find((entry) => entry.kind === "flow").signature,
  );
});
