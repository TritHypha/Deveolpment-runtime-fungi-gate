# Slice 89 Documentation Path Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove or fail closed on one reference-only Fungi replacement for the impact planner's internal documentation-path classifier.

**Architecture:** One package-owned pure Fungi flow preserves the fixed `docs/` prefix and three root-file equality rules. Shared immutable vectors exercise the live MJS caller and the Fungi candidate, while the governed physical integration independently compiles, publishes, re-admits and executes the candidate through SLIDE/VOK. The MJS caller remains active.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, existing compiler differential helper, independent SLIDE checked-Fungi package compiler and VOK receipt verifier.

## Global Constraints

- Pin Galerina to the live branch head and SLIDE to `ed326eaa14f1a899841cbac8da353d400970367e` before physical proof.
- Never emit `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop`.
- Use one `pure flow`, one Boolean prefix `if`, one exhaustive String `match`, and a terminal `_ => return false`.
- Do not export or modify `isDocumentation`; use `buildImpactPlan` as the live source oracle.
- Do not widen SLIDE limits or substitute a host-computed Boolean.
- Retain MJS and all production consumers; this slice grants no production, release, signing, retirement or push authority.
- If physical compilation or execution refuses, remove the candidate and close the slice as `BLOCKED` with the exact receipt.
- Keep repository-wide closure `UNKNOWN`; do not run crash-linked full tooling, normal phase-close, `graph-all`, or monolithic memory evaluation.

---

### Task 1: Establish the shared differential vector contract

**Files:**
- Create: `packages-galerina/galerina-devtools-impact/tests/documentation-path-cases.mjs`
- Modify: `packages-galerina/galerina-devtools-impact/tests/impact-plan.test.mjs`

**Interfaces:**
- Produces: `DOCUMENTATION_PATH_CASES`, a frozen array of `{ path: String, expected: Bool }`.
- Consumes: `buildImpactPlan({ root, changedPaths })` as the unmodified source oracle.

- [ ] **Step 1: Create the closed vector table**

```js
export const DOCUMENTATION_PATH_CASES = Object.freeze([
  { path: "docs/TODO.md", expected: true },
  { path: "docs/nested/guide.md", expected: true },
  { path: "README.md", expected: true },
  { path: "AGENTS.md", expected: true },
  { path: "SECURITY.md", expected: true },
  { path: "docs", expected: false },
  { path: "docs2/file.md", expected: false },
  { path: "nested/README.md", expected: false },
  { path: "packages-galerina/galerina-a/src/a.mjs", expected: false },
  { path: "packages-galerina/galerina-a/src/é.mjs", expected: false },
]);
```

- [ ] **Step 2: Add a source-oracle test using every vector**

For each positive vector, require `AFFECTED_SCOPE`, no affected packages and exactly the three `docs:*` commands. For each negative vector, require that documentation commands are absent; package paths must follow the existing affected-package behavior and unclassified paths must remain `FULL_REQUIRED`.

- [ ] **Step 3: Run the source-oracle test**

Run: `node --test packages-galerina/galerina-devtools-impact/tests/impact-plan.test.mjs`

Expected: PASS with the exact new vector test and all existing impact-plan tests.

- [ ] **Step 4: Commit the vector contract**

```powershell
git add -- packages-galerina/galerina-devtools-impact/tests/documentation-path-cases.mjs packages-galerina/galerina-devtools-impact/tests/impact-plan.test.mjs
git commit -m "test impact documentation path contract"
```

### Task 2: Add the package-owned candidate test first

**Files:**
- Create: `packages-galerina/galerina-devtools-impact/tests/documentation-path-fungi-conversion.test.mjs`
- Modify: `packages-galerina/galerina-devtools-impact/package.json`
- Create after RED: `packages-galerina/galerina-devtools-impact/src/self-hosted/documentation-path.fungi`

**Interfaces:**
- Consumes: `DOCUMENTATION_PATH_CASES` and `scripts/lib/scalar-classifier-fungi-proof.mjs`.
- Produces: Fungi flow `isDocumentationPath(path: String) -> Bool` and a declared `packageGraph.loadedAssets` entry.

- [ ] **Step 1: Write the failing candidate test**

The test must call `assertScalarClassifierAsset` with the exact source MJS and assert the four `DOCUMENT_ROOTS` constants plus the `some` decision. It must call `proveScalarClassifier` with the shared vectors mapped to `{ value: path, expected }`.

- [ ] **Step 2: Run RED**

Run: `node --test packages-galerina/galerina-devtools-impact/tests/documentation-path-fungi-conversion.test.mjs`

Expected: FAIL because `src/self-hosted/documentation-path.fungi` and its `loadedAssets` declaration are absent.

- [ ] **Step 3: Add the minimal candidate and asset declaration**

```fungi
@version 1
pure flow isDocumentationPath(path: String) -> Bool {
  if path.startsWith("docs/") {
    return true
  }
  match path {
    "README.md" => return true
    "AGENTS.md" => return true
    "SECURITY.md" => return true
    _ => return false
  }
}
```

Add `src/self-hosted/documentation-path.fungi` as the sole `packageGraph.loadedAssets` entry without changing exports or runtime entrypoints.

- [ ] **Step 4: Run GREEN and the complete owning package**

Run the focused conversion test, then `npm test` in `packages-galerina/galerina-devtools-impact`.

Expected: the focused test and every package test pass with no skips or warnings.

- [ ] **Step 5: Commit the candidate wave**

```powershell
git add -- packages-galerina/galerina-devtools-impact/package.json packages-galerina/galerina-devtools-impact/src/self-hosted/documentation-path.fungi packages-galerina/galerina-devtools-impact/tests/documentation-path-fungi-conversion.test.mjs
git commit -m "add slice 89 documentation path candidate"
```

### Task 3: Prove the physical SLIDE/VOK boundary

**Files:**
- Modify: `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact package-owned Fungi asset and `DOCUMENTATION_PATH_CASES` values.
- Produces: one physical candidate entry with `slice: 89`, package identity `@galerina/devtools-impact`, flow `isDocumentationPath`, `physicalExpectation: "PROVE"`, and text-comparison budgeting enabled.

- [ ] **Step 1: Add the physical candidate entry**

Import the shared vector table and map each row to `{ value: path, expected }`. Add Slice 89 to `CANDIDATES` without changing any earlier slice or the shared proof helper.

- [ ] **Step 2: Run the exact physical test**

Set `GALERINA_SLIDE_REPO` to the sibling SLIDE checkout and run only the Slice 89 test name from `five-scalar-classifiers-fungi-slide.integration.test.mjs`.

Expected: physical package compilation, `.slide` publication, independent re-admission, every vector, typed receipt verification, wrong-type/surplus/oversized refusal, exhaustion, receipt mutation and artifact mutation all pass.

- [ ] **Step 3: Fail closed if the composition refuses**

If the exact test refuses, record the compiler/registry diagnostic, remove the candidate asset and its `loadedAssets` entry, keep the negative test evidence only where it is independently stable, and classify Slice 89 `BLOCKED_BY_COMPOSED_TEXT_PREFIX_MATCH_PROFILE`. Do not widen a ceiling or use helper/host projection without a new approved design.

- [ ] **Step 4: Run the full focused physical file**

Run the entire `five-scalar-classifiers-fungi-slide.integration.test.mjs` with the exact SLIDE path.

Expected: every existing slice result remains unchanged and Slice 89 passes without skip.

- [ ] **Step 5: Commit the physical proof**

```powershell
git add -- scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs
git commit -m "prove slice 89 through physical slide"
```

### Task 4: Close the governed slice and refresh bounded owners

**Files:**
- Create: `docs/reports/slice-89-documentation-path-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/reports/galerina-conversion-and-assurance-status-2026-08-13.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate only registered relevant outputs after authored inputs are committed.

**Interfaces:**
- Produces: one governed Slice 89 receipt and current register/roadmap routing.

- [ ] **Step 1: Review both private Fungi skills**

Record `NO_SKILL_UPDATE` when the existing prefix, exhaustive-match, physical proof and refusal rules already cover the result. If a genuinely reusable gap exists, update its deterministic skill audit RED-first, verify it GREEN and record the exact private-skill commit.

- [ ] **Step 2: Write the report and authored status updates**

The receipt must contain exactly one valid skill disposition, `Threadability: PARALLEL_PURE`, the true terminal source classification, and `Bounded closure: COMPLETE`. State explicitly that MJS and consumers remain active.

- [ ] **Step 3: Run bounded verification**

Run the owning package, exact physical file, governed slice-receipt audit and self-test, canonical count owner/self-test, path-leak, private-doc leak, semantic graph check, percentage freshness, status drift and graph integrity. Do not run excluded aggregate lanes.

- [ ] **Step 4: Commit authored documents, regenerate owners, and commit outputs separately**

Commit authored Slice 89 sources first. Then regenerate roadmap/subway and project graph owners against that exact commit, verify their checks, and commit only their registered outputs.

- [ ] **Step 5: Refresh both navigation indexes at final HEAD**

Run moderate codebase-memory indexing and require `nodes == expected_nodes`, exact `indexed_head_sha`, and `stale: false`. Re-index Myco and report its bounded file/term counts. Verify a symbol introduced by Slice 89 is queryable.
