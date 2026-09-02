import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  sha256Canonical,
  sha256Raw,
} from "../lib/logic-aig-source-origin/contract.mjs";
import {
  buildSemanticRows,
  decodeHostProject,
} from "../lib/logic-aig-source-origin/host-decoder.mjs";

const GOVERNANCE = new URL("../../governance/", import.meta.url);
const TYPESCRIPT_ENTRY = new URL("../../packages-ts/galerina-core-compiler/node_modules/typescript/lib/typescript.js", import.meta.url);

async function policy(name) {
  return JSON.parse(await readFile(new URL(name, GOVERNANCE), "utf8"));
}

function row(path, bytes) {
  return {
    path,
    mode: "100644",
    blobOid: createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`, "utf8")).update(bytes).digest("hex"),
    objectFormat: "sha1",
    byteLength: bytes.length,
    rawSha256: sha256Raw(bytes),
  };
}

async function fixtureOptions(sourceTexts) {
  const [repositoryIdentity, sourcePolicy, resolutionPolicy, parserPolicy, pins] = await Promise.all([
    policy("logic-aig-source-origin-repository-identity.json"),
    policy("logic-aig-source-origin-source-policy.json"),
    policy("logic-aig-source-origin-resolution-policy.json"),
    policy("logic-aig-source-origin-parser-policy.json"),
    policy("logic-aig-source-origin-toolchain-pins.json"),
  ]);
  const record = pins.records.find((candidate) => candidate.platform === process.platform && candidate.arch === process.arch);
  assert(record);
  const entries = Object.entries(sourceTexts)
    .map(([path, text]) => [path, Buffer.from(text, "utf8")])
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const rows = entries.map(([path, bytes], index) => row(path, bytes, index + 1));
  const sourceBody = {
    schema: "galerina.logic-aig-source-manifest.v1",
    repositoryId: `repository:${repositoryIdentity.identityDigest}`,
    expectedHead: "a".repeat(40),
    expectedTree: "b".repeat(40),
    objectFormat: "sha1",
    policyDigest: sourcePolicy.policyDigest,
    exclusionDigest: sha256Canonical("galerina.logic-aig-exclusions.v1", sourcePolicy.exclusions),
    rows,
    counts: {
      paths: rows.length,
      blobs: rows.length,
      bytes: rows.reduce((sum, item) => sum + item.byteLength, 0),
      mode100644: rows.length,
      mode100755: 0,
      exclusions: 0,
    },
    authorizing: false,
  };
  const sourceManifest = { ...sourceBody, manifestDigest: sha256Canonical(sourceBody.schema, sourceBody) };
  const resolutionBody = {
    schema: "galerina.logic-aig-resolution-inputs.v1",
    repositoryId: sourceBody.repositoryId,
    expectedHead: sourceBody.expectedHead,
    expectedTree: sourceBody.expectedTree,
    policyDigest: resolutionPolicy.policyDigest,
    rows: [],
    authorizing: false,
  };
  const resolutionInputs = { ...resolutionBody, resolutionInputsDigest: sha256Canonical(resolutionBody.schema, resolutionBody) };
  const typescriptBytes = await readFile(TYPESCRIPT_ENTRY);
  return {
    repositoryIdentity,
    sourcePolicy,
    resolutionPolicy,
    parserPolicy,
    pins,
    sourceManifest,
    sourceBlobs: new Map(entries),
    resolutionInputs,
    resolutionBlobs: new Map(),
    toolchainBlobs: new Map([[record.typescript.entryLocator, typescriptBytes]]),
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: structuredClone(record.nodeIdentity),
    gitIdentity: structuredClone(record.gitIdentity),
  };
}

function expectRefusal(operation, pattern = /^SOURCE_ORIGIN_HOST_[A-Z0-9_]+$/) {
  return assert.rejects(operation, (error) => {
    assert.match(error?.code ?? "", pattern);
    return true;
  });
}

test("semantic-row boundary refuses proxy and accessor options before caller effects", async (t) => {
  await t.test("proxy", () => {
    let effects = 0;
    const hostile = new Proxy({}, {
      get(_target, _key) {
        effects += 1;
        return undefined;
      },
    });
    assert.throws(() => buildSemanticRows(hostile));
    assert.equal(effects, 0);
  });
  await t.test("accessor", () => {
    let effects = 0;
    const hostile = {};
    for (const key of [
      "repositoryId", "parserId", "sourceRows", "parseResults",
      "declarations", "relations", "parserPolicy", "resolutionPolicy",
    ]) {
      Object.defineProperty(hostile, key, {
        enumerable: true,
        get() {
          effects += 1;
          return undefined;
        },
      });
    }
    assert.throws(() => buildSemanticRows(hostile));
    assert.equal(effects, 0);
  });
});

test("HOST decoder loads only pinned lib/typescript.js and emits stable file/declaration semantics", async () => {
  const options = await fixtureOptions({
    "src/contracts.ts": [
      'import fs from "node:fs";',
      "export interface Contract { value: string }",
      "export function useContract(value: Contract): string { return value.value }",
    ].join("\n"),
  });
  const result = await decodeHostProject(options);
  assert.equal(result.authorizing, false);
  assert.equal(result.toolchain.domain, "HOST");
  assert.equal(result.toolchain.operation, "typescript-compiler-api");
  assert.deepEqual(result.toolchain.entry, {
    rootLocator: "packages-ts/galerina-core-compiler/node_modules/typescript",
    locator: "lib/typescript.js",
  });
  assert.deepEqual(result.actualRuntimeLoadSet, {
    id: "HOST",
    moduleRows: options.pins.records.find((row) => row.recordId === result.toolchain.recordId).runtimeLoadSets[0].moduleRows,
    builtinModules: options.pins.records.find((row) => row.recordId === result.toolchain.recordId).runtimeLoadSets[0].builtinModules,
  });
  assert(result.nodes.some((node) => node.kind === "FILE" && node.locator === "src/contracts.ts"));
  assert(result.nodes.some((node) => node.kind === "INTERFACE" && node.locator.includes("#INTERFACE!N!Contract")));
  assert(result.nodes.some((node) => node.kind === "FUNCTION" && node.locator.includes("#FUNCTION!N!useContract")));
  assert(result.unresolved.some((item) => item.relationshipClass === "IMPORT" && item.reasonCode === "TARGET_OUTSIDE_SOURCE_DOMAIN"));
  assert.match(result.idMapDigest, /^[0-9a-f]{64}$/);
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.nodes));
});

test("HOST checker does not join unrelated property-name has calls", async () => {
  const options = await fixtureOptions({
    "src/has.ts": [
      "const ENVIRONMENT_MODE_SET = new Set<string>();",
      "class GateCache { has(value: string): boolean { return value.length > 0; } }",
      'ENVIRONMENT_MODE_SET.has("production");',
      'new GateCache().has("gate");',
    ].join("\n"),
  });
  const result = await decodeHostProject(options);
  const method = result.nodes.find((node) => node.kind === "METHOD" && node.locator.includes("!has"));
  assert(method);
  const callerEdges = result.edges.filter((edge) => edge.kind === "CALLER" && edge.to === method.id);
  assert.equal(callerEdges.length, 1);
  assert(result.unresolved.some((item) => item.relationshipClass === "CALLER"));
});

test("HOST conserves NewExpression constructor calls as checker-backed relations", async () => {
  const options = await fixtureOptions({
    "src/constructor.ts": [
      "export class Widget {}",
      "export function makeWidget(): Widget {",
      "  return new Widget();",
      "}",
      "",
    ].join("\n"),
  });
  const result = await decodeHostProject(options);
  const widget = result.nodes.find((node) => node.kind === "CLASS" && node.locator.includes("!Widget"));
  const maker = result.nodes.find((node) => node.kind === "FUNCTION" && node.locator.includes("!makeWidget"));
  assert(widget);
  assert(maker);
  const constructorEdges = result.edges.filter((edge) => edge.kind === "CALLER" && edge.from === maker.id && edge.to === widget.id);
  assert.equal(constructorEdges.length, 1);
  assert.equal(
    result.edges.filter((edge) => edge.kind === "CALLER").length
      + result.unresolved.filter((row) => row.relationshipClass === "CALLER").length,
    1,
  );
});

test("HOST locator framing conserves case-distinct declarations under the global fold rule", async () => {
  const options = await fixtureOptions({
    "src/case-bindings.mjs": [
      "export function P() { return 1; }",
      "export function p() { return 2; }",
      "P();",
      "p();",
      "",
    ].join("\n"),
  });
  const result = await decodeHostProject(options);
  const bindings = result.nodes.filter((node) => node.kind === "FUNCTION" && /!N![Pp]!C![01]$/u.test(node.locator));
  assert.equal(bindings.length, 2);
  assert.equal(new Set(bindings.map((node) => node.locator.toLowerCase())).size, 2);
});

test("HOST retains addressable declarations while conserving relations from local implementation bindings", async () => {
  const options = await fixtureOptions({
    "src/addressable.mjs": [
      "export function retained() {",
      "  const local = () => retained();",
      "  return local();",
      "}",
      "",
    ].join("\n"),
  });
  const result = await decodeHostProject(options);
  assert.equal(result.nodes.filter((node) => node.kind === "FUNCTION").length, 1);
  assert.equal(result.nodes.filter((node) => node.kind === "SYMBOL").length, 0);
  assert.equal(result.edges.length + result.unresolved.length, 2);
  assert(result.edges.some((edge) => edge.kind === "CALLER"));
  assert(result.unresolved.some((row) => row.relationshipClass === "CALLER"));
});

test("HOST diagnostics use the policy-owned canonical TypeScript mapping", async () => {
  const options = await fixtureOptions({ "src/broken.ts": "const = ;\n" });
  const result = await decodeHostProject(options);
  assert.equal(result.parseResults.length, 1);
  assert.equal(result.parseResults[0].status, "REFUSED");
  assert(result.parseResults[0].diagnosticCodes.length > 0);
  for (const code of result.parseResults[0].diagnosticCodes) assert.match(code, /^TS-[0-9]{3,5}$/);
  assert.equal(result.nodes.filter((node) => node.kind !== "FILE").length, 0);
});

test("HOST refuses source or runtime byte drift before returning semantic or toolchain artifacts", async () => {
  const options = await fixtureOptions({ "src/clean.ts": "export const clean = true;\n" });
  const sourceDrift = { ...options, sourceBlobs: new Map(options.sourceBlobs) };
  sourceDrift.sourceBlobs.set("src/clean.ts", Buffer.from("drift", "utf8"));
  await expectRefusal(decodeHostProject(sourceDrift), /^SOURCE_ORIGIN_GIT_BLOB_SET$/);

  const runtimeDrift = { ...options, toolchainBlobs: new Map(options.toolchainBlobs) };
  runtimeDrift.toolchainBlobs.set(options.pins.records.find((row) => row.platform === process.platform).typescript.entryLocator, Buffer.from("module.exports = {};", "utf8"));
  let result;
  await expectRefusal(decodeHostProject(runtimeDrift), /^SOURCE_ORIGIN_HOST_TOOLCHAIN$/);
  assert.equal(result, undefined);

  let evaluations = 0;
  await expectRefusal(decodeHostProject({ ...options, evaluate() { evaluations += 1; } }), /^SOURCE_ORIGIN_HOST_SCHEMA$/);
  assert.equal(evaluations, 0);
});
