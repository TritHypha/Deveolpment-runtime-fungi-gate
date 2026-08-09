import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildReceiptBoundSlidePackage,
  digestRuntimeFile,
  slideToolManifestDigest,
} from "../lib/receipt-bound-slide-build.mjs";
import { createDisposableSlideObjectAuthenticator } from "./helpers/disposable-slide-object-authentication.mjs";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const TEMP = [];
const PIN_PATH = join(ROOT, "docs", "security", "slide-reference-tool-pin.json");
const MANIFEST_PATH = join(ROOT, "docs", "security", "slide-source-manifests", "restore-verdict-v1.json");
const PUBLICATION = join(ROOT, "build", "slide-package-candidates", "restore-verdict-v1", "publication");
const SOURCE_PATH = join(
  ROOT,
  "packages-galerina",
  "galerina-core-sentinel-state",
  "src",
  "self-hosted",
  "cold-boot.fungi",
);
const SOURCE_DIGEST = "5040e0b1ff890f602b8629f6205cee95f4236c502a446579f9184f27d22cf996";
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

after(async () => {
  await Promise.all(TEMP.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

function authenticatedExpectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    slideBundleDigest: receipt.slideBundleDigest,
    compilerProfileId: receipt.compilerProfileId,
    toolManifestDigest: receipt.toolManifestDigest,
    currentEpoch: receipt.currentEpoch,
    authenticationConsumptionDigest: receipt.authenticationConsumptionDigest,
    typedReceiptDigest: receipt.typedReceiptDigest,
    receiptDigest: receipt.receiptDigest,
    typedReceiptExpectation: {
      packageSetDigest: receipt.typedReceipt.packageSetDigest,
      packageIdentity: receipt.typedReceipt.packageIdentity,
      exportName: receipt.typedReceipt.exportName,
      receiptDigest: receipt.typedReceipt.receiptDigest,
      safeValueTypeId: receipt.typedReceipt.safeValueTypeId,
      safeValueStateId: receipt.typedReceipt.safeValueStateId,
      safeValueProvenanceDigest: receipt.typedReceipt.safeValueProvenanceDigest,
    },
  };
}

async function publishedObject() {
  const receipt = JSON.parse(await readFile(join(PUBLICATION, "package-set.receipt.json"), "utf8"));
  const artifact = receipt.artifacts[0];
  return {
    objectBytes: new Uint8Array(await readFile(join(PUBLICATION, basename(artifact.fileName)))),
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    compilerProfileId: artifact.compilerProfileId,
  };
}

async function receiptBackedAuthority(loader, hybrid, manifest, pin, decisionCount) {
  const handles = [];
  const authenticator = createDisposableSlideObjectAuthenticator(hybrid, {
    ...await publishedObject(),
    toolManifestDigest: pin.toolManifestDigest,
  });
  assert.equal(authenticator.verdict, 1);
  for (let index = 0; index < decisionCount; index += 1) {
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: PUBLICATION,
      packageIdentity: "@galerina/core-sentinel-state",
      exportName: "restoreVerdict",
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
    const authenticated = authenticator.openHandle();
    assert.equal(authenticated.verdict, 1, JSON.stringify(authenticated));
    handles.push({
      packageExecutionHandle: prepared.packageExecutionHandle,
      authenticatedObjectHandle: authenticated.authenticatedObjectHandle,
    });
  }

  return {
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    restoreVerdict(snapshotPresent, integrityOk) {
      const selected = handles.shift();
      assert.notEqual(selected, undefined, "one prepared affine handle per restore decision");
      const receipt = loader.executeAuthenticatedTypedCheckedFungiPackagePublication(
        selected.packageExecutionHandle,
        selected.authenticatedObjectHandle,
        [snapshotPresent, integrityOk],
        { steps: 64 },
        { toolManifestDigest: pin.toolManifestDigest, currentEpoch: 15 },
      );
      assert.equal(
        receipt.status,
        "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        JSON.stringify(receipt),
      );
      assert.equal(receipt.fallbackInvoked, false);
      const verified = loader.verifyAuthenticatedTypedCheckedFungiPackageReceipt(
        receipt,
        authenticatedExpectation(receipt),
      );
      assert.equal(verified.verdict, 1, JSON.stringify(verified));
      return verified.value;
    },
    remaining() {
      return handles.length;
    },
  };
}

async function authority() {
  const pinBytes = await readFile(PIN_PATH);
  const manifestBytes = await readFile(MANIFEST_PATH);
  const pin = JSON.parse(pinBytes.toString("utf8"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(`${JSON.stringify(pin, null, 2)}\n`, pinBytes.toString("utf8"));
  assert.equal(`${JSON.stringify(manifest, null, 2)}\n`, manifestBytes.toString("utf8"));
  assert.equal(exactKeys(pin, ["schema", "repositoryCommit", "toolManifestDigest", "toolFileCount"]), true);
  assert.equal(pin.schema, "galerina.slide.reference-tool-pin.v1");
  assert.equal(pin.repositoryCommit, "39920eb997a27bcb8deb937dcd97ef59612245aa");
  assert.equal(pin.toolFileCount, 89);
  assert.equal(exactKeys(manifest, ["schema", "context", "packages"]), true);
  assert.equal(manifest.schema, "slide.checked-fungi.source-manifest.v1");
  const source = await readFile(SOURCE_PATH);
  assert.equal(sha256(source), SOURCE_DIGEST);
  const toolManifestPath = join(SLIDE_ROOT, "governance", "checked-fungi-package-tool-manifest.json");
  const toolManifestBytes = await readFile(toolManifestPath);
  assert.equal(slideToolManifestDigest(toolManifestBytes), pin.toolManifestDigest);
  return { pin, manifest, toolManifestPath };
}

describe("Contract 85 real restoreVerdict source candidate", () => {
  it("re-admits and executes the committed source-free publication", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const hybrid = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "hybrid-object-authentication.mjs"),
    ).href);
    const authenticator = createDisposableSlideObjectAuthenticator(hybrid, {
      ...await publishedObject(),
      toolManifestDigest: pin.toolManifestDigest,
    });
    assert.equal(authenticator.verdict, 1);
    for (const [arguments_, expected] of [
      [[true, true], 1],
      [[false, true], -1],
      [[true, false], -1],
    ]) {
      const prepared = await loader.prepareCheckedFungiPackagePublication({
        publicationDirectory: PUBLICATION,
        packageIdentity: "@galerina/core-sentinel-state",
        exportName: "restoreVerdict",
        context: manifest.context,
        gates: ALL_ALLOW,
      });
      assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
      const authenticated = authenticator.openHandle();
      assert.equal(authenticated.verdict, 1, JSON.stringify(authenticated));
      const receipt = loader.executeAuthenticatedTypedCheckedFungiPackagePublication(
        prepared.packageExecutionHandle,
        authenticated.authenticatedObjectHandle,
        arguments_,
        { steps: 64 },
        { toolManifestDigest: pin.toolManifestDigest, currentEpoch: 15 },
      );
      assert.equal(
        receipt.status,
        "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        JSON.stringify(receipt),
      );
      const verified = loader.verifyAuthenticatedTypedCheckedFungiPackageReceipt(
        receipt,
        authenticatedExpectation(receipt),
      );
      assert.equal(verified.verdict, 1, JSON.stringify(verified));
      assert.equal(verified.value, expected);
      assert.equal(receipt.fallbackInvoked, false);
    }
  });

  it("rebuilds the exact artifact with the pinned SLIDE tool", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, toolManifestPath } = await authority();
    const parent = await mkdtemp(join(ROOT, "build", "contract85-rebuild-"));
    TEMP.push(parent);
    const rebuilt = join(parent, "publication");
    const result = await buildReceiptBoundSlidePackage({
      rootDirectory: ROOT,
      sourceManifestPath: MANIFEST_PATH,
      outputDirectory: rebuilt,
      slideToolRoot: SLIDE_ROOT,
      slideToolManifestPath: toolManifestPath,
      expectedSlideToolManifestDigest: pin.toolManifestDigest,
      expectedRuntimeDigest: await digestRuntimeFile(process.execPath),
    });
    assert.equal(result.verdict, 1, JSON.stringify(result));
    assert.equal(result.artifactCount, 1);
    const artifactName = result.outputFiles.find((name) => name.endsWith(".slide"));
    assert.equal(typeof artifactName, "string");
    assert.deepEqual(
      await readFile(join(rebuilt, artifactName)),
      await readFile(join(PUBLICATION, artifactName)),
    );
  });

  it("refuses a one-byte mutation of the committed physical object", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { manifest } = await authority();
    const parent = await mkdtemp(join(tmpdir(), "galerina-contract85-mutant-"));
    TEMP.push(parent);
    const mutant = join(parent, "publication");
    await cp(PUBLICATION, mutant, { recursive: true, errorOnExist: true });
    const receipt = JSON.parse(await readFile(join(mutant, "package-set.receipt.json"), "utf8"));
    const artifactName = basename(receipt.artifacts[0].fileName);
    const artifactPath = join(mutant, artifactName);
    const bytes = await readFile(artifactPath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(artifactPath, bytes);
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: mutant,
      packageIdentity: "@galerina/core-sentinel-state",
      exportName: "restoreVerdict",
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, -1);
  });

  it("drives the real cold-boot consumer with receipt-verified decisions", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const hybrid = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "hybrid-object-authentication.mjs"),
    ).href);
    const sentinel = await import(pathToFileURL(join(
      ROOT,
      "packages-galerina",
      "galerina-core-sentinel-state",
      "dist",
      "index.js",
    )).href);
    const parent = await mkdtemp(join(ROOT, "build", "contract85-consumer-"));
    TEMP.push(parent);
    const decisionAuthority = await receiptBackedAuthority(loader, hybrid, manifest, pin, 3);
    const orchestrator = new sentinel.ColdBootOrchestrator(
      new sentinel.StateSerializer(),
      new sentinel.AtomicWriter(parent),
      decisionAuthority,
    );

    orchestrator.checkpoint("valid", { recovered: true }, 85);
    assert.deepEqual(orchestrator.restore("valid"), {
      payload: { recovered: true },
      logicalTick: 85,
    });

    assert.throws(
      () => orchestrator.restore("missing"),
      (error) => error instanceof sentinel.HardenedBorderViolation
        && error.code === "LSS-NOSNAP-001",
    );

    orchestrator.checkpoint("tampered", { recovered: false }, 86);
    const tamperedPath = join(parent, "tampered.snap");
    const tampered = JSON.parse(await readFile(tamperedPath, "utf8"));
    tampered.payloadJson = tampered.payloadJson.replace("false", "true");
    await writeFile(tamperedPath, JSON.stringify(tampered), "utf8");
    assert.throws(
      () => orchestrator.restore("tampered"),
      (error) => error instanceof sentinel.SecurityTrap
        && error.code === "LSS-INTEGRITY-001",
    );
    assert.equal(decisionAuthority.remaining(), 0);
  });
});
