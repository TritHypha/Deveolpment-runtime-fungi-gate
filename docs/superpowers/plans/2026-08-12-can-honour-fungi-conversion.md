# Can Honour Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physically execute the exact fail-closed Boolean decision inside TypeScript `canHonour` as package-owned Fungi without changing or retiring its adapter or consumers.

**Architecture:** Add one pure scalar flow to the existing host-capability Fungi asset. Differential evidence compares its Bool with TypeScript `canHonour(...).ok`; an independent SLIDE/VOK test compiles, publishes, re-admits, executes, and verifies the same flow while keeping authority unreleased.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, the compiler interpreter, SLIDE checked-Fungi package compilation, VOK typed receipt verification.

## Global Constraints

- Unknown ceiling Strings return `false`.
- `unrestricted` returns `true` independently of host capability.
- The four restricted ceilings read only their corresponding Bool input.
- TypeScript keeps host resolution, rejection construction, and all consumers.
- Profiles are non-authorizing data; every physical receipt retains `authorityReleased: false`.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or `loop`.
- Commit locally and never push.
- Exclude full tooling, normal phase-close, and monolithic memory evaluation.

---

### Task 1: Differential decision proof

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/tests/resolve-host-fungi-conversion.test.mjs`

**Interfaces:**
- Consumes: TypeScript `canHonour(ceiling, host).ok` and the existing parsed Fungi asset.
- Produces: a failing expectation for `canHonourFungi(ceiling, canRegisterPin, canNoDramSpill, canNoSwap, canNoDisk) -> Bool`.

- [ ] **Step 1: Add the five typed ceilings, hostile ceiling Strings, and the declared plus unknown hosts to the focused vector matrix.**
- [ ] **Step 2: Execute `canHonourFungi` for each vector and compare the Bool with `canHonour(...).ok`.**
- [ ] **Step 3: Run `node --test packages-galerina/galerina-core-compiler/tests/resolve-host-fungi-conversion.test.mjs`.**

Expected: FAIL because `canHonourFungi` is absent.

- [ ] **Step 4: Commit only the RED test.**

### Task 2: Minimal Fungi decision

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-host-capability.fungi`

**Interfaces:**
- Consumes: one String ceiling and four Bool capability facts.
- Produces: `pure flow canHonourFungi(...) -> Bool` with a terminal wildcard refusal.

- [ ] **Step 1: Add an exhaustive String match with these exact arms:**

```galerina
"register_only" => return canRegisterPin
"no_dram_spill" => return canNoDramSpill
"no_swap" => return canNoSwap
"no_disk" => return canNoDisk
"unrestricted" => return true
_ => return false
```

- [ ] **Step 2: Run strict type and governance checking on the asset.**
- [ ] **Step 3: Re-run the focused differential test and require every vector to pass.**
- [ ] **Step 4: Commit the minimal source change.**

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Modify: `scripts/tests/resolve-host-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact Fungi source bytes and export `canHonourFungi`.
- Produces: a physical `.slide` Bool receipt proof with `authorityReleased: false`.

- [ ] **Step 1: Add a RED physical test that compiles the new export and executes the complete typed matrix.**
- [ ] **Step 2: Verify the receipt identity and exact Bool value independently.**
- [ ] **Step 3: Add refusal vectors for wrong arity, wrong types, invalid String encoding, exhausted work, source mutation, every envelope byte, receipt fields, and artifact bytes.**
- [ ] **Step 4: Run the physical test with `GALERINA_SLIDE_REPO` bound to the local SLIDE checkout.**
- [ ] **Step 5: Commit the physical proof.**

### Task 4: Owner regeneration and custody closure

**Files:**
- Modify owner-generated Golden, retirement, graph, code-index, component-health, roadmap, and canonical-count outputs as required.
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/reports/can-honour-fungi-conversion-2026-08-12.md`

**Interfaces:**
- Consumes: the committed source and physical proof.
- Produces: current generated owners and an explicit non-retirement custody record.

- [ ] **Step 1: Run the compiler package and one canonical package owner in bounded processes.**
- [ ] **Step 2: Regenerate only owners that correctly report drift.**
- [ ] **Step 3: Update TODO, roadmap, SVG, and the conversion report without claiming TypeScript retirement or production authority.**
- [ ] **Step 4: Run the final bounded owner matrix and commit generated outputs.**
- [ ] **Step 5: Refresh Myco and attempt the primary graph index; record a closed transport as `UNKNOWN`, never fresh.**
