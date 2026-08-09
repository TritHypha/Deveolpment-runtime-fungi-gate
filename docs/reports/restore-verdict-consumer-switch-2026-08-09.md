# Restore verdict consumer switch

Date: 2026-08-09

Status: **COMPLETE — REFERENCE-ONLY, NON-AUTHORIZING**

## Outcome

`ColdBootOrchestrator.restore` now requires one exact
`RestoreVerdictAuthority`. It derives snapshot presence and integrity locally,
calls the authority exactly once, accepts only integer `1` or `-1`, and
requires the result to equal the local fail-closed expectation. Authority
absence, wrong identity, exceptions, K3 unknown, malformed results and
disagreement all refuse as `LSS-RESTORE-AUTHORITY-001`; there is no inline
decision fallback.

The authority cannot expand access. A malicious or faulty authority can deny a
valid restore, but it cannot make an absent or invalid snapshot restorable.
`StateSerializer.deserialize` independently re-verifies integrity after the
decision allows restoration.

## Preserved ownership

The switch changes only the restore decision. The TypeScript host still owns:

- snapshot serialization and deserialization;
- authenticated checksum, epoch and HMAC verification;
- atomic file reads and writes;
- durability and recovery behaviour;
- hard scrub and unlink.

No TypeScript-retirement, host-boundary or production-authority counter moves
from this reference-only slice.

## Evidence

| Evidence | Result |
| --- | --- |
| Sentinel-state package | **26/26** |
| Tower Citizen package | **495/495** |
| Contract 85 source-free publication | **4/4** |
| Complete Galerina package aggregate | **99/99 packages · 9,464 tests · 0 failed** |
| Compiler subset | **6,319/6,319** |
| Golden Pack closure | **11/11 checked · 11/11 execution vectors** |
| Normal phase-close | **all blocking gates passed** |
| Node process census | **2 -> 2** |

The Contract 85 integration prepares three separate affine execution handles
and drives the real orchestrator through valid, missing and tampered snapshot
paths. Every decision executes the committed 617-byte `.slide`, verifies the
typed receipt, requires `fallbackInvoked=false`, and consumes exactly one
handle.

The first post-switch phase-close correctly refused a stale Golden Pack runtime
closure digest. Its owning writer regenerated the manifest, the focused
Golden Pack check passed, and the complete phase-close then passed. The gate
was not weakened and no digest was hand-edited.

## Remaining boundary

The boot composition layer still needs a content-bound, production-admitted
SLIDE runtime and authenticated platform evidence. Contract 85's loader path
and publication remain reference-only. General collections, broader Result
families, multiple/cross-package effects and production authority remain open.
