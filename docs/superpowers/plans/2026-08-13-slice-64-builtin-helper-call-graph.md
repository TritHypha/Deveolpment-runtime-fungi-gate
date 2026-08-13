# Slice 64 Builtin Helper-Call Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physically admit the exact eighteen-name `isBuiltin` Fungi decision through a bounded three-by-six pure helper graph while retaining TypeScript and every consumer.

**Architecture:** Three pure leaf flows each own six exact String labels and an exhaustive wildcard. The exported `isBuiltin` composes those leaves with two Boolean early returns and one terminal Boolean return; the existing physical harness publishes and independently re-admits that exact graph.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, independent SLIDE/VOK, Git.

## Global Constraints

- Modify only the exact Slice 64 candidate, its existing physical expectation and its linked documentation.
- Keep the source `isBuiltin` function and all consumers active.
- Do not change a SLIDE ceiling or host-precompute the result.
- Use no null, NaN, `else if`, `throw`, `try`, `catch`, `for`, `loop` or `while`.
- Every helper must terminate with `_ => return false`.
- Commit locally only; do not push.
- Run only focused slice checks; defer aggregate graphs, indexes, roadmaps and test closure to Slice 87.

---

### Task 1: Prove the old flat candidate still fails the new physical requirement

**Files:**
- Modify: `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs`
- Test: `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: existing `CANDIDATES` entry for Slice 37 and the flat eighteen-arm `isBuiltin` asset.
- Produces: a RED physical expectation requiring publication and VOK re-admission.

- [ ] **Step 1: Change only Slice 37's physical expectation**

Replace `physicalExpectation: "REFUSE_COMPILE"` with
`physicalExpectation: "PROVE"` for `flowName: "isBuiltin"`.

- [ ] **Step 2: Run the focused physical test and verify RED**

Run with `GALERINA_SLIDE_REPO` bound to the independent SLIDE repository:

```powershell
$env:GALERINA_SLIDE_REPO = "C:\Users\phill\Documents\GitHub\SLIDE"
node --test scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs
Remove-Item Env:GALERINA_SLIDE_REPO
```

Expected: FAIL only because the flat eighteen-arm `isBuiltin` physical compile
is refused. A missing repository, stale pin or unrelated failure is not valid RED.

### Task 2: Implement and prove the bounded helper graph

**Files:**
- Modify: `packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi`
- Test: `packages-galerina/galerina-devtools-context/tests/builtin-name-fungi-conversion.test.mjs`
- Test: `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: `String` and pure helper calls admitted by the pinned profile.
- Produces: `isBuiltin(name: String) -> Bool` with the unchanged external name and domain.

- [ ] **Step 1: Replace the flat flow with the exact helper graph**

```fungi
@version 1

pure flow isBuiltinPlatform(name: String) -> Bool
contract { intent { "Recognize an exact platform builtin name." } }
{
  match name {
    "AuditLog" => return true
    "Secrets" => return true
    "Crypto" => return true
    "Database" => return true
    "Http" => return true
    "File" => return true
    _ => return false
  }
}

pure flow isBuiltinRuntime(name: String) -> Bool
contract { intent { "Recognize an exact runtime builtin name." } }
{
  match name {
    "Auth" => return true
    "Session" => return true
    "validate" => return true
    "redact" => return true
    "emit" => return true
    "return" => return true
    _ => return false
  }
}

pure flow isBuiltinValue(name: String) -> Bool
contract { intent { "Recognize an exact value builtin name." } }
{
  match name {
    "Ok" => return true
    "Err" => return true
    "Some" => return true
    "None" => return true
    "true" => return true
    "false" => return true
    _ => return false
  }
}

pure flow isBuiltin(name: String) -> Bool
contract { intent { "Recognize only an exact context-receipt builtin name." } }
{
  if isBuiltinPlatform(name) {
    return true
  }
  if isBuiltinRuntime(name) {
    return true
  }
  return isBuiltinValue(name)
}
```

- [ ] **Step 2: Strict-check the exact asset**

```powershell
node galerina.mjs check packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi --strict-types --strict-governance
```

Expected: zero errors and zero governance warnings.

- [ ] **Step 3: Run package differential proof**

```powershell
node --test packages-galerina/galerina-devtools-context/tests/builtin-name-fungi-conversion.test.mjs
```

Expected: 2/2 pass across all eighteen names and hostile surplus text.

- [ ] **Step 4: Run physical SLIDE/VOK proof**

```powershell
$env:GALERINA_SLIDE_REPO = "C:\Users\phill\Documents\GitHub\SLIDE"
node --test scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs
Remove-Item Env:GALERINA_SLIDE_REPO
```

Expected: 8/8 pass with Slice 37 publishing and independently re-admitting
`isBuiltin`, while Slice 45 retains its exact two-String refusal.

### Task 3: Close the slice without broad authority claims

**Files:**
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Create: `docs/reports/builtin-helper-call-graph-fungi-conversion-2026-08-13.md`
- Modify: `docs/TODO.md`
- Review: private `writing-fungi` and `translating-typescript-to-fungi` repositories

**Interfaces:**
- Consumes: fresh strict, package, physical and queue evidence.
- Produces: one exact Slice 64 receipt and a local Git checkpoint.

- [ ] **Step 1: Review both private skills**

The three-by-six result exercises the helper-call rule added after Slice 35.
If it adds no reusable rule, record `NO_SKILL_UPDATE` and cite the already
verified private skill commits; do not create churn.

- [ ] **Step 2: Update the live register and TODO**

Record Slice 64 as `DONE` only if strict, package and physical checks all pass.
State that TypeScript and consumers remain active and that aggregate closure is
deferred to Slice 87.

- [ ] **Step 3: Verify conservation and hygiene**

```powershell
node scripts/conversion-queue.mjs --check
node scripts/audit-path-leak.mjs --check
git diff --check
```

Expected: queue current, zero path leaks and no whitespace errors.

- [ ] **Step 4: Commit the exact slice**

```powershell
git add -- packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs docs/reports/fungi-conversion-batch-33-42-file-status.md docs/reports/builtin-helper-call-graph-fungi-conversion-2026-08-13.md docs/TODO.md docs/superpowers/plans/2026-08-13-slice-64-builtin-helper-call-graph.md
git commit -m "feat: admit builtin Fungi helper graph"
```
