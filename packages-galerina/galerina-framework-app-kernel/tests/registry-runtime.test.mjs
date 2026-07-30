import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadProductionRegistry } from "../dist/registry-runtime.js";

const ROOT_KEY_ID = "21415420b447e219";
const OPERATIONAL_KEY_ID = "f3172a48372bfb23";

function productionOptions(overrides = {}) {
  return {
    expectedRootKeyId: ROOT_KEY_ID,
    at: "2026-07-30T16:40:00.000Z",
    minDelegationSerial: 0,
    minIndexIssuedAt: "2026-07-30T16:30:00.000Z",
    isRevoked: () => false,
    ...overrides,
  };
}

describe("production registry runtime", () => {
  it("loads the canonical signed index through its root delegation before admission", async () => {
    const runtime = await loadProductionRegistry(productionOptions());

    assert.equal(runtime.rootKeyId, ROOT_KEY_ID);
    assert.equal(runtime.operationalKeyId, OPERATIONAL_KEY_ID);
    assert.equal(runtime.delegationSerial, 1);
    assert.equal(runtime.indexIssuedAt, "2026-07-30T16:33:10.307Z");
    assert.deepEqual(
      runtime.admit(
        {
          name: "@galerina/auth",
          version: "1.0.0-beta.2",
          sourceHash:
            "sha256:56f8f08d7d37efa8936b5871582dcab900e7223e69be32361f1ab4dfc4eaee86",
          keyId: OPERATIONAL_KEY_ID,
        },
        {
          allowedLevels: ["uncertified"],
          maxRiskRating: "high",
        },
      ),
      {
        ok: true,
        entry: {
          name: "@galerina/auth",
          version: "1.0.0-beta.2",
          sourceHash:
            "sha256:56f8f08d7d37efa8936b5871582dcab900e7223e69be32361f1ab4dfc4eaee86",
          publisher: "galerina-owner-governance",
          keyId: OPERATIONAL_KEY_ID,
          certificationLevel: "uncertified",
          riskRating: "high",
          capabilities: ["clock.read", "crypto.verify"],
          effects: ["clock.read", "crypto.verify"],
        },
      },
    );
  });

  it("refuses revoked and stale authority", async () => {
    const denied = [
      productionOptions({ isRevoked: () => true }),
      productionOptions({ minDelegationSerial: 1 }),
      productionOptions({
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      }),
    ];

    for (const options of denied) {
      await assert.rejects(loadProductionRegistry(options));
    }
  });
});
