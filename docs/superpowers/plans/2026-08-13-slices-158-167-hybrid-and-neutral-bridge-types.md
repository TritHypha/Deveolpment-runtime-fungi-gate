# Slices 158-167 Hybrid and Neutral Bridge Types Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adjudicate the remaining hybrid bridge-attestation functions and the
first seven owned neutral Brain/Brawn contract types without inventing crypto,
binary64, typed-array, wire or module semantics in Fungi.

**Architecture:** Finish the Tower-owned hybrid functions first, then follow
the Tower re-export shim to `@galerina/inference-bridge-contract`, which owns
the real source. A TypeScript string union is not silently replaced by a Fungi
enum: the external string wire, exhaustive mapping and terminal surplus refusal
must be proved. No placeholder source is permitted.

**Tech Stack:** TypeScript, Node `node:test`, checked Fungi, independent SLIDE/
VOK contracts, Myco, Markdown slice receipts.

## Global constraints

- Local commits only; never push.
- No `null`, `NaN`, `else if`, `throw`, `try/catch`, `for` or unbounded `loop`
  in new Fungi. This batch is expected to refuse before Fungi authoring.
- A caller-projected cryptographic result is not verifier evidence.
- Preserve string-union spelling, property absence, binary64, typed-array and
  union identity, async failure, dynamic import, key custody and active-object
  behavior exactly.
- Defer aggregate graph/index/roadmap owners until Slice 172 under the approved
  25-slice cadence. Repository-wide closure remains `UNKNOWN`.

### Task 1: Bind the exact owners

- [x] Bind Slices 158-160 to `signManifestHybrid`,
  `verifyAttestationHybrid` and `attestBridgeHybrid` in Tower-Citizen.
- [x] Treat `bridge/interface.ts` only as a compatibility re-export and follow
  it to the neutral contract owner.
- [x] Bind Slices 161-164 to `PrecisionTechnique`, `QuantizationMethod`,
  `SchedulingTechnique` and `InferenceOpClass`.
- [x] Bind Slices 165-167 to `FixedScale`, `BridgeOp` and `BridgeResult`.

### Task 2: Classify semantic exits

- [x] Audit hybrid signing, verification and delegation for canonical bytes,
  Ed25519/ML-DSA-65, context, base64, dynamic import, async failure, key custody,
  no-downgrade and active bridge behavior.
- [x] Audit every string union for exact external spelling, exhaustive mapping,
  injectivity and terminal surplus refusal.
- [x] Audit bridge records for binary64, integer intent without runtime proof,
  typed arrays, number unions, optional fields and exact JavaScript object shape.
- [x] Search existing Fungi assets and refuse duplicates or narrower policy
  twins as complete replacements.

### Task 3: Bounded verification

- [x] Run neutral-contract and Tower-Citizen typechecks.
- [x] Run the complete neutral-contract package suite.
- [x] Run the focused hybrid-attestation and bridge-contract consumer tests.
- [x] Run complete Tower-Citizen; require zero failures and zero skips.

### Task 4: Publish and review

- [x] Create ten Slice 158-167 receipts and append the live register.
- [x] Review both private Fungi skills against RD-0826. Adopt only reusable,
  source-proven rules and pass each skill's hostile/release checks.
- [x] Update `docs/TODO.md` with exact reopen conditions.
- [x] Run the slice-close receipt owner plus staged path/private-document guards
  and commit bounded files only.

## Self-review

- The neutral package, not the Tower shim, is treated as the source owner.
- Fungi enums are not claimed wire-equivalent to TypeScript string unions.
- Binary64 and typed arrays are not narrowed to `Int`/`Array<Int>` silently.
- Hybrid policy folding is not confused with cryptographic verification.
- Every refusal records a concrete reopen contract and `_=>`-equivalent exit.
