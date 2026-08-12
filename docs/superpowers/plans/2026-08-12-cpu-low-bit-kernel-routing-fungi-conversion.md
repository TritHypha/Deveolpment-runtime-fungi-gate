# CPU Low-Bit Kernel Routing Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physically execute the CPU-kernel package's exact low-bit routing
predicate as package-owned Fungi while retaining TypeScript as the executing
differential authority.

**Architecture:** Add one pure two-String Fungi projection beside the CPU
kernel TypeScript source. Test the complete typed Cartesian product and hostile
String border, then publish and independently re-admit only that named flow
through the existing bounded SLIDE/VOK surface.

**Tech Stack:** Galerina `.fungi`, TypeScript/Node.js, `node:test`, canonical
GIR/WAT, independent SLIDE checked-Fungi package compiler, VOK typed receipts.

## Global Constraints

- Preserve all 42 declared input-type and operation pairs exactly.
- Unknown physical Strings return `false`; they never gain low-bit status.
- Add no null, NaN, `else`, `else if`, exception syntax, `for`, `while`, or `loop`.
- Add or widen no SLIDE registry and raise no execution limit.
- Keep `requiresLowBitKernel`, `validateCpuKernelPlan`, and every consumer live.
- Exclude crash-linked full tooling, normal phase-close, graph-all, and
  monolithic memory evaluation.
- Commit locally and never push.

---

### Task 1: Differential RED proof

**Files:**
- Modify: `packages-galerina/galerina-cpu-kernels/package.json`
- Create: `packages-galerina/galerina-cpu-kernels/tests/low-bit-kernel-routing-fungi-conversion.test.mjs`
- Expected later source: `packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi`

**Interfaces:**
- Consumes: exported `requiresLowBitKernel(plan: CpuKernelPlan): boolean`.
- Produces: a failing proof that requires a package-owned
  `requiresLowBitKernel(inputType: String, operation: String) -> Bool` flow.

- [ ] **Step 1: Register the expected package-owned asset**

Add `packageGraph.loadedAssets` containing exactly
`src/self-hosted/low-bit-kernel-routing.fungi`; do not create the asset yet.

- [ ] **Step 2: Write the failing real-behaviour test**

Import the compiled TypeScript function and compiler runtime. Enumerate these
literal domains independently:

```javascript
const INPUT_TYPES = ["f32", "f16", "bf16", "i8", "i2_s", "ternary"];
const OPERATIONS = [
  "gemm", "gemv", "dot", "matmul", "ternary_matmul",
  "embedding_lookup", "low_bit_decode",
];
```

For each pair, derive the expected result from the four literal admitted cases,
compare the TypeScript export, interpreted Fungi result and signed Wasm result,
and add hostile String pairs that must be false. Assert the exact Fungi source
has none of the forbidden forms from the global constraints.

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
npm run build --prefix packages-galerina/galerina-cpu-kernels
node --test packages-galerina/galerina-cpu-kernels/tests/low-bit-kernel-routing-fungi-conversion.test.mjs
```

Expected: fail only because the registered Fungi asset is absent.

- [ ] **Step 4: Commit the RED proof**

Stage only the manifest and test; commit as
`test: define CPU low-bit Fungi routing parity`.

### Task 2: Minimal Fungi implementation

**Files:**
- Create: `packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi`

**Interfaces:**
- Consumes: two admitted Strings named `inputType` and `operation`.
- Produces: pure Boolean flow `requiresLowBitKernel`.

- [ ] **Step 1: Add the minimal candidate**

Create an `@version 1` asset whose flow performs four terminal equality checks
in source order and ends with `return false`:

```fungi
pure flow requiresLowBitKernel(inputType: String, operation: String) -> Bool {
  if inputType == "i2_s" { return true }
  if inputType == "ternary" { return true }
  if operation == "ternary_matmul" { return true }
  if operation == "low_bit_decode" { return true }
  return false
}
```

- [ ] **Step 2: Strict-check the exact candidate**

Run:

```powershell
node galerina.mjs check packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi --strict-types --strict-governance
```

Expected: zero errors and warnings.

- [ ] **Step 3: Re-run differential proof to GREEN**

Run the exact Task 1 test. Expected: all tests pass with no skips.

- [ ] **Step 4: Commit the source**

Stage only the Fungi asset; commit as
`feat: add CPU low-bit Fungi routing reference`.

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/cpu-low-bit-kernel-routing-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact Fungi source bytes and independent SLIDE repository.
- Produces: one physical `.slide` plus independently verified typed Boolean
  receipts with `authorityReleased === false`.

- [ ] **Step 1: Write the physical integration test**

Compile package identity `@galerina/cpu-kernels`, export
`requiresLowBitKernel`, and the exact source flow. Assert the observed registry
identity/digest without changing the registry. Execute every declared pair and
hostile vector. Verify wrong arity/type, invalid Unicode, inadequate work,
source mutation, receipt mutation, every safe-value envelope byte and artifact
mutation all refuse.

- [ ] **Step 2: Run the physical proof**

Set `GALERINA_SLIDE_REPO` to the sibling SLIDE checkout for this isolated
process and run the exact integration test. Expected: one pass and zero skips.

- [ ] **Step 3: Commit the physical proof**

Stage only the integration test; commit as
`test: prove physical CPU low-bit Fungi routing`.

### Task 4: Bounded closure and publication evidence

**Files:**
- Create: `docs/reports/cpu-low-bit-kernel-routing-fungi-conversion-2026-08-12.md`
- Modify: `packages-galerina/galerina-cpu-kernels/TODO.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: registered graph, inventory, status, count, subway and index owners
  whose exact freshness checks refuse.

**Interfaces:**
- Consumes: focused differential/physical evidence and exact source/artifact
  digests.
- Produces: reference-only roadmap evidence with no switch or retirement claim.

- [ ] **Step 1: Run bounded regression owners**

Run the CPU package test, compiler package test, monitored canonical 100-package
owner, Golden owner/check, retirement owner/check/self-test, and individual
registered graph/audit owners. Do not run the excluded aggregate lanes.

- [ ] **Step 2: Publish the exact report and roadmap state**

Record source/Fungi/SLIDE identities, typed and hostile vector counts, focused
test counts, registry identity or exact absence, graph/index freshness, and the
unchanged reference-only authority boundary. Update active TODOs and roadmap;
regenerate subway rather than hand-editing its SVG.

- [ ] **Step 3: Refresh both indexes at the final commit**

Run the primary codebase graph moderate index and verify `indexed_head_sha`,
node/expected-node conservation and a query for the new flow. Refresh Myco and
query the same symbol.

- [ ] **Step 4: Commit and verify the final state**

Commit explicit owner groups locally, rerun direct freshness checks, require a
clean tracked worktree, and do not push.
