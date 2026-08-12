# Spill Retype Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and physically execute an exact package-owned Fungi record twin for exported TypeScript `spillRetype()` without switching or retiring consumers.

**Architecture:** Extend the existing governed hardening trust module with one nominal three-field record and one zero-argument pure flow. Differential evidence compares the exact TypeScript record and trust consequences; independent SLIDE/VOK evidence binds the exact record schema, physical artifact and typed receipt.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, compiler interpreter, independent SLIDE checked-package compiler, VOK typed record receipts.

## Global Constraints

- Preserve exact `retypedTo`, `code` and `reason` values from live TypeScript.
- Use the existing `refute() -> Verdict` helper; do not represent K3 as `Int`.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while` or `loop`.
- Keep TypeScript, governance-verifier consumers and fallbacks active.
- Grant no production, release, signing, platform, runtime-residency or retirement authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.
- Commit locally only; never push.

---

### Task 1: Differential RED contract

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/spill-retype-fungi-conversion.test.mjs`
- Read: `packages-galerina/galerina-core-compiler/src/hardening-residency.ts`
- Read: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi`

**Interfaces:**
- Consumes: TypeScript `spillRetype() -> SpillOutcome`, `boundaryTrusted`, and `combineTrust`.
- Produces: differential contract for `spillRetypeFungi() -> SpillOutcomeFungi`.

- [ ] **Step 1: Write the failing test**

Parse and effect-check the governed Fungi asset, invoke `spillRetypeFungi`, and
compare the interpreted record with `spillRetype()`. Assert the exact literal
record, Deny boundary refusal, contagious Deny combination and prohibited
source shapes. The production mutation this catches is any missing/wrong
record field, wrong trust state, or diagnostic drift.

- [ ] **Step 2: Run the RED test**

Run from the compiler package:

```powershell
node --test tests/spill-retype-fungi-conversion.test.mjs
```

Expected: one failure because `spillRetypeFungi` is absent.

---

### Task 2: Minimal Fungi record implementation

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi`

**Interfaces:**
- Consumes: existing `refute() -> Verdict`.
- Produces: nominal `SpillOutcomeFungi` and `spillRetypeFungi() -> SpillOutcomeFungi`.

- [ ] **Step 1: Add the exact record and flow**

Declare the record immediately after the version/module comments so it remains
inside the bounded SLIDE record profile, then add the flow after `refute`:

```fungi
record SpillOutcomeFungi {
  retypedTo: Verdict
  code: String
  reason: String
}

pure flow spillRetypeFungi() -> SpillOutcomeFungi
contract { intent { "Return the exact governed spill downgrade as a closed record." } }
{
  return SpillOutcomeFungi {
    retypedTo: refute()
    code: "FUNGI-HARDEN-007"
    reason: "The value provably spills past its residency ceiling, so its compile-time type-state is downgraded to `Refuted` (sticky + contagious, RD-0337) — it can no longer be released at a trust boundary, and anything derived from it inherits the refutation. This is the governed downgrade (RD-0358 §3-2), not a silent spill."
  }
}
```

- [ ] **Step 2: Strict-check and run GREEN**

Run:

```powershell
node galerina.mjs check packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi --strict-types --strict-governance
node --test packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs packages-galerina/galerina-core-compiler/tests/spill-retype-fungi-conversion.test.mjs
```

Expected: zero strict errors/warnings and 3/3 focused tests.

- [ ] **Step 3: Commit the source slice**

Commit only the Fungi source and differential test with message
`feat: add fungi spill retype decision`.

---

### Task 3: Physical SLIDE/VOK record proof

**Files:**
- Create: `scripts/tests/spill-retype-fungi-slide.integration.test.mjs`
- Modify: `../SLIDE/src/checked-fungi-pure-scalar-compiler.mjs`
- Modify: `../SLIDE/tests/v2c-external-record-abi.test.mjs`

**Interfaces:**
- Consumes: exact governed Fungi bytes and zero arguments.
- Produces: independently verified typed record receipt with `authorityReleased=false`.

- [ ] **Step 1: Write the physical RED test**

Compile and publish `spillRetypeFungi`; require the parent/no-successor profile
to omit registry-set fields and initially pin the record descriptor as
`UNPINNED` so the first admitted build exposes its exact identity. Verify the
record value, schema, safe-value record type, descriptor
digest and authority flag. Add refusals for surplus arguments, inadequate step
fuel, source mutation, published artifact mutation, receipt-field mutation and
safe-value-envelope mutation.

If this test refuses before packaging, reduce the failure against the bounded
record ABI. The confirmed reduction is the camelCase external field
`retypedTo`: add a SLIDE RED test that requires an exact camelCase external
descriptor and typed K3 record value, then map ordered members to deterministic
lower-snake internal slots without changing the external descriptor.

- [ ] **Step 2: Run RED and pin exact observed identities**

Run:

```powershell
$env:GALERINA_SLIDE_REPO='C:\Users\phill\Documents\GitHub\SLIDE'
node --test scripts/tests/spill-retype-fungi-slide.integration.test.mjs
```

Expected first failure: exact registry or record-descriptor mismatch. Replace
only `UNPINNED` constants with the observed identities; do not widen a profile.

- [ ] **Step 3: Run physical GREEN**

Rerun the same command. Expected: 1/1, zero skip, zero failure.

- [ ] **Step 4: Commit the physical proof**

Commit only the physical integration test with message
`test: prove fungi spill retype in slide`.

---

### Task 4: Bounded closure and publication

**Files:**
- Create: `docs/reports/spill-retype-fungi-conversion-2026-08-12.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: Golden, retirement, graph, status, code-index, component-health and roadmap-subway registered owners.

**Interfaces:**
- Consumes: fresh focused, compiler, canonical and physical results.
- Produces: exact local evidence with no consumer-switch or retirement claim.

- [ ] **Step 1: Run bounded verification owners**

Run the focused hardening neighborhood, compiler package, canonical package
owner, Golden Pack and retirement owner. Exclude full tooling, normal
phase-close and whole-memory evaluation.

- [ ] **Step 2: Record exact custody**

Record TypeScript/Fungi/test byte sizes and SHA-256 digests, Galerina and SLIDE
commits, registry and record-descriptor identities, counts, refusals and
authority limits in the report, TODO and active roadmap.

- [ ] **Step 3: Publish generated owners**

Run `node scripts/graph-all.mjs` once, then regenerate/check code registry,
code index, component health, status, pinned SLIDE and roadmap subway in
dependency order. Require canonical count, path-leak and private-doc checks.

- [ ] **Step 4: Refresh indexes and finish locally**

Refresh Myco and prove `spillRetypeFungi` is queryable. Attempt the primary
codebase-memory refresh once; report `UNKNOWN` if its transport closes. Verify
a clean tracked tree and do not push.
