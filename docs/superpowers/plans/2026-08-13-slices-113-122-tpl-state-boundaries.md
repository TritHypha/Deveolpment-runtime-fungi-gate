# Slices 113-122 TPL State Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce exact zero-trust conversion decisions for ten adjacent TPL
symbols without inventing Fungi or moving state, cleanup, governance or audit
authority into the host.

**Architecture:** Treat each source symbol as its own observable contract.
Compare that contract with the exact pinned checked-Fungi/SLIDE/VOK physical
surface, preserve TypeScript for every unrepresentable boundary, and publish
machine-checked slice receipts plus refreshed derived evidence.

**Tech Stack:** TypeScript, Node `node:test`, checked Fungi, GIR, SLIDE/VOK,
Myco, Markdown owner reports and deterministic graph/index generators.

## Global Constraints

- Branch: `codex/rd-0792-synthesize-only`; local commits only; no push.
- Pinned SLIDE: `ed326eaa14f1a899841cbac8da353d400970367e`.
- No `null`, NaN, `else if`, `throw`, `try/catch`, `for` or unbounded `loop` in
  authored Fungi.
- Plain `Int` and governance `Verdict` are not arithmetic Trit.
- Host projection, cleanup, packing, mutation or active-object calls cannot
  satisfy physical parity.
- Do not run crash-linked full tooling, normal phase-close, `graph-all` or the
  monolithic memory evaluation.
- Repository-wide closure remains `UNKNOWN`.

---

### Task 1: Bind the ten source contracts

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts`
- Read: `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs`
- Read: `packages-galerina/galerina-tower-citizen/tests/governance-algebra-binding.test.mjs`
- Read: `packages-galerina/galerina-tower-citizen/tests/tpl-simulator.test.mjs`
- Read: `packages-galerina/galerina-tower-citizen/tests/tpl-bitnet-fidelity.test.mjs`

**Interfaces:**
- Consumes: the exact TypeScript signatures and live package tests.
- Produces: one evidence ledger for Slices 113-122 matching the design table.

- [ ] **Step 1: Verify the exact source-order symbol set**

Run:

```powershell
myco -e "^export (async )?function |^export class " packages-galerina\galerina-tower-citizen\src\tpl-simulator.ts
```

Expected: `consensusTrit` and `TPLSimulator` are present; the class methods are
read directly from the bounded source region.

- [ ] **Step 2: Bind test coverage to the named behaviors**

Run bounded Myco queries for `consensusTrit`, `verifyIntegrity`, `setTrit`,
`getTrit`, `setScale` and `.gate(` under the package `tests` directory.

Expected: arithmetic truth tables, type-brand separation, canary erasure,
bounds/value traps, packed reads/writes, scale and gate behavior have named
test evidence.

### Task 2: Prove the physical exits

**Files:**
- Read: `../SLIDE/src/safe-value-envelope.mjs`
- Read: `../SLIDE/src/checked-fungi-pure-scalar-compiler.mjs`
- Read: `docs/superpowers/specs/2026-08-13-slices-113-122-tpl-state-boundaries-design.md`

**Interfaces:**
- Consumes: the exact SLIDE type IDs and checked-Fungi physical type table.
- Produces: the ten classifications in the design, with no placeholder asset.

- [ ] **Step 1: Verify the pinned sibling and type surface**

Run:

```powershell
git -C ..\SLIDE rev-parse HEAD
myco -s "SAFE_VALUE_TYPE_IDS" ..\SLIDE --in src
myco -s "Array<Int>" ..\SLIDE --in src
myco -s "Float" ..\SLIDE --in src
```

Expected: exact pin `ed326eaa14f1a899841cbac8da353d400970367e`;
no Float or arithmetic-Trit type; the admitted scalar/container types match
the design.

- [ ] **Step 2: Refuse non-equivalent projections**

For each slice, compare source input, output, failure, mutation and effect
semantics to the physical profile. Record the design classification exactly;
do not create `.fungi` when any dimension is absent.

### Task 3: Run bounded verification

**Files:**
- Test: `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs`
- Test: `packages-galerina/galerina-tower-citizen/tests/governance-algebra-binding.test.mjs`
- Test: `packages-galerina/galerina-tower-citizen/tests/tpl-simulator.test.mjs`
- Test: `packages-galerina/galerina-tower-citizen/tests/tpl-bitnet-fidelity.test.mjs`

**Interfaces:**
- Consumes: unchanged TypeScript source and existing independent tests.
- Produces: exact focused and package-wide pass/skip counts.

- [ ] **Step 1: Run typecheck and the four focused files**

```powershell
npm run typecheck
node --test tests/ternary-ops.test.mjs tests/governance-algebra-binding.test.mjs tests/tpl-simulator.test.mjs tests/tpl-bitnet-fidelity.test.mjs
```

Expected: exit 0, no failed or skipped tests.

- [ ] **Step 2: Run the complete owning package**

```powershell
$out = & npm test 2>&1
$code = $LASTEXITCODE
$out | Select-Object -Last 30
exit $code
```

Expected: exit 0, 515/515 or a freshly explained higher canonical count, zero
skips. Any failure stops report publication.

### Task 4: Review private skills and publish ten receipts

**Files:**
- Review: `../skills/translating-typescript-to-fungi/`
- Review: `../skills/writing-fungi/`
- Create: `docs/reports/slice-113-consensus-trit-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-114-trit-bit-shift-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-115-tpl-constructor-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-116-set-scale-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-117-verify-integrity-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-118-bounds-check-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-119-get-trit-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-120-erase-on-trap-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-121-set-trit-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-122-gate-fungi-conversion-2026-08-13.md`

**Interfaces:**
- Consumes: Tasks 1-3 evidence and current private-skill rules.
- Produces: ten exact reports, each with one valid slice-close receipt.

- [ ] **Step 1: Review cleanup-on-failure and active-object rules**

Search both private skills for `cleanup`, `erase`, `try`, `catch`, `callback`,
`active object`, `brand` and `host projection`. Add only a reusable missing
rule, verify each changed skill with its private audit/tests, commit locally,
and never push. If current rules are sufficient, record `NO_SKILL_UPDATE`.

- [ ] **Step 2: Write ten reports and update live documents**

Update the live register through Slice 122, `docs/TODO.md`, the assurance
status and the active roadmap. Each report must state no placeholder asset,
the exact blocker, focused evidence, package evidence, reopen condition and
non-authority consequence.

- [ ] **Step 3: Verify all receipts**

```powershell
node scripts\audit-conversion-slice-close.mjs
```

Expected: 62/62 governed receipts valid.

### Task 5: Refresh bounded evidence owners and commit

**Files:**
- Modify only outputs selected by their registered owner scripts.

**Interfaces:**
- Consumes: committed authored reports and final relevant-input build point.
- Produces: current project graph, code index, percent evidence, subway and
  bounded navigation index.

- [ ] **Step 1: Commit authored decisions with explicit paths**

Stage the design, plan, ten reports and four live documents only. Run
`git diff --cached --check`, then create one local commit.

- [ ] **Step 2: Run registered owners in dependency order**

Run retirement/queue/semantic checks, component-health `--audit-html`, status
check, project-graph wrapper, code-index owner and subway owner. If the
project-graph/subway pair requires convergence, permit one bounded extra pass;
otherwise record an owner-cycle refusal.

- [ ] **Step 3: Run final bounded gates**

Require project graph 5/5, subway 5/5, semantic 3/3, receipts 62/62,
retirement 1,486/1,486, queue 1,486/1,486, canonical counts 7/7, code index
current, percent current, and zero path/private-document violations.

- [ ] **Step 4: Commit generated outputs and refresh navigation**

Commit only owner-selected generated outputs. Refresh Myco and prove one new
blocker is queryable. Attempt the primary codebase-memory refresh once; if its
transport remains closed, retain exact final-HEAD freshness as `UNKNOWN` and
do not retry a monolithic index.

## Self-review

- Spec coverage: all ten symbols, source domains, state/failure/effect
  semantics, skill review, reports and owner closure have tasks.
- Placeholder scan: no implementation or report step contains a deferred
  placeholder; blocked outcomes explicitly create no Fungi asset.
- Type consistency: arithmetic Trit, governance Verdict, JavaScript binary64,
  physical Int, generic record and mutable `Int32Array` remain distinct.
