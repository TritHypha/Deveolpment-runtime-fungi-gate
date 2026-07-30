import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  StateSerializer,
} from "../../galerina-core-sentinel-state/dist/index.js";
import {
  createKeyRing,
  createSnapshotKeyProvider,
  snapshotKeyCommit,
  stageEpoch,
  switchActive,
} from "../dist/index.js";

const RING_MAC_KEY = new Uint8Array(32).fill(0x71);
const KEY_A = new Uint8Array(32).fill(0xa1);
const KEY_B = new Uint8Array(32).fill(0xb2);

function fixture() {
  const custody = new Map([
    ["snapshot-a", KEY_A],
    ["snapshot-b", KEY_B],
  ]);
  let ring = createKeyRing(RING_MAC_KEY, {
    keyId: "snapshot-a",
    keyKind: "symmetric",
    keyCommit: snapshotKeyCommit(KEY_A),
    fileRef: "custody://snapshot-a",
    createdTick: 1,
  });
  const provider = createSnapshotKeyProvider({
    currentRing: () => ring,
    ringMacKey: RING_MAC_KEY,
    readKey(epoch) {
      return custody.get(epoch.keyId) ?? null;
    },
  });
  return {
    provider,
    get ring() {
      return ring;
    },
    set ring(value) {
      ring = value;
    },
    custody,
  };
}

describe("Tower snapshot key provider", () => {
  it("binds StateSerializer to the authenticated active and retired ring epochs", () => {
    const value = fixture();
    const serializer = new StateSerializer({
      keyProvider: value.provider,
      strictKey: true,
    });
    const oldSnapshot = serializer.serialize({ epoch: 1 }, 1);
    value.ring = stageEpoch(value.ring, RING_MAC_KEY, {
      keyId: "snapshot-b",
      keyKind: "symmetric",
      keyCommit: snapshotKeyCommit(KEY_B),
      fileRef: "custody://snapshot-b",
      createdTick: 2,
    });
    value.ring = switchActive(value.ring, RING_MAC_KEY, 3);
    const newSnapshot = serializer.serialize({ epoch: 2 }, 4);

    assert.equal(oldSnapshot.keyEpoch, 1);
    assert.equal(newSnapshot.keyEpoch, 2);
    assert.equal(serializer.verify(oldSnapshot), true);
    assert.equal(serializer.verify(newSnapshot), true);
  });

  it("refuses ring tampering, custody substitution, missing keys, and asymmetric epochs", () => {
    const value = fixture();
    const serializer = new StateSerializer({
      keyProvider: value.provider,
      strictKey: true,
    });
    const snapshot = serializer.serialize({ protected: true }, 1);

    value.custody.set("snapshot-a", KEY_B);
    assert.equal(serializer.verify(snapshot), false);
    value.custody.delete("snapshot-a");
    assert.equal(serializer.verify(snapshot), false);
    value.custody.set("snapshot-a", KEY_A);
    value.ring = {
      ...value.ring,
      epochs: value.ring.epochs.map((epoch) => ({
        ...epoch,
        keyKind: "asymmetric",
      })),
    };
    assert.equal(serializer.verify(snapshot), false);
    assert.throws(() => serializer.serialize({ denied: true }, 2));
  });

  it("fails closed when custody or ring access throws", () => {
    const value = fixture();
    const throwingCustody = createSnapshotKeyProvider({
      currentRing: () => value.ring,
      ringMacKey: RING_MAC_KEY,
      readKey() {
        throw new Error("custody unavailable");
      },
    });
    const throwingRing = createSnapshotKeyProvider({
      currentRing() {
        throw new Error("ring unavailable");
      },
      ringMacKey: RING_MAC_KEY,
      readKey: () => KEY_A,
    });

    assert.equal(throwingCustody.active(), null);
    assert.equal(throwingCustody.resolve(1, "snapshot-a"), null);
    assert.equal(throwingRing.active(), null);
    assert.equal(throwingRing.resolve(1, "snapshot-a"), null);
  });
});
