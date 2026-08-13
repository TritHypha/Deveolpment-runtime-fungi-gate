# Slices 448-497 Myco Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the next 50 unique conversion scopes across the Myco test runner, CLI, stored-index contract, graph model, and store foundations without inventing Fungi authority.

**Architecture:** Three read-only workers produce pinned source dossiers in parallel while the root agent owns every repository edit, focused verification, receipt, owner publication, commit, and index refresh. Every scope is classified independently as `CANDIDATE`, `BLOCKED`, `NO_RUNTIME_BEHAVIOR`, or `SUPERSEDED_BY_EXISTING_FUNGI`; candidates require exact Fungi, GIR, physical `.slide`, independent re-admission, VOK, and consumer-switch evidence before retirement.

**Tech Stack:** TypeScript, MJS, Node 24, Galerina `.fungi`, Myco, codebase-memory, SLIDE/VOK, node:test.

## Global Constraints

- Pin the exact committed HEAD and SHA-256 of every source and focused test before adjudication.
- Use codebase-memory first; bounded Myco `--no-refresh` and exact reads are fallback evidence only.
- Root is the sole writer, tester, stager, and committer; workers remain read-only.
- Never write placeholder `.fungi`; retain TypeScript and public `.d.ts` contracts until the complete retirement gate passes.
- Never author `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop`; admitted iteration is bounded Boolean `while` only.
- Preserve JavaScript numbers, property observations, aliases, callbacks, child-process states, filesystem effects, output ordering, and Error identity exactly or name the blocker.
- Review both private Fungi skills for every slice and record exact skill commits or an evidence-based `NO_SKILL_UPDATE`; keep both private and unpushed.
- Adjacent test files are focused evidence, not silent conversion credit. Slice 448 explicitly accounts the executable test-runner module that precedes the TypeScript source in the maintained queue.
- Run focused Myco checks and receipt audit after authoring. Run registered owners and both indexes only at the 50-slice boundary.
- Repository-wide closure remains `UNKNOWN`; no excluded aggregate substitutes for focused evidence.

---

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 448 | `scripts/run-tests.mjs` whole-file module |
| 449 | `HELP` |
| 450 | `toOptions` |
| 451 | `useColor` |
| 452 | `cmdIndex` |
| 453 | `noteSaveOutcome` |
| 454 | `cmdStatus` |
| 455 | `cmdSearch` |
| 456 | `run` |
| 457 | `MAX_INDEX_PATH_LENGTH` |
| 458 | `MAX_INDEX_TERM_LENGTH` |
| 459 | `MAX_INDEX_FILES` |
| 460 | `MAX_INDEX_TERMS_PER_FILE` |
| 461 | `MAX_INDEX_TERM_EDGES` |
| 462 | `MAX_INDEX_BYTES` |
| 463 | `IndexLimits` |
| 464 | `DEFAULT_INDEX_LIMITS` |
| 465 | `StoredFile` |
| 466 | `StoredIndex` |
| 467 | `isRecord` |
| 468 | `hasExactKeys` |
| 469 | `isCanonicalIndexPath` |
| 470 | `validateStoredIndex` |
| 471 | `FileId` |
| 472 | `FileRecord` |
| 473 | `TermCounts` |
| 474 | `SearchGraph` |
| 475 | `SearchGraph.setFile` |
| 476 | `SearchGraph.removeFile` |
| 477 | `SearchGraph.indexName` |
| 478 | `SearchGraph.file` |
| 479 | `SearchGraph.fileByPath` |
| 480 | `SearchGraph.files` |
| 481 | `SearchGraph.fileCount` |
| 482 | `SearchGraph.termCount` |
| 483 | `SearchGraph.termEdgeCount` |
| 484 | `SearchGraph.forwardOf` |
| 485 | `SearchGraph.filesWithTerm` |
| 486 | `SearchGraph.terms` |
| 487 | `SearchGraph.filesWithNameTerm` |
| 488 | `nameTermsOf` |
| 489 | `FORMAT` |
| 490 | `INDEX_DIR` |
| 491 | `INDEX_FILE` |
| 492 | `IndexMeta` |
| 493 | `LoadGraphOptions` |
| 494 | `SaveGraphOptions` |
| 495 | `clampTermEdgeCeiling` |
| 496 | `indexPath` |
| 497 | `compareCodeUnits` |

### Task 1: Pin and adjudicate Slices 448-470

**Files:**
- Read: `packages-galerina/galerina-tools-myco/scripts/run-tests.mjs`
- Read: `packages-galerina/galerina-tools-myco/src/cli.ts`
- Read: `packages-galerina/galerina-tools-myco/src/graph/index-contract.ts`
- Read: `packages-galerina/galerina-tools-myco/tests/**/*.test.ts`

- [x] Pin sources, toolchain, callers, tests, package boundary, queue/retirement state, and exact physical evidence.
- [x] Record every observable process, argv, stream, filesystem, path, JSON, numeric, array, record, mutation, failure, and exit-code behavior.
- [x] Run read-only hostile probes that discriminate nominal TypeScript shapes from the live JavaScript boundary.
- [x] Return one exact classification, blocker/exit, threadability class, vectors, and skill disposition for each Slice 448-470.

### Task 2: Pin and adjudicate Slices 471-488

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/graph/model.ts`
- Read: focused graph-model tests and package boundary evidence.

- [x] Pin the exact source/test identities and all callers.
- [x] Record Map/Set identity, mutation, insertion order, iterator behavior, numeric IDs/counts, path tokenization, regex/Unicode behavior, exceptions, and aliasing.
- [x] Exercise duplicate paths, mutable term maps, hostile strings, iterator mutation, unsafe numbers, and post-return aliases.
- [x] Return exact classifications, blockers/exits, threadability, vectors, and skill dispositions for Slices 471-488.

### Task 3: Pin and adjudicate Slices 489-497

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/graph/store.ts`
- Read: focused store/index contract tests and package boundary evidence.

- [x] Pin the exact source/test identities and all callers.
- [x] Record constant bytes, public declaration contracts, clamp semantics, platform path behavior, UTF-16 comparison, and physical String/Int limits.
- [x] Distinguish immutable primitive candidates from consumer filesystem authority; do not over-block constants or under-block active records.
- [x] Return exact classifications, blockers/exits, threadability, vectors, and skill dispositions for Slices 489-497.

### Task 4: Author, review, and publish the wave

**Files:**
- Create: `docs/reports/slice-448-*-fungi-conversion-2026-08-13.md` through `docs/reports/slice-497-*-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

- [x] Root reconciles all three dossiers to exact live source and authors 50 receipts with no duplicate credit.
- [x] No exact candidate is admitted under mirror custody; no `.fungi` was authored.
- [x] Run focused Myco typecheck/tests, receipt audit, path/private leak checks, and three independent read-only reviews.
- [x] Commit authored evidence separately from registered owner outputs.
- [x] Run all registered graph/owner publishers and the bounded close matrix.
- [ ] Commit the final provenance build point, then refresh Myco and
  codebase-memory with exact-head readback at Slice 497.
- [ ] Keep repository closure `UNKNOWN` and continue with Slice 498 after the bounded close.
