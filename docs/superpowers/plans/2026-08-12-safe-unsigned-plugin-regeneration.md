# Safe Unsigned Plugin Regeneration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an unambiguous full rebuild for unsigned fusable packages while keeping ceremony-signed packages fail-closed.

**Architecture:** Extend the existing real subprocess interface instead of adding a second package enumerator. Preserve the committed-manifest predicate and separate freshness override from signed-custody override.

**Tech Stack:** Node.js ESM, `node:test`, Git-backed temporary fixtures, Galerina package CLI.

## Global Constraints

- Never delete the build tree or ceremony artifacts.
- `--rebuild-all` never rewrites committed ceremony-signed packages.
- `--allow-signed` is the only top-level signed-custody bypass.
- `--force` refuses as ambiguous.
- `--strict` conserves every failure and empty discovery.

---

### Task 1: Rebuild option contract

**Files:**
- Modify: `scripts/rebuild-fusable-packages.mjs`
- Test: `scripts/tests/signed-fixture-guard.test.mjs`

**Interfaces:**
- Consumes: `findFusablePackages(baseDirs, { gitRoot })` and each package's `committedSigned` fact.
- Produces: CLI options `--rebuild-all`, `--allow-signed`, `--strict`, and a refusing legacy `--force`.

- [ ] **Step 1: Write failing subprocess tests**

Add fixtures which build once to become fresh, then assert `--rebuild-all` rebuilds the unsigned artifact while leaving the committed ceremony manifest byte-identical. Assert `--allow-signed` prints the named warning and changes the signed artifact. Assert `--force` exits 2 and names `--rebuild-all` and `--allow-signed`.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test scripts/tests/signed-fixture-guard.test.mjs`

Expected: the new option tests fail because the options are not implemented and legacy `--force` still bypasses custody.

- [ ] **Step 3: Implement the minimal option separation**

Parse `REBUILD_ALL` and `ALLOW_SIGNED` independently. Refuse `--force`. Skip freshness only when `REBUILD_ALL` is true. Skip `committedSigned` unless `ALLOW_SIGNED` is true. Forward child `--force` only for `ALLOW_SIGNED`.

- [ ] **Step 4: Run focused verification**

Run: `node --test scripts/tests/signed-fixture-guard.test.mjs`

Expected: all tests pass and the signed fixture remains protected in the full-rebuild case.

- [ ] **Step 5: Commit the focused change**

Stage only the script, its test, and this design/plan pair, then commit with message `fix: separate full rebuild from signed custody bypass`.

