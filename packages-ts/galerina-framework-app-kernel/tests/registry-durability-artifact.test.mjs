import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {
  inspectRegistryDurabilityArtifactCandidate,
} from "../dist/index.js";

const FIXED_DIGESTS = Object.freeze({
  source: `sha256:${"1".repeat(64)}`,
  contract: `sha256:${"2".repeat(64)}`,
  toolchain: `sha256:${"4".repeat(64)}`,
  build: `sha256:${"5".repeat(64)}`,
  sourceReview: `sha256:${"6".repeat(64)}`,
  loaderTests: `sha256:${"7".repeat(64)}`,
  faultMatrix: `sha256:${"8".repeat(64)}`,
  crashEvidence: `sha256:${"9".repeat(64)}`,
  independentReview: `sha256:${"a".repeat(64)}`,
});

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function peFixture(machine = 0x8664) {
  const bytes = Buffer.alloc(88);
  bytes.write("MZ", 0, "ascii");
  bytes.writeUInt32LE(64, 0x3c);
  bytes.write("PE\0\0", 64, "binary");
  bytes.writeUInt16LE(machine, 68);
  return bytes;
}

function elfFixture(machine = 0x003e) {
  const bytes = Buffer.alloc(20);
  bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0);
  bytes.writeUInt16LE(machine, 18);
  return bytes;
}

function machOFixture(cpuType = 0x01000007) {
  const bytes = Buffer.alloc(8);
  bytes.writeUInt32LE(0xfeedfacf, 0);
  bytes.writeUInt32LE(cpuType, 4);
  return bytes;
}

function descriptor(bytes, overrides = {}) {
  return {
    schema: "galerina-registry-durability-adapter/v1",
    adapterId: "galerina.registry.durability.windows.v1",
    abiVersion: "galerina.registry.durability.abi.v1",
    platform: "windows",
    architecture: "x86_64",
    targetTriple: "x86_64-pc-windows-msvc",
    filesystems: ["ntfs", "refs"],
    loaderRelativePath: "native/win32-x64/registry-durability.node",
    binaryFormat: "pe-coff-node-api-v10",
    sourceDigest: FIXED_DIGESTS.source,
    contractDigest: FIXED_DIGESTS.contract,
    binaryDigest: sha256(bytes),
    toolchainDigest: FIXED_DIGESTS.toolchain,
    buildRecipeDigest: FIXED_DIGESTS.build,
    evidence: {
      sourceReviewDigest: FIXED_DIGESTS.sourceReview,
      hostileLoaderTestsDigest: FIXED_DIGESTS.loaderTests,
      deterministicFaultMatrixDigest: FIXED_DIGESTS.faultMatrix,
      platformCrashEvidenceDigest: FIXED_DIGESTS.crashEvidence,
      independentReviewDigest: FIXED_DIGESTS.independentReview,
    },
    ...overrides,
  };
}

async function withArtifact(
  bytes,
  run,
  relative = "native/win32-x64/registry-durability.node",
) {
  const root = await mkdtemp(join(tmpdir(), "galerina-durability-artifact-"));
  const artifact = join(root, relative);
  try {
    await mkdir(dirname(artifact), { recursive: true });
    await writeFile(artifact, bytes, { flag: "wx" });
    await run({ root, artifact });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("registry durability artifact candidate inspection", () => {
  it("materializes and hashes the exact fixed-path PE candidate without loading it", async () => {
    const bytes = peFixture();
    await withArtifact(bytes, async ({ root }) => {
      const decision = await inspectRegistryDurabilityArtifactCandidate(
        descriptor(bytes),
        root,
      );
      assert.deepEqual(decision, {
        verdict: "CANDIDATE",
        reason: "ARTIFACT_VERIFIED_NON_EXECUTED_CANDIDATE",
        adapterId: "galerina.registry.durability.windows.v1",
        binaryDigest: sha256(bytes),
        byteLength: bytes.length,
      });
      assert.equal(Object.isFrozen(decision), true);
    });
  });

  it("refuses mutated bytes, a malformed container, and the wrong PE architecture", async () => {
    const expected = peFixture();
    const cases = [
      { bytes: Buffer.from(expected).fill(0x41, 70, 71), candidate: descriptor(expected) },
      { bytes: Buffer.from("not-a-native-module"), candidate: descriptor(Buffer.from("not-a-native-module")) },
      { bytes: peFixture(0xaa64), candidate: descriptor(peFixture(0xaa64)) },
    ];
    for (const testCase of cases) {
      await withArtifact(testCase.bytes, async ({ root }) => {
        assert.equal(
          (await inspectRegistryDurabilityArtifactCandidate(
            testCase.candidate,
            root,
          )).verdict,
          "DENY",
        );
      });
    }
  });

  it("binds ELF and Mach-O candidates to their declared architecture markers", async () => {
    const cases = [
      {
        bytes: elfFixture(),
        relative: "native/linux-x64/registry-durability.node",
        candidate: {
          adapterId: "galerina.registry.durability.linux.v1",
          platform: "linux",
          targetTriple: "x86_64-unknown-linux-gnu",
          filesystems: ["btrfs", "ext4", "xfs"],
          loaderRelativePath: "native/linux-x64/registry-durability.node",
          binaryFormat: "elf-node-api-v10",
        },
      },
      {
        bytes: machOFixture(),
        relative: "native/darwin-x64/registry-durability.node",
        candidate: {
          adapterId: "galerina.registry.durability.macos.v1",
          platform: "macos",
          targetTriple: "x86_64-apple-darwin",
          filesystems: ["apfs"],
          loaderRelativePath: "native/darwin-x64/registry-durability.node",
          binaryFormat: "mach-o-node-api-v10",
        },
      },
    ];
    for (const testCase of cases) {
      await withArtifact(
        testCase.bytes,
        async ({ root }) => {
          assert.equal(
            (await inspectRegistryDurabilityArtifactCandidate(
              descriptor(testCase.bytes, testCase.candidate),
              root,
            )).verdict,
            "CANDIDATE",
          );
        },
        testCase.relative,
      );
    }
  });

  it("refuses a relative root, missing fixed path, and multi-link artifact", async () => {
    const bytes = peFixture();
    assert.equal(
      (await inspectRegistryDurabilityArtifactCandidate(
        descriptor(bytes),
        ".",
      )).verdict,
      "DENY",
    );

    const emptyRoot = await mkdtemp(join(tmpdir(), "galerina-durability-empty-"));
    try {
      assert.equal(
        (await inspectRegistryDurabilityArtifactCandidate(
          descriptor(bytes),
          emptyRoot,
        )).verdict,
        "DENY",
      );
    } finally {
      await rm(emptyRoot, { recursive: true, force: true });
    }

    await withArtifact(bytes, async ({ root, artifact }) => {
      await link(artifact, join(root, "second-name.node"));
      assert.equal(
        (await inspectRegistryDurabilityArtifactCandidate(
          descriptor(bytes),
          root,
        )).verdict,
        "DENY",
      );
    });
  });

  it("refuses a symlinked loader component when the host can create one", async () => {
    const bytes = peFixture();
    const root = await mkdtemp(join(tmpdir(), "galerina-durability-link-"));
    const real = join(root, "real");
    const linked = join(root, "native");
    try {
      await mkdir(join(real, "win32-x64"), { recursive: true });
      await writeFile(join(real, "win32-x64", "registry-durability.node"), bytes);
      try {
        await symlink(real, linked, "junction");
      } catch {
        return;
      }
      assert.equal(
        (await inspectRegistryDurabilityArtifactCandidate(
          descriptor(bytes),
          root,
        )).verdict,
        "DENY",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses a package root below a symlinked ancestor when the host can create one", async () => {
    const bytes = peFixture();
    const outer = await mkdtemp(join(tmpdir(), "galerina-durability-root-link-"));
    const real = join(outer, "real");
    const packageRoot = join(real, "package");
    const linked = join(outer, "linked");
    const relative = "native/win32-x64/registry-durability.node";
    try {
      await mkdir(dirname(join(packageRoot, relative)), { recursive: true });
      await writeFile(join(packageRoot, relative), bytes);
      try {
        await symlink(real, linked, "junction");
      } catch {
        return;
      }
      assert.equal(
        (await inspectRegistryDurabilityArtifactCandidate(
          descriptor(bytes),
          join(linked, "package"),
        )).verdict,
        "DENY",
      );
    } finally {
      await rm(outer, { recursive: true, force: true });
    }
  });

  it("refuses an artifact above the bounded materialization ceiling", async () => {
    const bytes = peFixture();
    await withArtifact(bytes, async ({ root, artifact }) => {
      await truncate(artifact, (16 * 1024 * 1024) + 1);
      assert.equal(
        (await inspectRegistryDurabilityArtifactCandidate(
          descriptor(bytes),
          root,
        )).verdict,
        "DENY",
      );
    });
  });
});
