import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  atomicPublishJson,
  assertFileSha256,
  buildGoldenManifest,
  canonicalJson,
  validateCaseDefinition,
} from "../fungi-golden-probe.mjs";

const REPOSITORY = fileURLToPath(new URL("../..", import.meta.url));

const validDefinition = () => ({
  schema: "galerina.fungi-golden-cases.v1",
  examples: [
    {
      id: "001-bool-if",
      source: "001-bool-if.fungi",
      checker: "STRICT_ZERO_DIAGNOSTICS",
      execution: {
        status: "EXECUTED",
        surface: "RAW_CLI",
        flow: "boolToInt",
        vectors: [{ arguments: ["true"], expectedStdout: "777" }],
      },
    },
  ],
});

describe("Fungi Golden Pack probe", () => {
  it("accepts one exact definition for every available source", () => {
    const definition = validDefinition();
    assert.doesNotThrow(() =>
      validateCaseDefinition(definition, ["001-bool-if.fungi"]),
    );
  });

  it("refuses duplicate IDs and undeclared or missing sources", () => {
    const duplicate = validDefinition();
    duplicate.examples.push({ ...duplicate.examples[0] });
    assert.throws(
      () => validateCaseDefinition(duplicate, ["001-bool-if.fungi"]),
      /duplicate example id/u,
    );

    assert.throws(
      () =>
        validateCaseDefinition(validDefinition(), [
          "001-bool-if.fungi",
          "002-int-match.fungi",
        ]),
      /source set mismatch/u,
    );
  });

  it("refuses an unreasoned NOT_EXECUTED state", () => {
    const definition = validDefinition();
    definition.examples[0].execution = { status: "NOT_EXECUTED" };
    assert.throws(
      () => validateCaseDefinition(definition, ["001-bool-if.fungi"]),
      /reason/u,
    );
  });

  it("accepts an exact expected refusal vector", () => {
    const definition = validDefinition();
    definition.examples[0].execution.vectors = [
      {
        arguments: ["1", "0"],
        expectedExitCode: 1,
        expectedOutputIncludes: "divide by zero",
      },
    ];
    assert.doesNotThrow(() =>
      validateCaseDefinition(definition, ["001-bool-if.fungi"]),
    );
  });

  it("emits stable canonical JSON independent of object insertion order", () => {
    assert.equal(
      canonicalJson({ z: 1, a: { y: 2, b: 3 } }),
      canonicalJson({ a: { b: 3, y: 2 }, z: 1 }),
    );
  });

  it("leaves prior evidence unchanged when manifest production fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fungi-golden-probe-"));
    const output = join(directory, "manifest.json");
    const prior = "{\"prior\":true}\n";
    try {
      await writeFile(output, prior, "utf8");
      await assert.rejects(
        atomicPublishJson(output, async () => {
          throw new Error("probe refused");
        }),
        /probe refused/u,
      );
      assert.equal(await readFile(output, "utf8"), prior);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses a file that changes after its evidence digest is captured", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fungi-golden-drift-"));
    const path = join(directory, "source.fungi");
    try {
      await writeFile(path, "first", "utf8");
      await assert.doesNotReject(assertFileSha256(path, "a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e"));
      await writeFile(path, "second", "utf8");
      await assert.rejects(
        assertFileSha256(path, "a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e"),
        /changed during Golden Pack probe/u,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("derives checker and execution evidence from the live Golden Pack", async () => {
    const manifest = await buildGoldenManifest({ repositoryRoot: REPOSITORY });
    assert.equal(manifest.schema, "galerina.fungi-golden-manifest.v1");
    assert.equal(manifest.status, "PROBE_DERIVED_REFERENCE_ONLY");
    assert.deepEqual(manifest.summary, {
      checked: 10,
      executedExamples: 7,
      executionVectors: 10,
      notExecutedExamples: 3,
    });
    assert.equal(manifest.authority.productionAuthorityReleased, false);
    assert.match(manifest.toolchain.runtimeClosureSha256, /^sha256:[0-9a-f]{64}$/u);
  });

  it("is wired into the blocking phase-close cadence", async () => {
    const phaseClose = await readFile(join(REPOSITORY, "scripts", "run-phase-close.mjs"), "utf8");
    assert.match(
      phaseClose,
      /run\("fungi:golden", "node", \["scripts\/fungi-golden-probe\.mjs", "--check"\]\)/u,
    );
  });
});
