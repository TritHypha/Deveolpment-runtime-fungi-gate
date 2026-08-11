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
const PACKAGE_IDENTITY = "@galerina/core-runtime";
const EXPORT_NAME = "vokAuthorityVerdict";
const PIN_PATH = join(ROOT, "docs", "security", "slide-reference-tool-pin.json");
const MANIFEST_PATH = join(
  ROOT,
  "docs",
  "security",
  "slide-source-manifests",
  "vok-authority-verdict-v1.json",
);
const PUBLICATION = join(
  ROOT,
  "build",
  "slide-package-candidates",
  "vok-authority-verdict-v1",
  "publication",
);
const SOURCE_PATH = join(
  ROOT,
  "packages-galerina",
  "galerina-core-runtime",
  "src",
  "self-hosted",
  "vok-authority-admission.fungi",
);
const SOURCE_DIGEST = "133d8444e7f0e37acdc13e3b4fe056c451e663b93eac3df7f8f1371e6d3de10d";
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

function expectedMin(vector) {
  if (vector.some((value) => !Number.isInteger(value) || value < -1 || value > 1)) {
    return -1;
  }
  return Math.min(...vector);
}

function* k3Vectors(width, prefix = []) {
  if (prefix.length === width) {
    yield prefix;
    return;
  }
  for (const value of [-1, 0, 1]) {
    yield* k3Vectors(width, [...prefix, value]);
  }
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
    packageIdentity: PACKAGE_IDENTITY,
    exportName: EXPORT_NAME,
    compilerProfileId: artifact.compilerProfileId,
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
  assert.equal(pin.repositoryCommit, "eed124974b6ddf6cd54e14d48e4b36996ed59f57");
  assert.equal(pin.toolFileCount, 91);
  assert.equal(exactKeys(manifest, ["schema", "context", "packages"]), true);
  assert.equal(manifest.schema, "slide.checked-fungi.source-manifest.v1");
  const source = await readFile(SOURCE_PATH);
  assert.equal(sha256(source), SOURCE_DIGEST);
  const toolManifestPath = join(
    SLIDE_ROOT,
    "governance",
    "checked-fungi-package-tool-manifest.json",
  );
  const toolManifestBytes = await readFile(toolManifestPath);
  assert.equal(slideToolManifestDigest(toolManifestBytes), pin.toolManifestDigest);
  return { pin, manifest, toolManifestPath };
}

async function execute(loader, manifest, vector) {
  const prepared = await loader.prepareCheckedFungiPackagePublication({
    publicationDirectory: PUBLICATION,
    packageIdentity: PACKAGE_IDENTITY,
    exportName: EXPORT_NAME,
    context: manifest.context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  const receipt = loader.executeTypedCheckedFungiPackagePublication(
    prepared.packageExecutionHandle,
    vector,
    { steps: 256 },
  );
  assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", JSON.stringify(receipt));
  assert.equal(receipt.fallbackInvoked, false);
  const verified = loader.verifyTypedCheckedFungiPackageReceipt(receipt, {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: PACKAGE_IDENTITY,
    exportName: EXPORT_NAME,
    receiptDigest: receipt.receiptDigest,
    safeValueTypeId: receipt.safeValueTypeId,
    safeValueStateId: receipt.safeValueStateId,
    safeValueProvenanceDigest: receipt.safeValueProvenanceDigest,
  });
  assert.equal(verified.verdict, 1, JSON.stringify(verified));
  return verified.value;
}

describe("Contract 86 VOK authority source candidate", () => {
  it("re-admits and executes every nine-trit vector through physical SLIDE", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
    timeout: 300_000,
  }, async () => {
    const { manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    let vectors = 0;
    let authorizing = 0;
    for (const vector of k3Vectors(9)) {
      const actual = await execute(loader, manifest, vector);
      assert.equal(actual, expectedMin(vector), JSON.stringify(vector));
      vectors += 1;
      if (actual === 1) authorizing += 1;
    }
    assert.equal(vectors, 19_683);
    assert.equal(authorizing, 1);
  });

  it("refuses caller-owned authentication for the exact authorizing vector", {
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
    assert.equal(authenticator.provisioningVerdict, 0);
    assert.equal(authenticator.provisioningStatus, "AUTHORITY_PROVISIONING_REQUIRED");
    const authenticated = authenticator.openHandle();
    assert.equal(authenticated.verdict, -1, JSON.stringify(authenticated));
    assert.equal(authenticated.authenticatedObjectHandleState, "ABSENT");
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: PUBLICATION,
      packageIdentity: PACKAGE_IDENTITY,
      exportName: EXPORT_NAME,
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
    const receipt = loader.executeAuthenticatedTypedCheckedFungiPackagePublication(
      prepared.packageExecutionHandle,
      authenticated.authenticatedObjectHandle,
      Array(9).fill(1),
      { steps: 256 },
      { toolManifestDigest: pin.toolManifestDigest, currentEpoch: 15 },
    );
    assert.equal(receipt.verdict, -1, JSON.stringify(receipt));
    assert.equal(receipt.status, "REFUSED");
    assert.equal(receipt.authenticated, false);
    assert.equal(receipt.fallbackInvoked, false);
  });

  it("refuses malformed trits through the physical object", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    for (const malformed of [-2, 2, 7, 2_147_483_647, -2_147_483_648]) {
      const vector = Array(9).fill(1);
      vector[4] = malformed;
      assert.equal(await execute(loader, manifest, vector), -1);
    }
  });

  it("rebuilds the exact source-free publication", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, toolManifestPath } = await authority();
    const parent = await mkdtemp(join(ROOT, "build", "contract86-rebuild-"));
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

  it("refuses a one-byte mutation of the physical object", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { manifest } = await authority();
    const parent = await mkdtemp(join(tmpdir(), "galerina-contract86-mutant-"));
    TEMP.push(parent);
    const mutant = join(parent, "publication");
    await cp(PUBLICATION, mutant, { recursive: true, errorOnExist: true });
    const publication = JSON.parse(await readFile(join(mutant, "package-set.receipt.json"), "utf8"));
    const artifactName = basename(publication.artifacts[0].fileName);
    const artifactPath = join(mutant, artifactName);
    const bytes = await readFile(artifactPath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(artifactPath, bytes);
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: mutant,
      packageIdentity: PACKAGE_IDENTITY,
      exportName: EXPORT_NAME,
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, -1);
  });
});
