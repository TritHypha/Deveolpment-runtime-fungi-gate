// @galerina/core-sentinel-state (LSS) — the Tower's Checkpointing & Persistence Engine.
//
// Atomic, cryptographically-verified state snapshots for cold-boot recovery.
// Citizen Protocol v1.5.

export { SecurityTrap, HardenedBorderViolation } from "./errors.js";
export { StateSerializer } from "./state-serializer.js";
export type {
  Snapshot,
  SnapshotKeyHandle,
  SnapshotKeyProvider,
  StateSerializerOptions,
} from "./state-serializer.js";
export { AtomicWriter } from "./atomic-writer.js";
export {
  ColdBootOrchestrator,
  RESTORE_VERDICT_EXPORT_NAME,
  RESTORE_VERDICT_PACKAGE_IDENTITY,
} from "./cold-boot.js";
export type { RestoreVerdictAuthority } from "./cold-boot.js";
