import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const SLIDE_AVAILABLE =
  typeof SLIDE_ROOT === "string"
  && existsSync(join(SLIDE_ROOT, "src", "checked-fungi-package-compiler.mjs"));
const SOURCE = join(
  process.cwd(),
  "packages-galerina",
  "galerina-core-compiler",
  "src",
  "self-hosted",
  "plugin-type-compatibility.fungi",
);
const ALL_ALLOW = Object.freeze({
  identity: 1,
  provenance: 1,
  target: 1,
  effects: 1,
  policy: 1,
  revocation: 1,
  validation: 1,
  memory: 1,
});
const CANONICAL_TYPES = Object.freeze([
  "Int",
  "String",
  "Bool",
  "Float",
  "Bytes",
  "Array<Int>",
  "Array<String>",
]);
const HOSTILE_PAIRS = Object.freeze([
  Object.freeze(["", ""]),
  Object.freeze(["int", "Float"]),
  Object.freeze(["Int", "float"]),
  Object.freeze(["unknown", "Float"]),
  Object.freeze(["Int\u0000", "Float"]),
  Object.freeze(["Int", "Float\u0000"]),
]);

function expectedCompatibility(actual, expected) {
  return actual === "Int" && expected === "Float";
}

async function loadSlide() {
  const fromSlide = async (path) => import(pathToFileURL(join(SLIDE_ROOT, "src", path)).href);
  const compiler = await fromSlide("checked-fungi-package-compiler.mjs");
  const file = await fromSlide("checked-fungi-package-file.mjs");
  const loader = await fromSlide("checked-fungi-package-publication-loader.mjs");
  const values = await fromSlide("safe-value-envelope.mjs");
  const veo = await fromSlide("portable-veo.mjs");
  return { ...compiler, ...file, ...loader, ...values, ...veo };
}

function verificationExpectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    receiptDigest: receipt.receiptDigest,
    safeValueTypeId: receipt.safeValueTypeId,
    safeValueStateId: receipt.safeValueStateId,
    safeValueProvenanceDigest: receipt.safeValueProvenanceDigest,
  };
}

async function prepare(slide, publicationDirectory, context) {
  const prepared = await slide.prepareCheckedFungiPackagePublication({
    publicationDirectory,
    packageIdentity: "@galerina/core-compiler",
    exportName: "isCompatibleType",
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  return prepared.packageExecutionHandle;
}

it(
  "publishes and independently re-admits plugin type compatibility through SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sourceBytes = Uint8Array.from(readFileSync(SOURCE));
    const compiled = slide.compileCheckedFungiPackageSet({
      packages: [{
        identity: "@galerina/core-compiler",
        version: "1.0.0-beta.2",
        exports: [{
          name: "isCompatibleType",
          sourceFlowName: "isCompatibleType",
          sourceBytes,
        }],
        dependencies: [],
        resources: [],
      }],
      context,
      gates: ALL_ALLOW,
    });
    assert.equal(compiled.verdict, 1, JSON.stringify(compiled));

    const mutatedSourceBytes = Uint8Array.from(sourceBytes);
    mutatedSourceBytes[0] ^= 0x01;
    const mutatedSource = slide.compileCheckedFungiPackageSet({
      packages: [{
        identity: "@galerina/core-compiler",
        version: "1.0.0-beta.2",
        exports: [{
          name: "isCompatibleType",
          sourceFlowName: "isCompatibleType",
          sourceBytes: mutatedSourceBytes,
        }],
        dependencies: [],
        resources: [],
      }],
      context,
      gates: ALL_ALLOW,
    });
    assert.equal(mutatedSource.verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-plugin-compatibility-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      assert.equal(published.packageSetDigest, compiled.packageSetDigest);
      const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
      assert.equal(slideFiles.length, 1);

      const positiveAndCanonical = [];
      for (const actual of CANONICAL_TYPES) {
        for (const expected of CANONICAL_TYPES) positiveAndCanonical.push([actual, expected]);
      }
      for (const [actual, expected] of [...positiveAndCanonical, ...HOSTILE_PAIRS]) {
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          [actual, expected],
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(
          verified.value,
          expectedCompatibility(actual, expected),
          `${JSON.stringify(actual)} -> ${JSON.stringify(expected)}`,
        );
      }

      for (const invalidArguments of [
        [1, "Float"],
        ["Int", 2],
        ["Int"],
        ["Int", "Float", "extra"],
        ["\uD800", "Float"],
      ]) {
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          invalidArguments,
          { steps: 128 },
        );
        assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
        assert.equal(refused.safeValueTypeId, 0);
      }

      const mutatedPath = join(publicationDirectory, slideFiles[0]);
      const mutatedBytes = await readFile(mutatedPath);
      mutatedBytes[0] ^= 0x01;
      await writeFile(mutatedPath, mutatedBytes);
      const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/core-compiler",
        exportName: "isCompatibleType",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
