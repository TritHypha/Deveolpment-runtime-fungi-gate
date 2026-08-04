import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

import { executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FIXTURE = join(HERE, "fixtures", "slide-g4-checked-source.fungi");
const REQUIRED_FILES = [
  "lexer.fungi",
  "parser.fungi",
  "gir-emitter.fungi",
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-encoder.fungi",
  "slide-v2c-cbor-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-encoder.fungi",
  "slide-v2d-cbor-validator.fungi",
  "slide-v2d-cbor-importer.fungi",
  "slide-v2d-semantic-digest.fungi",
  "slide-gfrontend-fixture-adapter.fungi",
  "slide-v2e-frontend-schema.fungi",
  "slide-gfrontend-checked-snapshot.fungi",
];

const vStr = (value) => ({ __tag: "string", value });

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

async function loadHarness() {
  const sourceText = await readFile(FIXTURE, "utf8");
  const sources = [];
  for (const name of REQUIRED_FILES) {
    const source = await readFile(join(SELF_HOSTED, name), "utf8").catch(
      () => null,
    );
    assert.ok(source, `${name} is not implemented`);
    sources.push(source);
  }
  const combined = sources
    .map((value, index) =>
      index === 0 ? value : value.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  const compiler = parseProgram(
    combined,
    "slide-gfrontend-checked-snapshot.fungi",
    { requireVersionHeader: true },
  );
  assert.deepEqual(
    compiler.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );

  async function run(flowName, args = new Map()) {
    const result = await executeFlow(
      flowName,
      args,
      compiler.ast,
      compiler.flows,
      undefined,
      undefined,
      { pureFastPath: false },
    );
    assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
    return result.value;
  }

  const tokenized = await run(
    "tokenize",
    new Map([["source", vStr(sourceText)]]),
  );
  const tokens = tokenized.__tag === "ok" ? tokenized.value : tokenized;
  const parsed = await run("parseFlows", new Map([["tokens", tokens]]));
  return { parsed, run, sourceText, tokens };
}

it("seals immutable checked facts with an instruction-total source trace", async () => {
  const { parsed, run, sourceText, tokens } = await loadHarness();
  const result = await run(
    "sealSLIDEG4CheckedSnapshot",
    new Map([
      ["tokens", tokens],
      ["parsed", parsed],
      ["sourceText", vStr(sourceText)],
    ]),
  );
  assert.equal(field(field(result, "decision"), "verdict").value, 1);
  const snapshot = field(result, "snapshot");
  assert.equal(
    field(snapshot, "profileId").value,
    "galerina.checked-module.g4.fixture.v1",
  );
  assert.equal(field(snapshot, "sourceByteLength").value, 1643);
  assert.equal(
    field(snapshot, "sourceDigest").value,
    "d4007a8e4b89bffc3dc84d0108b422b71efdb741e4b1a3ca9d760db49d7d8c6d",
  );
  assert.equal(field(snapshot, "errorCount").value, 0);
  assert.equal(field(snapshot, "warningCount").value, 0);
  assert.equal(field(snapshot, "recordDecls").items.length, 1);
  assert.equal(field(snapshot, "enumDecls").items.length, 1);
  assert.equal(field(snapshot, "flows").items.length, 3);
  assert.equal(field(snapshot, "instructionCount").value, 31);
  assert.equal(field(snapshot, "terminatorCount").value, 9);

  const trace = field(snapshot, "sourceMappings").items;
  assert.equal(trace.length, 40);
  const keys = trace.map((entry) =>
    [
      field(entry, "functionId").value,
      field(entry, "blockId").value,
      field(entry, "nodeKindId").value,
      field(entry, "nodeId").value,
    ].join(":"),
  );
  assert.equal(new Set(keys).size, 40);
  assert.ok(
    new Set(
      trace.map(
        (entry) =>
          `${field(entry, "startByte").value}:${field(entry, "endByte").value}`,
      ),
    ).size > 20,
  );
  for (const entry of trace) {
    const start = field(entry, "startByte").value;
    const end = field(entry, "endByte").value;
    assert.ok(start >= 0 && end > start && end <= 1643);
  }

  const forbidden = [
    "isValid",
    "safe",
    "verified",
    "trusted",
    "authorized",
    "authorityReleased",
    "ast",
    "parserCursor",
    "backend",
    "hostHandle",
  ];
  for (const name of forbidden) {
    assert.equal(snapshot.fields.has(name), false, `forbidden snapshot field ${name}`);
  }
});

it("refuses caller-supplied lexer facts that do not match the bound source", async () => {
  const { parsed, run, sourceText, tokens } = await loadHarness();
  const changed = structuredClone(tokens);
  const token = changed.items.find(
    (item) =>
      field(item, "value").value === "slide_g4_checked_increment" &&
      field(item, "start").value === 154,
  );
  assert.ok(token);
  token.fields.set("value", vStr("slide_g4_checked_incremenx"));

  const result = await run(
    "sealSLIDEG4CheckedSnapshot",
    new Map([
      ["tokens", changed],
      ["parsed", parsed],
      ["sourceText", vStr(sourceText)],
    ]),
  );
  assert.equal(field(field(result, "decision"), "verdict").value, -1);
  assert.equal(field(field(result, "snapshot"), "profileId").value, "");
  assert.equal(
    field(field(result, "snapshot"), "sourceMappings").items.length,
    0,
  );
});
