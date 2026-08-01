# Data-Pipeline Block Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every blocking data-pipeline saturation policy terminate after
a declared positive safe-integer duration.

**Architecture:** Replace the broad backpressure interface with a
discriminated union and keep runtime validation in the existing package
validator. Blocking policies require `blockTimeoutMs`; non-blocking policies
refuse that dead field.

**Tech Stack:** TypeScript, Node test runner, repository graph/generator and
phase-close tooling.

## Global Constraints

- Zero trust: malformed, missing, surplus or inapplicable timeout state refuses.
- Fail closed: no timeout may be inherited from the whole-pipeline budget.
- Keep the flat package topology; add no package, dependency, sidecar or host effect.
- Preserve existing diagnostic codes and ordering outside the new timeout checks.
- Implementation is test-first and local commits are never pushed.

---

### Task 1: Runtime contract tests

**Files:**
- Modify: `packages-galerina/galerina-data-pipeline/tests/pipeline-contracts.test.mjs`

**Interfaces:**
- Consumes: `validateBackpressurePolicy(policy, path?)`
- Produces: executable requirements for `blockTimeoutMs`

- [ ] **Step 1: Update the valid blocking fixture**

Set every valid `block` policy to include `blockTimeoutMs: 5_000`.

- [ ] **Step 2: Add missing and invalid timeout tests**

Assert that missing, zero, negative, fractional, non-finite and unsafe values
produce exactly `Galerina_DATA_PIPELINE_BLOCK_TIMEOUT_REQUIRED` at
`backpressure.blockTimeoutMs`.

- [ ] **Step 3: Add dead-field tests**

Assert that `fail` and `shed_oldest` with `blockTimeoutMs` produce exactly
`Galerina_DATA_PIPELINE_BLOCK_TIMEOUT_UNEXPECTED`.

- [ ] **Step 4: Prove RED**

Run `npm.cmd test` in
`packages-galerina/galerina-data-pipeline`. The new assertions must fail
because the current validator neither requires nor refuses the field.

### Task 2: Discriminated policy and validator

**Files:**
- Modify: `packages-galerina/galerina-data-pipeline/src/index.ts`

**Interfaces:**
- Produces: `BackpressurePolicy` discriminated union
- Preserves: `validateBackpressurePolicy(policy, path?) -> readonly PipelineDiagnostic[]`

- [ ] **Step 1: Replace the interface with the union from the design**

Use literal `block`, `shed_oldest` and `fail` arms. The non-blocking arm must
declare `blockTimeoutMs?: never`.

- [ ] **Step 2: Add the two fail-closed runtime checks**

When `onSaturation === "block"`, require
`isPositiveSafeInteger(policy.blockTimeoutMs)`. When the mode is a known
non-blocking arm, refuse an own timeout field. Leave unknown-mode reporting
independent.

- [ ] **Step 3: Prove GREEN**

Run `npm.cmd test` in the package and require all tests, typecheck and build to
pass without warnings.

### Task 3: Documentation and repository closure

**Files:**
- Modify: `packages-galerina/galerina-data-pipeline/README.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: generated indexes and `version.json` only through owned tools

**Interfaces:**
- Consumes: verified Task 2 behavior
- Produces: current package usage and auditable project status

- [ ] **Step 1: Document both valid policy shapes and non-claims**

Show one bounded `block` example and one `fail` example. State that the package
validates the contract but runtime enforcement remains a separate gate.

- [ ] **Step 2: Update current status**

Mark the recorded data-pipeline contract delta complete and record exact
focused evidence without changing platform or release authority.

- [ ] **Step 3: Regenerate and verify**

Run the governed generators, graph check, generator-contract audit,
authoritative package-count run and strict/exhaustive phase-close. Fix rather
than waive any failure.

- [ ] **Step 4: Commit locally**

Commit only the reviewed chapter files and generated evidence. Never push.
