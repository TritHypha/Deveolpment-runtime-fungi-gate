import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2d-cbor-validator.fungi",
);

let parsed;
let canonicalBytes;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
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

async function validate(bytes) {
  const result = await run(
    "validateSLIDEV2DCanonicalBody",
    new Map([["candidate", { __tag: "bytes", value: bytes }]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  let source = "@version 1\n";
  try {
    source = await readFile(SOURCE_PATH, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  parsed = parseProgram(source, "slide-v2d-cbor-validator.fungi", {
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
  assert.ok(
    parsed.flows.some(
      (flow) => flow.name === "slideV2DCanonicalReferenceBytes",
    ),
    "independent V2-D canonical-vector gate is not implemented",
  );
  const result = await run("slideV2DCanonicalReferenceBytes");
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  canonicalBytes = result.value.value;
});

describe("independent SLIDE V2-D canonical-vector admission", () => {
  it("pins the complete body without producer or encoder access", async () => {
    assert.equal(canonicalBytes.length, 791);
    assert.equal(
      createHash("sha256").update(canonicalBytes).digest("hex"),
      "b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38",
    );
    const decision = await validate(canonicalBytes);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "consumed").value, 791);
    assert.equal(field(decision, "expectedLength").value, 791);
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("rejects a mutation at every byte offset", async () => {
    for (let offset = 0; offset < canonicalBytes.length; offset += 1) {
      const mutated = canonicalBytes.slice();
      mutated[offset] ^= 1;
      const decision = await validate(mutated);
      assert.equal(field(decision, "verdict").value, -1, `offset ${offset}`);
      assert.equal(field(decision, "failureId").value, "SLIDE-V2D-WIRE-004");
      assert.equal(field(decision, "mismatchOffset").value, offset);
      assert.equal(field(decision, "authorityReleased").value, false);
    }
  });

  it("rejects empty, truncation, and suffixes with terminal identities", async () => {
    for (const [bytes, failureId] of [
      [new Uint8Array(), "SLIDE-V2D-WIRE-002"],
      [canonicalBytes.slice(0, -1), "SLIDE-V2D-WIRE-002"],
      [Uint8Array.from([...canonicalBytes, 0]), "SLIDE-V2D-WIRE-003"],
    ]) {
      const decision = await validate(bytes);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "failureId").value, failureId);
      assert.equal(field(decision, "authorityReleased").value, false);
    }
  });
});
