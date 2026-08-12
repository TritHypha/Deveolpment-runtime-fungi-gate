# Execution Signature Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Physically execute the exact passive record construction inside
TypeScript `computeExecutionSignature` as package-owned Fungi without changing
or retiring its callers.

**Architecture:** Add one pure Fungi flow returning a closed eight-field record
whose members preserve seven typed Int inputs and one Bool input exactly.
Differential evidence compares it with the live TypeScript function;
independent SLIDE/VOK evidence compiles, publishes, re-admits, executes, and
verifies the physical record without releasing authority.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, compiler interpreter,
SLIDE checked-Fungi package compiler, VOK typed receipt verifier.

## Global constraints

- Preserve all eight inputs exactly; add no validation or inference.
- Keep TypeScript, governance-verifier, proof builders, and every consumer
  active.
- A matching record is not authenticated metadata; physical receipts retain
  `authorityReleased: false`.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or
  `loop`.
- Commit locally and never push.
- Exclude full tooling, normal phase-close, and monolithic memory evaluation.

### Task 1: RED differential contract

**Create:**
`packages-galerina/galerina-core-compiler/tests/proof-execution-signature-fungi-conversion.test.mjs`

1. Add zero, mixed, negative, largest safely represented integer, and both
   Boolean vectors.
2. Compare every member returned by live `computeExecutionSignature` with the
   future Fungi record.
3. Require package ownership and absence of forbidden constructs.
4. Run the test and require failure because the Fungi asset is absent.
5. Commit only the RED test.

### Task 2: Minimal package-owned Fungi record constructor

**Create:**
`packages-galerina/galerina-core-compiler/src/self-hosted/proof-execution-signature.fungi`

**Modify:**
`packages-galerina/galerina-core-compiler/package.json`

1. Declare the exact eight-field `ExecutionSignatureFungi` record.
2. Add pure `computeExecutionSignatureFungi`, returning each input unchanged.
3. Register the asset in `packageGraph.loadedAssets`.
4. Strict-check the exact source, then require the differential test to pass.
5. Commit the source and ownership change.

### Task 3: Physical SLIDE/VOK proof

**Create:**
`scripts/tests/proof-execution-signature-fungi-slide.integration.test.mjs`

1. Compile and publish the exact export.
2. Pin the successful registry-set and record-descriptor identities.
3. Execute every differential vector and verify every typed record field plus
   `authorityReleased: false`.
4. Refuse wrong arity/type, unsafe numeric values, inadequate work,
   source/receipt/envelope mutation, and artifact mutation.
5. Run with the local SLIDE repository bound and commit the physical proof.

### Task 4: Bounded owner closure

1. Run the compiler package and canonical package owner as isolated monitored
   processes.
2. Regenerate only owners that correctly refuse as stale.
3. Update TODO, active roadmap, SVG, and a focused report without claiming an
   authenticated input, consumer switch, or retirement.
4. Run the bounded owner matrix and commit intended outputs locally.
5. Refresh Myco and attempt the primary graph index once; retain closed
   transport as `UNKNOWN`.
