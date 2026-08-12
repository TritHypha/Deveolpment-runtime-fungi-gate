import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";

import { verifyMillionIterationSourcePair } from "../src/million-iteration-source-pair.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = join(HERE, "..", "..", "..");
const MANIFEST = join(
  HERE,
  "..",
  "contracts",
  "million-iteration-source-pair-v1.json",
);
const CHECKED_PATH = "docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi";
const VERIFIED_PATH = "docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi";
const temporaryRoots = [];

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function copyFixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-million-source-pair-"));
  temporaryRoots.push(root);
  for (const relativePath of [CHECKED_PATH, VERIFIED_PATH]) {
    const destination = join(root, ...relativePath.split("/"));
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(REPOSITORY_ROOT, ...relativePath.split("/")), destination, {
      recursive: false,
    });
  }
  const manifestPath = join(root, "million-iteration-source-pair-v1.json");
  cpSync(MANIFEST, manifestPath);
  return { root, manifestPath };
}

function updateManifest(manifestPath, update) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  update(manifest);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

test("binds the exact checked and verified million-iteration source pair", async () => {
  const receipt = await verifyMillionIterationSourcePair({
    repositoryRoot: REPOSITORY_ROOT,
    manifestPath: MANIFEST,
  });

  assert.equal(receipt.schema, "galerina.benchmark.million-iteration-source-pair-receipt.v1");
  assert.equal(receipt.verdict, 1);
  assert.equal(receipt.status, "VERIFIED_NON_AUTHORIZING");
  assert.equal(receipt.referenceOnly, true);
  assert.equal(receipt.authorityReleased, false);
  assert.deepEqual(
    receipt.subjects.map(({ role, path, candidate, k3, failureIds }) => ({
      role,
      path,
      candidate,
      k3,
      failureIds,
    })),
    [
      {
        role: "checked",
        path: CHECKED_PATH,
        candidate: false,
        k3: -1,
        failureIds: ["VERIFIED_NATIVE_PERMISSION_MISSING"],
      },
      {
        role: "verified",
        path: VERIFIED_PATH,
        candidate: true,
        k3: 0,
        failureIds: ["INDEPENDENT_VERIFIER_UNAVAILABLE"],
      },
    ],
  );
});

test("refuses source-byte drift even when the manifest remains pinned", async () => {
  const { root, manifestPath } = copyFixture();
  const checked = join(root, ...CHECKED_PATH.split("/"));
  writeFileSync(
    checked,
    readFileSync(checked, "utf8").replace("MILLION_LENGTH", "MILLION_LENGTH_DRIFT"),
    "utf8",
  );

  const receipt = await verifyMillionIterationSourcePair({
    repositoryRoot: root,
    manifestPath,
  });
  assert.equal(receipt.verdict, -1);
  assert.equal(receipt.failureId, "SOURCE_DIGEST_MISMATCH");
  assert.equal(receipt.authorityReleased, false);
});

test("refuses semantic drift even when an attacker refreshes the source digest", async () => {
  const { root, manifestPath } = copyFixture();
  const checked = join(root, ...CHECKED_PATH.split("/"));
  const drifted = readFileSync(checked, "utf8").replace(
    "i = i + 1",
    "i = i + 2",
  );
  writeFileSync(checked, drifted, "utf8");

  updateManifest(manifestPath, (manifest) => {
    manifest.subjects[0].sha256 = sha256(Buffer.from(drifted, "utf8"));
  });

  const receipt = await verifyMillionIterationSourcePair({
    repositoryRoot: root,
    manifestPath,
  });
  assert.equal(receipt.verdict, -1);
  assert.equal(receipt.failureId, "SOURCE_SEMANTICS_MISMATCH");
  assert.equal(receipt.authorityReleased, false);
});

test("refuses a manifest that swaps the checked and verified roles", async () => {
  const { root, manifestPath } = copyFixture();
  updateManifest(manifestPath, (manifest) => {
    [manifest.subjects[0].role, manifest.subjects[1].role] = [
      manifest.subjects[1].role,
      manifest.subjects[0].role,
    ];
  });

  const receipt = await verifyMillionIterationSourcePair({
    repositoryRoot: root,
    manifestPath,
  });
  assert.equal(receipt.verdict, -1);
  assert.equal(receipt.failureId, "SOURCE_PAIR_MANIFEST_INVALID");
  assert.equal(receipt.authorityReleased, false);
});

test("refuses surplus and duplicate manifest facts", async () => {
  const surplus = copyFixture();
  updateManifest(surplus.manifestPath, (manifest) => {
    manifest.surplus = false;
  });
  assert.equal(
    (await verifyMillionIterationSourcePair({
      repositoryRoot: surplus.root,
      manifestPath: surplus.manifestPath,
    })).failureId,
    "SOURCE_PAIR_MANIFEST_INVALID",
  );

  const duplicate = copyFixture();
  const text = readFileSync(duplicate.manifestPath, "utf8").replace(
    '"benchmark": "verified-native-operation",',
    '"benchmark": "verified-native-operation",\n  "benchmark": "verified-native-operation",',
  );
  writeFileSync(duplicate.manifestPath, text, "utf8");
  assert.equal(
    (await verifyMillionIterationSourcePair({
      repositoryRoot: duplicate.root,
      manifestPath: duplicate.manifestPath,
    })).failureId,
    "SOURCE_PAIR_MANIFEST_INVALID",
  );
});

test("refuses inherited, accessor and proxy input objects", async () => {
  const inherited = Object.create({
    repositoryRoot: REPOSITORY_ROOT,
    manifestPath: MANIFEST,
  });
  assert.equal(
    (await verifyMillionIterationSourcePair(inherited)).failureId,
    "SOURCE_PAIR_INPUT_INVALID",
  );

  const accessor = {};
  Object.defineProperties(accessor, {
    repositoryRoot: { enumerable: true, get: () => REPOSITORY_ROOT },
    manifestPath: { enumerable: true, get: () => MANIFEST },
  });
  assert.equal(
    (await verifyMillionIterationSourcePair(accessor)).failureId,
    "SOURCE_PAIR_INPUT_INVALID",
  );

  const proxy = new Proxy(
    { repositoryRoot: REPOSITORY_ROOT, manifestPath: MANIFEST },
    {},
  );
  assert.equal(
    (await verifyMillionIterationSourcePair(proxy)).failureId,
    "SOURCE_PAIR_INPUT_INVALID",
  );
});

test("refuses a non-single-link source before trusting its bytes", async () => {
  const { root, manifestPath } = copyFixture();
  const checked = join(root, ...CHECKED_PATH.split("/"));
  const verified = join(root, ...VERIFIED_PATH.split("/"));
  rmSync(checked);
  linkSync(verified, checked);

  const receipt = await verifyMillionIterationSourcePair({
    repositoryRoot: root,
    manifestPath,
  });
  assert.equal(receipt.verdict, -1);
  assert.equal(receipt.failureId, "SOURCE_FILE_INVALID");
});

test("refuses permission and loop-bound drift after digest refresh", async () => {
  const permission = copyFixture();
  const checked = join(permission.root, ...CHECKED_PATH.split("/"));
  const permissionSource = readFileSync(checked, "utf8").replace(
    "  effects {}\n",
    "  effects {}\n  permissions { require verified_native_checked_read_loop_v1 on values }\n",
  );
  writeFileSync(checked, permissionSource, "utf8");
  updateManifest(permission.manifestPath, (manifest) => {
    manifest.subjects[0].sha256 = sha256(Buffer.from(permissionSource, "utf8"));
    manifest.subjects[0].bytes = Buffer.byteLength(permissionSource, "utf8");
  });
  assert.equal(
    (await verifyMillionIterationSourcePair({
      repositoryRoot: permission.root,
      manifestPath: permission.manifestPath,
    })).failureId,
    "SOURCE_ROLE_MISMATCH",
  );

  const bound = copyFixture();
  updateManifest(bound.manifestPath, (manifest) => {
    for (const [index, relativePath] of [CHECKED_PATH, VERIFIED_PATH].entries()) {
      const path = join(bound.root, ...relativePath.split("/"));
      const source = readFileSync(path, "utf8").replaceAll("1000000", "999999");
      writeFileSync(path, source, "utf8");
      manifest.subjects[index].sha256 = sha256(Buffer.from(source, "utf8"));
      manifest.subjects[index].bytes = Buffer.byteLength(source, "utf8");
    }
  });
  assert.equal(
    (await verifyMillionIterationSourcePair({
      repositoryRoot: bound.root,
      manifestPath: bound.manifestPath,
    })).failureId,
    "SOURCE_ROLE_MISMATCH",
  );
});
