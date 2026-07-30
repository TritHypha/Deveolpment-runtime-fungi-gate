# Narrow `.fungi` Wasm Compatibility Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary platform-provided Wasm execution path with a
fail-closed `.fungi` engine that accepts only the frozen Galerina-emitted
profile and lowers the same checked representation to SLIDE.

**Architecture:** The existing flat
`packages-galerina/galerina-core-runtime-wasm` package is evolved in place.
An attested binary passes through a bounded decoder, closed profile gate,
complete stack/type validator, exact capability linker, governed reference
interpreter, and finally the SLIDE lowering seam. The present execution path
and independent oracle remain until the complete replacement gate passes.

**Tech Stack:** Galerina `.fungi`, the existing Galerina compiler and package
tools, governed-memory contracts, SLIDE checked execution, JSON profile
evidence, hostile binary fixtures, differential/mutation/fuzz testing, and
temporary beta dev harnesses that carry no runtime authority.

## Global Constraints

- Do not start implementation until Galerina beta-v1 acceptance is complete.
- Keep the existing execution path operational until all ten replacement
  conditions in the accepted design pass.
- Implement only the closed, versioned Galerina-emitted profile; unknown or
  surplus input always terminates.
- Put the implementation in the existing direct child
  `packages-galerina/galerina-core-runtime-wasm`; do not create a duplicate or
  nested package.
- Production implementation source is `.fungi`. Temporary development
  harnesses are non-authoritative and must have a recorded retirement gate.
- `.fungi` `if` is Boolean-only. Use exhaustive `check` for K3 and exhaustive
  `match` for every other multi-way decision.
- Every error, absent value, unrecognised variant, limit breach, trap, and
  indeterminate authority result has an explicit terminal exit (`_=>` in
  design notation).
- No raw-pointer or manual-free authority is exposed to application code.
- Values belong to their flow unless explicitly moved to the global vault.
  Flow cleanup covers return, refusal, trap, cancellation, and exhaustion.
- No ambient filesystem, network, database, process, clock, randomness,
  device, dynamic-code, or graph authority crosses the import boundary.
- Windows 10/11, macOS, Debian/Ubuntu, Fedora, and Mint are required release
  evidence platforms.
- Public product claims describe Galerina and its measured evidence, not
  comparisons with other products.
- Commit locally at each independently reviewable green checkpoint. Never
  push.

---

## File structure

The migration begins under `src/self-hosted/` while the old path remains
authoritative. At final cutover the `.fungi` files become the package's
canonical implementation and the replaced bootstrap files are removed in a
separate commit.

| File | Responsibility |
|---|---|
| `src/self-hosted/profile.fungi` | Closed profile identity, sections, types, instructions, imports, limits |
| `src/self-hosted/bytes.fungi` | Bounded byte cursor and canonical integer decoding |
| `src/self-hosted/module-decoder.fungi` | Section framing and decoded module records |
| `src/self-hosted/checked-ir.fungi` | Closed, validated compatibility IR |
| `src/self-hosted/validator.fungi` | Structural, type-stack, index and limit validation |
| `src/self-hosted/linear-memory.fungi` | Checked memory, regions, generations, bounds and wipe |
| `src/self-hosted/capability-linker.fungi` | Exact import/capability/lease binding |
| `src/self-hosted/interpreter.fungi` | Deterministic reference execution and fuel |
| `src/self-hosted/runtime.fungi` | Attest, decode, validate, link, invoke, clean up |
| `src/self-hosted/slide-lowering.fungi` | Checked IR to SLIDE plan lowering |
| `tests/fixtures/profile/**` | Positive admitted modules and source provenance |
| `tests/fixtures/hostile/**` | One-defect malformed/surplus modules plus controls |
| `tests/profile-census.test.mjs` | Temporary census/profile completeness harness |
| `tests/fungi-engine-*.test.mjs` | Temporary execution/differential harnesses |
| `docs/security/galerina-wasm-profile-v1.json` | Generated, reviewable profile evidence |
| `docs/security/galerina-wasm-profile-v1.schema.json` | Closed schema for the profile evidence |
| `scripts/audit-wasm-profile.mjs` | Non-mutating profile and corpus audit |

The temporary `.mjs` harnesses are development evidence only. The final
cutover task ports their authoritative assertions into `.fungi`/SLIDE test
lanes before retiring the bootstrap toolchain.

---

### Task 1: Census and freeze the Galerina-emitted profile

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/tests/profile-census.test.mjs`
- Create: `scripts/audit-wasm-profile.mjs`
- Create: `docs/security/galerina-wasm-profile-v1.schema.json`
- Create: `docs/security/galerina-wasm-profile-v1.json`
- Modify: `scripts/audit-wasm-validate.mjs`
- Modify: `packages-galerina/galerina-core-runtime-wasm/package.json`

**Interfaces:**

- Consumes: every admitted `.fungi` compiler fixture and its emitted binary.
- Produces: `galerina.wasm.profile.v1`, containing exact section, type,
  instruction, import/export and resource-limit sets with source hashes.

- [ ] **Step 1: Write a red census test**

The test must compile the admitted corpus, parse each valid binary, and fail
when the checked-in profile is missing an observed feature or contains a
feature not justified by a corpus witness.

```js
assert.deepEqual(profile.sections, observed.sections);
assert.deepEqual(profile.instructions, observed.instructions);
assert.deepEqual(profile.imports, observed.imports);
assert.equal(observed.invalidModules.length, 0);
```

- [ ] **Step 2: Prove the current corpus is not profile-freezable**

Run:

```powershell
node --test packages-galerina/galerina-core-runtime-wasm/tests/profile-census.test.mjs
node scripts/audit-wasm-validate.mjs
```

Expected: RED on the documented invalid examples and known unresolved
lowering cases; no baseline suppression may turn those defects green.

- [ ] **Step 3: Implement bounded binary inventory**

Inventory must reject truncation, overlong integer encodings, duplicate
non-custom sections, section-order errors, byte-budget excess, unknown
opcodes, and trailing bytes. It records observations but never executes a
module.

- [ ] **Step 4: Resolve emitter blockers**

Repair or explicitly remove from the admitted corpus every undefined call,
type mismatch, fixed-record-layout overflow, and incorrect Decimal lowering.
Each repair receives a focused compiler regression before source changes.

- [ ] **Step 5: Generate and validate the profile evidence**

The generated profile must bind:

```json
{
  "schema": "galerina.wasm.profile.v1",
  "corpusRoot": "<sha256>",
  "sections": [],
  "valueTypes": [],
  "instructions": [],
  "imports": [],
  "exports": [],
  "limits": {},
  "witnesses": {}
}
```

Unknown fields, duplicate entries, empty witness sets, unbounded limits, or a
corpus-root mismatch refuse.

- [ ] **Step 6: Run the profile gate**

Run:

```powershell
node scripts/audit-wasm-profile.mjs
node scripts/audit-wasm-validate.mjs
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
```

Expected: exact profile/corpus equality, zero invalid admitted modules, and
all package tests green.

- [ ] **Step 7: Commit the profile checkpoint**

Commit the tests, repaired corpus/compiler files, schema, generated profile,
and audit together with exact pathspecs.

---

### Task 2: Implement the bounded canonical decoder in `.fungi`

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/profile.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/bytes.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/module-decoder.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-decoder.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fixtures/hostile/decoder/**`

**Interfaces:**

- Consumes: `Array<Int>` bytes plus immutable `ProfileLimits`.
- Produces: `DecodeResult` containing a decoded module or an exact registered
  `DecodeFault`; never a partial-success module.

- [ ] **Step 1: Define closed decoder types**

```fungi
enum DecodeFault {
  Truncated
  BadMagic
  BadVersion
  OverlongInteger
  SectionOrder
  DuplicateSection
  UnknownSection
  UnknownInstruction
  LimitExceeded
  TrailingBytes
}

record ByteCursor {
  bytes: Array<Int>
  position: Int
  limit: Int
}
```

Use variants for all closed vocabularies. No instruction, section or fault
kind is represented by an open `String`.

- [ ] **Step 2: Write hostile/control pairs**

Add one-defect fixtures for empty, truncated magic/version, overlong and
overflowed integers, reordered/duplicate sections, unknown opcode, declared
length beyond input, trailing bytes, and resource-limit excess. Pair every
hostile input with the smallest admitted control.

- [ ] **Step 3: Run the decoder tests red**

Run:

```powershell
node --test packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-decoder.test.mjs
```

Expected: missing `.fungi` decoder exports.

- [ ] **Step 4: Implement byte cursor primitives**

Every read checks remaining bytes and the declared budget before advancing.
The cursor is returned only on success; no default byte or zero-length
substitute is permitted.

- [ ] **Step 5: Implement section decoding**

Use exhaustive `match` over admitted section identifiers. A custom section
has no generic pass-through arm; it is accepted only if `profile.fungi` names
its schema and maximum size.

- [ ] **Step 6: Verify deterministic faults**

Run each hostile fixture twice and require identical fault code, byte offset,
section identity, and consumed-work count.

- [ ] **Step 7: Run package and strict `.fungi` checks**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
node scripts/lint-fungi.mjs packages-galerina/galerina-core-runtime-wasm/src/self-hosted
npm.cmd --prefix packages-galerina/galerina-core-compiler test
```

- [ ] **Step 8: Commit the decoder checkpoint**

Commit only the decoder types, implementation, fixtures, and green evidence.

---

### Task 3: Implement complete structural and type-stack validation

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/checked-ir.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/validator.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-validator.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fixtures/hostile/validator/**`

**Interfaces:**

- Consumes: fully decoded `DecodedModule` and `WasmProfile`.
- Produces: `ValidationResult` with `CheckedModule` or exact
  `ValidationFault`. Only `CheckedModule` may reach linking or execution.

- [ ] **Step 1: Define checked IR and validation faults**

```fungi
enum ValidationFault {
  TypeMismatch
  StackUnderflow
  StackRemainder
  UnknownIndex
  InvalidBranchDepth
  InvalidBlockResult
  InvalidMemory
  InvalidImport
  InvalidExport
  ResourceLimit
}

record CheckedModule {
  functions: Array<CheckedFunction>
  imports: Array<CheckedImport>
  exports: Array<CheckedExport>
  initialMemoryPages: Int
  profileDigest: String
}
```

- [ ] **Step 2: Add one-rule mutation fixtures**

Cover each validator rule with a positive control and a mutation that changes
only one relevant byte or field. Include unreachable-polymorphic stack cases,
branch result arity, local/global indexes, function signatures, memory
alignment/offset, export uniqueness, and import signature mismatch.

- [ ] **Step 3: Run validation tests red**

Expected: decoded modules currently have no checked-type boundary.

- [ ] **Step 4: Implement single-pass operand/control-stack validation**

The validator maintains explicit operand and control stacks, checks every pop
and push, and validates a function completely before returning it. No lazy
first-invocation validation is admitted.

- [ ] **Step 5: Bind profile and corpus identity**

`CheckedModule.profileDigest` must match the admitted profile digest, and the
attested binary digest must survive unchanged through checked IR provenance.

- [ ] **Step 6: Prove checked-only execution construction**

Add a compile-time/boundary test showing linker and interpreter interfaces
cannot accept `DecodedModule`.

- [ ] **Step 7: Run focused, compiler and mutation gates**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
node scripts/audit-wasm-profile.mjs
npm.cmd --prefix packages-galerina/galerina-devtools-security test
```

- [ ] **Step 8: Commit the validation checkpoint**

Commit validator, checked IR, fixtures and exact green evidence.

---

### Task 4: Implement governed linear memory and deterministic execution

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/linear-memory.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/interpreter.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-execution.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-memory.test.mjs`

**Interfaces:**

- Consumes: `CheckedModule`, exact invocation values, and `ExecutionBudget`.
- Produces: `ExecutionResult` with values and receipts, or a typed terminal
  `ExecutionFault`.

- [ ] **Step 1: Define memory and execution contracts**

```fungi
record ExecutionBudget {
  fuel: Int
  callDepth: Int
  valueStack: Int
  memoryPages: Int
  hostCalls: Int
}

enum ExecutionFault {
  Trap
  OutOfBounds
  Misaligned
  FuelExhausted
  CallDepthExceeded
  StackLimitExceeded
  MemoryLimitExceeded
  InvalidGeneration
  CleanupFailed
}
```

- [ ] **Step 2: Add red arithmetic/control/memory fixtures**

Cover every profile instruction, integer edge, divide trap, comparison,
conversion, structured block/loop/branch, direct call, local/global access,
load/store/fill, and out-of-bounds case. Floating-point fixtures bind exact
NaN, infinity, signed-zero, and conversion policy.

- [ ] **Step 3: Implement generation-tagged regions**

Each allocation binds region identity, generation, extent, alignment, state,
and custody class. Reads/writes must check all fields before touching bytes.
Closing a region increments/revokes its generation and makes every stale
handle refuse.

- [ ] **Step 4: Implement the reference interpreter**

Use exhaustive instruction matching. Each instruction consumes fuel before
performing work. A missing case is a compile error or terminal profile fault,
never a no-op.

- [ ] **Step 5: Implement deterministic traps and receipts**

Receipts bind module, function, input, profile, budget, consumed work,
terminal/result class and cleanup result without recording secret bytes.

- [ ] **Step 6: Run execution and memory tests**

Require two runs to produce identical values/faults/receipts for deterministic
fixtures, with explicit exceptions only for capabilities whose supplied
values are themselves receipt-bound inputs.

- [ ] **Step 7: Run full package and memory mutation gates**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
node scripts/audit-wat-emitter-mutation.mjs
node scripts/audit-wasm-profile.mjs
```

- [ ] **Step 8: Commit the execution checkpoint**

Commit memory and interpreter work only after all admitted instructions have a
positive witness and at least one rejecting mutation.

---

### Task 5: Implement exact capability linking and injection separation

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/capability-linker.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-linker.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fixtures/hostile/imports/**`
- Modify: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/checked-ir.fungi`

**Interfaces:**

- Consumes: checked imports, signed module identity, caller identity,
  capability grants, leases and K3 evidence.
- Produces: a closed `LinkedModule` or typed terminal link refusal.

- [ ] **Step 1: Define closed import identities**

Import module/name pairs and signatures come from `profile.fungi`. Unknown,
duplicate, surplus, malformed Unicode, bidi-control, NUL, confusable or
signature-mismatched names refuse before any capability is attached.

- [ ] **Step 2: Add injection and surplus-authority tests**

Cover name confusion, duplicate normalized names, hidden controls,
instruction-like metadata, path/URL strings, unknown import modules, surplus
grants, expired/wrong-subject leases, K3 indeterminate, and handler
re-entrancy.

- [ ] **Step 3: Run linker tests red**

Expected: current host-map construction has no `.fungi` checked-link boundary.

- [ ] **Step 4: Implement exact lease binding**

Bind module digest, import identity, operation, subject, resource, generation,
time/work ceiling and handler identity. Compose K3 with `check`; only exact
`ALLOW` constructs a linked handler.

- [ ] **Step 5: Enforce no ambient capabilities**

The linked module contains only handlers explicitly named by checked imports
and exact grants. Absence and surplus both refuse. Retrieved text, graph
content and custom sections cannot create or select handlers.

- [ ] **Step 6: Prove link-before-instantiate ordering**

A test must show malformed, unattested, unvalidated, denied and indeterminate
modules never call a handler factory.

- [ ] **Step 7: Run focused and governance gates**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
node scripts/audit-effect-canonicality.mjs
node scripts/audit-sink-canonicality.mjs
```

- [ ] **Step 8: Commit the linker checkpoint**

Commit the closed linker and hostile corpus with no authority widening.

---

### Task 6: Make flow cleanup and vault transfer total

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/runtime.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-cleanup.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-vault-transfer.test.mjs`
- Modify: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/linear-memory.fungi`
- Modify: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/interpreter.fungi`

**Interfaces:**

- Consumes: attested bytes, profile, grants, invocation and budget.
- Produces: a result whose returned values have explicit ownership, plus a
  signed cleanup receipt; no invocation-owned region survives accidentally.

- [ ] **Step 1: Enumerate all exits**

The test matrix must cover normal return, explicit refusal, unreachable trap,
numeric trap, bad host result, denied capability, indeterminate capability,
fuel exhaustion, call-depth exhaustion, cancellation, wipe failure and vault
transfer failure.

- [ ] **Step 2: Write cleanup tests red**

For each exit assert:

```text
all invocation regions closed
all secret extents wiped or quarantined
all generation handles revoked
no host registry handle remains reachable
receipt names the terminal and cleanup result
```

- [ ] **Step 3: Implement one cleanup epilogue**

All invocation exits converge through a single total runtime epilogue. An
early return or trap cannot bypass it. Cleanup failure replaces success with a
terminal cleanup fault.

- [ ] **Step 4: Implement explicit vault moves**

Only a verified move receipt can transfer a value from the flow to the global
vault. The source handle is invalid immediately after a successful move.
Copying, aliasing, missing custody evidence, or indeterminate authority
refuses.

- [ ] **Step 5: Prove secret-observation limits**

Logs, receipts, errors, graphs, dumps and test snapshots must contain identity,
extent and digest evidence only—never secret bytes or reversible plaintext.

- [ ] **Step 6: Mutation-test exit coverage**

Mutate each cleanup edge so the suite proves it detects a skipped wipe,
generation revoke, region close, handle release and receipt bind.

- [ ] **Step 7: Run memory, security and package gates**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-runtime-wasm test
npm.cmd --prefix packages-galerina/galerina-devtools-security test
node scripts/run-phase-close.mjs --strict
```

- [ ] **Step 8: Commit the governed-runtime checkpoint**

Record that the reference lane is complete but not yet the release authority.

---

### Task 7: Establish independent conformance, fuzz and fault evidence

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-differential.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-fuzz.test.mjs`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-fault-replay.test.mjs`
- Modify: `packages-galerina/galerina-devtools-wasmtime-oracle/tools/export-corpus-differential.mjs`
- Modify: `packages-galerina/galerina-devtools-wasmtime-oracle/README.md`

**Interfaces:**

- Consumes: the frozen admitted corpus and deterministic seeded mutations.
- Produces: per-lane value/trap/receipt equivalence and independent
  disagreement reports. No lane can outvote a security refusal.

- [ ] **Step 1: Define comparison semantics**

Compare exact integer and memory effects, normalized floating-point policy,
trap class, host-call trace, consumed budget, cleanup receipt and output. A
disagreement is RED; majority voting is forbidden.

- [ ] **Step 2: Add seeded mutation families**

Mutate section lengths/order, integer encoding, indexes, signatures, branch
depths, local/global types, memory offsets, instruction bytes, import names,
limits, attestation, leases and cleanup outcomes.

- [ ] **Step 3: Add deterministic fault replay**

Inject runner, broker, cache, disk, process, cancellation and corrupted-index
faults through declared seams. Pair each fault with a known-good control and
record the seed.

- [ ] **Step 4: Run the differential corpus**

```powershell
node --test packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-differential.test.mjs
cargo test --locked --manifest-path packages-galerina/galerina-devtools-wasmtime-oracle/Cargo.toml
```

- [ ] **Step 5: Run bounded fuzz/mutation campaigns**

Campaigns have explicit seed, input count, byte/work ceilings and timeout.
Timeout, crash, uncountable execution, empty corpus or malformed report is
RED.

- [ ] **Step 6: Audit independence**

Prove the `.fungi` engine does not import, shell to, or dynamically load the
independent comparator. Shared generated expected-output files cannot be the
sole oracle.

- [ ] **Step 7: Commit the conformance checkpoint**

Keep the independent comparator. This checkpoint is evidence for later
replacement, not authorization to remove it.

---

### Task 8: Lower checked compatibility IR to SLIDE

**Files:**

- Create: `packages-galerina/galerina-core-runtime-wasm/src/self-hosted/slide-lowering.fungi`
- Create: `packages-galerina/galerina-core-runtime-wasm/tests/fungi-engine-slide.test.mjs`
- Modify: `../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- Modify: `../SLIDE/TODO.md`

**Interfaces:**

- Consumes: `CheckedModule` only.
- Produces: a signed, bounded `SlideCompatibilityPlan` with exact source,
  profile, instruction, capability, memory and budget provenance.

- [ ] **Step 1: Define the lowering contract**

Every admitted instruction has exactly one checked lowering or an explicit
terminal unsupported-profile fault. No source bytes, unchecked decoded module,
or host object bypasses checked IR.

- [ ] **Step 2: Add per-instruction lowering tests red**

Reuse the profile witness table so every admitted instruction must have a
reference-interpreter result and SLIDE result. Surplus SLIDE operations do not
expand the Wasm profile.

- [ ] **Step 3: Implement total lowering**

Use exhaustive `match` on instruction variants. Bind flow regions, vault
moves, capability leases, fuel and trap behavior into the SLIDE plan.

- [ ] **Step 4: Verify final-artifact provenance**

The SLIDE receipt must bind the original binary digest, profile digest,
checked-IR digest, lowering version, target manifest and final artifact.

- [ ] **Step 5: Run three named lanes**

Run the reference interpreter, SLIDE execution and independent comparator as
separate reported lanes. A missing/empty lane is RED. The Galerina-side SLIDE
test is not counted as independent SLIDE repository evidence.

- [ ] **Step 6: Benchmark only after correctness**

Record decode, validate, link, execute and cleanup separately. Do not publish
performance claims until the executable backend, comparable workload, raw
samples, environment manifest and uncertainty analysis are available.

- [ ] **Step 7: Commit Galerina and SLIDE changes separately**

Use repository-local commits with exact pathspecs. Never combine two
repositories in one claimed commit and never push.

---

### Task 9: Cross-platform hardening and final cutover

**Files:**

- Modify: `packages-galerina/galerina-core-runtime-wasm/package.json`
- Modify: `packages-galerina/galerina-core-runtime-wasm/README.md`
- Modify: `packages-galerina/galerina-core-runtime-wasm/src/index.ts`
- Delete after replacement proof: replaced TypeScript/bootstrap implementation
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/reports/zero-trust-tooling-refactor-completion-2026-07-29.md`
- Create: `docs/reports/fungi-wasm-compatibility-engine-completion-<date>.md`

**Interfaces:**

- Consumes: all prior green checkpoints and platform receipts.
- Produces: one canonical `.fungi` implementation in the existing flat
  package, with the old execution path removed by a separately reviewed commit.

- [ ] **Step 1: Run the supported-platform matrix**

Require Windows 10/11, macOS, Debian/Ubuntu, Fedora and Mint receipts binding
OS/toolchain versions, repository commit, profile digest, corpus digest and
all test counts.

- [ ] **Step 2: Execute every replacement condition**

Create a ten-row evidence matrix matching Decision 7 exactly. Missing,
historical, malformed, stale, uncountable or non-independent evidence is RED.

- [ ] **Step 3: Port authoritative bootstrap tests**

Move all release-authoritative assertions from temporary `.mjs` harnesses into
the `.fungi`/SLIDE test and audit lanes. Temporary harnesses may remain only as
clearly named non-authoritative development tools.

- [ ] **Step 4: Run terminal Galerina evidence**

Run all governed graph tools, test tools and audit tools; repair every genuine
issue; regenerate the complete build including packages; run the percentage
audit and manually update the roadmap; then run the full benchmark and charts.

- [ ] **Step 5: Verify no dependency-tree regression**

Prove there is one canonical runtime package directly beneath
`packages-galerina`, no nested Galerina package/plugin copies, no repeated
package chains, and no new ambient runtime dependency.

- [ ] **Step 6: Remove the replaced path in isolation**

Delete only files proven replaced by the evidence matrix. Preserve the
optional compatibility target and any independently valuable development
oracle unless its separate retirement gate also passes.

- [ ] **Step 7: Re-run all terminal evidence after deletion**

The post-deletion run—not the pre-deletion run—is authoritative. Any red
restores the cutover task to incomplete; do not weaken a gate or restore an
implicit fallback.

- [ ] **Step 8: Commit completion locally**

Commit source and tests first, generated artifacts separately, and the
completion report last. Record exact hashes and commands. Never push.

---

## Self-review

- **Spec coverage:** The plan covers the accepted narrow-profile boundary,
  current-path retention, `.fungi` implementation, flow/vault memory,
  injection protection, independent verification, SLIDE integration, flat
  packages, platform support and the ten-part replacement gate.
- **Deliberate exclusion:** General-purpose Wasm features, broad host APIs,
  JIT compilation, ambient system access and a duplicated package ecosystem
  are not planned.
- **Type consistency:** `DecodedModule` can be consumed only by validation;
  `CheckedModule` can be consumed by linking/interpreting/lowering;
  `LinkedModule` alone can be invoked.
- **Authority consistency:** Profile inventory, external comparison, graphs,
  indexes and learned/shape proposals provide evidence only. None can mint
  execution or capability authority.
- **Sequencing:** Galerina beta remains first. The reference engine precedes
  SLIDE lowering. Removal follows complete post-deletion evidence.
