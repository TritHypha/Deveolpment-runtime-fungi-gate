# Power Rank Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the private sentinel-power `powerRank` String-to-Int decision through the existing package-owned Fungi twin and physical SLIDE/VOK without retiring TypeScript.

**Architecture:** Extend `power-governor.fungi` with one pure flow and extend its existing signed-Wasm differential test. Add one independent physical publication test for the exact flow, then register that test in the governed tooling manifest and refresh only its dependent owners.

**Tech Stack:** Galerina `.fungi`, TypeScript reference source, Node.js `node:test`, canonical GIR/WAT/Wasm, independent SLIDE/VOK.

## Global Constraints

- Exact mapping: `native -> 0`, `simd -> 1`, `shadow -> 2`, every other String -> `-1`.
- No null, NaN, `else if`, exception syntax, `for`, or `loop` in the Fungi source.
- No new effect, capability, contract permission, Hallmark, border grant, or host API.
- `power-governor.ts` and `PowerGovernor.requestAdjustment` remain active.
- No bootstrap, production, hardware, signing, release, durability, consumer-switch, or retirement authority.
- Do not run the previously crashing tooling process or a whole-memory evaluation.
- Commit locally only; do not push.

---

### Task 1: Existing governor proof RED

**Files:**
- Modify: `packages-galerina/galerina-core-sentinel-power/tests/rd0361-power-governor-execution.test.mjs`

**Interfaces:**
- Consumes: existing compiler exports, `power-governor.fungi`, and the private TypeScript source shape.
- Produces: a test contract requiring `powerRank(String) -> Int` and exact canonical/hostile vectors.

- [x] **Step 1: Add the missing-export assertion before changing Fungi**

```js
assert.equal(typeof X.powerRank, "function", "powerRank admitted (R1)");
```

- [x] **Step 2: Define an independent bounded vector family**

```js
const POWER_RANK_VECTORS = Object.freeze([
  ["native", 0],
  ["simd", 1],
  ["shadow", 2],
  ["", -1],
  ["Native", -1],
  [" shadow", -1],
  ["shadow\u0000", -1],
  ["unknown", -1],
]);
```

- [x] **Step 3: Run the focused test and retain the intended RED**

Run:

```powershell
node --test packages-galerina/galerina-core-sentinel-power/tests/rd0361-power-governor-execution.test.mjs
```

Expected: FAIL only because the `powerRank` export is absent.

### Task 2: Exact Fungi flow and canonical execution

**Files:**
- Modify: `packages-galerina/galerina-core-sentinel-power/src/self-hosted/power-governor.fungi`
- Modify: `packages-galerina/galerina-core-sentinel-power/tests/rd0361-power-governor-execution.test.mjs`

**Interfaces:**
- Consumes: one admitted `String`.
- Produces: one deterministic `Int` rank with a terminal `-1` non-member exit.

- [x] **Step 1: Add the minimal pure flow**

```fungi
pure flow powerRank(kernel: String) -> Int
contract { intent { "Map a kernel tier name to its fixed power rank; return -1 for a non-member." } }
{
  if kernel == "native" { return 0 }
  if kernel == "simd" { return 1 }
  if kernel == "shadow" { return 2 }
  return 0 - 1
}
```

- [x] **Step 2: Exercise typed interpretation and signed Wasm**

For every `POWER_RANK_VECTORS` row, call `executeFlow` with a typed String and
call the admitted `X.powerRank` with the host-interned String. Require the same
`Int` result from both surfaces.

- [x] **Step 3: Anchor production ordering**

Instantiate `PowerGovernor` and compare `requestAdjustment` over all three
target tiers at NOMINAL, THROTTLED, and SAFETY readings. Require the public
decision to equal `targetRank >= permittedRank` using the independent vector
table.

- [x] **Step 4: Run strict and package checks**

```powershell
node galerina.mjs check packages-galerina/galerina-core-sentinel-power/src/self-hosted/power-governor.fungi --strict-types --strict-governance
node --test packages-galerina/galerina-core-sentinel-power/tests/rd0361-power-governor-execution.test.mjs
npm test --prefix packages-galerina/galerina-core-sentinel-power
```

Expected: all commands exit 0 with no skipped candidate test.

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/power-rank-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: exact `power-governor.fungi` bytes and independent SLIDE at `ac8a0418`.
- Produces: one physical reference-only `.slide` export and independently verified typed Int receipts.

- [x] **Step 1: Compile one checked-Fungi package export**

Use package identity `@galerina/core-sentinel-power`, export name and source
flow `powerRank`, version `1.0.0-beta.2`, no dependencies/resources, and the
existing all-allow non-production reference gate fixture.

- [x] **Step 2: Publish, re-admit, and execute all vectors**

Require `SUCCEEDED_PHYSICAL_REFERENCE_ONLY`, `SAFE_VALUE_TYPE_IDS.int`, an
independently verified receipt, and the exact expected rank for every vector.

- [x] **Step 3: Prove refusal boundaries**

Require refusal for `[]`, `[1]`, `["native", "extra"]`, an unpaired surrogate,
mutated source bytes, and a one-byte physical `.slide` mutation.

- [x] **Step 4: Run with an explicit SLIDE root and zero skips**

```powershell
$env:GALERINA_SLIDE_REPO=(Resolve-Path '..\SLIDE').Path
node --test scripts/tests/power-rank-fungi-slide.integration.test.mjs
```

Expected: 1/1 pass, zero skips.

### Task 4: Governed registration and closure

**Files:**
- Modify: `governance/phase-close-commands.json`
- Create: `docs/reports/power-rank-fungi-conversion-2026-08-11.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: generated outputs selected by their owning tools

**Interfaces:**
- Consumes: focused compiler/Wasm and physical SLIDE/VOK evidence.
- Produces: one registered non-retiring conversion record with fresh graphs and indexes.

- [x] **Step 1: Register the physical test**

Add `scripts/tests/power-rank-fungi-slide.integration.test.mjs` once to both the
`tests:tooling` command and subject lists; raise `expectedCount` from 105 to
106. Run the tooling-contract and manifest-focused tests only, not the full
tooling process.

- [x] **Step 2: Record exact evidence and authority limits**

Write source/candidate hashes, build points, vectors, command results, and the
reference-only/non-retirement boundary in the report and current TODO/roadmap.

- [x] **Step 3: Refresh owners in dependency order**

Run code index/registry if their checks require it, then graphs, component
health/status, and roadmap. Verify registry, semantic 3/3, graph 7/7,
percentage, status, subway 5/5, canonical counts, and path-leak.

- [x] **Step 4: Commit and re-index**

Commit explicit paths locally. Refresh codebase-memory in full mode and require
actual nodes/edges to equal expected values at the exact final HEAD. Refresh
Myco and report its file/term counts. Do not push.
