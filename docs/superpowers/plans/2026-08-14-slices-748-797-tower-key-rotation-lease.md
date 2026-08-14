# Slices 748-797 Tower Key Rotation and Lease Plan

> **For agentic workers:** use the executing-plans workflow. Root is the sole
> writer, tester and committer; workers are read-only.

**Goal:** Account for the next 50 unique TypeScript conversion scopes in exact
source order after Slice 747.

**Source build point:** `2a5c5454fbdc163709f9d04e74842ae77924fb1b`,
independently indexed by codebase-memory and refreshed by Myco before this
plan. This plan commit makes later graph freshness `UNKNOWN` until the
Slice-797 refresh.

**Pinned sources/tests:**

- `key-rotation.ts` SHA-256 `E0AB126D2D32925ACDB5E2A0D31028E99E31CA265CCE634E6E1EDC4181C47F26`
- `key-rotation.test.mjs` SHA-256 `950673FF76FC12DDB0C21EC41B42A1611A937A6CB6C39D1859F070454C7ADB25`
- `lease.ts` SHA-256 `923A33F8302F02A3F1AD09A11AB8C4E937F6664CC503D03C4CEC6C1AF4337CB3`
- `lease.test.mjs` SHA-256 `C9D5C2BE5BD53A98A7A68666F3A76E453A5CAC0722C1028E92D0A82D43E8B2D1`
- `partial-return.ts` SHA-256 `BF7223B8C6C47C980D2757362823189FB4814E4686063DFD4BECCC13926FF156`
- `partial-return.test.mjs` SHA-256 `8A1B6A3330963D8CC061B57F5303CD3494E2E70EB67E8375517B66CE1EC0B20D`

## Constraints

- Use codebase-memory first, bounded Myco second, exact reads last.
- Skip `key-rotation.ts#isWellFormedCommit`: Slice 47 already owns that exact
  scope. The identically named data-database helper is a different path and
  does not consume this credit.
- Treat Node crypto, Buffer/TypedArray views, JSON canonicalization, callbacks,
  mutable arrays/records, error identity and K3 authority as observable.
- A loaded `governance-decisions.fungi#leaseVerdict` fold is adjacent evidence
  only: it consumes host-precomputed Booleans and does not close the TypeScript
  record/proxy/null/non-finite ingress.
- No placeholder candidate, consumer switch or retirement without exact GIR,
  physical `.slide`, independent re-admission and VOK evidence.
- Private skills remain private and unpushed. Never push repository commits.
- Repository-wide closure remains `UNKNOWN`.

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 748 | `key-rotation.ts#canonicalEpochs` |
| 749 | `key-rotation.ts#ringMac` |
| 750 | `key-rotation.ts#macEqual` |
| 751 | `key-rotation.ts#isNonNegativeSafeInteger` |
| 752 | `key-rotation.ts#createKeyRing` |
| 753 | `key-rotation.ts#verifyRing` |
| 754 | `key-rotation.ts#activeEpoch` |
| 755 | `key-rotation.ts#epochForVerification` |
| 756 | `key-rotation.ts#stageEpoch` |
| 757 | `key-rotation.ts#switchActive` |
| 758 | `key-rotation.ts#fallbackSwitch` |
| 759 | `key-rotation.ts#markRevoked` |
| 760 | `key-rotation.ts#RotationCtx` |
| 761 | `key-rotation.ts#seamVerdict` |
| 762 | `key-rotation.ts#GateResult` |
| 763 | `key-rotation.ts#gate` |
| 764 | `key-rotation.ts#ReadinessEvidence` |
| 765 | `key-rotation.ts#readinessVerdict` |
| 766 | `key-rotation.ts#lockAVerdict` |
| 767 | `key-rotation.ts#lockBVerdict` |
| 768 | `key-rotation.ts#lockCVerdict` |
| 769 | `key-rotation.ts#tripleLockVerdict` |
| 770 | `key-rotation.ts#VerifyEvidence` |
| 771 | `key-rotation.ts#tripleVerifyVerdict` |
| 772 | `key-rotation.ts#DrainEvidence` |
| 773 | `key-rotation.ts#drainVerdict` |
| 774 | `key-rotation.ts#RetirePolicyMode` |
| 775 | `key-rotation.ts#RetirePolicy` |
| 776 | `key-rotation.ts#retireVerdict` |
| 777 | `key-rotation.ts#RotationPhase` |
| 778 | `key-rotation.ts#RotationProcess` |
| 779 | `key-rotation.ts#PhaseOutcome` |
| 780 | `key-rotation.ts#beginRotation` |
| 781 | `key-rotation.ts#closePhase` |
| 782 | `key-rotation.ts#checkReadiness` |
| 783 | `key-rotation.ts#stageCandidate` |
| 784 | `key-rotation.ts#commitTripleLock` |
| 785 | `key-rotation.ts#switchEpoch` |
| 786 | `key-rotation.ts#confirmTripleVerify` |
| 787 | `key-rotation.ts#fallbackToOldEpoch` |
| 788 | `key-rotation.ts#confirmDrain` |
| 789 | `key-rotation.ts#retireOldEpoch` |
| 790 | `lease.ts#CapabilityLease` |
| 791 | `lease.ts#LeaseDecision` |
| 792 | `lease.ts#LeaseDenyReason` |
| 793 | `lease.ts#isWellFormed` |
| 794 | `lease.ts#leaseVerdict` |
| 795 | `lease.ts#checkLease` |
| 796 | `lease.ts#isLeaseValid` |
| 797 | `partial-return.ts#Masked` |

Planned arithmetic: **14 NO_RUNTIME_BEHAVIOR + 36 BLOCKED**; zero
candidates/superseded scopes.

## Tasks

### Task 1: Slices 748-764

- [x] Pin crypto, canonical wire, ring construction/mutation, callbacks,
  declarations, callers, tests, assets and prior-credit proof.
- [x] Record exact blocker exits, hostile vectors and threadability.

### Task 2: Slices 765-781

- [x] Pin readiness/lock/verify/drain/retire folds and rotation process state.
- [x] Preserve callback, K3, array/record alias and failure ordering exactly.

### Task 3: Slices 782-797

- [x] Pin phase wrappers, lease borders and the partial-return declaration.
- [x] Reconcile loaded Fungi dependency evidence without promoting a false twin.

### Task 4: Author, verify, review and publish

- [x] Author 50 unique receipt-local classifications, exact exits and vectors.
- [x] Run focused Tower checks and the governed receipt audit.
- [x] Reconcile three independent read-only reviews.
- [x] Commit authored evidence separately, publish owners and run the bounded
  19-check matrix.
- [ ] Refresh both indexes at the final Slice-797 closure commit.
