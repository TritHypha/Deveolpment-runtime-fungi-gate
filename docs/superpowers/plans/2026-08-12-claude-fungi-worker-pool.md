# Claude Fungi Worker Pool Implementation Plan

Binding design:
[`../specs/2026-08-12-claude-fungi-worker-pool-design.md`](../specs/2026-08-12-claude-fungi-worker-pool-design.md).

> **For agentic workers:** REQUIRED SUB-SKILL: use the repository's public
> `translating-typescript-to-fungi` and `writing-fungi` skills task-by-task.

**Goal:** Use three Claude Opus/high sessions at a time to prepare bounded
three-slice waves, for no more than 30 slices under this plan, without
transferring product authority or weakening zero-trust gates.

**Architecture:** Run a read-only dossier wave first. Codex verifies and binds
the second batch design and queue, then starts one isolated implementation
worktree per admitted symbol and independently reviews every returned patch.

**Tech Stack:** Claude CLI background sessions, Git worktrees, Galerina Fungi,
Node.js focused tests, SLIDE/VOK physical admission, codebase-memory and Myco.

## Global Constraints

- Maximum three concurrent Claude sessions.
- Product-owner verification and admission runs after every three-worker wave.
- Model `opus`; effort `high`.
- Both public Fungi skill directories are mounted and named in every prompt.
- One exact symbol and owning package per worker.
- Run the mandatory live/dead, duplicate, floor, custody and physical-domain
  preflight before assigning each scope.
- Workers never commit, push, change authority ledgers, widen profiles or run
  the crash-linked aggregate lanes.
- Codex owns admission, review, shared files, verification and local commits.

---

### Task 1: Read-only dossier wave

**Files:**

- Read: `packages-galerina/galerina-web/src/index.ts`
- Read: `packages-galerina/galerina-target-js/src/index.ts`
- Read: `packages-galerina/galerina-devtools-provenance/src/analyzer.ts`
- Read: `packages-galerina/galerina-core-network/src/index.ts`
- Read: `packages-galerina/galerina-cpu-kernels/src/index.ts`
- Read: `build/ts-retirement/ts-retirement.json`

**Produces:** three independent dossier results per wave. Slices 38-40 and
Slices 41-43, 44-46, 47-49, 50-52 and 53-55 have completed their product-owner gates.

- [x] Start three background sessions with the exact Slice 38-40 scopes in the
  design.
- [x] Mount `../skills/translating-typescript-to-fungi`,
  `../skills/writing-fungi` and the sibling SLIDE repository.
- [x] Require read-only behavior and the ten-field dossier return schema.
- [x] Capture every process exit and terminal status in the live per-file
  register.
- [x] Correct the preflight after duplicate-selection pressure: require the
  live register, retirement floor, every package loaded asset, exact/sibling
  Fungi assets and governed mirrors before a worker is launched.

### Task 2: Product-owner admission

**Files:**

- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Create: `docs/superpowers/specs/2026-08-12-five-follow-on-fungi-conversions-design.md`
- Modify: `governance/conversion-queue-decisions.json`
- Regenerate: `build/conversion-queue/queue.json`
- Regenerate: `build/conversion-queue/QUEUE.md`

**Produces:** an owner-reviewed, digest-bound queue extension containing only
newly admitted symbols.

- [x] Re-read every source, caller, test, type, constant and retirement row.
- [x] Treat a dead-code finding as deletion/adjudication work, never as an
  otherwise successful conversion candidate.
- [x] Reject any bootstrap-floor, unsupported-domain or ambiguous candidate.
- [x] Bind exact decisions/effects, physical profiles and hostile vectors in
  the second design.
- [x] Add only sorted, unique `SYMBOLS` decisions that remain admitted. A
  blocked, duplicate or superseded scope is recorded and replaced only in a
  later wave. No new candidate survived these waves, so no authority row was
  added.
- [x] Retain the already checked bounded queue with zero whole-file claims;
  regeneration is unnecessary because candidate authority did not change.

### Task 3: Isolated implementation wave

**Files:** package-owned Fungi assets, package manifests and focused tests named
by the approved second design only.

**Produces:** one uncommitted worktree patch per admitted slice.

- [ ] Start one CLI-managed worktree session per admitted symbol.
- [ ] Require RED evidence before the minimal Fungi asset is written.
- [ ] Require strict candidate checking, differential true/false/surplus
  vectors and the owning package's focused test.
- [ ] Require the worker to return its exact changed paths and test output.
- [ ] Do not permit edits to shared queue, roadmap, generated owner or skill
  files.

### Task 4: Independent integration and physical proof

**Files:**

- Modify: the batch physical integration test or add one focused successor
  when the second design proves the profiles are independent.
- Modify: `governance/phase-close-commands.json` only for a green governed
  command or an explicit reproducible refusal check.

**Produces:** reviewed main-branch changes with physical receipts or exact
blockers.

- [ ] Inspect every worker diff before applying it.
- [ ] Re-run the worker's RED/GREEN test independently.
- [ ] Strict-check each exact asset from its owning source directory.
- [ ] Compile, publish, re-admit and execute each supported physical profile.
- [ ] Refuse wrong type, missing, surplus, malformed, exhausted and mutated
  inputs/artifacts.
- [ ] Preserve blockers as blockers; do not force a green receipt.

### Task 5: Bounded shared closure

**Files:** the active TODO, roadmap, subway, live file register, generated
bounded owners and public skills selected by the final slice review.

**Produces:** one locally committed bounded checkpoint; no push.

- [ ] Run the focused slice lanes and applicable owning package suites.
- [ ] Review both public Fungi skills and apply only reusable proved guidance.
- [ ] Run bounded owners once in dependency order.
- [ ] Refresh graph and Myco once at final HEAD and verify new symbols.
- [ ] Update the live file register, TODO, roadmap and subway once.
- [ ] Commit explicit paths locally and leave publishing to the owner.
