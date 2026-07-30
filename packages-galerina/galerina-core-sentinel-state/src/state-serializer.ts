// state-serializer.ts — the cryptographic core of LSS.
//
// A Snapshot is a self-describing, self-verifying record of governed state at
// one logical tick and one authenticated key epoch. Snapshot bytes contain
// only the non-secret epoch identity; key material remains in the provider.

import { createHmac, timingSafeEqual } from "node:crypto";
import { SecurityTrap } from "./errors.js";

/** A self-verifying, point-in-time record of governed state. */
export interface Snapshot {
  readonly version: string;
  readonly keyEpoch: number;
  readonly keyId: string;
  readonly logicalTick: number;
  readonly payloadJson: string;
  readonly xorChecksum: number;
  readonly hmac: string;
}

export interface SnapshotKeyHandle {
  readonly epochId: number;
  readonly keyId: string;
  readonly key: Uint8Array;
}

export interface SnapshotKeyProvider {
  active(): SnapshotKeyHandle | null;
  resolve(epochId: number, keyId: string): Uint8Array | null;
}

export interface StateSerializerOptions {
  readonly hmacKey?: Uint8Array;
  readonly keyProvider?: SnapshotKeyProvider;
  readonly strictKey?: boolean;
}

const SNAPSHOT_VERSION = "2.0";
const LOCAL_KEY_ID = "local-development-epoch-1";
const DEV_ZERO_KEY = new Uint8Array(32);

/** XOR-fold UTF-8 bytes of a string into an unsigned 32-bit integer. */
function xorFold32(bytes: Uint8Array): number {
  let acc = 0;
  for (let i = 0; i < bytes.length; i++) {
    const lane = (i & 3) << 3;
    acc ^= bytes[i]! << lane;
  }
  return acc >>> 0;
}

/** True if a key is absent, shorter than 256 bits, or all-zero. */
function isWeakKey(key: Uint8Array | undefined): boolean {
  if (!key || key.length < 32) return true;
  for (const byte of key) if (byte !== 0) return false;
  return true;
}

function validHandle(
  value: SnapshotKeyHandle | null,
): value is SnapshotKeyHandle {
  return value !== null
    && Number.isSafeInteger(value.epochId)
    && value.epochId >= 1
    && typeof value.keyId === "string"
    && value.keyId.length >= 1
    && value.keyId.length <= 128
    && !/[\0\r\n|]/.test(value.keyId)
    && value.key instanceof Uint8Array;
}

function fixedProvider(key: Uint8Array): SnapshotKeyProvider {
  const fixed = Uint8Array.from(key);
  return Object.freeze({
    active: (): SnapshotKeyHandle => ({
      epochId: 1,
      keyId: LOCAL_KEY_ID,
      key: fixed,
    }),
    resolve: (epochId: number, keyId: string): Uint8Array | null =>
      epochId === 1 && keyId === LOCAL_KEY_ID ? fixed : null,
  });
}

export class StateSerializer {
  readonly #keyProvider: SnapshotKeyProvider;
  readonly #strictKey: boolean;

  constructor(opts?: StateSerializerOptions) {
    if (opts?.hmacKey !== undefined && opts.keyProvider !== undefined) {
      throw new SecurityTrap(
        "LSS-KEY-003",
        "StateSerializer accepts one key authority, never both a fixed key and an epoch provider",
      );
    }
    this.#strictKey = opts?.strictKey === true;
    this.#keyProvider = opts?.keyProvider
      ?? fixedProvider(opts?.hmacKey ?? DEV_ZERO_KEY);
    if (
      typeof this.#keyProvider.active !== "function"
      || typeof this.#keyProvider.resolve !== "function"
    ) {
      throw new SecurityTrap(
        "LSS-KEY-003",
        "StateSerializer key authority is malformed",
      );
    }
    if (this.#strictKey) {
      let active: SnapshotKeyHandle | null;
      try {
        active = this.#keyProvider.active();
      } catch {
        active = null;
      }
      if (active !== null && (!validHandle(active) || isWeakKey(active.key))) {
        throw new SecurityTrap(
          "LSS-KEY-001",
          "StateSerializer strictKey requires a valid non-zero epoch key of at least 256 bits",
        );
      }
    }
  }

  #macInput(
    version: string,
    keyEpoch: number,
    keyId: string,
    logicalTick: number,
    xorChecksum: number,
    payloadJson: string,
  ): string {
    return `${version}|${keyEpoch}|${keyId}|${logicalTick}|${xorChecksum}|${payloadJson}`;
  }

  #computeHmac(
    key: Uint8Array,
    version: string,
    keyEpoch: number,
    keyId: string,
    logicalTick: number,
    xorChecksum: number,
    payloadJson: string,
  ): string {
    return createHmac("sha256", key)
      .update(
        this.#macInput(
          version,
          keyEpoch,
          keyId,
          logicalTick,
          xorChecksum,
          payloadJson,
        ),
        "utf8",
      )
      .digest("hex");
  }

  /** Serialize using the currently active epoch selected by custody. */
  serialize(payload: unknown, logicalTick: number): Snapshot {
    if (!Number.isSafeInteger(logicalTick) || logicalTick < 0) {
      throw new SecurityTrap(
        "LSS-SNAPSHOT-001",
        "snapshot logicalTick must be a non-negative safe integer",
      );
    }
    let active: SnapshotKeyHandle | null;
    try {
      active = this.#keyProvider.active();
    } catch {
      active = null;
    }
    if (!validHandle(active) || (this.#strictKey && isWeakKey(active.key))) {
      throw new SecurityTrap(
        "LSS-KEY-002",
        "no valid active snapshot-signing epoch is available",
      );
    }
    const payloadJson = JSON.stringify(payload);
    if (typeof payloadJson !== "string") {
      throw new SecurityTrap(
        "LSS-SNAPSHOT-001",
        "snapshot payload is not JSON-serializable",
      );
    }
    const xorChecksum = xorFold32(Buffer.from(payloadJson, "utf8"));
    const hmac = this.#computeHmac(
      active.key,
      SNAPSHOT_VERSION,
      active.epochId,
      active.keyId,
      logicalTick,
      xorChecksum,
      payloadJson,
    );
    return {
      version: SNAPSHOT_VERSION,
      keyEpoch: active.epochId,
      keyId: active.keyId,
      logicalTick,
      payloadJson,
      xorChecksum,
      hmac,
    };
  }

  /** Verify checksum, epoch authority and MAC; any ambiguity returns false. */
  verify(snap: Snapshot): boolean {
    if (
      typeof snap !== "object"
      || snap === null
      || snap.version !== SNAPSHOT_VERSION
      || !Number.isSafeInteger(snap.keyEpoch)
      || snap.keyEpoch < 1
      || typeof snap.keyId !== "string"
      || snap.keyId.length < 1
      || snap.keyId.length > 128
      || /[\0\r\n|]/.test(snap.keyId)
      || !Number.isSafeInteger(snap.logicalTick)
      || snap.logicalTick < 0
      || typeof snap.payloadJson !== "string"
      || !Number.isSafeInteger(snap.xorChecksum)
      || snap.xorChecksum < 0
      || snap.xorChecksum > 0xffff_ffff
      || typeof snap.hmac !== "string"
      || !/^[0-9a-f]{64}$/.test(snap.hmac)
    ) {
      return false;
    }
    const expectedChecksum = xorFold32(Buffer.from(snap.payloadJson, "utf8"));
    if (expectedChecksum !== snap.xorChecksum) return false;

    let key: Uint8Array | null;
    try {
      key = this.#keyProvider.resolve(snap.keyEpoch, snap.keyId);
    } catch {
      return false;
    }
    if (!(key instanceof Uint8Array) || (this.#strictKey && isWeakKey(key))) {
      return false;
    }
    let expectedHmac: string;
    try {
      expectedHmac = this.#computeHmac(
        key,
        snap.version,
        snap.keyEpoch,
        snap.keyId,
        snap.logicalTick,
        snap.xorChecksum,
        snap.payloadJson,
      );
    } catch {
      return false;
    }
    const expected = Buffer.from(expectedHmac, "hex");
    const actual = Buffer.from(snap.hmac, "hex");
    return expected.length === actual.length
      && timingSafeEqual(expected, actual);
  }

  /** Verify-then-parse. */
  deserialize(snap: Snapshot): unknown {
    if (!this.verify(snap)) {
      throw new SecurityTrap(
        "LSS-INTEGRITY-001",
        "snapshot integrity check failed — checksum, epoch authority, or HMAC mismatch",
      );
    }
    return JSON.parse(snap.payloadJson);
  }
}
