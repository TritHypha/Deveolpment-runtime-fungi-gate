// cold-boot.ts — the checkpoint/restore lifecycle orchestrator.
//
// Ties the cryptographic core (StateSerializer) to durable storage
// (AtomicWriter) into the three operations a cold-boot recovery needs:
//
//   checkpoint — capture governed state at a logical tick, durably + atomically.
//   restore    — reconstruct state on boot; fail closed if absent (border
//                violation) or tampered (security trap).
//   scrub      — hard-erase a checkpoint (zero-overwrite then unlink) so a
//                decommissioned snapshot leaves no recoverable residue.

import { writeFileSync, statSync, rmSync } from "node:fs";
import { HardenedBorderViolation } from "./errors.js";
import { StateSerializer, type Snapshot } from "./state-serializer.js";
import { AtomicWriter } from "./atomic-writer.js";

export const RESTORE_VERDICT_PACKAGE_IDENTITY = "@galerina/core-sentinel-state" as const;
export const RESTORE_VERDICT_EXPORT_NAME = "restoreVerdict" as const;

export interface RestoreVerdictAuthority {
  readonly packageIdentity: typeof RESTORE_VERDICT_PACKAGE_IDENTITY;
  readonly exportName: typeof RESTORE_VERDICT_EXPORT_NAME;
  restoreVerdict(snapshotPresent: boolean, integrityOk: boolean): unknown;
}

function authorityRefusal(reason: string): HardenedBorderViolation {
  return new HardenedBorderViolation(
    "LSS-RESTORE-AUTHORITY-001",
    `cold-boot restore authority refused: ${reason}`,
  );
}

export class ColdBootOrchestrator {
  readonly #serializer: StateSerializer;
  readonly #writer: AtomicWriter;
  readonly #restoreAuthority: RestoreVerdictAuthority;

  constructor(
    serializer: StateSerializer,
    writer: AtomicWriter,
    restoreAuthority: RestoreVerdictAuthority,
  ) {
    if (
      restoreAuthority === null
      || typeof restoreAuthority !== "object"
      || restoreAuthority.packageIdentity !== RESTORE_VERDICT_PACKAGE_IDENTITY
      || restoreAuthority.exportName !== RESTORE_VERDICT_EXPORT_NAME
      || typeof restoreAuthority.restoreVerdict !== "function"
    ) {
      throw authorityRefusal("missing or incorrectly identified decision port");
    }
    this.#serializer = serializer;
    this.#writer = writer;
    this.#restoreAuthority = restoreAuthority;
  }

  /** Serialise + durably persist a checkpoint; returns the snapshot written. */
  checkpoint(name: string, payload: unknown, logicalTick: number): Snapshot {
    const snap = this.#serializer.serialize(payload, logicalTick);
    this.#writer.write(name, snap);
    return snap;
  }

  /**
   * Restore a checkpoint on cold boot.
   * @throws HardenedBorderViolation if no snapshot exists (LSS-NOSNAP-001).
   * @throws SecurityTrap if the snapshot fails integrity (LSS-INTEGRITY-001).
   */
  restore(name: string): { payload: unknown; logicalTick: number } {
    const snap = this.#writer.read(name);
    if (snap === null) {
      this.#requireRestoreVerdict(false, false);
      throw new HardenedBorderViolation(
        "LSS-NOSNAP-001",
        `cold-boot restore requires a snapshot "${name}", but none exists`,
      );
    }

    const integrityOk = this.#serializer.verify(snap);
    this.#requireRestoreVerdict(true, integrityOk);
    if (!integrityOk) {
      // Keep StateSerializer as the single owner of the integrity trap. If a
      // future defect ever makes deserialize accept an input that verify
      // refused, the explicit refusal below still prevents restoration.
      this.#serializer.deserialize(snap);
      throw authorityRefusal("serializer contradicted its integrity verdict");
    }

    // Re-verification in deserialize is intentional: the authority decision
    // never replaces the serializer's own integrity gate.
    const payload = this.#serializer.deserialize(snap);
    return { payload, logicalTick: snap.logicalTick };
  }

  #requireRestoreVerdict(snapshotPresent: boolean, integrityOk: boolean): 1 | -1 {
    let verdict: unknown;
    try {
      verdict = this.#restoreAuthority.restoreVerdict(snapshotPresent, integrityOk);
    } catch {
      throw authorityRefusal("decision execution failed");
    }
    if (verdict !== 1 && verdict !== -1) {
      throw authorityRefusal("decision was not exact allow or refuse");
    }
    const expected = snapshotPresent && integrityOk ? 1 : -1;
    if (verdict !== expected) {
      throw authorityRefusal("decision disagreed with locally verified facts");
    }
    return verdict;
  }

  /** Hard-erase a checkpoint: zero-overwrite the bytes, then unlink. No-op if absent. */
  scrub(name: string): void {
    // The AtomicWriter owns the on-disk layout; ask it for the live path.
    const live = this.#writer.livePath(name);
    let size: number;
    try {
      size = statSync(live).size;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return; // nothing to scrub
      throw err;
    }
    writeFileSync(live, Buffer.alloc(size, 0)); // overwrite contents with zeros
    rmSync(live, { force: true }); // then unlink
  }
}
