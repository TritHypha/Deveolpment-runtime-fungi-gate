/**
 * Single-process reference compare-and-swap store for SLIDE V2-B lease use.
 *
 * This is concurrency/mutation evidence, not a production crash-consistent or
 * distributed nonce store. It commits only an exact digest/generation step and
 * returns a typed receipt. It cannot create a lease reference or broker handle.
 */

import { createHash } from "node:crypto";

const RESERVATION_SCHEMA_ID = "slide.capability.lease-use-reservation.v2b";
const RECEIPT_SCHEMA_ID = "slide.atomic-state-receipt.v1";
const HEX_256 = /^[0-9a-f]{64}$/;

export type SLIDEV2BAtomicStateVerdict = 1 | 0 | -1;

export interface SLIDEV2BAtomicStateRecord {
  readonly leaseId: string;
  readonly nonceDigest: string;
  readonly stateDigest: string;
  readonly generation: number;
  readonly callsConsumed: number;
  readonly requestBytesConsumed: number;
  readonly expiresAt: number;
  readonly statusId: number;
  readonly canonicalBytes: Uint8Array;
}

export interface SLIDEV2BAtomicReservationCandidate {
  readonly schemaId: string;
  readonly storeId: string;
  readonly leaseId: string;
  readonly nonceDigest: string;
  readonly priorStateDigest: string;
  readonly nextStateDigest: string;
  readonly priorGeneration: number;
  readonly nextGeneration: number;
  readonly proposedCallNumber: number;
  readonly commitTime: number;
  readonly nextStateCanonicalBytes: Uint8Array;
}

export interface SLIDEV2BAtomicStateReceipt {
  readonly schemaId: typeof RECEIPT_SCHEMA_ID;
  readonly storeId: string;
  readonly leaseId: string;
  readonly nonceDigest: string;
  readonly priorStateDigest: string;
  readonly nextStateDigest: string;
  readonly priorGeneration: number;
  readonly nextGeneration: number;
  readonly proposedCallNumber: number;
  readonly verdict: SLIDEV2BAtomicStateVerdict;
  readonly committedAt: number;
  readonly evidenceDigest: string;
  readonly authorityReleased: false;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function boundedText(value: string, maximumCharacters: number): Uint8Array {
  if (value.length <= maximumCharacters) return utf8(value);
  return utf8(`OVERSIZE:${value.length}`);
}

function hashFramed(domain: string, ...parts: readonly Uint8Array[]): string {
  const digest = createHash("sha256");
  for (const part of [utf8(`${domain}\0`), ...parts]) {
    const length = part.length;
    digest.update(
      Uint8Array.of(
        (length >>> 24) & 0xff,
        (length >>> 16) & 0xff,
        (length >>> 8) & 0xff,
        length & 0xff,
      ),
    );
    digest.update(part);
  }
  return digest.digest("hex");
}

function receipt(
  candidate: SLIDEV2BAtomicReservationCandidate,
  verdict: SLIDEV2BAtomicStateVerdict,
): SLIDEV2BAtomicStateReceipt {
  const evidenceDigest = hashFramed(
    "slide.atomic-state-receipt.v1",
    boundedText(candidate.storeId, 128),
    boundedText(candidate.leaseId, 128),
    boundedText(candidate.nonceDigest, 64),
    boundedText(candidate.priorStateDigest, 64),
    boundedText(candidate.nextStateDigest, 64),
    utf8(String(candidate.priorGeneration)),
    utf8(String(candidate.nextGeneration)),
    utf8(String(candidate.proposedCallNumber)),
    utf8(String(verdict)),
    utf8(String(candidate.commitTime)),
  );
  return {
    schemaId: RECEIPT_SCHEMA_ID,
    storeId: candidate.storeId,
    leaseId: candidate.leaseId,
    nonceDigest: candidate.nonceDigest,
    priorStateDigest: candidate.priorStateDigest,
    nextStateDigest: candidate.nextStateDigest,
    priorGeneration: candidate.priorGeneration,
    nextGeneration: candidate.nextGeneration,
    proposedCallNumber: candidate.proposedCallNumber,
    verdict,
    committedAt: candidate.commitTime,
    evidenceDigest,
    authorityReleased: false,
  };
}

function safeCounter(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

interface DecodedState {
  readonly leaseId: string;
  readonly nonceDigest: string;
  readonly generation: number;
  readonly callsConsumed: number;
  readonly requestBytesConsumed: number;
  readonly expiresAt: number;
  readonly statusId: number;
}

class StateReader {
  #offset = 0;

  constructor(readonly bytes: Uint8Array) {}

  #byte(): number {
    const value = this.bytes[this.#offset];
    if (value === undefined) throw new Error("truncated");
    this.#offset += 1;
    return value;
  }

  #head(expectedMajor: number): number {
    const first = this.#byte();
    const major = first >>> 5;
    const additional = first & 0x1f;
    if (major !== expectedMajor) throw new Error("wrong major type");
    if (additional < 24) return additional;
    if (additional === 24) {
      const value = this.#byte();
      if (value < 24) throw new Error("non-shortest integer");
      return value;
    }
    if (additional === 25) {
      const value = this.#byte() * 256 + this.#byte();
      if (value < 256) throw new Error("non-shortest integer");
      return value;
    }
    if (additional === 26) {
      const value =
        this.#byte() * 16777216 +
        this.#byte() * 65536 +
        this.#byte() * 256 +
        this.#byte();
      if (value < 65536 || value > 2147483647) {
        throw new Error("non-shortest or unbounded integer");
      }
      return value;
    }
    throw new Error("unsupported or indefinite head");
  }

  arrayLength(): number {
    return this.#head(4);
  }

  uint(): number {
    return this.#head(0);
  }

  text(maximumBytes: number): string {
    const length = this.#head(3);
    if (length > maximumBytes || this.#offset + length > this.bytes.length) {
      throw new Error("text ceiling or truncation");
    }
    const payload = this.bytes.slice(this.#offset, this.#offset + length);
    this.#offset += length;
    return new TextDecoder("utf-8", { fatal: true }).decode(payload);
  }

  finish(): void {
    if (this.#offset !== this.bytes.length) throw new Error("surplus bytes");
  }
}

function stateDigest(canonicalBytes: Uint8Array): string {
  return hashFramedRaw(
    utf8("slide.capability.lease-use-state.v2b\0"),
    canonicalBytes,
  );
}

function hashFramedRaw(...parts: readonly Uint8Array[]): string {
  const digest = createHash("sha256");
  for (const part of parts) digest.update(part);
  return digest.digest("hex");
}

function decodeState(canonicalBytes: Uint8Array): DecodedState {
  if (canonicalBytes.length < 1 || canonicalBytes.length > 1024) {
    throw new Error("state size ceiling");
  }
  const reader = new StateReader(canonicalBytes);
  if (reader.arrayLength() !== 8) throw new Error("state arity");
  if (reader.text(64) !== "slide.capability.lease-use-state.v2b") {
    throw new Error("state schema");
  }
  const leaseId = reader.text(128);
  const nonceDigest = reader.text(64);
  const generation = reader.uint();
  const callsConsumed = reader.uint();
  const requestBytesConsumed = reader.uint();
  const expiresAt = reader.uint();
  const statusId = reader.uint();
  reader.finish();
  if (
    leaseId.length < 1 ||
    !HEX_256.test(nonceDigest) ||
    statusId < 1 ||
    statusId > 2
  ) {
    throw new Error("state field");
  }
  return {
    leaseId,
    nonceDigest,
    generation,
    callsConsumed,
    requestBytesConsumed,
    expiresAt,
    statusId,
  };
}

/**
 * Reference in-memory CAS. `reserve` contains no `await`: comparison and update
 * occur in one JavaScript turn. A production provider must additionally prove
 * crash consistency, multi-process behavior, durability, and trusted time.
 */
export class SLIDEV2BAtomicStateReference {
  readonly #storeId: string;
  readonly #records = new Map<string, SLIDEV2BAtomicStateRecord>();

  constructor(storeId: string, initialRecords: readonly SLIDEV2BAtomicStateRecord[]) {
    if (storeId.length < 1 || storeId.length > 128) {
      throw new Error("SLIDE-V2B-ATOMIC-001: invalid store identity");
    }
    if (initialRecords.length > 1024) {
      throw new Error("SLIDE-V2B-ATOMIC-002: initial state ceiling exceeded");
    }
    this.#storeId = storeId;
    for (const record of initialRecords) {
      let decoded: DecodedState;
      try {
        decoded = decodeState(record.canonicalBytes);
      } catch {
        throw new Error("SLIDE-V2B-ATOMIC-002: invalid or duplicate initial state");
      }
      const malformed =
        record.leaseId !== decoded.leaseId ||
        record.nonceDigest !== decoded.nonceDigest ||
        record.stateDigest !== stateDigest(record.canonicalBytes) ||
        record.generation !== decoded.generation ||
        record.callsConsumed !== decoded.callsConsumed ||
        record.requestBytesConsumed !== decoded.requestBytesConsumed ||
        record.expiresAt !== decoded.expiresAt ||
        record.statusId !== decoded.statusId ||
        this.#records.has(record.leaseId);
      if (malformed) {
        throw new Error("SLIDE-V2B-ATOMIC-002: invalid or duplicate initial state");
      }
      this.#records.set(record.leaseId, {
        ...record,
        canonicalBytes: record.canonicalBytes.slice(),
      });
    }
  }

  reserve(
    candidate: SLIDEV2BAtomicReservationCandidate,
  ): SLIDEV2BAtomicStateReceipt {
    const malformed =
      candidate.schemaId !== RESERVATION_SCHEMA_ID ||
      candidate.storeId !== this.#storeId ||
      candidate.leaseId.length < 1 ||
      candidate.leaseId.length > 128 ||
      !HEX_256.test(candidate.nonceDigest) ||
      !HEX_256.test(candidate.priorStateDigest) ||
      !HEX_256.test(candidate.nextStateDigest) ||
      !safeCounter(candidate.priorGeneration) ||
      !safeCounter(candidate.nextGeneration) ||
      !safeCounter(candidate.proposedCallNumber) ||
      !safeCounter(candidate.commitTime) ||
      candidate.nextGeneration !== candidate.priorGeneration + 1 ||
      candidate.nextStateDigest === candidate.priorStateDigest ||
      candidate.proposedCallNumber < 1;
    if (malformed) return receipt(candidate, -1);

    let next: DecodedState;
    try {
      next = decodeState(candidate.nextStateCanonicalBytes);
    } catch {
      return receipt(candidate, -1);
    }
    if (stateDigest(candidate.nextStateCanonicalBytes) !== candidate.nextStateDigest) {
      return receipt(candidate, -1);
    }

    const current = this.#records.get(candidate.leaseId);
    if (current === undefined) return receipt(candidate, 0);
    const staleOrMismatched =
      current.nonceDigest !== candidate.nonceDigest ||
      current.stateDigest !== candidate.priorStateDigest ||
      current.generation !== candidate.priorGeneration ||
      current.callsConsumed + 1 !== candidate.proposedCallNumber ||
      next.leaseId !== current.leaseId ||
      next.nonceDigest !== current.nonceDigest ||
      next.generation !== candidate.nextGeneration ||
      next.callsConsumed !== candidate.proposedCallNumber ||
      next.requestBytesConsumed <= current.requestBytesConsumed ||
      next.requestBytesConsumed - current.requestBytesConsumed > 4096 ||
      next.expiresAt !== current.expiresAt ||
      next.statusId !== 2;
    if (staleOrMismatched) return receipt(candidate, -1);

    this.#records.set(candidate.leaseId, {
      leaseId: current.leaseId,
      nonceDigest: current.nonceDigest,
      stateDigest: candidate.nextStateDigest,
      generation: candidate.nextGeneration,
      callsConsumed: candidate.proposedCallNumber,
      requestBytesConsumed: next.requestBytesConsumed,
      expiresAt: next.expiresAt,
      statusId: next.statusId,
      canonicalBytes: candidate.nextStateCanonicalBytes.slice(),
    });
    return receipt(candidate, 1);
  }

  inspect(leaseId: string): SLIDEV2BAtomicStateRecord | undefined {
    const record = this.#records.get(leaseId);
    return record === undefined
      ? undefined
      : { ...record, canonicalBytes: record.canonicalBytes.slice() };
  }
}
