import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

import { isRoundMode } from "../../packages-ts/galerina-core-compiler/dist/decimal-arith.js";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const SLIDE_AVAILABLE =
  typeof SLIDE_ROOT === "string"
  && existsSync(join(SLIDE_ROOT, "src", "checked-fungi-package-compiler.mjs"));
const SOURCE = join(
  process.cwd(),
  "packages-ts",
  "galerina-core-compiler",
  "src",
  "self-hosted",
  "decimal-round-mode.fungi",
);
const REGISTRY_ID = "slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1";
const REGISTRY_DIGEST = "d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc";
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
const VALUES = Object.freeze([
  "halfEven",
  "halfUp",
  "halfDown",
  "up",
  "down",
  "ceiling",
  "floor",
  "",
  "nearest",
  "HalfEven",
  " halfEven",
  "halfEven ",
  "halfEven\u0000tail",
  "constructor",
  "\u00bdEven",
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
    packageIdentity: "@galerina/core-compiler",
    exportName: "isRoundModeFungi",
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  assert.equal(prepared.registrySetId, REGISTRY_ID);
  assert.equal(prepared.registrySetDigest, REGISTRY_DIGEST);
  return prepared.packageExecutionHandle;
}

it(
  "publishes and independently re-admits decimal round-mode membership through SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sourceBytes = Uint8Array.from(readFileSync(SOURCE));
    const request = (candidateBytes) => ({
      packages: [{
        identity: "@galerina/core-compiler",
        version: "1.0.0-beta.2",
        exports: [{
          name: "isRoundModeFungi",
          sourceFlowName: "isRoundModeFungi",
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

    const mutatedSourceBytes = Uint8Array.from(sourceBytes);
    mutatedSourceBytes[0] ^= 0x01;
    assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSourceBytes)).verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-round-mode-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
      assert.equal(slideFiles.length, 1);

      for (const mode of VALUES) {
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          [mode],
          { steps: 128, textComparisonWork: 65_536 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, isRoundMode(mode));
        assert.equal(verified.authorityReleased, false);
      }

      for (const invalidArguments of [
        [],
        ["halfEven", "extra"],
        [1],
        ["\ud800"],
      ]) {
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          invalidArguments,
          { steps: 128, textComparisonWork: 65_536 },
        );
        assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
        assert.equal(refused.safeValueTypeId, 0);
      }

      const exhausted = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, publicationDirectory, context),
        ["halfEven"],
        { steps: 1, textComparisonWork: 65_536 },
      );
      assert.equal(exhausted.status, "REFUSED", JSON.stringify(exhausted));

      const mutatedPath = join(publicationDirectory, slideFiles[0]);
      const mutatedBytes = await readFile(mutatedPath);
      mutatedBytes[0] ^= 0x01;
      await writeFile(mutatedPath, mutatedBytes);
      const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/core-compiler",
        exportName: "isRoundModeFungi",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
