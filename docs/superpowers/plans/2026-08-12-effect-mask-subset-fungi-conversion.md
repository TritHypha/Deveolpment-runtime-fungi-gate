# Effect-mask Subset Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physically execute the exact signed-32-bit subset decision inside TypeScript `effectsSubset` as package-owned Fungi without changing effect-name authority or retiring any consumer.

**Architecture:** Add one pure Fungi flow using governed static `Int.bitAnd`, then compare its Bool with the live TypeScript export across the complete named vector family. Independent SLIDE/VOK evidence compiles, publishes, re-admits, executes, and verifies the exact source while retaining `authorityReleased: false`.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, compiler interpreter, SLIDE checked-Fungi package compiler, VOK typed receipt verifier.

## Global Constraints

- Preserve JavaScript signed 32-bit `(required & declared) === required` exactly within the Fungi Int domain.
- Keep `effectsToFlags`, authoritative string-name checks, TypeScript, and every consumer active.
- Never admit NaN, infinity, fractions, or out-of-signed-32-bit values as Fungi Int.
- A matching Bool does not authenticate either mask and releases no authority.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or `loop` to the Fungi source.
- Add or widen no SLIDE registry. A missing exact `Int.bitAnd` profile is a blocker.
- Commit locally and never push.
- Exclude full tooling, normal phase-close, and monolithic memory evaluation.

---

### Task 1: RED differential contract

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/effect-mask-subset-fungi-conversion.test.mjs`

**Interfaces:**
- Consumes: live `effectsSubset(required, declared)` and `EffectFlags`.
- Produces: the required `effectsSubsetFungi(required: Int, declared: Int) -> Bool` contract.

- [ ] **Step 1: Write the failing package-ownership and differential test**

Use vectors for `0`, exact flags, proper subsets, disjoint flags, combined flags,
`EffectFlags.UnmappedEffect`, signed `-1`, `-2147483648`, and `2147483647`.
Pass interpreter inputs as `{ __tag: "int", value }` and assert the returned
`Bool` equals `effectsSubset(required, declared)` for every vector. Assert the
source contains none of the forbidden constructs.

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test packages-galerina\galerina-core-compiler\tests\effect-mask-subset-fungi-conversion.test.mjs
```

Expected: one failure because
`src/self-hosted/effect-mask-subset.fungi` is not package-owned.

- [ ] **Step 3: Commit only the RED test**

```powershell
git add -- packages-galerina/galerina-core-compiler/tests/effect-mask-subset-fungi-conversion.test.mjs
git commit -m "test: specify fungi effect mask subset"
```

### Task 2: Minimal package-owned Fungi flow

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/effect-mask-subset.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: two signed Fungi `Int` mask values.
- Produces: exact `Bool` subset result.

- [ ] **Step 1: Add the exact checked source**

```fungi
@version 1
/// Compare two already-derived signed 32-bit effect masks. This does not
/// authenticate either mask or replace authoritative effect-name checks.
pure flow effectsSubsetFungi(required: Int, declared: Int) -> Bool
contract { intent { "Require every bit in the required effect mask to be present in the declared mask." } }
{
  return Int.bitAnd(required, declared) == required
}
```

- [ ] **Step 2: Register package ownership**

Add `src/self-hosted/effect-mask-subset.fungi` to the sorted
`packageGraph.loadedAssets` array in the compiler package.

- [ ] **Step 3: Strict-check the exact candidate**

```powershell
node packages-galerina\galerina-core-cli\dist\index.js check packages-galerina\galerina-core-compiler\src\self-hosted\effect-mask-subset.fungi --strict
```

Expected: zero errors and zero warnings. If `Int.bitAnd` is not accepted, stop
and record the exact checker blocker without substituting an implementation.

- [ ] **Step 4: Re-run the differential test**

Run the Task 1 command. Expected: 1/1 passing.

- [ ] **Step 5: Commit source and ownership**

```powershell
git add -- packages-galerina/galerina-core-compiler/src/self-hosted/effect-mask-subset.fungi packages-galerina/galerina-core-compiler/package.json
git commit -m "feat: add fungi effect mask subset"
```

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/effect-mask-subset-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: exact candidate source bytes and export `effectsSubsetFungi`.
- Produces: independently verified physical Bool receipts for the differential vector family.

- [ ] **Step 1: Write the physical RED proof**

Compile and publish the exact source through the local SLIDE checked-Fungi
package compiler. Initially require a deliberately impossible registry identity
or digest after successful independent admission so the test exposes the actual
closed profile without trusting a guessed value.

- [ ] **Step 2: Run the physical test and classify the result**

```powershell
$env:GALERINA_SLIDE_REPO='C:\Users\phill\Documents\GitHub\SLIDE'
node --test scripts\tests\effect-mask-subset-fungi-slide.integration.test.mjs
```

Expected: compilation and re-admission succeed, then the exact profile pin
assertion fails and reveals the actual identity/digest. If compilation or
re-admission refuses because the exact operation is unsupported, record a
profile blocker and stop this slice without widening a registry.

- [ ] **Step 3: Pin the exact admitted profile and complete hostile vectors**

Require the actual registry identity and digest. Execute every differential
vector and verify the typed Bool plus `authorityReleased: false`. Refuse empty,
short, surplus, String, Bool, NaN, infinity, fractional, and out-of-range Int
arguments; inadequate steps; mutated source; receipt fields; every envelope
byte; and the physical artifact.

- [ ] **Step 4: Re-run the physical test**

Run the Step 2 command. Expected: 1/1 passing with zero skips.

- [ ] **Step 5: Commit the physical proof**

```powershell
git add -- scripts/tests/effect-mask-subset-fungi-slide.integration.test.mjs
git commit -m "test: prove effect mask subset slide execution"
```

### Task 4: Bounded owner closure

**Files:**
- Modify only owner-generated Golden, retirement, graph, code-index, component-health, roadmap, and count outputs when their exact checks refuse as stale.
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Create: `docs/reports/effect-mask-subset-fungi-conversion-2026-08-12.md`

**Interfaces:**
- Consumes: committed candidate and physical proof.
- Produces: current generated owners and a non-retiring custody record.

- [ ] **Step 1: Run the compiler package and canonical package owner as isolated resumable processes**

```powershell
npm test
node scripts/run-all-tests.cjs --emit-counts
```

Run the first command from the compiler package and the second from repository
root. Preserve each terminal exit and count.

- [ ] **Step 2: Regenerate only owners that correctly refuse as stale**

Use the registered Golden, retirement, graph-all, code-index,
component-health, roadmap-subway, and canonical-count owners. Commit base
owners before graph owners, authored evidence before generated graph evidence,
and current count consumers before final roadmap provenance.

- [ ] **Step 3: Record exact evidence and authority boundaries**

Update TODO, active roadmap, SVG, and the focused report. State that mask
provenance and authoritative string-name checks remain outside this flow;
claim no consumer switch, production authority, or retirement.

- [ ] **Step 4: Run the final bounded matrix**

Require strict candidate check; differential and physical tests; Golden;
retirement plus self-test; graph 7/7; code-index; percentage freshness;
roadmap 5/5; canonical count 7/7 plus self-test; and path-leak.

- [ ] **Step 5: Refresh indexes and finish locally**

Refresh the primary graph at final HEAD and verify observed equals expected,
the indexed SHA equals HEAD, and a known TypeScript symbol remains queryable.
Refresh Myco and require a hit for `effectsSubsetFungi`. Keep the branch and
workspace; do not push or merge.
