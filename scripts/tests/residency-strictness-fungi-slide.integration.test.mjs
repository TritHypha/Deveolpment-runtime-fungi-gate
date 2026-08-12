import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

import { atLeastAsStrict } from "../../packages-galerina/galerina-core-compiler/dist/index.js";

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
  "residency-strictness.fungi",
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
const CANONICAL_PAIRS = Object.freeze([
  Object.freeze(["register_only", "register_only", true]),
  Object.freeze(["register_only", "no_dram_spill", true]),
  Object.freeze(["register_only", "no_swap", true]),
  Object.freeze(["register_only", "no_disk", true]),
  Object.freeze(["register_only", "unrestricted", true]),
  Object.freeze(["no_dram_spill", "register_only", false]),
  Object.freeze(["no_dram_spill", "no_dram_spill", true]),
  Object.freeze(["no_dram_spill", "no_swap", true]),
  Object.freeze(["no_dram_spill", "no_disk", true]),
  Object.freeze(["no_dram_spill", "unrestricted", true]),
  Object.freeze(["no_swap", "register_only", false]),
  Object.freeze(["no_swap", "no_dram_spill", false]),
  Object.freeze(["no_swap", "no_swap", true]),
  Object.freeze(["no_swap", "no_disk", true]),
  Object.freeze(["no_swap", "unrestricted", true]),
  Object.freeze(["no_disk", "register_only", false]),
  Object.freeze(["no_disk", "no_dram_spill", false]),
  Object.freeze(["no_disk", "no_swap", false]),
  Object.freeze(["no_disk", "no_disk", true]),
  Object.freeze(["no_disk", "unrestricted", true]),
  Object.freeze(["unrestricted", "register_only", false]),
  Object.freeze(["unrestricted", "no_dram_spill", false]),
  Object.freeze(["unrestricted", "no_swap", false]),
  Object.freeze(["unrestricted", "no_disk", false]),
  Object.freeze(["unrestricted", "unrestricted", true]),
]);
const HOSTILE_PAIRS = Object.freeze([
  Object.freeze(["", "no_swap", false]),
  Object.freeze(["no_swap", "", false]),
  Object.freeze(["No_Swap", "no_swap", false]),
  Object.freeze(["no_swap", "NO_SWAP", false]),
  Object.freeze([" no_swap", "no_swap", false]),
  Object.freeze(["no_swap", "no_swap ", false]),
  Object.freeze(["no_swap\u0000tail", "no_disk", false]),
  Object.freeze(["no_disk", "no_swap\u0000tail", false]),
  Object.freeze(["constructor", "unrestricted", false]),
  Object.freeze(["unrestricted", "__proto__", false]),
  Object.freeze(["n\u00f8_swap", "no_swap", false]),
  Object.freeze(["no_swap", "n\u00f8_swap", false]),
  Object.freeze(["unknown", "unknown", false]),
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
    exportName: "atLeastAsStrictFungi",
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  assert.equal(prepared.registrySetId, REGISTRY_ID);
  assert.equal(prepared.registrySetDigest, REGISTRY_DIGEST);
  return prepared.packageExecutionHandle;
}

it(
  "publishes and independently re-admits residency strictness through SLIDE/VOK",
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
          name: "atLeastAsStrictFungi",
          sourceFlowName: "atLeastAsStrictFungi",
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

    const parent = await mkdtemp(join(tmpdir(), "galerina-residency-strictness-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
      assert.equal(slideFiles.length, 1);

      for (const [tier, floor, expected] of [...CANONICAL_PAIRS, ...HOSTILE_PAIRS]) {
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          [tier, floor],
          { steps: 256, textComparisonWork: 65_536 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(
          receipt,
          verificationExpectation(receipt),
        );
        assert.equal(verified.verdict, 1, JSON.stringify(verified));
        assert.equal(verified.value, expected);
        assert.equal(verified.value, atLeastAsStrict(tier, floor));
        assert.equal(verified.authorityReleased, false);
      }

      for (const invalidArguments of [
        [],
        ["no_swap"],
        ["no_swap", "no_disk", "extra"],
        [1, "no_disk"],
        ["no_swap", 2],
        ["\ud800", "no_disk"],
        ["no_swap", "\ud800"],
      ]) {
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          invalidArguments,
          { steps: 256, textComparisonWork: 65_536 },
        );
        assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
        assert.equal(refused.safeValueTypeId, 0);
      }

      const exhaustedSteps = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, publicationDirectory, context),
        ["unrestricted", "unrestricted"],
        { steps: 1, textComparisonWork: 65_536 },
      );
      assert.equal(exhaustedSteps.status, "REFUSED", JSON.stringify(exhaustedSteps));

      const mutatedPath = join(publicationDirectory, slideFiles[0]);
      const mutatedBytes = await readFile(mutatedPath);
      mutatedBytes[0] ^= 0x01;
      await writeFile(mutatedPath, mutatedBytes);
      const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/core-compiler",
        exportName: "atLeastAsStrictFungi",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
