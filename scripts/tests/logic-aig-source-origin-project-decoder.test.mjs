import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
  validateParseOutcomesReceipt,
  validateToolchainManifest,
} from "../lib/logic-aig-source-origin/contract.mjs";
import { decodeSourceProject } from "../lib/logic-aig-source-origin/decode-project.mjs";

const ROOT = new URL("../../", import.meta.url);
const GOVERNANCE = new URL("../../governance/", import.meta.url);
const SNAPSHOT_MAP = Map;
const SNAPSHOT_MAP_SET = Map.prototype.set;
const SNAPSHOT_REFLECT_APPLY = Reflect.apply;
const OWNER_LOCATORS = Object.freeze({
  expectedOutcomes: "governance/logic-aig-source-origin-expected-parse-outcomes.json",
  exporter: "governance/logic-aig-source-origin-exporter-policy.json",
  gate: "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json",
  generated: "governance/logic-aig-source-origin-generated-consumers.json",
  parser: "governance/logic-aig-source-origin-parser-policy.json",
  pins: "governance/logic-aig-source-origin-toolchain-pins.json",
  proposedBaseline: "governance/example-proposed-baseline.json",
  repositoryIdentity: "governance/logic-aig-source-origin-repository-identity.json",
  resolution: "governance/logic-aig-source-origin-resolution-policy.json",
  source: "governance/logic-aig-source-origin-source-policy.json",
});

const VALID_GATE = [
  "@gate 3.0.0",
  "CIRCUIT identity(value: Int) -> Int",
  '  INTENT "Return a value."',
  "  REQUIRES:",
  "  PARTS:",
  "    [copy :: app.identity@1.0.0]",
  "  WIRES:",
  "    IN.value -> copy.value",
  "    copy.value -> OUT.value",
  "END",
  "",
].join("\n");

function mutableBlobSnapshot(capability) {
  const snapshot = new SNAPSHOT_MAP();
  const iterator = capability.entries();
  while (true) {
    const step = iterator.next();
    if (step.done) return snapshot;
    const pair = step.value;
    SNAPSHOT_REFLECT_APPLY(SNAPSHOT_MAP_SET, snapshot, [pair[0], pair[1]]);
  }
}

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

function gitBlobOid(bytes, objectFormat = "sha1") {
  return createHash(objectFormat)
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

function manifestRow(path, bytes) {
  return {
    path,
    mode: "100644",
    blobOid: gitBlobOid(bytes),
    objectFormat: "sha1",
    byteLength: bytes.length,
    rawSha256: sha256Raw(bytes),
  };
}

function sourceManifestFor(entries, repositoryIdentity, sourcePolicy) {
  const rows = entries.map(([path, bytes]) => manifestRow(path, bytes));
  const body = {
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
      bytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
      mode100644: rows.length,
      mode100755: 0,
      exclusions: 0,
    },
    authorizing: false,
  };
  return { ...body, manifestDigest: sha256Canonical(body.schema, body) };
}

function resolutionInputsFor(entries, sourceManifest, resolutionPolicy) {
  const rows = entries.map(([path, bytes]) => manifestRow(path, bytes));
  const body = {
    schema: "galerina.logic-aig-resolution-inputs.v1",
    repositoryId: sourceManifest.repositoryId,
    expectedHead: sourceManifest.expectedHead,
    expectedTree: sourceManifest.expectedTree,
    policyDigest: resolutionPolicy.policyDigest,
    rows,
    authorizing: false,
  };
  return { ...body, resolutionInputsDigest: sha256Canonical(body.schema, body) };
}

function withDigest(value, field) {
  const body = { ...value };
  delete body[field];
  return { ...body, [field]: sha256Canonical(body.schema, body) };
}

function rawOwnerBytes(name, value) {
  const text = name === "gate" ? JSON.stringify(value, null, 2) : canonicalJsonText(value);
  return Buffer.from(name === "gate" ? `${text}\n` : text, "utf8");
}

function semanticDigest(name, value) {
  if (name === "expectedOutcomes") return value.expectedOutcomesDigest;
  if (name === "repositoryIdentity") return value.identityDigest;
  if (name === "pins") return value.pinsDigest;
  if (name === "gate") return sha256Canonical("galerina.logic-aig-gate-v3-reference-verdicts.v1", value);
  return value.policyDigest;
}

function buildOwnerSnapshot(values) {
  const entries = Object.entries(OWNER_LOCATORS).sort(([, left], [, right]) => left < right ? -1 : left > right ? 1 : 0);
  const identities = entries.map(([name, locator]) => {
    const bytes = rawOwnerBytes(name, values[name]);
    return {
      locator,
      blobOid: gitBlobOid(bytes),
      byteLength: bytes.length,
      rawSha256: sha256Raw(bytes),
      semanticDigest: semanticDigest(name, values[name]),
    };
  });
  return {
    owners: {
      values,
      identities,
      ownerSetDigest: sha256Canonical("galerina.logic-aig-frozen-owner-set.v1", identities),
      authorizing: false,
    },
    ownerBlobs: new Map(entries.map(([name, locator]) => [locator, rawOwnerBytes(name, values[name])])),
  };
}

async function fixtureOptions() {
  const [repositoryIdentity, sourcePolicy, resolutionPolicy, parserPolicy, pins, generated, exporterTemplate] = await Promise.all([
    policy("logic-aig-source-origin-repository-identity.json"),
    policy("logic-aig-source-origin-source-policy.json"),
    policy("logic-aig-source-origin-resolution-policy.json"),
    policy("logic-aig-source-origin-parser-policy.json"),
    policy("logic-aig-source-origin-toolchain-pins.json"),
    policy("logic-aig-source-origin-generated-consumers.json"),
    policy("logic-aig-source-origin-exporter-policy.json"),
  ]);
  const proposedBaseline = withDigest({
    schema: "galerina.example-proposed-baseline.v1",
    entries: [{ directoryName: "Proposed-Example", reason: "Syntax is intentionally held as a proposal." }],
    authorizing: false,
  }, "policyDigest");
  const expectedOutcomes = withDigest({
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parserPolicy.policyDigest,
    rows: [
      {
        path: "src/negative.fungi",
        domain: "FUNGI",
        parserId: "galerina-fungi-parser",
        disposition: "EXPECTED_REFUSAL",
        diagnosticCodes: ["FUNGI-PARSE-001"],
        ownerKind: "INLINE_EXPECTATION",
        ownerLocator: "src/negative.fungi",
        ownerKey: "expected_diagnostics",
      },
      {
        path: "src/Proposed-Example/opaque.fungi",
        domain: "FUNGI",
        parserId: "galerina-fungi-parser",
        disposition: "OPAQUE_PROPOSED",
        diagnosticCodes: null,
        ownerKind: "PROPOSED_BASELINE",
        ownerLocator: "governance/example-proposed-baseline.json",
        ownerKey: "Proposed-Example",
      },
    ].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
    authorizing: false,
  }, "expectedOutcomesDigest");
  const exporterBody = {
    ...exporterTemplate,
    expectedOutcomesDigest: expectedOutcomes.expectedOutcomesDigest,
    proposedBaselineDigest: proposedBaseline.policyDigest,
  };
  delete exporterBody.policyDigest;
  const exporter = { ...exporterBody, policyDigest: sha256Canonical(exporterBody.schema, exporterBody) };
  const values = {
    expectedOutcomes,
    exporter,
    gate: { "src/identity.gate": { ok: true, codes: [] } },
    generated,
    parser: parserPolicy,
    pins,
    proposedBaseline,
    repositoryIdentity,
    resolution: resolutionPolicy,
    source: sourcePolicy,
  };
  const frozenOwners = buildOwnerSnapshot(values);
  const sourceEntries = Object.entries({
    "src/clean.ts": "export function clean(value: number): number { return value; }\n",
    "src/calls.fungi": [
      "flow helper(a: Int) -> Int { return a }",
      "flow caller(a: Int) -> Int { return helper(a) }",
      "",
    ].join("\n"),
    "src/none.fungi": "/// expected_diagnostics: none\nflow none_expected(a: Int) -> Int { return a }\n",
    "src/identity.gate": VALID_GATE,
    "src/negative.fungi": "/// expected_diagnostics: FUNGI-PARSE-001\nflow broken( {\n",
    "src/Proposed-Example/opaque.fungi": "/// expected_diagnostics: none (when adopted)\nthis proposal is deliberately opaque\n",
  }).map(([path, text]) => [path, Buffer.from(text, "utf8")])
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const sourceManifest = sourceManifestFor(sourceEntries, repositoryIdentity, sourcePolicy);
  const proposedBytes = rawOwnerBytes("proposedBaseline", proposedBaseline);
  const resolutionEntries = [["governance/example-proposed-baseline.json", proposedBytes]];
  const resolutionInputs = resolutionInputsFor(resolutionEntries, sourceManifest, resolutionPolicy);
  const record = pins.records.find((candidate) => candidate.platform === process.platform && candidate.arch === process.arch);
  assert(record);
  const host = record.runtimeLoadSets.find((candidate) => candidate.id === "HOST");
  const parserSourceLocators = [...new Set([
    record.sourceOriginParser.sourceEntry.locator,
    ...record.sourceOriginParser.sourceEdgeRows.flatMap((edge) => [edge.fromLocator, edge.toLocator]),
  ])].sort();
  const toolchainEntries = [[
    `${host.entry.rootLocator}/${host.entry.locator}`,
    await readFile(new URL(`${host.entry.rootLocator}/${host.entry.locator}`, ROOT)),
  ]];
  for (const locator of parserSourceLocators) {
    const joined = `${record.sourceOriginParser.sourceEntry.rootLocator}/${locator}`;
    toolchainEntries.push([joined, frozenBlob(joined)]);
  }
  toolchainEntries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return {
    ...frozenOwners,
    sourceManifest,
    sourceBlobs: new Map(sourceEntries),
    resolutionInputs,
    resolutionBlobs: new Map(resolutionEntries),
    toolchainBlobs: new Map(toolchainEntries),
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: structuredClone(record.nodeIdentity),
    gitIdentity: structuredClone(record.gitIdentity),
  };
}

function expectRefusal(operation, pattern = /^SOURCE_ORIGIN_PROJECT_[A-Z0-9_]+$/) {
  return assert.rejects(operation, (error) => {
    assert.match(error?.code ?? "", pattern);
    return true;
  });
}

test("eighth-review project boundary preserves owner OID authority under post-import poisoning", async (t) => {
  const safeGetDescriptor = Object.getOwnPropertyDescriptor;
  const safeDefineProperty = Object.defineProperty;
  const safeReflectApply = Reflect.apply;
  const options = await fixtureOptions();
  const forgedOwners = structuredClone(options.owners);
  const forgedIdentity = forgedOwners.identities.find(
    (row) => row.locator === OWNER_LOCATORS.expectedOutcomes,
  );
  assert(forgedIdentity);
  const honestOid = forgedIdentity.blobOid;
  const forgedOid = "0".repeat(honestOid.length);
  forgedIdentity.blobOid = forgedOid;
  forgedOwners.ownerSetDigest = sha256Canonical(
    "galerina.logic-aig-frozen-owner-set.v1",
    forgedOwners.identities,
  );
  const candidate = { ...options, owners: forgedOwners };

  await t.test("the unpoisoned control refuses the forged owner at the owner boundary", async () => {
    let result;
    let failure;
    try { result = await decodeSourceProject(candidate); } catch (error) { failure = error; }
    assert.equal(result, undefined);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_OWNER");
  });

  await t.test("a synced createHash replacement cannot advance the forged owner", async () => {
    const { createRequire, syncBuiltinESMExports } = await import("node:module");
    const require = createRequire(import.meta.url);
    const crypto = require("node:crypto");
    const descriptor = safeGetDescriptor(crypto, "createHash");
    const safeCreateHash = descriptor.value;
    let effects = 0;
    let firstSha1 = true;
    let result;
    let failure;
    safeDefineProperty(crypto, "createHash", {
      ...descriptor,
      value(algorithm, createOptions) {
        effects += 1;
        const hash = createOptions === undefined
          ? safeReflectApply(safeCreateHash, crypto, [algorithm])
          : safeReflectApply(safeCreateHash, crypto, [algorithm, createOptions]);
        if (algorithm === "sha1" && firstSha1) {
          firstSha1 = false;
          safeDefineProperty(hash, "digest", {
            configurable: true,
            enumerable: false,
            value() { return forgedOid; },
            writable: true,
          });
        }
        return hash;
      },
    });
    syncBuiltinESMExports();
    try { result = await decodeSourceProject(candidate); } catch (error) { failure = error; }
    finally {
      safeDefineProperty(crypto, "createHash", descriptor);
      syncBuiltinESMExports();
    }
    assert.equal(result, undefined);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_OWNER");
    assert.equal(effects, 0);
  });

  await t.test("Buffer.from cannot execute beneath the forged owner check", async () => {
    const descriptor = safeGetDescriptor(Buffer, "from");
    let effects = 0;
    let result;
    let failure;
    safeDefineProperty(Buffer, "from", {
      ...descriptor,
      value() {
        effects += 1;
        throw new Error("ATTACKER_BUFFER_FROM");
      },
    });
    try { result = await decodeSourceProject(candidate); } catch (error) { failure = error; }
    finally { safeDefineProperty(Buffer, "from", descriptor); }
    assert.equal(effects, 0);
    assert.equal(result, undefined);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_OWNER");
  });

  await t.test("decodeSourceProject snapshots Object.getPrototypeOf", async () => {
    const descriptor = safeGetDescriptor(Object, "getPrototypeOf");
    let effects = 0;
    let failure;
    safeDefineProperty(Object, "getPrototypeOf", {
      ...descriptor,
      value() {
        effects += 1;
        throw new Error("ATTACKER_OBJECT_GETPROTO");
      },
    });
    try { await decodeSourceProject({}); } catch (error) { failure = error; }
    finally { safeDefineProperty(Object, "getPrototypeOf", descriptor); }
    assert.equal(effects, 0);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_SCHEMA");
  });

  await t.test("a synced isProxy replacement cannot expose a project option Proxy", async () => {
    const { createRequire, syncBuiltinESMExports } = await import("node:module");
    const require = createRequire(import.meta.url);
    const types = require("node:util/types");
    const descriptor = safeGetDescriptor(types, "isProxy");
    let effects = 0;
    let proxyTraps = 0;
    let failure;
    const hostile = new Proxy({}, {
      getPrototypeOf() {
        proxyTraps += 1;
        throw new Error("ATTACKER_PROXY_GETPROTO");
      },
    });
    safeDefineProperty(types, "isProxy", {
      ...descriptor,
      value() {
        effects += 1;
        return false;
      },
    });
    syncBuiltinESMExports();
    try { await decodeSourceProject(hostile); } catch (error) { failure = error; }
    finally {
      safeDefineProperty(types, "isProxy", descriptor);
      syncBuiltinESMExports();
    }
    assert.equal(effects, 0);
    assert.equal(proxyTraps, 0);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_SCHEMA");
  });
});

test("ninth-review descriptor gates require own data values in PROJECT inputs", { timeout: 30_000 }, async () => {
  const options = await fixtureOptions();
  let inputEffects = 0;
  Object.defineProperty(options, "owners", {
    configurable: true,
    enumerable: true,
    get() {
      inputEffects += 1;
      throw new Error("ATTACKER_INPUT_VALUE");
    },
  });
  const safeGetDescriptor = Object.getOwnPropertyDescriptor;
  const safeDefineProperty = Object.defineProperty;
  const inherited = safeGetDescriptor(Object.prototype, "value");
  let descriptorEffects = 0;
  let failure;
  safeDefineProperty(Object.prototype, "value", {
    configurable: true,
    get() {
      descriptorEffects += 1;
      throw new Error("ATTACKER_DESCRIPTOR_VALUE");
    },
  });
  try { await decodeSourceProject(options); } catch (error) { failure = error; }
  finally {
    if (inherited) safeDefineProperty(Object.prototype, "value", inherited);
    else delete Object.prototype.value;
  }
  assert.equal(inputEffects, 0);
  assert.equal(descriptorEffects, 0);
  assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_SCHEMA");
});

test("ninth-review PROJECT parsing avoids ambient numeric prototype lookup", { timeout: 120_000 }, async (t) => {
  await t.test("raw owner string parsing does not consult String.prototype", async () => {
    const options = await fixtureOptions();
    const hostileText = '{"src/identity.gate"\n';
    const hostileBytes = Buffer.from(hostileText, "utf8");
    const owners = structuredClone(options.owners);
    const identity = owners.identities.find((row) => row.locator === OWNER_LOCATORS.gate);
    identity.blobOid = gitBlobOid(hostileBytes);
    identity.byteLength = hostileBytes.length;
    identity.rawSha256 = sha256Raw(hostileBytes);
    owners.ownerSetDigest = sha256Canonical("galerina.logic-aig-frozen-owner-set.v1", owners.identities);
    const ownerBlobs = mutableBlobSnapshot(options.ownerBlobs);
    ownerBlobs.set(OWNER_LOCATORS.gate, hostileBytes);
    const safeGetDescriptor = Object.getOwnPropertyDescriptor;
    const safeDefineProperty = Object.defineProperty;
    const safeDeleteProperty = Reflect.deleteProperty;
    const indexKey = String(hostileText.length);
    const inherited = safeGetDescriptor(String.prototype, indexKey);
    let effects = 0;
    let failure;
    safeDefineProperty(String.prototype, indexKey, {
      configurable: true,
      get() {
        effects += 1;
        throw new Error("ATTACKER_STRING_INDEX");
      },
    });
    try { await decodeSourceProject({ ...options, owners, ownerBlobs }); } catch (error) { failure = error; }
    finally {
      if (inherited) safeDefineProperty(String.prototype, indexKey, inherited);
      else safeDeleteProperty(String.prototype, indexKey);
    }
    assert.equal(effects, 0);
    assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_OWNER");
  });

  await t.test("empty diagnostic matches do not consult Array.prototype", async () => {
    const options = await fixtureOptions();
    const injectedMatch = Object.freeze([undefined, "FUNGI-PARSE-001"]);
    const safeGetDescriptor = Object.getOwnPropertyDescriptor;
    const safeDefineProperty = Object.defineProperty;
    const safeDeleteProperty = Reflect.deleteProperty;
    const inherited = safeGetDescriptor(Array.prototype, "0");
    let effects = 0;
    let failure;
    let result;
    safeDefineProperty(Array.prototype, "0", {
      configurable: true,
      get() {
        effects += 1;
        return injectedMatch;
      },
      set(value) {
        safeDefineProperty(this, "0", {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
      },
    });
    try { result = await decodeSourceProject(options); } catch (error) { failure = error; }
    finally {
      if (inherited) safeDefineProperty(Array.prototype, "0", inherited);
      else safeDeleteProperty(Array.prototype, "0");
    }
    assert.equal(effects, 0);
    assert.equal(failure, undefined);
    assert.equal(result?.authorizing, false);
  });
});

test("eleventh-review missing Gate verdict ignores inherited properties", { timeout: 30_000 }, async (t) => {
  const options = { ...await fixtureOptions(), toolchainBlobs: new Map() };
  const property = "identity.gate";
  const safeGetDescriptor = Object.getOwnPropertyDescriptor;
  const safeDefineProperty = Object.defineProperty;
  const safeDeleteProperty = Reflect.deleteProperty;
  const prior = safeGetDescriptor(Object.prototype, property);
  if (prior) safeDeleteProperty(Object.prototype, property);
  assert.deepEqual(options.owners.values.gate["src/identity.gate"], { ok: true, codes: [] });
  assert.equal(Object.hasOwn(options.owners.values.gate, property), false);

  const captureFailure = async () => {
    let result;
    let failure;
    try { result = await decodeSourceProject(options); } catch (error) { failure = error; }
    return { failure, result };
  };

  try {
    await t.test("unpoisoned control reaches the next closed boundary", async () => {
      const { failure, result } = await captureFailure();
      assert.equal(result, undefined);
      assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_TOOLCHAIN");
    });

    await t.test("throwing getter has zero effects", async () => {
      let effects = 0;
      safeDefineProperty(Object.prototype, property, {
        configurable: true,
        get() {
          effects += 1;
          throw new Error("ATTACKER_GATE_VERDICT_GETTER");
        },
      });
      const { failure, result } = await captureFailure();
      safeDeleteProperty(Object.prototype, property);
      assert.equal(effects, 0);
      assert.equal(result, undefined);
      assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_TOOLCHAIN");
    });

    await t.test("data value cannot inject a verdict", async () => {
      safeDefineProperty(Object.prototype, property, {
        configurable: true,
        enumerable: true,
        value: Object.freeze({ ok: false, codes: Object.freeze(["FUNGI-PARSE-001"]) }),
        writable: true,
      });
      const { failure, result } = await captureFailure();
      safeDeleteProperty(Object.prototype, property);
      assert.equal(result, undefined);
      assert.equal(failure?.code, "SOURCE_ORIGIN_PROJECT_TOOLCHAIN");
    });
  } finally {
    safeDeleteProperty(Object.prototype, property);
    if (prior) safeDefineProperty(Object.prototype, property, prior);
  }
});

test("project decoder conserves every source and emits a closed owner-backed outcome receipt", async () => {
  const options = await fixtureOptions();
  const result = await decodeSourceProject(options);
  assert.equal(result.authorizing, false);
  assert.equal(result.nodes.filter((node) => node.kind === "FILE").length, options.sourceManifest.rows.length);
  for (const source of options.sourceManifest.rows) {
    assert.equal(result.nodes.filter((node) => node.kind === "FILE" && node.locator === source.path).length, 1);
  }
  assert(result.edges.some((edge) => edge.kind === "CALLER"));
  assert.deepEqual(result.parseResults.map((row) => row.path), ["src/calls.fungi", "src/clean.ts", "src/identity.gate", "src/none.fungi"]);
  assert.equal(result.parseOutcomesReceipt.rows.length, 2);
  assert.deepEqual(result.parseOutcomesReceipt.rows.map((row) => row.actualStatus), ["OPAQUE_AS_PROPOSED", "REFUSED_AS_EXPECTED"]);
  for (const outcome of result.parseOutcomesReceipt.rows) {
    const rows = result.unresolved.filter((row) => row.sourceNodeId === outcome.representedFileNodeId);
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map((row) => row.relationshipClass).sort(), ["CALLER", "CONTRACT", "GENERATED_CONSUMER", "IMPORT", "TEST"]);
    assert.equal(outcome.unresolvedRowsDigest, sha256Canonical("galerina.logic-aig-outcome-unresolved-rows.v1", rows));
    assert(!result.edges.some((edge) => edge.kind === "TEST" && edge.from === outcome.representedFileNodeId));
    assert(!result.nodes.some((node) => node.kind !== "FILE" && node.locator.startsWith(`${outcome.path}#`)));
  }
  validateToolchainManifest(result.toolchainManifest, { pins: options.owners.values.pins });
  validateParseOutcomesReceipt(result.parseOutcomesReceipt, {
    repositoryIdentity: options.owners.values.repositoryIdentity,
    sourcePolicy: options.owners.values.source,
    resolutionPolicy: options.owners.values.resolution,
    parserPolicy: options.owners.values.parser,
    pins: options.owners.values.pins,
    proposedBaseline: options.owners.values.proposedBaseline,
    expectedOutcomes: options.owners.values.expectedOutcomes,
    sourceManifest: options.sourceManifest,
    resolutionInputs: options.resolutionInputs,
    toolchainManifest: result.toolchainManifest,
  });
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.parseOutcomesReceipt));
});

test("project decoder refuses owner-byte drift and unexplained authority before semantic evaluation", async () => {
  const options = await fixtureOptions();
  const ownerDrift = { ...options, ownerBlobs: mutableBlobSnapshot(options.ownerBlobs) };
  ownerDrift.ownerBlobs.set(OWNER_LOCATORS.expectedOutcomes, Buffer.from("{}", "utf8"));
  let result;
  await expectRefusal(decodeSourceProject(ownerDrift));
  assert.equal(result, undefined);

  const ownerOidDrift = structuredClone(options.owners);
  ownerOidDrift.identities[0].blobOid = "f".repeat(40);
  ownerOidDrift.ownerSetDigest = sha256Canonical("galerina.logic-aig-frozen-owner-set.v1", ownerOidDrift.identities);
  await expectRefusal(decodeSourceProject({ ...options, owners: ownerOidDrift }));

  const ownerObjectFormatDrift = structuredClone(options.owners);
  const substitutedIdentity = ownerObjectFormatDrift.identities[0];
  substitutedIdentity.blobOid = gitBlobOid(
    options.ownerBlobs.get(substitutedIdentity.locator),
    "sha256",
  );
  ownerObjectFormatDrift.ownerSetDigest = sha256Canonical(
    "galerina.logic-aig-frozen-owner-set.v1",
    ownerObjectFormatDrift.identities,
  );
  await expectRefusal(
    decodeSourceProject({ ...options, owners: ownerObjectFormatDrift }),
    /^SOURCE_ORIGIN_PROJECT_OWNER$/,
  );

  const duplicateGateBytes = Buffer.from([
    "{",
    '  "src/identity.gate": { "ok": false, "codes": ["GATE-PARSE-001"] },',
    '  "src/identity.gate": { "ok": true, "codes": [] }',
    "}",
    "",
  ].join("\n"), "utf8");
  const duplicateGateOwners = structuredClone(options.owners);
  const duplicateGateIdentity = duplicateGateOwners.identities.find((row) => row.locator === OWNER_LOCATORS.gate);
  duplicateGateIdentity.blobOid = gitBlobOid(duplicateGateBytes);
  duplicateGateIdentity.byteLength = duplicateGateBytes.length;
  duplicateGateIdentity.rawSha256 = sha256Raw(duplicateGateBytes);
  duplicateGateOwners.ownerSetDigest = sha256Canonical("galerina.logic-aig-frozen-owner-set.v1", duplicateGateOwners.identities);
  const duplicateGateBlobs = mutableBlobSnapshot(options.ownerBlobs);
  duplicateGateBlobs.set(OWNER_LOCATORS.gate, duplicateGateBytes);
  await expectRefusal(decodeSourceProject({ ...options, owners: duplicateGateOwners, ownerBlobs: duplicateGateBlobs }));

  const missingAuthorityValues = structuredClone(options.owners.values);
  missingAuthorityValues.expectedOutcomes = withDigest({
    ...missingAuthorityValues.expectedOutcomes,
    rows: missingAuthorityValues.expectedOutcomes.rows.filter((row) => row.path !== "src/negative.fungi"),
  }, "expectedOutcomesDigest");
  const exporterBody = {
    ...missingAuthorityValues.exporter,
    expectedOutcomesDigest: missingAuthorityValues.expectedOutcomes.expectedOutcomesDigest,
  };
  delete exporterBody.policyDigest;
  missingAuthorityValues.exporter = { ...exporterBody, policyDigest: sha256Canonical(exporterBody.schema, exporterBody) };
  const rebuilt = buildOwnerSnapshot(missingAuthorityValues);
  await expectRefusal(decodeSourceProject({ ...options, ...rebuilt }));

  let evaluations = 0;
  await expectRefusal(decodeSourceProject({ ...options, evaluate() { evaluations += 1; } }));
  assert.equal(evaluations, 0);
});

test("project owner boundary rejects a proxied Gate map before caller traps", async () => {
  const options = await fixtureOptions();
  const owners = structuredClone(options.owners);
  let effects = 0;
  owners.values.gate = new Proxy({}, {
    ownKeys() {
      effects += 1;
      return [];
    },
  });
  await expectRefusal(
    decodeSourceProject({ ...options, owners }),
    /^SOURCE_ORIGIN_PROJECT_OWNER$/,
  );
  assert.equal(effects, 0);
});

test("project decoder refuses source drift without emitting receipt, manifest, or parser artifacts", async () => {
  const options = await fixtureOptions();
  const oidDriftManifest = structuredClone(options.sourceManifest);
  oidDriftManifest.rows.find((row) => row.path === "src/clean.ts").blobOid = "e".repeat(40);
  const oidBody = { ...oidDriftManifest };
  delete oidBody.manifestDigest;
  oidDriftManifest.manifestDigest = sha256Canonical(oidBody.schema, oidBody);
  await expectRefusal(decodeSourceProject({ ...options, sourceManifest: oidDriftManifest }), /^SOURCE_ORIGIN_(?:GIT_BLOB_SET|PROJECT_[A-Z0-9_]+)$/);

  const drift = { ...options, sourceBlobs: mutableBlobSnapshot(options.sourceBlobs) };
  drift.sourceBlobs.set("src/clean.ts", Buffer.from("drift", "utf8"));
  let result;
  await expectRefusal(decodeSourceProject(drift), /^SOURCE_ORIGIN_(?:GIT_BLOB_SET|PROJECT_[A-Z0-9_]+)$/);
  assert.equal(result, undefined);
});

test("project decoder refuses a source/toolchain case-fold collision before semantic evaluation", async () => {
  const options = await fixtureOptions();
  const record = options.owners.values.pins.records.find((candidate) => candidate.platform === options.platform && candidate.arch === options.arch);
  const host = record.runtimeLoadSets.find((candidate) => candidate.id === "HOST");
  const collisionPath = `${host.entry.rootLocator}/LIB/typescript.js`;
  assert.equal(collisionPath.toLowerCase(), `${host.entry.rootLocator}/${host.entry.locator}`.toLowerCase());
  const collisionBytes = Buffer.from("export const collision = true;\n", "utf8");
  const collisionManifest = structuredClone(options.sourceManifest);
  collisionManifest.rows.push(manifestRow(collisionPath, collisionBytes));
  collisionManifest.rows.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  collisionManifest.counts = {
    paths: collisionManifest.rows.length,
    blobs: new Set(collisionManifest.rows.map((row) => row.blobOid)).size,
    bytes: collisionManifest.rows.reduce((sum, row) => sum + row.byteLength, 0),
    mode100644: collisionManifest.rows.filter((row) => row.mode === "100644").length,
    mode100755: collisionManifest.rows.filter((row) => row.mode === "100755").length,
    exclusions: 0,
  };
  const collisionBody = { ...collisionManifest };
  delete collisionBody.manifestDigest;
  collisionManifest.manifestDigest = sha256Canonical(collisionBody.schema, collisionBody);
  const collisionBlobs = mutableBlobSnapshot(options.sourceBlobs);
  collisionBlobs.set(collisionPath, collisionBytes);

  await expectRefusal(
    decodeSourceProject({ ...options, sourceManifest: collisionManifest, sourceBlobs: collisionBlobs }),
    /^SOURCE_ORIGIN_PROJECT_TOOLCHAIN$/,
  );
});
