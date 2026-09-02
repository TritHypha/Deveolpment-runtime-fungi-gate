import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sha256Canonical,
  sha256Raw,
} from "../lib/logic-aig-source-origin/contract.mjs";
import { decodeFungiGateProject } from "../lib/logic-aig-source-origin/fungi-decoder.mjs";

const ROOT = new URL("../../", import.meta.url);
const GOVERNANCE = new URL("../../governance/", import.meta.url);

const VALID_GATE = [
  "@gate 3.0.0",
  "CIRCUIT get_customer(caller: CallerId, id: CustomerId) -> CustomerView",
  '  INTENT "Return one authorized, redacted customer view."',
  "  REQUIRES:",
  "    capability customer.read",
  "    effect database.read",
  "    budget scanned_rows=100",
  "  PARTS:",
  "    [auth :: galerina.tower.authorize@1.0.0 capability=customer.read]",
  "    [load :: app.customer.read@1.2.0]",
  "  WIRES:",
  "    IN.caller -> auth.subject",
  "    IN.id -> load.key",
  "    auth.allow -> load.authority",
  "    auth.deny -> DENY.not_authorized",
  "    auth.indeterminate -> DENY.authority_unknown",
  "    load.record -> OUT.value",
  "END",
  "",
].join("\n");

async function policy(name) {
  return JSON.parse(await readFile(new URL(name, GOVERNANCE), "utf8"));
}

function frozenBlob(locator) {
  return execFileSync("git", ["show", `HEAD:${locator}`], {
    cwd: fileURLToPath(ROOT),
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
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
  const host = record.runtimeLoadSets.find((candidate) => candidate.id === "HOST");
  const parserSourceLocators = [...new Set([
    record.sourceOriginParser.sourceEntry.locator,
    ...record.sourceOriginParser.sourceEdgeRows.flatMap((edge) => [edge.fromLocator, edge.toLocator]),
  ])].sort();
  const toolchainEntries = [
    [`${host.entry.rootLocator}/${host.entry.locator}`, await readFile(new URL(`${host.entry.rootLocator}/${host.entry.locator}`, ROOT))],
  ];
  for (const locator of parserSourceLocators) {
    const joined = `${record.sourceOriginParser.sourceEntry.rootLocator}/${locator.replace(/^src\//u, "src/")}`;
    toolchainEntries.push([joined, frozenBlob(joined)]);
  }
  toolchainEntries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
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
    toolchainBlobs: new Map(toolchainEntries),
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: structuredClone(record.nodeIdentity),
    gitIdentity: structuredClone(record.gitIdentity),
  };
}

function expectRefusal(operation, pattern = /^SOURCE_ORIGIN_(?:FUNGI|GATE)_[A-Z0-9_]+$/) {
  return assert.rejects(operation, (error) => {
    assert.match(error?.code ?? "", pattern);
    return true;
  });
}

test("FUNGI/GATE decoder compiles and evaluates only the pinned parser closure", async () => {
  const options = await fixtureOptions({
    "src/add.fungi": [
      "flow helper(a: Int) -> Int {",
      "  return a",
      "}",
      "flow add(a: Int) -> Int {",
      "  return helper(a)",
      "}",
      "",
    ].join("\n"),
    "src/customer.gate": VALID_GATE,
  });
  const result = await decodeFungiGateProject(options);
  assert.equal(result.authorizing, false);
  assert.deepEqual(result.toolchains.map((row) => [row.domain, row.operation]), [
    ["FUNGI", "parseProgram"],
    ["GATE", "parseGateV3"],
  ]);
  assert(!result.toolchains.some((row) => row.domain === "BUILD"));
  assert.deepEqual(result.actualRuntimeLoadSets.map((row) => row.id), ["HOST", "PARSER"]);
  assert.deepEqual(result.actualParserExportNames, ["lex", "parseGateV3", "parseProgram"]);
  assert(result.nodes.some((node) => node.kind === "FLOW" && node.locator.includes("!helper")));
  assert(result.nodes.some((node) => node.kind === "FLOW" && node.locator.includes("!add")));
  assert(result.nodes.some((node) => node.kind === "GATE" && node.locator.includes("!get_customer")));
  assert(result.edges.some((edge) => edge.kind === "CALLER"));
  assert.deepEqual(result.parseResults.map((row) => [row.path, row.status]), [
    ["src/add.fungi", "PARSED"],
    ["src/customer.gate", "PARSED"],
  ]);
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.nodes));
});

test("FUNGI converts parser code-unit locations to UTF-8 byte spans", async () => {
  const validPath = "src/unicode.fungi";
  const validSource = [
    "// café 😀",
    "flow helper(a: Int) -> Int {",
    "  return a",
    "}",
    "// piñata",
    "flow add(a: Int) -> Int {",
    "  return helper(a)",
    "}",
    "",
  ].join("\n");
  const brokenPath = "src/unicode-broken.fungi";
  const brokenSource = "// café 😀\nflow broken( {\n";
  const options = await fixtureOptions({
    [validPath]: validSource,
    [brokenPath]: brokenSource,
  });
  const result = await decodeFungiGateProject(options);
  const sourceBytes = Buffer.from(validSource, "utf8");
  const helperStart = sourceBytes.indexOf(Buffer.from("flow helper", "utf8"));
  const helperEnd = helperStart + Buffer.byteLength("flow", "utf8");
  const addStart = sourceBytes.indexOf(Buffer.from("flow add", "utf8"));
  const addEnd = addStart + Buffer.byteLength("flow", "utf8");
  const callStart = sourceBytes.indexOf(Buffer.from("helper(a)", "utf8"), addStart);
  const callEnd = callStart + Buffer.byteLength("helper", "utf8");
  assert(helperStart >= 0 && helperEnd > helperStart && addStart > helperEnd && addEnd > addStart && callStart > addStart);

  const helper = result.nodes.find((node) => node.kind === "FLOW" && node.locator.includes("!helper"));
  const add = result.nodes.find((node) => node.kind === "FLOW" && node.locator.includes("!add"));
  assert(helper);
  assert(add);
  const helperIdentity = result.idMapRows.find((row) => row.nodeId === helper.id)?.nativeIdentity;
  const addIdentity = result.idMapRows.find((row) => row.nodeId === add.id)?.nativeIdentity;
  assert.deepEqual(
    [helperIdentity?.startByte, helperIdentity?.endByte, addIdentity?.startByte, addIdentity?.endByte],
    [helperStart, helperEnd, addStart, addEnd],
  );

  const caller = result.edges.find((edge) => edge.kind === "CALLER" && edge.from === add.id && edge.to === helper.id);
  assert(caller);
  const sourceRow = options.sourceManifest.rows.find((row) => row.path === validPath);
  assert(sourceRow);
  const evidenceBody = {
    schema: "galerina.logic-aig-edge-evidence.v1",
    relationshipKind: "CALLER",
    sourceNodeId: add.id,
    targetNodeId: helper.id,
    evidenceLocation: {
      kind: "SOURCE_SYNTAX",
      sourceBlobOid: sourceRow.blobOid,
      sourceRawSha256: sourceRow.rawSha256,
      startByte: callStart,
      endByte: callEnd,
    },
    authorizing: false,
  };
  assert.equal(caller.digest, sha256Canonical(evidenceBody.schema, evidenceBody));

  const brokenResult = result.parseResults.find((row) => row.path === brokenPath);
  const brokenFile = result.nodes.find((node) => node.kind === "FILE" && node.locator === brokenPath);
  assert.equal(brokenResult?.status, "REFUSED");
  assert(brokenFile);
  const brokenIdentity = result.idMapRows.find((row) => row.nodeId === brokenFile.id)?.nativeIdentity;
  assert.equal(brokenIdentity?.endByte, Buffer.byteLength(brokenSource, "utf8"));
});

test("FUNGI/GATE parser diagnostics are canonical refusals with file nodes only", async () => {
  const options = await fixtureOptions({
    "src/broken.fungi": "flow broken( {\n",
    "src/broken.gate": "@gate 1.0.0\n",
  });
  const result = await decodeFungiGateProject(options);
  assert.deepEqual(result.parseResults.map((row) => row.status), ["REFUSED", "REFUSED"]);
  assert(result.parseResults[0].diagnosticCodes.every((code) => /^FUNGI-[A-Z0-9-]+$/u.test(code)));
  assert.deepEqual(result.parseResults[1].diagnosticCodes, ["GATE-PARSE-002"]);
  assert.equal(result.nodes.filter((node) => node.kind !== "FILE").length, 0);
  assert.equal(result.edges.length, 0);
});

test("FUNGI/GATE refuses parser source drift before evaluation or parser artifacts", async () => {
  const options = await fixtureOptions({ "src/clean.fungi": "flow clean() -> Int { return 1 }\n" });
  const record = options.pins.records.find((candidate) => candidate.platform === process.platform && candidate.arch === process.arch);
  assert(record);
  const parserLocator = `${record.sourceOriginParser.sourceEntry.rootLocator}/src/parser.ts`;
  const drift = { ...options, toolchainBlobs: new Map(options.toolchainBlobs) };
  drift.toolchainBlobs.set(parserLocator, Buffer.from("export const parseProgram = () => ({ injected: true });\n", "utf8"));
  let result;
  await expectRefusal(decodeFungiGateProject(drift), /^SOURCE_ORIGIN_(?:FUNGI|GATE)_TOOLCHAIN$/);
  assert.equal(result, undefined);

  let evaluations = 0;
  await expectRefusal(decodeFungiGateProject({ ...options, evaluate() { evaluations += 1; } }), /^SOURCE_ORIGIN_(?:FUNGI|GATE)_SCHEMA$/);
  assert.equal(evaluations, 0);
});
