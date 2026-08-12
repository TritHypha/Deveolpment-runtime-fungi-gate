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
  "galerina-core-reports",
  "src",
  "self-hosted",
  "report-status.fungi",
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
const REGISTRY_ID = "slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1";
const REGISTRY_DIGEST = "d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc";
const COUNTS = Object.freeze([-1, 0, 1]);

function expectedStatus({ warnings, errors, critical }) {
  if (critical > 0) return "critical";
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "ok";
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
    packageIdentity: "@galerina/core-reports",
    exportName: "selectReportStatus",
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  assert.equal(prepared.registrySetId, REGISTRY_ID);
  assert.equal(prepared.registrySetDigest, REGISTRY_DIGEST);
  return prepared.packageExecutionHandle;
}

it(
  "publishes and independently re-admits report status through SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sourceBytes = Uint8Array.from(readFileSync(SOURCE));
    const request = (candidateBytes) => ({
      packages: [{
        identity: "@galerina/core-reports",
        version: "1.0.0-beta.2",
        exports: [{
          name: "selectReportStatus",
          sourceFlowName: "selectReportStatus",
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
    assert.deepEqual(compiled.exports[0].parameterTypeIds, [slide.SAFE_VALUE_TYPE_IDS.record]);
    assert.equal(compiled.exports[0].resultTypeId, slide.SAFE_VALUE_TYPE_IDS.string);
    assert.equal(compiled.exports[0].registrySetId, REGISTRY_ID);
    assert.equal(compiled.exports[0].registrySetDigest, REGISTRY_DIGEST);

    const mutatedSourceBytes = Uint8Array.from(sourceBytes);
    mutatedSourceBytes[0] ^= 0x01;
    assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSourceBytes)).verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-report-status-slide-"));
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
      for (const warnings of COUNTS) {
        for (const errors of COUNTS) {
          for (const critical of COUNTS) {
            const input = Object.freeze({ warnings, errors, critical });
            const receipt = slide.executeTypedCheckedFungiPackagePublication(
              await prepare(slide, publicationDirectory, context),
              [input],
              { steps: 256, textComparisonWork: 65_536 },
            );
            assert.equal(
              receipt.status,
              "SUCCEEDED_PHYSICAL_REFERENCE_ONLY",
              JSON.stringify(receipt),
            );
            assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.string);
            const verified = slide.verifyTypedCheckedFungiPackageReceipt(
              receipt,
              verificationExpectation(receipt),
            );
            assert.equal(verified.verdict, 1, JSON.stringify(verified));
            assert.equal(verified.value, expectedStatus(input), JSON.stringify(input));
            assert.equal(verified.authorityReleased, false);
            retainedReceipt = receipt;
          }
        }
      }

      const inherited = Object.create({ warnings: 0 });
      inherited.errors = 0;
      inherited.critical = 0;
      const accessor = { warnings: 0, errors: 0 };
      Object.defineProperty(accessor, "critical", { enumerable: true, get: () => 0 });
      const hostileRecords = [
        [],
        [0],
        [{ warnings: 0, errors: 0 }],
        [{ warnings: 0, errors: 0, critical: 0, extra: 0 }],
        [{ warnings: 0.5, errors: 0, critical: 0 }],
        [{ warnings: Number.NaN, errors: 0, critical: 0 }],
        [inherited],
        [accessor],
        [new Proxy({ warnings: 0, errors: 0, critical: 0 }, {})],
        [{ warnings: 0, errors: 0, critical: 0 }, "extra"],
      ];
      for (const invalidArguments of hostileRecords) {
        const refused = slide.executeTypedCheckedFungiPackagePublication(
          await prepare(slide, publicationDirectory, context),
          invalidArguments,
          { steps: 256, textComparisonWork: 65_536 },
        );
        assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
        assert.equal(refused.safeValueTypeId, 0);
      }

      const exhausted = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, publicationDirectory, context),
        [{ warnings: 1, errors: 1, critical: 1 }],
        { steps: 1, textComparisonWork: 65_536 },
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
        packageIdentity: "@galerina/core-reports",
        exportName: "selectReportStatus",
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(mutationAdmission.verdict, -1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);
