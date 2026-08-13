# Slices 498-547 Myco Persistence, Ingest, Output, and Regex Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the next 50 unique conversion scopes across the remaining Myco persistence surface, public version constant, indexing/tokenization/walk pipeline, output renderer, path filtering, regex executor, and the first six regex-guard declarations without inventing Fungi authority.

**Architecture:** Three read-only workers produce pinned source dossiers in parallel while the root agent owns every repository edit, focused verification, receipt, owner publication, commit, and index refresh. Every scope is classified independently as `CANDIDATE`, `BLOCKED`, `NO_RUNTIME_BEHAVIOR`, or `SUPERSEDED_BY_EXISTING_FUNGI`; candidates require exact Fungi, GIR, physical `.slide`, independent re-admission, VOK, and consumer-switch evidence before retirement.

**Tech Stack:** TypeScript, Node 24, Galerina `.fungi`, Myco, codebase-memory, SLIDE/VOK, node:test.

## Global Constraints

- Source build point is `dd521faa88441c4cde51614d1ba6aabb4c26b3b1`; pin the exact SHA-256 of every source and focused test before adjudication and recheck the live bytes before authoring.
- Use codebase-memory first; bounded Myco `--no-refresh` and exact reads are fallback evidence only.
- Root is the sole writer, tester, stager, and committer; workers remain read-only.
- Never write placeholder `.fungi`; retain TypeScript and public `.d.ts` contracts until the complete retirement gate passes.
- Never author `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop`; admitted iteration is bounded Boolean `while` only.
- Preserve JavaScript numbers, property observations, aliases, Map/Set state, callbacks, workers, timers, filesystem effects, output ordering, Unicode/regex behavior, and Error identity exactly or name the blocker.
- Review both private Fungi skills for every slice and record exact skill commits or an evidence-based `NO_SKILL_UPDATE`; keep both private and unpushed.
- Adjacent test files are focused evidence, not silent conversion credit.
- The Myco package is a governed read-only mirror. Do not author beneath mirror `src`; a candidate requires upstream or governed-overlay custody plus candidate-specific physical proof.
- Run focused Myco checks and receipt audit after authoring. Run registered owners and both indexes only at the 50-slice boundary.
- Repository-wide closure remains `UNKNOWN`; no excluded aggregate substitutes for focused evidence.

---

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 498 | `SaveOutcome` |
| 499 | `saveGraph` |
| 500 | `LoadStatus` |
| 501 | `loadGraph` |
| 502 | `loadGraphOutcome` |
| 503 | `VERSION` |
| 504 | `IndexOptions` |
| 505 | `IndexStats` |
| 506 | `DEFAULT_INDEX_OPTIONS` |
| 507 | `buildIndex` |
| 508 | `countTerms` |
| 509 | `FileMeta` |
| 510 | `WalkOptions` |
| 511 | `Rule` |
| 512 | `ALWAYS_SKIP` |
| 513 | `VENDORED_SKIP` |
| 514 | `globToRegExp` |
| 515 | `parseIgnore` |
| 516 | `readIfPresent` |
| 517 | `loadDirRules` |
| 518 | `isIgnored` |
| 519 | `walk` |
| 520 | `walk.recur` |
| 521 | `RenderOptions` |
| 522 | `C` |
| 523 | `paint` |
| 524 | `LineGroup` |
| 525 | `group` |
| 526 | `highlight` |
| 527 | `renderContent` |
| 528 | `renderNames` |
| 529 | `render` |
| 530 | `summaryLine` |
| 531 | `PathFilter` |
| 532 | `META` |
| 533 | `compileOne` |
| 534 | `buildPathFilter` |
| 535 | `applyPathFilter` |
| 536 | `RegexScanResult` |
| 537 | `ScanResponse` |
| 538 | `RegexExecutor` |
| 539 | `RegexExecutor.constructor` |
| 540 | `RegexExecutor.scan` |
| 541 | `RegexExecutor.close` |
| 542 | `MAX_REPETITION` |
| 543 | `MAX_REGEX_LINE_LEN` |
| 544 | `SEARCH_TIME_BUDGET_MS` |
| 545 | `REGEX_OPERATION_TIME_BUDGET_MS` |
| 546 | `RegexVerdict` |
| 547 | `parseBraceQuantifier` |

### Task 1: Pin and adjudicate Slices 498-508

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/graph/store.ts`
- Read: `packages-galerina/galerina-tools-myco/src/index.ts`
- Read: `packages-galerina/galerina-tools-myco/src/ingest/indexer.ts`
- Read: `packages-galerina/galerina-tools-myco/src/ingest/tokenize.ts`
- Read: focused persistence, indexing, tokenization, and package-boundary evidence.

- [ ] Pin source/test identities, toolchain, callers, queue/retirement state, mirror custody, and physical evidence.
- [ ] Record save/load wire bytes, filesystem containment and write effects, mutable graph aliases, time/number/JSON behavior, public declaration retention, indexing races, bounded-work ceilings, and tokenization semantics.
- [ ] Run read-only hostile probes that distinguish nominal TypeScript types from the live JavaScript boundary.
- [ ] Return exact classifications, blocker/exit, threadability, vectors, defects, and both skill dispositions for Slices 498-508.

### Task 2: Pin and adjudicate Slices 509-530

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/ingest/walk.ts`
- Read: `packages-galerina/galerina-tools-myco/src/output.ts`
- Read: focused walk/output tests and package-boundary evidence.

- [ ] Pin source/test identities and all callers.
- [ ] Record ignore-rule parsing, nested filesystem traversal, symlink/file-kind behavior, ordering and coverage caps, mutable output aliases, UTF-16 spans, ANSI rendering, JSON serialization, and exact summary text.
- [ ] Exercise hostile paths, ignore files, getters/proxies, sparse arrays, overlapping spans, control text, non-finite numbers, and stream-visible bytes without mutating the repository.
- [ ] Return exact classifications, blocker/exit, threadability, vectors, defects, and both skill dispositions for Slices 509-530.

### Task 3: Pin and adjudicate Slices 531-547

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/query/path-filter.ts`
- Read: `packages-galerina/galerina-tools-myco/src/query/regex-executor.ts`
- Read: `packages-galerina/galerina-tools-myco/src/query/regex-guard.ts`
- Read: focused path-filter, regex-worker, regex-guard, and search tests.

- [ ] Pin source/test identities, callers, worker boundary, mirror custody, and physical evidence.
- [ ] Record glob/regex compilation, path normalization, sparse/active records, worker lifecycle, IDs/listeners/timers, timeout/error conflation, termination, line/hit ceilings, numeric coercion, and optional-result semantics.
- [ ] Exercise malformed patterns, empty/wrong-class inputs, getter/proxy/array mutation, worker error/timeout/races, numeric extrema, Unicode/surrogate paths, and exact refusal/output ordering.
- [ ] Return exact classifications, blocker/exit, threadability, vectors, defects, and both skill dispositions for Slices 531-547.

### Task 4: Author, review, and publish the wave

**Files:**
- Create: `docs/reports/slice-498-*-fungi-conversion-2026-08-13.md` through `docs/reports/slice-547-*-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

- [ ] Root reconciles all three dossiers to exact live source and authors 50 receipts with no duplicate credit.
- [ ] Run focused Myco typecheck/tests, receipt audit, path/private leak checks, and three independent read-only reviews.
- [ ] Commit authored evidence separately from registered owner outputs.
- [ ] Run all registered graph/owner publishers and the bounded close matrix.
- [ ] Commit the final provenance build point, then refresh Myco and codebase-memory with exact-head readback at Slice 547.
- [ ] Keep repository closure `UNKNOWN` and continue with Slice 548 after the bounded close.
