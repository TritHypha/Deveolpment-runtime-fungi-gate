# Slices 148-157 Attestation Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adjudicate the remaining audit configuration records and the first
eight bridge-attestation surfaces without inventing Fungi crypto, host-key or
capability semantics.

**Architecture:** Preserve TypeScript as the active host-cryptography and
bridge-object boundary. Reuse the existing checked Fungi PQ policy twin only
for its exact Boolean policy fold; never reinterpret host-computed signature
Booleans as cryptographic proof. Create no placeholder source.

**Tech Stack:** TypeScript, Node `node:test`, checked Fungi, independent SLIDE/
VOK contracts, Myco, Markdown slice receipts.

## Global constraints

- Local commits only; never push.
- No `null`, `NaN`, `else if`, `throw`, `try/catch`, `for` or unbounded `loop`
  in new Fungi. This batch is expected to refuse before Fungi authoring.
- The existing `pq-admission-policy.fungi` is policy-only and not evidence that
  Fungi implements Ed25519, ML-DSA-65, key generation or manifest hashing.
- A signature-valid Boolean never substitutes for independently verified
  cryptographic evidence.
- Preserve optional-field absence, exact object/prototype identity, callback
  failure, revocation, key custody, randomness and byte encoding.
- Defer aggregate graph/index/roadmap owners until Slice 172 under the approved
  25-slice cadence. Repository-wide closure remains `UNKNOWN`.

### Task 1: Exact preflight and duplicate conservation

- [ ] Bind Slices 148-149 to `AuditFilter` and `AuditLoggerOptions`.
- [ ] Bind Slices 150-157 to `AttestationPolicy`, `AttestationResult`,
  `attestationHash`, `signManifest`, `verifyAttestation`,
  `generateAttestationKeypair`, `attestBridge` and
  `generateHybridAttestationKeypair`.
- [ ] Search existing package Fungi assets and conserve
  `pq-admission-policy.fungi` as a narrower policy twin, not a duplicate or
  full-source replacement.

### Task 2: Classify every semantic exit

- [ ] Audit the two configuration records for Option, binary64, callback,
  capability and exact JavaScript object-shape requirements.
- [ ] Audit hash/sign/verify/key-generation surfaces for canonical bytes,
  Node key objects, base64, randomness, dynamic imports, hybrid no-downgrade,
  revocation and typed failure behavior.
- [ ] Audit `attestBridge` for getters, prototype/method delegation, lifecycle
  effects and thrown missing-manifest identity.
- [ ] Refuse any surface whose complete source domain or effect identity is not
  admitted through Fungi, GIR, physical `.slide` and independent VOK receipts.

### Task 3: Bounded evidence

- [ ] Run Tower-Citizen typecheck.
- [ ] Run the focused audit, classical-attestation, hybrid-attestation,
  certified-profile, photonic-admission and PQ policy files; record exact
  pass/skip counts.
- [ ] Run complete Tower-Citizen; require zero failures and zero skips.

### Task 4: Publish exact decisions

- [ ] Create ten Slice 148-157 reports and append the live register.
- [ ] Review both private Fungi skills. Update only for a genuinely missing,
  reusable, source-proven rule; otherwise record `NO_SKILL_UPDATE`.
- [ ] Update `docs/TODO.md` with reopen conditions and retain TypeScript.
- [ ] Run the slice-close receipt owner for the new ten reports and commit
  bounded documents only. Do not run crash-linked aggregate lanes.

## Self-review

- Policy folding is not confused with cryptographic verification.
- No key, random source, callback, host object or active bridge is projected
  into inert data.
- The existing policy twin is conserved without claiming a consumer switch.
- Every refusal has an explicit reopen contract and `_=>`-equivalent exit.
