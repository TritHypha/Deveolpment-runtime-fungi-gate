import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  REGISTRY_ARTIFACT_PROFILE,
  hashFlatPackageArtifact,
  resolveFlatWorkspacePackage,
} from "../lib/registry-package-artifact.mjs";

function withWorkspace(run) {
  const root = mkdtempSync(join(tmpdir(), "galerina-flat-artifact-"));
  const packages = join(root, "packages-galerina");
  mkdirSync(packages);
  try {
    return run({ root, packages });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writePackage(packages, {
  directory = "example",
  name = "@galerina/example",
  files = {},
} = {}) {
  const packageRoot = join(packages, directory);
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(
    join(packageRoot, "package.json"),
    `${JSON.stringify({ name, version: "1.0.0" }, null, 2)}\n`,
    "utf8",
  );
  for (const [relativePath, contents] of Object.entries(files)) {
    const destination = join(packageRoot, ...relativePath.split("/"));
    mkdirSync(join(destination, ".."), { recursive: true });
    writeFileSync(destination, contents);
  }
  return packageRoot;
}

function independentDigest(entries) {
  const digest = createHash("sha256");
  digest.update(Buffer.from("galerina.package.artifact.tree.v1\0", "utf8"));
  for (const [relativePath, contents] of entries) {
    const pathBytes = Buffer.from(relativePath, "utf8");
    const fileBytes = Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(contents, "utf8");
    const pathLength = Buffer.alloc(8);
    const fileLength = Buffer.alloc(8);
    pathLength.writeBigUInt64BE(BigInt(pathBytes.length));
    fileLength.writeBigUInt64BE(BigInt(fileBytes.length));
    digest.update(pathLength);
    digest.update(pathBytes);
    digest.update(fileLength);
    digest.update(fileBytes);
  }
  return `sha256:${digest.digest("hex")}`;
}

function hashExample(packages, artifactFiles) {
  return hashFlatPackageArtifact({
    workspacePackagesDir: packages,
    packageName: "@galerina/example",
    artifactProfile: REGISTRY_ARTIFACT_PROFILE,
    artifactFiles,
  });
}

test("hashes one flat package with canonical length-framed bytes", () =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages, {
      files: {
        LICENSE: "license\n",
        "src/index.ts": "export const answer = 42;\n",
      },
    });
    const packageJson = `${JSON.stringify({
      name: "@galerina/example",
      version: "1.0.0",
    }, null, 2)}\n`;
    const artifactFiles = ["LICENSE", "package.json", "src/index.ts"];
    const expected = independentDigest([
      ["LICENSE", "license\n"],
      ["package.json", packageJson],
      ["src/index.ts", "export const answer = 42;\n"],
    ]);

    assert.equal(
      expected,
      "sha256:127c4e3af8af7c0ef9eb987ee024365b7f6a34e94c879bf2889ad9f347f56161",
    );
    assert.deepEqual(hashExample(packages, artifactFiles), {
      packageRoot,
      packageDirectory: "example",
      fileCount: 3,
      totalBytes:
        Buffer.byteLength("license\n")
        + Buffer.byteLength(packageJson)
        + Buffer.byteLength("export const answer = 42;\n"),
      hash: expected,
    });
  }));

test("content and declared path identities change the digest", () =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages, {
      files: {
        "src/a.ts": "same\n",
        "src/b.ts": "same\n",
      },
    });
    const first = hashExample(packages, ["package.json", "src/a.ts"]).hash;
    const renamed = hashExample(packages, ["package.json", "src/b.ts"]).hash;
    writeFileSync(join(packageRoot, "src", "a.ts"), "same!\n", "utf8");
    const changed = hashExample(packages, ["package.json", "src/a.ts"]).hash;

    assert.notEqual(first, renamed);
    assert.notEqual(first, changed);
  }));

test("filesystem creation order cannot affect the declared-order digest", () => {
  const hashes = [];
  for (const order of [
    [["a.txt", "a"], ["z.txt", "z"]],
    [["z.txt", "z"], ["a.txt", "a"]],
  ]) {
    hashes.push(withWorkspace(({ packages }) => {
      writePackage(packages, { files: Object.fromEntries(order) });
      return hashExample(packages, ["a.txt", "package.json", "z.txt"]).hash;
    }));
  }
  assert.equal(hashes[0], hashes[1]);
});

test("refuses empty, unsorted and duplicate artifact file sets", () =>
  withWorkspace(({ packages }) => {
    writePackage(packages, { files: { "a.txt": "a", "b.txt": "b" } });
    assert.throws(() => hashExample(packages, []), /artifactFiles.*non-empty/);
    assert.throws(
      () => hashExample(packages, ["b.txt", "a.txt"]),
      /canonical lexical order/,
    );
    assert.throws(
      () => hashExample(packages, ["a.txt", "a.txt"]),
      /duplicate artifact path/,
    );
  }));

test("refuses non-canonical, absolute and traversing artifact paths", () =>
  withWorkspace(({ packages }) => {
    writePackage(packages, { files: { "a.txt": "a" } });
    for (const invalidPath of [
      "",
      ".",
      "./a.txt",
      "a//b.txt",
      "a/./b.txt",
      "../a.txt",
      "a/../../b.txt",
      "a\\b.txt",
      "/absolute.txt",
      "C:/absolute.txt",
      "//server/share.txt",
    ]) {
      assert.throws(
        () => hashExample(packages, [invalidPath]),
        /artifact path/,
        invalidPath,
      );
    }
  }));

test("refuses unknown profiles, missing files and directories", () =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages, { files: { "a.txt": "a" } });
    mkdirSync(join(packageRoot, "directory"));
    assert.throws(
      () =>
        hashFlatPackageArtifact({
          workspacePackagesDir: packages,
          packageName: "@galerina/example",
          artifactProfile: "unknown/v1",
          artifactFiles: ["a.txt"],
        }),
      /unsupported artifact profile/,
    );
    assert.throws(
      () => hashExample(packages, ["missing.txt"]),
      /artifact file is missing/,
    );
    assert.throws(
      () => hashExample(packages, ["directory"]),
      /artifact path is not a regular file/,
    );
  }));

test("refuses symlinked artifact files when the platform permits creation", (t) =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages, { files: { "target.txt": "x" } });
    try {
      symlinkSync("target.txt", join(packageRoot, "link.txt"), "file");
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip("this host does not permit an unprivileged file symlink");
        return;
      }
      throw error;
    }
    assert.throws(
      () => hashExample(packages, ["link.txt"]),
      /artifact path must not be a symlink or reparse point/,
    );
  }));

test("refuses oversized paths, file counts, files and total artifacts", (t) =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages, { files: { "a.txt": "a" } });
    assert.throws(
      () => hashExample(packages, [`${"a".repeat(513)}`]),
      /artifact path exceeds 512 UTF-8 bytes/,
    );
    assert.throws(
      () =>
        hashExample(
          packages,
          Array.from({ length: 4_097 }, (_, index) =>
            `f-${String(index).padStart(4, "0")}.txt`),
        ),
      /artifactFiles exceeds 4096 entries/,
    );

    const largePath = join(packageRoot, "large.bin");
    writeFileSync(largePath, Buffer.alloc((16 * 1024 * 1024) + 1));
    assert.throws(
      () => hashExample(packages, ["large.bin"]),
      /artifact file exceeds 16777216 bytes/,
    );

    const sharedPath = join(packageRoot, "part-0.bin");
    writeFileSync(sharedPath, Buffer.alloc(13 * 1024 * 1024));
    try {
      for (let index = 1; index < 6; index += 1) {
        linkSync(sharedPath, join(packageRoot, `part-${index}.bin`));
      }
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip("this host does not permit the hard-link total-size fixture");
        return;
      }
      throw error;
    }
    assert.throws(
      () =>
        hashExample(
          packages,
          Array.from({ length: 6 }, (_, index) => `part-${index}.bin`),
        ),
      /artifact exceeds 67108864 total bytes/,
    );
  }));

test("resolves exactly one direct package identity", () =>
  withWorkspace(({ packages }) => {
    const packageRoot = writePackage(packages);
    assert.deepEqual(
      resolveFlatWorkspacePackage(packages, "@galerina/example"),
      {
        packageRoot,
        packageDirectory: "example",
      },
    );

    writePackage(packages, { directory: "duplicate" });
    assert.throws(
      () => resolveFlatWorkspacePackage(packages, "@galerina/example"),
      /duplicate direct package identity/,
    );
  }));

test("refuses mismatched, nested-only and symlinked package identities", (t) =>
  withWorkspace(({ root, packages }) => {
    writePackage(packages, {
      directory: "other",
      name: "@galerina/other",
    });
    const nested = join(packages, "holder", "node_modules");
    mkdirSync(nested, { recursive: true });
    writePackage(nested);
    assert.throws(
      () => resolveFlatWorkspacePackage(packages, "@galerina/example"),
      /no direct package identity/,
    );

    const targetParent = join(root, "outside");
    mkdirSync(targetParent);
    writePackage(targetParent, { directory: "linked" });
    try {
      symlinkSync(
        join(targetParent, "linked"),
        join(packages, "linked"),
        "junction",
      );
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip("this host does not permit an unprivileged directory link");
        return;
      }
      throw error;
    }
    assert.throws(
      () => resolveFlatWorkspacePackage(packages, "@galerina/example"),
      /no direct package identity/,
    );
  }));
