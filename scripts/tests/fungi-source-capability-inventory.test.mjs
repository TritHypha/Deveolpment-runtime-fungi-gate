import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  collectAstFeatures,
  inventoryFungiSources,
} from "../fungi-source-capability-inventory.mjs";

const SOURCE = `@version 1
record Row { value: Int }

pure flow sum(values: Array<Int>, enabled: Bool) -> Int
contract { intent { "Inventory fixture." } }
{
  mut index: Int = 0
  mut total: Int = 0
  while index < values.count() {
    if enabled {
      total = total + values.get(index).unwrapOr(0)
    }
    index = index + 1
  }
  return total
}
`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-fungi-inventory-"));
  const relativePath = "packages-galerina/galerina-test-probe/src/index.fungi";
  const sourcePath = join(root, ...relativePath.split("/"));
  mkdirSync(join(sourcePath, ".."), { recursive: true });
  writeFileSync(sourcePath, SOURCE, "utf8");
  const retirementPath = join(root, "build", "ts-retirement", "ts-retirement.json");
  mkdirSync(join(retirementPath, ".."), { recursive: true });
  writeFileSync(retirementPath, `${JSON.stringify({ unexecutedFungiPaths: [relativePath] })}\n`, "utf8");
  return { root, retirementPath, relativePath };
}

test("derives deterministic non-authorizing source capability facts", () => {
  const { root, retirementPath, relativePath } = fixture();
  const first = inventoryFungiSources({ root, retirementPath });
  const second = inventoryFungiSources({ root, retirementPath });

  assert.deepEqual(first, second);
  assert.equal(first.schema, "galerina.fungi-source-capability-inventory.v1");
  assert.equal(first.authority.productionAuthorityReleased, false);
  assert.equal(first.authority.retirementAuthorized, false);
  assert.equal(first.totals.files, 1);
  assert.equal(first.files[0].path, relativePath);
  assert.equal(first.files[0].astKinds.whileStmt, 1);
  assert.equal(first.files[0].astKinds.ifStmt, 1);
  assert.equal(first.files[0].typeRefs.Int >= 1, true);
  assert.equal(first.files[0].typeRefs["Array<Int>"], 1);
  assert.equal(first.files[0].memberCalls.count, 1);
  assert.equal(first.files[0].memberCalls.get, 1);
  assert.equal(first.files[0].memberCalls.unwrapOr, 1);
});

test("refuses an AST kind the inventory contract does not know", () => {
  assert.throws(
    () => collectAstFeatures({ kind: "futureAuthorityNode", children: [] }),
    /unknown AST kind futureAuthorityNode/,
  );
});

test("refuses traversal, duplicate paths and parse failures", () => {
  const traversal = fixture();
  writeFileSync(
    traversal.retirementPath,
    `${JSON.stringify({ unexecutedFungiPaths: ["../outside.fungi"] })}\n`,
    "utf8",
  );
  assert.throws(
    () => inventoryFungiSources(traversal),
    /non-canonical source path/,
  );

  const duplicate = fixture();
  writeFileSync(
    duplicate.retirementPath,
    `${JSON.stringify({ unexecutedFungiPaths: [duplicate.relativePath, duplicate.relativePath] })}\n`,
    "utf8",
  );
  assert.throws(
    () => inventoryFungiSources(duplicate),
    /strictly sorted unique/,
  );

  const broken = fixture();
  writeFileSync(
    join(broken.root, ...broken.relativePath.split("/")),
    "@version 1\npure flow broken( -> Int {\n",
    "utf8",
  );
  assert.throws(
    () => inventoryFungiSources(broken),
    /parser refused source/,
  );

  const escapedLedger = fixture();
  const outside = join(mkdtempSync(join(tmpdir(), "galerina-fungi-ledger-outside-")), "ledger.json");
  writeFileSync(outside, `${JSON.stringify({ unexecutedFungiPaths: [] })}\n`, "utf8");
  assert.throws(
    () => inventoryFungiSources({ root: escapedLedger.root, retirementPath: outside }),
    /retirement input escapes repository root/,
  );
});
