import { createHash } from "node:crypto";
import {
  activeEpoch,
  epochForVerification,
  verifyRing,
  type KeyEpoch,
  type KeyRing,
} from "./key-rotation.js";

const SNAPSHOT_KEY_CONTEXT = "galerina.snapshot.epoch.key.v1";

export interface SnapshotEpochKeyHandle {
  readonly epochId: number;
  readonly keyId: string;
  readonly key: Uint8Array;
}

export interface TowerSnapshotKeyProvider {
  active(): SnapshotEpochKeyHandle | null;
  resolve(epochId: number, keyId: string): Uint8Array | null;
}

export interface SnapshotKeyProviderOptions {
  readonly currentRing: () => KeyRing;
  readonly ringMacKey: Uint8Array;
  readonly readKey: (epoch: KeyEpoch) => Uint8Array | null;
}

function strongKey(value: unknown): value is Uint8Array {
  if (!(value instanceof Uint8Array) || value.length < 32) return false;
  for (const byte of value) if (byte !== 0) return true;
  return false;
}

/** Public commitment used by a MAC-key epoch; never the key itself. */
export function snapshotKeyCommit(key: Uint8Array): string {
  if (!strongKey(key)) {
    throw new TypeError(
      "snapshot epoch key must be non-zero and at least 256 bits",
    );
  }
  return createHash("sha256")
    .update(`${SNAPSHOT_KEY_CONTEXT}\0`, "utf8")
    .update(key)
    .digest("hex");
}

function resolveKey(
  options: SnapshotKeyProviderOptions,
  ringMacKey: Uint8Array,
  select: (ring: KeyRing) => KeyEpoch | null,
): SnapshotEpochKeyHandle | null {
  let ring: KeyRing;
  try {
    ring = options.currentRing();
  } catch {
    return null;
  }
  if (!verifyRing(ring, ringMacKey)) return null;
  const epoch = select(ring);
  if (epoch === null || epoch.keyKind !== "symmetric") return null;
  let key: Uint8Array | null;
  try {
    key = options.readKey(epoch);
  } catch {
    return null;
  }
  if (!strongKey(key)) return null;
  let commit: string;
  try {
    commit = snapshotKeyCommit(key);
  } catch {
    return null;
  }
  if (commit !== epoch.keyCommit.toLowerCase()) return null;
  return {
    epochId: epoch.epochId,
    keyId: epoch.keyId,
    key,
  };
}

/**
 * Adapt the authenticated Tower key ring and least-authority custody reader to
 * Sentinel State's structural key-provider seam. A ring failure, revoked or
 * asymmetric epoch, missing/substituted key, or throwing custody returns no
 * authority.
 */
export function createSnapshotKeyProvider(
  options: SnapshotKeyProviderOptions,
): TowerSnapshotKeyProvider {
  if (
    typeof options.currentRing !== "function"
    || typeof options.readKey !== "function"
    || !strongKey(options.ringMacKey)
  ) {
    throw new TypeError("snapshot key-provider configuration is malformed");
  }
  const ringMacKey = Uint8Array.from(options.ringMacKey);
  return Object.freeze({
    active(): SnapshotEpochKeyHandle | null {
      return resolveKey(
        options,
        ringMacKey,
        (ring) => activeEpoch(ring),
      );
    },
    resolve(
      epochId: number,
      keyId: string,
    ): Uint8Array | null {
      if (
        !Number.isSafeInteger(epochId)
        || epochId < 1
        || typeof keyId !== "string"
        || keyId.length === 0
      ) {
        return null;
      }
      const value = resolveKey(
        options,
        ringMacKey,
        (ring) => {
          const epoch = epochForVerification(ring, epochId);
          return epoch?.keyId === keyId ? epoch : null;
        },
      );
      return value?.key ?? null;
    },
  });
}
