# Residency strictness Fungi conversion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and physically execute an exact package-owned Fungi twin for the
exported TypeScript `atLeastAsStrict` predicate without switching or retiring
its TypeScript consumers.

**Architecture:** Map the exact five-member String domain to ranks `0..4` and
all other text to sentinel rank `5`; compare ranks only after one combined
sentinel guard succeeds. Keep
the TypeScript implementation as the differential oracle and independently
compile, publish, re-admit and execute the Fungi flow through SLIDE/VOK.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, the compiler interpreter,
independent SLIDE checked-package compilation and VOK typed receipts.

## Global Constraints

- Accept only the five exact `ResidencyTier` spellings before rank comparison.
- Unknown or malformed runtime Strings return `false`; never normalize or
  default a tier.
- Add no null, NaN, `else if`, `else`, `throw`, `try`, `catch`, `for`, `while`
  or `loop`.
- Keep TypeScript and every consumer active; grant no production or release
  authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.
- Make local commits only; do not push.

---

### Task 1: RED differential contract

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/residency-strictness-fungi-conversion.test.mjs`
- Read: `packages-galerina/galerina-core-compiler/src/hardening-residency.ts`

**Interfaces:**
- Consumes: `atLeastAsStrict(tier: ResidencyTier, floor: ResidencyTier): boolean`.
- Produces: a differential contract for
  `atLeastAsStrictFungi(tier: String, floor: String) -> Bool`.

- [ ] **Step 1: Write the failing test**

  Require `src/self-hosted/residency-strictness.fungi` as a loaded package
  asset. Compare all 25 literal canonical pairs and hostile values in both
  positions against the TypeScript export and interpreted Fungi flow. Assert
  the project source-shape prohibitions.

- [ ] **Step 2: Run the test to verify RED**

  Run `node --test tests/residency-strictness-fungi-conversion.test.mjs` from
  the compiler package. Expected: one failure naming the absent governed asset.

### Task 2: Minimal Fungi implementation

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/residency-strictness.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: exact residency-tier Strings.
- Produces: `atLeastAsStrictFungi(tier: String, floor: String) -> Bool`.

- [ ] **Step 1: Add the minimal source**

  Implement `residencyRank` as an exhaustive five-arm String match whose
  terminal wildcard returns sentinel `5`. Implement `rankAtMost` with a
  Boolean `if left <= right` and terminal false return because the selected
  physical profile does not admit a directly returned comparison. In the
  public flow, derive both ranks, return `false` when either is `>= 5` through
  one combined `or` guard, then call `rankAtMost` with both admitted ranks.

- [ ] **Step 2: Register the package asset**

  Add `src/self-hosted/residency-strictness.fungi` exactly once to
  `packageGraph.loadedAssets`.

- [ ] **Step 3: Verify GREEN**

  Strict-check the exact source, then rerun the differential test. Expected:
  zero diagnostics and all tests pass.

- [ ] **Step 4: Commit the source slice**

  Commit only the source, package manifest and differential test.

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/residency-strictness-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact Fungi bytes and two bounded String arguments.
- Produces: verified Bool receipts with `authorityReleased === false`.

- [ ] **Step 1: Write the physical boundary test**

  Compile and publish the exact source; require the derived registry identity
  and digest; prepare a fresh handle for each vector; verify the complete
  canonical matrix and hostile false results.

- [ ] **Step 2: Add refusal vectors**

  Require refusal for wrong arity/type, invalid Unicode, inadequate step fuel,
  source mutation and publication mutation. Do not claim a text-comparison
  budget for the bounded-wide-control-flow registry when its receipt reports
  zero separately-metered text work.

- [ ] **Step 3: Run physical GREEN**

  Run with `GALERINA_SLIDE_REPO` bound to the sibling SLIDE checkout. Expected:
  one executed test, zero skips and zero failures.

- [ ] **Step 4: Commit the physical proof**

  Commit only the physical integration test and any evidence-driven design
  correction.

### Task 4: Bounded closure and publication

**Files:**
- Create: `docs/reports/residency-strictness-fungi-conversion-2026-08-12.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: registered Golden, retirement, graph, status, component-health,
  code-index and roadmap-subway owners.

**Interfaces:**
- Consumes: fresh focused, package, canonical and physical results.
- Produces: exact local evidence and a current roadmap without retirement or
  production authority.

- [ ] **Step 1: Run bounded verification owners**

  Run the focused hardening neighborhood, compiler package, canonical package
  owner, Golden Pack and retirement owner. Do not run excluded crash lanes.

- [ ] **Step 2: Record exact custody**

  Record source/candidate/test bytes and SHA-256 digests, Galerina and SLIDE
  build points, registry identity/digest, counts, refusals and authority limits.

- [ ] **Step 3: Publish generated owners**

  Run graph-all once, then the registered code registry/index,
  component-health, status, pinned-SLIDE and roadmap-subway owners in dependency
  order. Run canonical count checks and path/private leak checks.

- [ ] **Step 4: Refresh indexes and finish locally**

  Attempt primary codebase-memory refresh once. If unavailable, report
  `UNKNOWN`; refresh Myco and prove the new public flow is queryable. Commit
  explicit paths, verify a clean tracked tree and do not push.
