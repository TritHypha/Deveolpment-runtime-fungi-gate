# Tensor dimension-count compatibility Fungi conversion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a package-owned Fungi proof twin for the tensor rank-compatibility decision and execute the exact candidate through physical SLIDE/VOK without switching or retiring TypeScript.

**Architecture:** Project each TypeScript tensor dimension to one opaque `Int` token, preserving collection cardinality, then compare the two immutable Fungi array counts. The Fungi flow never reads token values. Differential tests bind the projection to the real exported TypeScript helper and type-checker caller; a separate integration test compiles, publishes and independently re-admits the same source bytes through the existing immutable-array registry.

**Tech Stack:** Galerina `.fungi`, TypeScript bootstrap compiler, Node.js `node:test`, independent SLIDE checked-Fungi package compiler, physical `.slide` publication, portable VOK receipt verification.

## Global Constraints

- Keep `type-registry.ts`, `tensorDimensionCountsCompatible`, `type-checker.ts` and every existing consumer active.
- Add no interpreted sentinel, coercion, default, fallback or host API.
- The new Fungi source must contain no null, NaN, `else if`, `else`, `throw`, `try`, `catch`, `for`, `while` or `loop`.
- Pin `slide.registry.executable-gir.v2c-immutable-array-option.v1` and digest `0ca2e25be48aab5d5e3355069144e79b33888345c8771bffc5afbaab59c8dfbc` only after the compiler derives them from the exact candidate.
- Malformed arguments, oversized arrays, insufficient work, altered source, altered publication and wrong registry evidence must refuse.
- No consumer-switch, signing, production, release or TypeScript-retirement authority is granted.
- Do not run the crash-linked full-tooling, normal phase-close or whole-memory evaluation lanes.

---

### Task 1: Differential contract and RED proof

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs`
- Modify later: `packages-galerina/galerina-core-compiler/package.json`
- Create later: `packages-galerina/galerina-core-compiler/src/self-hosted/tensor-dimension-count-compatibility.fungi`

**Interfaces:**
- Consumes: exported `tensorDimensionCountsCompatible(expected, actual): boolean`, `parseProgram`, `checkTypes`, `checkEffects`, and `executeFlow`.
- Produces: a required Fungi asset named `tensorDimensionCountsCompatibleFungi(expected: Array<Int>, actual: Array<Int>) -> Bool`.

- [ ] **Step 1: Write the failing behavioral test**

Create vectors with literal expected outcomes, including `[]/[]`, one fixed
dimension, one dynamic dimension, equal two-dimensional shapes, and both
directions of unequal rank. Normalize each source shape with:

```javascript
function rankTokens(dimensions) {
  return {
    __tag: "list",
    items: dimensions.map(() => ({ __tag: "int", value: 0 })),
  };
}
```

Require the package asset and source file, reject every prohibited construct,
interpret `tensorDimensionCountsCompatibleFungi`, and compare its Bool result
with both the literal expectation and the real TypeScript helper. Add a real
caller probe that parses assignments between `Tensor<Float32, [...]>` shapes
and asserts unequal rank includes `FUNGI-TYPE-016` while equal rank does not.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs
```

Expected: FAIL because the governed Fungi source/asset does not exist.

- [ ] **Step 3: Record the RED reason**

Confirm the failure names the missing candidate or package asset, not an import,
fixture, stale build or unrelated compiler failure.

### Task 2: Minimal Fungi implementation

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/tensor-dimension-count-compatibility.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`
- Test: `packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs`

**Interfaces:**
- Consumes: two normalized immutable `Array<Int>` token collections.
- Produces: typed `Bool`; true exactly when the collection counts are equal.

- [ ] **Step 1: Add the minimal candidate**

```fungi
@version 1

/// Tensor dimension counts are compatible only when both normalized shapes
/// contain the same number of opaque rank tokens. Token values are not read.
pure flow tensorDimensionCountsCompatibleFungi(expected: Array<Int>, actual: Array<Int>) -> Bool
contract { intent { "Compare tensor ranks without interpreting dimension tokens." } }
{
  if expected.count() == actual.count() {
    return true
  }
  return false
}
```

Add `src/self-hosted/tensor-dimension-count-compatibility.fungi` once to
`packageGraph.loadedAssets` in the compiler package manifest.

- [ ] **Step 2: Strict-check the exact source**

```powershell
node galerina.mjs check packages-galerina/galerina-core-compiler/src/self-hosted/tensor-dimension-count-compatibility.fungi --strict-types --strict-governance
```

Expected: exit 0 with no error diagnostics.

- [ ] **Step 3: Run the differential test and verify GREEN**

```powershell
node --test packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs
```

Expected: all tests pass; the real helper, typed interpreter and real
`FUNGI-TYPE-016` caller agree.

- [ ] **Step 4: Commit the differential slice**

```powershell
git add -- packages-galerina/galerina-core-compiler/package.json packages-galerina/galerina-core-compiler/src/self-hosted/tensor-dimension-count-compatibility.fungi packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs
git commit -m "feat: prove tensor rank compatibility in fungi"
```

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/tensor-dimension-count-compatibility-fungi-slide.integration.test.mjs`
- Read: `../SLIDE/src/checked-fungi-package-compiler.mjs`
- Read: `../SLIDE/src/checked-fungi-package-publication-loader.mjs`

**Interfaces:**
- Consumes: exact Fungi source bytes and the SLIDE build point pinned by the design.
- Produces: one physical `.slide`, independently re-admitted typed Bool receipts, and refusal evidence.

- [ ] **Step 1: Write the physical integration test before relying on it**

Follow the existing package-publication integration pattern. Compile the exact
candidate as `@galerina/core-compiler` export
`tensorDimensionCountsCompatibleFungi`, assert the derived registry ID and
digest from Global Constraints, publish one `.slide`, prepare a fresh execution
handle for each vector, execute arguments such as `[[0, 0], [7, -3]]`, verify
the Bool receipt, and assert `authorityReleased === false`.

Add explicit refusals for no arguments, one argument, scalar instead of array,
non-Int array element, surplus argument, a 17-element array, insufficient step
budget, mutated source bytes and mutated publication bytes.

- [ ] **Step 2: Run the physical test**

```powershell
$env:GALERINA_SLIDE_REPO=(Resolve-Path '..\SLIDE').Path
node --test scripts/tests/tensor-dimension-count-compatibility-fungi-slide.integration.test.mjs
```

Expected: 1/1 pass, zero skips. Any missing SLIDE path, registry mismatch,
malformed receipt or unsupported array boundary is a refusal, not a waived test.

- [ ] **Step 3: Run the focused neighborhood**

```powershell
$env:GALERINA_SLIDE_REPO=(Resolve-Path '..\SLIDE').Path
node --test packages-galerina/galerina-core-compiler/tests/tensor-dimension-count-compatibility-fungi-conversion.test.mjs packages-galerina/galerina-core-compiler/tests/tensor-element-type-compatibility-fungi-conversion.test.mjs packages-galerina/galerina-core-compiler/tests/type-registry/type-id-and-flags.test.mjs scripts/tests/tensor-dimension-count-compatibility-fungi-slide.integration.test.mjs scripts/tests/tensor-element-type-compatibility-fungi-slide.integration.test.mjs
```

Expected: all focused tests pass with both physical tests executed.

- [ ] **Step 4: Commit the physical proof**

```powershell
git add -- scripts/tests/tensor-dimension-count-compatibility-fungi-slide.integration.test.mjs
git commit -m "test: admit tensor rank fungi through slide"
```

### Task 4: Bounded closure, evidence and custody

**Files:**
- Create: `docs/reports/tensor-dimension-count-compatibility-fungi-conversion-2026-08-12.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate through owners: retirement, code registry/index, semantic graph, component health, status, pinned SLIDE evidence, roadmap subway and canonical counts.

**Interfaces:**
- Consumes: committed candidate/test identities and fresh bounded verification results.
- Produces: source/artifact digest custody, current roadmap evidence and an explicit remaining-authority boundary.

- [ ] **Step 1: Run candidate and compiler checks**

Run the strict candidate check, Golden Pack audit, focused neighborhood, compiler
package suite, canonical package owner and retirement owner. Capture exact exit
codes and counts. Stop on any stale, skipped or nonzero candidate-specific lane.

- [ ] **Step 2: Write the proof report**

Record exact Galerina/SLIDE commits; TypeScript, Fungi, differential-test and
physical-test byte lengths and SHA-256 digests; derived registry identity;
differential/physical/focused/compiler/aggregate counts; retirement counts; and
the explicit statement that all TypeScript consumers remain active.

- [ ] **Step 3: Update authored TODO and roadmap evidence**

Add this bounded proof as the sixteenth reference-only decision slice. Do not
mark consumer switch, full conversion, production authority or retirement
complete. Keep excluded crash-linked lanes `UNKNOWN`.

- [ ] **Step 4: Regenerate bounded owners in dependency order**

Refresh retirement, code registry/index, semantic graph, package/project/KB
graphs, dev-tool/Fungi inventories, component health, status, pinned SLIDE,
roadmap subway and canonical count consumers using their documented owner
commands. Run graph-all at most once before final roadmap publication. Do not run
full tooling, normal phase-close or the whole-memory evaluator.

- [ ] **Step 5: Re-index and verify custody**

Refresh Myco after the final local commit. Attempt the primary codebase-memory
moderate refresh once; accept it only if status, node conservation and indexed
HEAD all match, otherwise record freshness `UNKNOWN`. Verify the introduced flow
is queryable, the tracked tree is clean, and no push occurred.

- [ ] **Step 6: Commit bounded evidence**

Stage only the report, authored TODO/roadmap changes and owner-generated outputs
whose owning checks pass. Commit locally with explicit path custody; do not push.
