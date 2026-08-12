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
  "galerina-tower-citizen",
  "src",
  "self-hosted",
  "transport-fsm.fungi",
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
const VECTORS = Object.freeze([
  Object.freeze([0, true]),
  Object.freeze([1, false]),
  Object.freeze([2, false]),
  Object.freeze([-2147483648, false]),
  Object.freeze([-1, false]),
  Object.freeze([3, false]),
  Object.freeze([2147483647, false]),
]);

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
    packageIdentity: "@galerina/tower-citizen",
    exportName: "s4PermitData",
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  assert.equal(Object.hasOwn(prepared, "registrySetId"), false, JSON.stringify(prepared));
  assert.equal(Object.hasOwn(prepared, "registrySetDigest"), false, JSON.stringify(prepared));
  return prepared.packageExecutionHandle;
}

it(
  "publishes and independently re-admits transport permit data through SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sourceBytes = Uint8Array.from(readFileSync(SOURCE));
    const request = (candidateBytes) => ({
      packages: [{
        identity: "@galerina/tower-citizen",
        version: "1.0.0-beta.2",
        exports: [{
          name: "s4PermitData",
          sourceFlowName: "s4PermitData",
          sourceBytes: candidateBytes,
        }],
        dependencies: [],
        resources: [],
      }],
      context,
      gates: ALL_ALLOW,
    });
    const compiled = slide.compileCheckedFungiPackageSet(request(sourceBytes));
    assert.equal(compiled.verdict, 1, JSON.stringify(compiled));
    assert.equal(Object.hasOwn(compiled.exports[0], "registrySetId"), false);
    assert.equal(Object.hasOwn(compiled.exports[0], "registrySetDigest"), false);

    const mutatedSourceBytes = Uint8Array.from(sourceBytes);
    mutatedSourceBytes[0] ^= 0x01;
    assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSourceBytes)).verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-transport-permit-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
      assert.equal(slideFiles.length, 1);

      let retainedReceipt;
      for (const [state, expected] of VECTORS) {
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          [state],
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
        const expectation = verificationExpectation(receipt);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, expectation);
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, expected);
        assert.equal(verified.authorityReleased, false);
        retainedReceipt = receipt;
      }

      const nonNumeric = Number.parseInt("not-a-number", 10);
      for (const invalidArguments of [
        [],
        [0, 0],
        ["0"],
        [false],
        [nonNumeric],
        [Number.POSITIVE_INFINITY],
        [0.5],
        [2147483648],
        [-2147483649],
      ]) {
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          invalidArguments,
          { steps: 128 },
        );
        assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
        assert.equal(refused.safeValueTypeId, 0);
      }

      const exhausted = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, publicationDirectory, context),
        [0],
        { steps: 1 },
      );
      assert.equal(exhausted.status, "REFUSED", JSON.stringify(exhausted));

      assert.ok(retainedReceipt);
      const expectation = verificationExpectation(retainedReceipt);
      for (const [field, replacement] of [
        ["schema", "slide.checked-fungi.physical-execution.receipt.invalid"],
        ["safeValuePayloadDigest", `sha256:${"0".repeat(64)}`],
        ["receiptDigest", `sha256:${"0".repeat(64)}`],
        ["fallbackInvoked", true],
        ["authorityReleased", true],
      ]) {
        const mutated = { ...retainedReceipt, [field]: replacement };
        assert.equal(slide.inspectTypedCheckedFungiPackageReceipt(mutated).verdict, -1, field);
        assert.equal(slide.verifyTypedCheckedFungiPackageReceipt(mutated, expectation).verdict, -1, field);
      }
      for (let index = 0; index < retainedReceipt.safeValueEnvelopeBytes.length; index += 1) {
        const mutatedBytes = Uint8Array.from(retainedReceipt.safeValueEnvelopeBytes);
        mutatedBytes[index] ^= 1;
        const mutated = { ...retainedReceipt, safeValueEnvelopeBytes: mutatedBytes };
        assert.equal(
          slide.verifyTypedCheckedFungiPackageReceipt(mutated, expectation).verdict,
          -1,
          `safe-value envelope byte ${index}`,
        );
      }

      const mutatedPath = join(publicationDirectory, slideFiles[0]);
      const mutatedBytes = await readFile(mutatedPath);
      mutatedBytes[0] ^= 0x01;
      await writeFile(mutatedPath, mutatedBytes);
      const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/tower-citizen",
        exportName: "s4PermitData",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
