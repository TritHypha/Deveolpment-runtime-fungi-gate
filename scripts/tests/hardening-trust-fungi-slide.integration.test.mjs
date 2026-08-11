import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

import {
  boundaryTrusted,
  combineTrust,
  refute,
  trustName,
} from "../../packages-galerina/galerina-core-compiler/dist/index.js";

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
  "hardening-trust-boundary.fungi",
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
const CONJUNCTION = Object.freeze([
  Object.freeze([-1, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([-1, 1]),
  Object.freeze([0, -1]),
  Object.freeze([0, 0]),
  Object.freeze([0, 1]),
  Object.freeze([1, -1]),
  Object.freeze([1, 0]),
  Object.freeze([1, 1]),
]);
const RELEASE = Object.freeze([-1, 0, 1]);
const NAMES = Object.freeze([
  Object.freeze([-1, "Refuted"]),
  Object.freeze([0, "Unverified"]),
  Object.freeze([1, "Trusted"]),
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

it(
  "publishes and independently re-admits the fail-closed trust boundary through SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sourceBytes = Uint8Array.from(readFileSync(SOURCE));
    const exports = Object.freeze([
      Object.freeze({ name: "combineTrust", sourceFlowName: "combineTrust", sourceBytes }),
      Object.freeze({ name: "boundaryTrusted", sourceFlowName: "boundaryTrusted", sourceBytes }),
      Object.freeze({ name: "trustName", sourceFlowName: "trustName", sourceBytes }),
      Object.freeze({ name: "refute", sourceFlowName: "refute", sourceBytes }),
    ]);
    const compiled = slide.compileCheckedFungiPackageSet({
      packages: [{
        identity: "@galerina/core-compiler",
        version: "1.0.0-beta.2",
        exports,
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
          name: "combineTrust",
          sourceFlowName: "combineTrust",
          sourceBytes: mutatedSourceBytes,
        }],
        dependencies: [],
        resources: [],
      }],
      context,
      gates: ALL_ALLOW,
    });
    assert.equal(mutatedSource.verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-hardening-trust-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      assert.equal(published.packageSetDigest, compiled.packageSetDigest);
      const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
      assert.equal(slideFiles.length, 4);

      for (const vector of CONJUNCTION) {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/core-compiler",
          exportName: "combineTrust",
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          vector,
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.verdict);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, combineTrust(...vector));
      }

      for (const trust of RELEASE) {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/core-compiler",
          exportName: "boundaryTrusted",
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          [trust],
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, boundaryTrusted(trust));
        if (trust !== 1) assert.equal(verified.value, false);
      }

      for (const [trust, expected] of NAMES) {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/core-compiler",
          exportName: "trustName",
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          [trust],
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.string);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, expected);
        assert.equal(verified.value, trustName(trust));
      }

      {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/core-compiler",
          exportName: "refute",
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          [],
          { steps: 128 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.verdict);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, refute());
        assert.equal(verified.value, -1);
      }

      for (const [exportName, invalidVector] of [
        ["combineTrust", [1, 2]],
        ["boundaryTrusted", [2]],
        ["trustName", [2]],
        ["refute", [1]],
      ]) {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/core-compiler",
          exportName,
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          invalidVector,
          { steps: 128 },
        );
        assert.equal(refused.status, "REFUSED");
        assert.equal(refused.safeValueTypeId, 0);
      }

      const mutatedPath = join(publicationDirectory, slideFiles[0]);
      const mutatedBytes = await readFile(mutatedPath);
      mutatedBytes[0] ^= 0x01;
      await writeFile(mutatedPath, mutatedBytes);
      const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/core-compiler",
        exportName: "combineTrust",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
