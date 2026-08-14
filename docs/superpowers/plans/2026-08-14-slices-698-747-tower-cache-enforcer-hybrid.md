# Slices 698-747 Tower Cache, Enforcer and Hybrid Plan

> **For agentic workers:** use the executing-plans workflow. Root is the sole
> writer, tester and committer; workers are read-only.

**Goal:** Account for the next 50 unique TypeScript conversion scopes in exact
source order after Slice 697.

**Source build point:** `17996b1145cc42067ec76332685b986ca741754f`,
independently indexed before this plan. This plan commit makes later graph
freshness `UNKNOWN` until the Slice-747 refresh.

**Pinned sources:**

- `gate-cache.ts` SHA-256 `D10696EEA5A4F2AD748ED9152D757E5E720C7ED1ED309C1FBCCF5D565312568F`
- `governance-enforcer.ts` SHA-256 `63DC1C1C8890C4E3198FE76E4D39196E5D77A037F721B0EFE42E7C3F70E24EC0`
- `hybrid-engine.ts` SHA-256 `EF868088EB15BBB853ABD01D75327053E70221CB1123621DBBF3C667B381EECB`
- `key-rotation.ts` SHA-256 `E0AB126D2D32925ACDB5E2A0D31028E99E31CA265CCE634E6E1EDC4181C47F26`

## Constraints

- Use codebase-memory first, bounded Myco second, exact reads last.
- Refuse duplicate credit for bridge re-exports and prior Slice-47
  `isWellFormedCommit`.
- Treat TypeScript private/readonly as erased. Reflectable mutable static state
  and class-owned active state remain observable runtime scopes.
- No placeholder Fungi, consumer switch or retirement without exact GIR,
  physical `.slide`, independent re-admission and VOK evidence.
- Preserve host crypto, UTF-16/number/typed-array semantics, callback effects,
  active aliases, error identity, clock/audit order and async cleanup exactly or
  record a precise blocker.
- Private skills remain private and unpushed. Never push repository commits.
- Repository-wide closure remains `UNKNOWN`.

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 698 | `gate-cache.ts#defaultGateCache` |
| 699 | `gate-cache.ts#compilePolicyCached` |
| 700 | `governance-enforcer.ts#RestrictedTransition` |
| 701 | `governance-enforcer.ts#TransitionPolicy` |
| 702 | `governance-enforcer.ts#TPL_DEFAULT_POLICY` |
| 703 | `governance-enforcer.ts#GovernanceEnforcer` |
| 704 | `GovernanceEnforcer.KNOWN_REQUIREMENTS` |
| 705 | `GovernanceEnforcer.constructor` |
| 706 | `GovernanceEnforcer.signAudit` |
| 707 | `GovernanceEnforcer.markSchemaValidated` |
| 708 | `GovernanceEnforcer.hasAuditSignature` |
| 709 | `GovernanceEnforcer.checkTransition` |
| 710 | `GovernanceEnforcer.reset` |
| 711 | `hybrid-engine.ts#STANDARD_INFERENCE_OPS` |
| 712 | `hybrid-engine.ts#HybridInferenceRequest` |
| 713 | `hybrid-engine.ts#AiGovernance` |
| 714 | `hybrid-engine.ts#HybridInferenceReceipt` |
| 715 | `hybrid-engine.ts#HYBRID_METADATA` |
| 716 | `hybrid-engine.ts#AI_INFERENCE_CAP` |
| 717 | `hybrid-engine.ts#DEMO_COUNT` |
| 718 | `hybrid-engine.ts#fnv1a` |
| 719 | `hybrid-engine.ts#packTrits` |
| 720 | `hybrid-engine.ts#buildDemoTernaryOp` |
| 721 | `hybrid-engine.ts#PhotonicKernelCost` |
| 722 | `hybrid-engine.ts#PhotonicOffloadPort` |
| 723 | `hybrid-engine.ts#PhotonicCertifiedAttestation` |
| 724 | `hybrid-engine.ts#PhotonicConfig` |
| 725 | `hybrid-engine.ts#defaultPhotonicKernelFor` |
| 726 | `hybrid-engine.ts#HybridInferenceEngine` |
| 727 | `HybridInferenceEngine.constructor` |
| 728 | `HybridInferenceEngine.resolveCapabilityGrant` |
| 729 | `HybridInferenceEngine.checkBridgeAttestation` |
| 730 | `HybridInferenceEngine.verifyPhotonicCertifiedAdmission` |
| 731 | `HybridInferenceEngine.initialize` |
| 732 | `HybridInferenceEngine.planFor` |
| 733 | `HybridInferenceEngine.seal` |
| 734 | `HybridInferenceEngine.infer` |
| 735 | `HybridInferenceEngine.checkAiGovernance` |
| 736 | `HybridInferenceEngine.dispatchPlan` |
| 737 | `HybridInferenceEngine.shutdown` |
| 738 | `HybridInferenceEngine.auditPrecisionDecision` |
| 739 | `HybridInferenceEngine.buildReceipt` |
| 740 | `HybridInferenceEngine.getAudit` |
| 741 | `hybrid-engine.ts#createHybridEngine` |
| 742 | `key-rotation.ts#KeyKind` |
| 743 | `key-rotation.ts#KeyEpochStatus` |
| 744 | `key-rotation.ts#KeyEpoch` |
| 745 | `key-rotation.ts#KeyRing` |
| 746 | `key-rotation.ts#Transition` |
| 747 | `key-rotation.ts#isWeakRingKey` |

Planned arithmetic: **14 NO_RUNTIME_BEHAVIOR + 34 BLOCKED + 2 CANDIDATE**.

`isWeakRingKey` is `BLOCKED`, not a leaf candidate: its complete source domain
is a live `Uint8Array | undefined` view with offset/length, mutation,
detachment/resize and possible shared-buffer behavior. An inert byte-array copy
would narrow that observable host contract until an exact border is approved.

## Tasks

### Task 1: Slices 698-714

- [x] Pin exact ranges, callers, tests, loaded assets and prior-credit proof.
- [x] Record GateCache singleton and TPL policy/enforcer semantics, blockers,
  threadability, exits and hostile vectors.

### Task 2: Slices 715-731

- [x] Pin metadata/constants/helpers, declarations, class state, constructor and
  asynchronous authority admission paths.
- [x] Record exact numeric, typed-array, crypto, bridge and lifecycle semantics.

### Task 3: Slices 732-747

- [x] Pin planning, sealing, inference, dispatch, shutdown, receipts, factory
  and key-rotation prefix evidence.
- [x] Reconcile every scope with exact physical Fungi/GIR/SLIDE/VOK authority.

### Task 4: Author, verify, review and publish

- [x] Author 50 unique receipt-local classifications/blockers/exits/vectors.
- [x] Run focused Tower checks and the governed receipt audit.
- [x] Reconcile three independent read-only reviews.
- [x] Commit authored evidence separately.
- [x] Publish registered owners and pass the bounded 19-check matrix.
- [ ] Commit closure provenance and refresh both indexes at Slice 747.
