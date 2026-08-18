import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("VOK alone owns detached-scalar lease entry, consumption and terminal receipt", () => {
  const v3 = source("../../../../SLIDE/src/typed-package-execution-receipt-v3.mjs");
  const boundary = source("../../../../SLIDE/src/vok-component-boundary.mjs");
  assert.match(v3, /createVokComponentBoundary/u);
  assert.match(v3, /VOK_BOUNDARY\.enter/u);
  assert.match(v3, /VOK_BOUNDARY\.consume/u);
  assert.match(boundary, /enterVokSink/u);
  assert.match(boundary, /consumeVokLease/u);
  for (const forbidden of ["tower-citizen", "tri-pipe", "tri-fuse", "hypha", "renderWAT", "WebAssembly"] ) {
    assert.equal(v3.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }
});

test("Tower and Tri-Pipe remain compute planners and cannot mint or consume VOK authority", () => {
  const tower = source("../../galerina-tower-citizen/src/tower-runtime.ts");
  const triPipe = source("../../galerina-tri-pipe/src/tri-pipe.ts");
  assert.match(tower, /class TowerRuntime/u);
  assert.match(triPipe, /createTriPipeEngine/u);
  assert.match(triPipe, /createHybridEngine/u);
  for (const text of [tower, triPipe]) {
    for (const forbidden of [
      "typed-package-execution-receipt-v3",
      "createVokComponentBoundary",
      "enterVokSink",
      "consumeLease",
      "vokLeaseDigest",
    ]) {
      assert.equal(text.includes(forbidden), false, forbidden);
    }
  }
});

test("Tri-Fuse WAT evidence is retained as historical coverage but is absent from the detached path", () => {
  const triFuseA = source("wat-tri-fuse-a-elision.test.mjs");
  const triFuseB = source("wat-tri-fuse-b-deny-sentinel.test.mjs");
  const handoff = source("../src/detached-scalar-handoff.ts");
  const scalarCompiler = source("../../../../SLIDE/src/checked-module-snapshot-scalar-compiler.mjs");
  const v3 = source("../../../../SLIDE/src/typed-package-execution-receipt-v3.mjs");
  assert.match(triFuseA, /compileWAT/u);
  assert.match(triFuseB, /compileWAT/u);
  for (const text of [handoff, scalarCompiler, v3]) {
    for (const forbidden of ["renderWAT", "assembleWAT", "WebAssembly", "hypha"] ) {
      assert.equal(text.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
    }
  }
});

test("the scalar chain carries bytes and receipts, never bodies in graph or index APIs", () => {
  const modules = [
    source("../src/runtime-checked-snapshot.ts"),
    source("../src/detached-scalar-handoff.ts"),
    source("../../../../SLIDE/src/galerina-artifact-reference.mjs"),
    source("../../../../SLIDE/src/checked-module-snapshot-scalar-compiler.mjs"),
    source("../../../../SLIDE/src/typed-package-execution-receipt-v3.mjs"),
    source("../../../../lyth-weaver/tools/adapter/adapter.ts"),
  ];
  for (const text of modules) {
    for (const forbidden of ["index_repository", "search_graph", "trace_path", "semanticGraph"] ) {
      assert.equal(text.includes(forbidden), false, forbidden);
    }
  }
});
