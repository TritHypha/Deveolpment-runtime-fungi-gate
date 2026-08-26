import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

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
];

const vStr = (value) => ({ __tag: "string", value });
const vInt = (value) => ({ __tag: "int", value });
const vVerdict = (value) => ({ __tag: "verdict", value });

let compiler;
let fixtureSource;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

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

async function checkedFacts(source) {
  const tokenized = await run("tokenize", new Map([["source", vStr(source)]]));
  const tokens = tokenized.__tag === "ok" ? tokenized.value : tokenized;
  return run("parseFlows", new Map([["tokens", tokens]]));
}

async function adaptSource(source) {
  return run(
    "adaptSLIDEG4CheckedFixture",
    new Map([["parsed", await checkedFacts(source)]]),
  );
}

before(async () => {
  fixtureSource = await readFile(FIXTURE, "utf8");
  const sources = await Promise.all(
    REQUIRED_FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  const normalized = sources.map((value, index) =>
      index === 0 ? value : value.replace(/^@version 1\r?\n/, ""),
    );
  const adapterStartLine =
    normalized.slice(0, -1).join("\n").split(/\r?\n/).length + 1;
  const source = normalized.join("\n");
  compiler = parseProgram(source, "slide-gfrontend-fixture-adapter.fungi", {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    compiler.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const adapterTypeErrors = checkTypes(compiler.ast).diagnostics.filter(
    (diagnostic) =>
      diagnostic.severity === "error" &&
      (diagnostic.location?.line ?? 0) >= adapterStartLine,
  );
  assert.deepEqual(adapterTypeErrors, []);
  assert.ok(
    compiler.flows.some((flow) => flow.name === "adaptSLIDEG4CheckedFixture"),
    "checked-source-to-V2-D adapter is not implemented",
  );
});

describe("SLIDE G4 checked-source fixture adapter", () => {
  it("pins a source program whose allowed results match frozen V2-D function 2", async () => {
    const parsed = parseProgram(fixtureSource, "slide-g4-checked-source.fungi", {
      requireVersionHeader: true,
    });
    assert.deepEqual(
      parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    assert.deepEqual(
      checkTypes(parsed.ast).diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error",
      ),
      [],
    );

    for (const [left, right, expected] of [
      [2, 3, 6],
      [-2, 3, 7],
    ]) {
      const result = await executeFlow(
        "slide_g4_k3_join",
        new Map([
          ["left", vInt(left)],
          ["right", vInt(right)],
          ["admission", vVerdict(1)],
        ]),
        parsed.ast,
        parsed.flows,
        undefined,
        undefined,
        { pureFastPath: false },
      );
      assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
      assert.equal(result.value.__tag, "ok");
      assert.equal(result.value.value.value, expected);
    }
  });

  it("derives and independently binds the exact frozen V2-D body", async () => {
    const candidate = await adaptSource(fixtureSource);
    assert.equal(field(candidate, "materialized").value, true);
    assert.equal(field(field(candidate, "decision"), "verdict").value, 1);
    assert.equal(field(candidate, "semanticBody").value.length, 791);
    assert.equal(
      field(candidate, "semanticBodyDigest").value,
      "b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38",
    );
    assert.equal(
      field(candidate, "semanticDigest").value,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    assert.equal(field(candidate, "sourceFlowCount").value, 3);
    assert.equal(field(candidate, "authorityReleased").value, false);
  });

  it("is deterministic for the same compiler-owned checked facts", async () => {
    assert.deepEqual(
      await adaptSource(fixtureSource),
      await adaptSource(fixtureSource),
    );
  });

  const mutations = [
    [
      "record declaration identity",
      (source) => source.replace("SLIDEG4FixtureRecord", "OtherRecord"),
      "SLIDE-GFRONT-003",
    ],
    [
      "record field order",
      (source) =>
        source.replace(
          "  selected: Int\n  length: Int",
          "  length: Int\n  selected: Int",
        ),
      "SLIDE-GFRONT-003",
    ],
    [
      "enum case removal",
      (source) => source.replace("  Missing\n}", "}"),
      "SLIDE-GFRONT-003",
    ],
    [
      "flow order",
      (source) =>
        source.replace(
          "pure flow slide_g4_checked_increment",
          "pure flow slide_g4_checked_increment_late",
        ),
      "SLIDE-GFRONT-003",
    ],
    [
      "checked increment",
      (source) => source.replace("return value + 1", "return value + 2"),
      "SLIDE-GFRONT-005",
    ],
    [
      "negative branch call operand",
      (source) =>
        source.replace(
          "slide_g4_checked_increment(right) + right",
          "slide_g4_checked_increment(left) + right",
        ),
      "SLIDE-GFRONT-005",
    ],
    [
      "K3 arm",
      (source) =>
        source.replace(
          '    ambig: { return Err("SLIDE_PROBE_INDETERMINATE") }\n',
          "",
        ),
      "SLIDE-GFRONT-005",
    ],
    [
      "bounds ceiling",
      (source) => source.replace("index >= 3", "index >= 4"),
      "SLIDE-GFRONT-005",
    ],
    [
      "option catch-all",
      (source) =>
        source.replace(
          '    _ => return Err("SLIDE_PROBE_INVALID_OPTION")\n',
          "",
        ),
      "SLIDE-GFRONT-005",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`refuses ${name} drift without partial bytes`, async () => {
      const candidate = await adaptSource(mutate(fixtureSource));
      assert.equal(field(candidate, "materialized").value, false);
      assert.equal(field(field(candidate, "decision"), "verdict").value, -1);
      assert.equal(
        field(field(candidate, "decision"), "failureId").value,
        expectedFailure,
      );
      assert.equal(field(candidate, "semanticBody").value.length, 0);
      assert.equal(field(candidate, "semanticBodyDigest").value, "");
      assert.equal(field(candidate, "semanticDigest").value, "");
      assert.equal(field(candidate, "authorityReleased").value, false);
    });
  }
});
