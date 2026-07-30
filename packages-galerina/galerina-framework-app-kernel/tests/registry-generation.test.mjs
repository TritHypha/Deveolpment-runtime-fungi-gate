import assert from "node:assert/strict";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createHash,
  generateKeyPairSync,
  sign as edSign,
} from "node:crypto";
import { describe, it } from "node:test";
import {
  ml_dsa65 as mlDsa65,
} from "../../galerina-tower-citizen/node_modules/@noble/post-quantum/ml-dsa.js";

import {
  buildRegistryGeneration,
  isPersistedRegistryGeneration,
  isProductionAdmittedRegistryGeneration,
  isVerifiedRegistryGeneration,
  loadRegistryGeneration,
  persistRegistryGeneration,
  registryGenerationCanonicalJson,
  registryGenerationFileName,
  registryGenerationId,
  verifyRegistryGeneration,
} from "../dist/index.js";

const KEY_ID = "bbbbbbbbbbbbbbbb";
const CONTEXTS = Object.freeze({
  "package-manifest": new TextEncoder().encode(
    "galerina.registry.package.manifest.sig.v1",
  ),
  "registry-index": new TextEncoder().encode(
    "galerina.registry.index.sig.v2",
  ),
});

function hybridKey(keyId = KEY_ID) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const mlSecret = mlDsa65.keygen().secretKey;
  return {
    publicBundle: {
      keyId,
      ed25519PublicKeyPem: publicKey.export({
        type: "spki",
        format: "pem",
      }).toString(),
      mlDsa65PublicKey: mlDsa65.getPublicKey(mlSecret),
    },
    custody: {
      signHybrid(requestedKeyId, message, role) {
        if (requestedKeyId !== keyId || !(role in CONTEXTS)) return null;
        return {
          ed25519: Buffer.from(
            edSign(null, message, privateKey),
          ).toString("base64"),
          mlDsa65: Buffer.from(
            mlDsa65.sign(message, mlSecret, {
              context: CONTEXTS[role],
            }),
          ).toString("base64"),
        };
      },
    },
  };
}

function unsignedManifest(name = "@galerina/example") {
  return {
    schema: "galerina-package-manifest/v1",
    name,
    version: "1.0.0",
    registry: "https://registry.galerina.dev",
    artifactProfile: "galerina-flat-package-tree/v1",
    artifactFiles: ["LICENSE", "package.json", "src/index.fungi"],
    capabilities: ["audit.write"],
    effects: ["audit.write"],
    installScript: null,
    hash: `sha256:${"4".repeat(64)}`,
    publisher: "galerina-owner-governance",
    keyId: "1111111111111111",
    signerKeyId: "1111111111111111",
    certificationLevel: "verified",
    riskRating: "low",
    governance: {
      reviewed: true,
      reviewedBy: "galerina-owner-governance",
      reviewedAt: "2026-08-01T00:00:00.000Z",
    },
  };
}

function builtFixture() {
  const key = hybridKey();
  const generation = buildRegistryGeneration({
    delegationSerial: 2,
    operationalPublicBundle: key.publicBundle,
    unsignedManifests: [unsignedManifest()],
    registry: "https://registry.galerina.dev",
    issuedAt: "2026-08-02T00:00:00.000Z",
    custody: key.custody,
  });
  return { key, generation };
}

describe("content-addressed registry generation", () => {
  it("re-signs every manifest, signs the index, and verifies exact correspondence", async () => {
    const { key, generation } = builtFixture();
    assert.equal(generation.delegationSerial, 2);
    assert.equal(generation.operationalKeyId, KEY_ID);
    assert.equal(generation.manifests.length, 1);
    assert.equal(generation.manifests[0].keyId, KEY_ID);
    assert.equal(generation.manifests[0].signerKeyId, KEY_ID);
    assert.equal(generation.index.entries[0].keyId, KEY_ID);
    assert.equal(
      verifyRegistryGeneration(generation, {
        expectedDelegationSerial: 2,
        publicBundle: key.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      }),
      "verified",
    );
    assert.equal(
      registryGenerationCanonicalJson(generation),
      registryGenerationCanonicalJson(generation),
    );
    const generationId = await registryGenerationId(generation);
    assert.match(generationId, /^[0-9a-f]{64}$/);
    assert.equal(
      generationId,
      await registryGenerationId(generation),
    );
    assert.equal(
      registryGenerationFileName(generationId),
      `registry-generation-${generationId}.json`,
    );
    assert.equal(Object.isFrozen(generation), true);
  });

  it("refuses malformed generation identities and binds the context separator", async () => {
    const { generation } = builtFixture();
    const generationId = await registryGenerationId(generation);
    const unseparatedDigest = createHash("sha256")
      .update(registryGenerationCanonicalJson(generation), "utf8")
      .digest("hex");
    assert.notEqual(
      generationId,
      unseparatedDigest,
    );
    assert.throws(() => registryGenerationFileName(""));
    assert.throws(() => registryGenerationFileName("A".repeat(64)));
    assert.throws(() => registryGenerationFileName("../generation"));
  });

  it("refuses empty input, incomplete custody, duplicate packages, and stale index time", () => {
    const key = hybridKey();
    const base = {
      delegationSerial: 2,
      operationalPublicBundle: key.publicBundle,
      registry: "https://registry.galerina.dev",
      issuedAt: "2026-08-02T00:00:00.000Z",
      custody: key.custody,
    };
    assert.throws(() => buildRegistryGeneration({
      ...base,
      unsignedManifests: [],
    }));
    assert.throws(() => buildRegistryGeneration({
      ...base,
      unsignedManifests: [unsignedManifest(), unsignedManifest()],
    }));
    assert.throws(() => buildRegistryGeneration({
      ...base,
      unsignedManifests: [unsignedManifest()],
      custody: { signHybrid: () => null },
    }));
    assert.throws(() => buildRegistryGeneration({
      ...base,
      issuedAt: "not-a-canonical-instant",
      unsignedManifests: [unsignedManifest()],
    }));
    assert.throws(() => buildRegistryGeneration({
      ...base,
      unsignedManifests: [{
        ...unsignedManifest(),
        artifactFiles: ["../outside-the-package"],
      }],
    }));

    const generation = buildRegistryGeneration({
      ...base,
      unsignedManifests: [unsignedManifest()],
    });
    assert.throws(() => verifyRegistryGeneration(generation, {
      expectedDelegationSerial: 2,
      publicBundle: key.publicBundle,
      minIndexIssuedAt: generation.index.issuedAt,
    }));
  });

  it("refuses substituted keys and mutation of either signed layer", () => {
    const { key, generation } = builtFixture();
    const attacker = hybridKey("cccccccccccccccc");
    const options = {
      expectedDelegationSerial: 2,
      publicBundle: key.publicBundle,
      minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
    };
    assert.throws(() => verifyRegistryGeneration(generation, {
      ...options,
      publicBundle: {
        ...attacker.publicBundle,
        keyId: KEY_ID,
      },
    }));
    assert.throws(() => verifyRegistryGeneration({
      ...generation,
      manifests: [{
        ...generation.manifests[0],
        riskRating: "critical",
      }],
    }, options));
    assert.throws(() => verifyRegistryGeneration({
      ...generation,
      index: {
        ...generation.index,
        entries: [{
          ...generation.index.entries[0],
          sourceHash: `sha256:${"5".repeat(64)}`,
        }],
      },
    }, options));
    assert.throws(() => verifyRegistryGeneration({
      ...generation,
      delegationSerial: 3,
    }, options));
  });

  it("publishes, re-opens, and independently verifies an immutable generation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "galerina-generation-"));
    try {
      const { key, generation } = builtFixture();
      const verify = {
        expectedDelegationSerial: 2,
        publicBundle: key.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      };
      let barriers = 0;
      const directoryDurabilityBarrier = async () => {
        barriers += 1;
        return true;
      };
      const receipt = await persistRegistryGeneration({
        directory,
        generation,
        verify,
        directoryDurabilityBarrier,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      });
      assert.equal(isPersistedRegistryGeneration(receipt), true);
      assert.equal(
        isProductionAdmittedRegistryGeneration(receipt),
        false,
      );
      assert.match(receipt.generationId, /^[0-9a-f]{64}$/);
      assert.equal(receipt.delegationSerial, 2);
      assert.equal(receipt.operationalKeyId, KEY_ID);
      assert.equal(barriers, 1);
      const bytes = await readFile(receipt.path, "utf8");
      assert.equal(bytes, registryGenerationCanonicalJson(generation));

      const restored = await loadRegistryGeneration({
        directory,
        generationId: receipt.generationId,
        verify,
      });
      assert.equal(isVerifiedRegistryGeneration(restored), true);
      assert.equal(isPersistedRegistryGeneration(restored), false);
      assert.equal(restored.generationId, receipt.generationId);
      assert.equal(
        registryGenerationCanonicalJson(restored.generation),
        registryGenerationCanonicalJson(generation),
      );

      const idempotent = await persistRegistryGeneration({
        directory,
        generation,
        verify,
        directoryDurabilityBarrier,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      });
      assert.equal(idempotent.generationId, receipt.generationId);
      assert.equal(isPersistedRegistryGeneration(idempotent), true);
      assert.equal(barriers, 2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses non-durable publication, existing-different bytes, and mutation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "galerina-generation-"));
    try {
      const { key, generation } = builtFixture();
      const generationId = await registryGenerationId(generation);
      const fileName = registryGenerationFileName(generationId);
      const verify = {
        expectedDelegationSerial: 2,
        publicBundle: key.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      };
      await writeFile(join(directory, fileName), "{}", {
        flag: "wx",
      });
      await assert.rejects(() => persistRegistryGeneration({
        directory,
        generation,
        verify,
        directoryDurabilityBarrier: async () => true,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      }));
      await rm(join(directory, fileName));

      await assert.rejects(() => persistRegistryGeneration({
        directory,
        generation,
        verify,
        directoryDurabilityBarrier: async () => false,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      }));
      await assert.rejects(() => loadRegistryGeneration({
        directory,
        generationId,
        verify,
      }));

      const receipt = await persistRegistryGeneration({
        directory,
        generation,
        verify,
        directoryDurabilityBarrier: async () => true,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      });
      await chmod(receipt.path, 0o666);
      await writeFile(receipt.path, "{}");
      await assert.rejects(() => loadRegistryGeneration({
        directory,
        generationId: receipt.generationId,
        verify,
      }));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses relative and reparse-point generation directories", async (test) => {
    const parent = await mkdtemp(join(tmpdir(), "galerina-generation-"));
    try {
      const { key, generation } = builtFixture();
      const verify = {
        expectedDelegationSerial: 2,
        publicBundle: key.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      };
      await assert.rejects(() => persistRegistryGeneration({
        directory: ".",
        generation,
        verify,
        directoryDurabilityBarrier: async () => true,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      }));

      const real = join(parent, "real");
      const linked = join(parent, "linked");
      await mkdir(real);
      try {
        await symlink(real, linked, "junction");
      } catch (error) {
        if (error?.code === "EPERM") {
          test.skip("junction creation is unavailable on this host");
          return;
        }
        throw error;
      }
      await assert.rejects(() => persistRegistryGeneration({
        directory: linked,
        generation,
        verify,
        directoryDurabilityBarrier: async () => true,
        durabilityAdapterDigest: `sha256:${"a".repeat(64)}`,
      }));
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
