# Round 5 External Fungi Package Conversion Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Issue a reproducible, fail-closed external assignment that retries
the prior conversion surface and 30 distinct backup files without authorizing
Galerina integration.

**Architecture:** Galerina owns the maintained design and standards; a separate
Round 5 sandbox owns all worker output. An exact selection manifest separates
verified file-level history, incomplete package-level history and deterministic
backups, while the handover requires complete per-file dossiers and strict
frontend evidence.

**Tech Stack:** Markdown, Git path inventory, SHA-256 selection, Galerina
`.fungi`, current Galerina strict checker.

## Global Constraints

- Verify; never infer authority from a name, prior candidate or success Boolean.
- Unknown, missing or unsupported behavior fails closed and remains visible.
- `if` is Boolean-only; `check` is typed-`Verdict`-only; all other alternatives
  use exhaustive `match` with a terminal `_ =>` refusal.
- Every package/plugin is one top-level peer; no nested dependency copies.
- All repositories and earlier staging rounds are read-only to the external
  worker.
- No commit, push, signing, key access, installation or TypeScript deletion.

---

### Task 1: Freeze and classify prior-round evidence

**Files:**
- Create: external `ROUND-5-SELECTION-MANIFEST.md`

- [x] Read candidate manifests and reports from Rounds 1-4.
- [x] Separate verified file attempts from package-only or missing history.
- [x] Record that Round 2 produced no file-level candidate output.
- [x] Verify every selected current path is tracked at the issue checkpoint.

### Task 2: Select deterministic backup peers

**Files:**
- Modify: external `ROUND-5-SELECTION-MANIFEST.md`

- [x] Exclude all primary and recovery packages.
- [x] Choose one tracked `src/**/*.ts` path per remaining package using the
  documented SHA-256 seed and ordering.
- [x] Select 30 distinct package peers and record the exact paths.

### Task 3: Write the worker handover

**Files:**
- Create: external `ROUND-5-CLEAN-SLATE-AI-HANDOVER.md`
- Create: external `COPY-PASTE-PROMPT.md`
- Create: external `README.md`

- [x] Bind read/write custody and forbidden operations.
- [x] Bind the current control/effect examples instead of duplicating a stale
  dialect.
- [x] Require every assigned file to receive a full-read outcome.
- [x] Require exact strict-check evidence and non-authorizing labels.
- [x] Require continuation after local blockers.

### Task 4: Verify and record issuance

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`

- [ ] Check all manifest paths against current Git-tracked source.
- [ ] Scan the handover for unresolved placeholders and forbidden private/local
  path disclosure in Galerina documentation.
- [ ] Record Round 5 as issued but not executed or admitted.
- [ ] Commit Galerina documentation locally; never push.
