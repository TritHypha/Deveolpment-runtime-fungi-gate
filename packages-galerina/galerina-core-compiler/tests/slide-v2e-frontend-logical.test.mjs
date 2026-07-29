import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FIXTURE = join(HERE, "fixtures", "slide-v2e-source.fungi");
const REQUIRED_FILES = [
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-validator.fungi",
  "slide-v2d-cbor-importer.fungi",
  "slide-v2d-semantic-digest.fungi",
];
const IMPLEMENTATION_FILES = [
  "slide-v2e-frontend-schema.fungi",
  "slide-v2e-frontend-model.fungi",
  "slide-v2e-frontend-validator.fungi",
];

let parsed;
let sourceText;
let canonicalBytes;
let validEvidence;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function vString(value) {
  return { __tag: "string", value };
}

function vInt(value) {
  return { __tag: "int", value };
}

function vBool(value) {
  return { __tag: "bool", value };
}

function externalEvidence(diagnosticSetDigest = "d".repeat(64)) {
  return {
    __tag: "record",
    fields: new Map([
      ["compilerArtifactDigest", vString("c".repeat(64))],
      ["diagnosticSetDigest", vString(diagnosticSetDigest)],
      ["corpusDigest", vString("e".repeat(64))],
      ["vectorSetDigest", vString("f".repeat(64))],
      ["buildActionRootDigest", vString("a".repeat(64))],
      ["toolchainLockDigest", vString("b".repeat(64))],
      ["environmentContractDigest", vString("9".repeat(64))],
    ]),
  };
}

async function run(flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function materialize(text = sourceText) {
  const result = await run(
    "materializeSLIDEV2EFrontendEvidence",
    new Map([
      ["sourceText", vString(text)],
      ["compilerArtifactDigest", vString("c".repeat(64))],
      ["diagnosticSetDigest", vString("d".repeat(64))],
      ["corpusDigest", vString("e".repeat(64))],
      ["vectorSetDigest", vString("f".repeat(64))],
      ["buildActionRootDigest", vString("a".repeat(64))],
      ["toolchainLockDigest", vString("b".repeat(64))],
      ["environmentContractDigest", vString("9".repeat(64))],
      ["semanticBody", { __tag: "bytes", value: canonicalBytes }],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function validate(
  evidence,
  text = sourceText,
  bytes = canonicalBytes,
  expected = externalEvidence(),
) {
  const result = await run(
    "validateSLIDEV2EFrontendEvidence",
    new Map([
      ["evidence", evidence],
      ["sourceText", vString(text)],
      ["semanticBody", { __tag: "bytes", value: bytes }],
      ["expectedExternalEvidence", expected],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  sourceText = await readFile(FIXTURE, "utf8");
  const sourceFixture = parseProgram(sourceText, FIXTURE, {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    sourceFixture.diagnostics.filter((item) => item.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(sourceFixture.ast).diagnostics.filter(
      (item) => item.severity === "error",
    ),
    [],
  );

  const sources = await Promise.all(
    REQUIRED_FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  for (const name of IMPLEMENTATION_FILES) {
    try {
      sources.push(await readFile(join(SELF_HOSTED, name), "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const combined = sources
    .map((source, index) =>
      index === 0 ? source : source.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(combined, "slide-v2e-frontend-combined.fungi", {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    parsed.diagnostics.filter((item) => item.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (item) => item.severity === "error",
    ),
    [],
  );
  assert.ok(
    parsed.flows.some(
      (flow) => flow.name === "materializeSLIDEV2EFrontendEvidence",
    ),
    "V2-E frontend-evidence producer is not implemented",
  );
  assert.ok(
    parsed.flows.some(
      (flow) => flow.name === "validateSLIDEV2EFrontendEvidence",
    ),
    "independent logical V2-E frontend-evidence validator is not implemented",
  );
  canonicalBytes = (await run("slideV2DCanonicalReferenceBytes")).value.value;
  validEvidence = await materialize();
});

describe("SLIDE V2-E logical frontend receipt", () => {
  it("pins a strictly checked normalized source fixture", () => {
    assert.equal(Buffer.byteLength(sourceText, "utf8"), 1492);
    assert.equal(
      createHash("sha256").update(sourceText, "utf8").digest("hex"),
      "8bdc2c2961d0c13c66132d3d506ebe24c050e1a618631c18b30eba6539694bde",
    );
    assert.equal(sourceText.includes("\r"), false);
    assert.equal(sourceText.includes("\0"), false);
  });

  it("binds frozen V2-D without changing frontend-neutral identity", async () => {
    const evidence = structuredClone(validEvidence);
    const decision = field(evidence, "decision");
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(evidence, "materialized").value, true);
    assert.equal(field(evidence, "authorityReleased").value, false);
    const receipt = field(evidence, "receipt");
    assert.equal(field(receipt, "receiptMajor").value, 1);
    assert.equal(field(receipt, "receiptMinor").value, 0);
    assert.equal(
      field(receipt, "receiptProfileId").value,
      "slide.frontend.galerina.v1",
    );
    assert.equal(
      field(receipt, "semanticBodyDigest").value,
      "b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38",
    );
    assert.equal(
      field(receipt, "semanticDigest").value,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    assert.equal(
      field(receipt, "sourceSetDigest").value.length,
      64,
    );
    assert.equal(
      field(receipt, "sourceMapDigest").value.length,
      64,
    );
    assert.equal(field(receipt, "nativeCertificatePresent").value, false);
    assert.equal(field(receipt, "authorityReleased").value, false);
  });

  it("covers every admitted instruction and terminator exactly once", async () => {
    const evidence = structuredClone(validEvidence);
    const mappings = field(evidence, "sourceMappings").items;
    assert.equal(mappings.length, 40);
    assert.deepEqual(
      mappings.map((entry) => field(entry, "mapId").value),
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      [...new Set(mappings.map((entry) => field(entry, "functionId").value))],
      [1, 2, 3],
    );
    for (const entry of mappings) {
      const start = field(entry, "startByte").value;
      const end = field(entry, "endByte").value;
      assert.ok(start >= 0 && end > start && end <= 1492);
      assert.equal(field(entry, "sourceUnitId").value, 1);
    }
  });

  it("derives nine distinct plan digests from independently admitted bytes", async () => {
    const evidence = structuredClone(validEvidence);
    const plans = field(field(evidence, "receipt"), "plans");
    const names = [
      "functionGraphDigest",
      "typePlanDigest",
      "memoryPlanDigest",
      "effectPlanDigest",
      "capabilityPlanDigest",
      "importPlanDigest",
      "k3ObligationSetDigest",
      "failureModelDigest",
      "resourcePlanDigest",
    ];
    const values = names.map((name) => field(plans, name).value);
    assert.equal(new Set(values).size, 9);
    assert.ok(values.every((value) => /^[0-9a-f]{64}$/.test(value)));
  });

  it("independently validates the exact producer evidence", async () => {
    const validated = await validate(structuredClone(validEvidence));
    assert.equal(field(field(validated, "decision"), "verdict").value, 1);
    assert.equal(field(validated, "materialized").value, true);
    assert.equal(field(validated, "sourceMappings").items.length, 40);
    assert.equal(field(validated, "authorityReleased").value, false);
  });

  const receiptMutations = [
    ["receipt major", "receiptMajor", vInt(2)],
    ["receipt minor", "receiptMinor", vInt(1)],
    ["receipt profile", "receiptProfileId", vString("other")],
    ["receipt role", "receiptRoleId", vString("EXECUTION_AUTHORITY")],
    ["digest suite", "digestSuiteId", vString("other")],
    ["producer identity", "producerId", vString("other")],
    ["producer version", "producerVersion", vString("other")],
    ["compiler artifact digest", "compilerArtifactDigest", vString("0")],
    ["compiler artifact binding", "compilerArtifactDigest", vString("1".repeat(64))],
    ["invalid compiler artifact hex", "compilerArtifactDigest", vString("g".repeat(64))],
    ["frontend profile", "frontendProfileId", vString("other")],
    ["source edition", "sourceLanguageEdition", vString("other")],
    ["check profile", "authoritativeCheckProfileId", vString("other")],
    ["source-set digest", "sourceSetDigest", vString("0".repeat(64))],
    ["source-map digest", "sourceMapDigest", vString("0".repeat(64))],
    ["diagnostic-set binding", "diagnosticSetDigest", vString("1".repeat(64))],
    ["semantic archive media type", "semanticArchiveMediaType", vString("other")],
    ["semantic body digest", "semanticBodyDigest", vString("0".repeat(64))],
    ["semantic digest", "semanticDigest", vString("0".repeat(64))],
    ["semantic profile", "semanticProfileId", vString("other")],
    ["registry identity", "registrySetId", vString("other")],
    ["registry digest", "registrySetDigest", vString("0".repeat(64))],
    ["memory profile", "memoryProfileId", vString("other")],
    ["corpus binding", "corpusDigest", vString("1".repeat(64))],
    ["vector-set binding", "vectorSetDigest", vString("1".repeat(64))],
    ["build-action binding", "buildActionRootDigest", vString("1".repeat(64))],
    ["toolchain-lock binding", "toolchainLockDigest", vString("1".repeat(64))],
    ["environment binding", "environmentContractDigest", vString("1".repeat(64))],
    ["determinism", "deterministic", vBool(false)],
    ["native certificate", "nativeCertificatePresent", vBool(true)],
    ["authority", "authorityReleased", vBool(true)],
  ];

  for (const [name, property, replacement] of receiptMutations) {
    it(`refuses ${name} drift with no partial evidence`, async () => {
      const candidate = structuredClone(validEvidence);
      field(candidate, "receipt").fields.set(property, replacement);
      const refused = await validate(candidate);
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "materialized").value, false);
      assert.equal(field(refused, "sourceUnits").items.length, 0);
      assert.equal(field(refused, "sourceMappings").items.length, 0);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  for (const property of [
    "functionGraphDigest",
    "typePlanDigest",
    "memoryPlanDigest",
    "effectPlanDigest",
    "capabilityPlanDigest",
    "importPlanDigest",
    "k3ObligationSetDigest",
    "failureModelDigest",
    "resourcePlanDigest",
  ]) {
    it(`refuses independently false ${property}`, async () => {
      const candidate = structuredClone(validEvidence);
      const plans = field(field(candidate, "receipt"), "plans");
      plans.fields.set(property, vString("0".repeat(64)));
      const refused = await validate(candidate);
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "materialized").value, false);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  const mappingMutations = [
    ["missing mapping", (items) => items.pop()],
    ["surplus mapping", (items) => items.push(structuredClone(items.at(-1)))],
    ["duplicate mapping", (items) => {
      items[1] = structuredClone(items[0]);
    }],
    ["reordered mappings", (items) => {
      [items[0], items[1]] = [items[1], items[0]];
    }],
    ["wrong function", (items) => {
      items[0].fields.set("functionId", vInt(2));
    }],
    ["wrong block", (items) => {
      items[0].fields.set("blockId", vInt(9));
    }],
    ["wrong node kind", (items) => {
      items[0].fields.set("nodeKindId", vInt(2));
    }],
    ["wrong node", (items) => {
      items[0].fields.set("nodeId", vInt(99));
    }],
    ["wrong source unit", (items) => {
      items[0].fields.set("sourceUnitId", vInt(2));
    }],
    ["empty span", (items) => {
      items[0].fields.set("endByte", field(items[0], "startByte"));
    }],
    ["reversed span", (items) => {
      items[0].fields.set("startByte", vInt(310));
      items[0].fields.set("endByte", vInt(144));
    }],
    ["out-of-range span", (items) => {
      items[0].fields.set("endByte", vInt(1493));
    }],
  ];

  for (const [name, mutate] of mappingMutations) {
    it(`refuses ${name}`, async () => {
      const candidate = structuredClone(validEvidence);
      mutate(field(candidate, "sourceMappings").items);
      const refused = await validate(candidate);
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "sourceMappings").items.length, 0);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  for (const [name, mutate] of [
    ["missing source unit", (items) => items.pop()],
    ["surplus source unit", (items) =>
      items.push(structuredClone(items[0]))],
  ]) {
    it(`refuses ${name}`, async () => {
      const candidate = structuredClone(validEvidence);
      mutate(field(candidate, "sourceUnits").items);
      const refused = await validate(candidate);
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "sourceUnits").items.length, 0);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  for (const [name, mutate] of [
    ["traversal source logical name", (unit) =>
      unit.fields.set("logicalName", vString("../escape.fungi"))],
    ["absolute source logical name", (unit) =>
      unit.fields.set("logicalName", vString("C:/escape.fungi"))],
    ["backslash source logical name", (unit) =>
      unit.fields.set("logicalName", vString("fixtures\\escape.fungi"))],
    ["empty-segment source logical name", (unit) =>
      unit.fields.set("logicalName", vString("fixtures//escape.fungi"))],
    ["source digest", (unit) =>
      unit.fields.set("sourceBytesDigest", vString("0".repeat(64)))],
    ["source length", (unit) =>
      unit.fields.set("sourceByteLength", vInt(1491))],
  ]) {
    it(`refuses changed ${name}`, async () => {
      const candidate = structuredClone(validEvidence);
      mutate(field(candidate, "sourceUnits").items[0]);
      const refused = await validate(candidate);
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "sourceUnits").items.length, 0);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  for (const [name, mutate] of [
    ["source bytes", (value) => `${value}\n`],
    ["CRLF source", (value) => value.replace(/\n/g, "\r\n")],
    ["NUL source", (value) => `${value}\0`],
  ]) {
    it(`releases no partial evidence for changed ${name}`, async () => {
      const evidence = await materialize(mutate(sourceText));
      assert.equal(field(field(evidence, "decision"), "verdict").value, -1);
      assert.equal(field(evidence, "materialized").value, false);
      assert.equal(field(evidence, "sourceMappings").items.length, 0);
      assert.equal(field(evidence, "authorityReleased").value, false);
    });
  }
});
