# Slices 548-597 Myco Search, Test Modules, and Tower Entry Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the next 50 unique conversion scopes across the remaining Myco regex guard, runtime worker, search and normalization surfaces, the outstanding Myco test modules, three Tower benchmark modules, and the first Tower AI-governance declaration.

**Architecture:** Three read-only workers produce pinned source dossiers in parallel while the root agent alone writes receipts, runs focused checks, reconciles independent reviews, publishes owners, commits, and refreshes both indexes. Module scopes are used only where the queue owns executable top-level JavaScript or test/benchmark files without a stable named production declaration.

**Tech Stack:** TypeScript, JavaScript, Node 24, Galerina `.fungi`, Myco, codebase-memory, node:test, SLIDE/VOK.

## Global Constraints

- Source build point is the clean, independently indexed Slice 547 commit `0afd1653968b0aa8b85f5a6bcaa02a7edc9fac85`; pin every scoped source/test SHA-256 and recheck live bytes before authoring.
- Use codebase-memory first. Its independently read-back index is exact at the source build point; bounded Myco `--no-refresh` and exact reads remain secondary evidence.
- Root is the sole writer, tester, stager, and committer; workers are strictly read-only.
- Never write placeholder `.fungi`; retain TypeScript/JavaScript and declaration contracts until the complete retirement gate passes.
- Never author `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop`; admitted iteration is bounded Boolean `while` only.
- Preserve RegExp/Unicode/coercion semantics, mutable Map/Set/Array state, callbacks, worker lifecycle, clocks, filesystem effects, error identity, ordered output, module startup, and test-runner termination exactly or record a precise blocker.
- Review both private Fungi skills for every slice, record exact private commits, and keep them unpushed.
- Test and benchmark modules receive queue accounting only; green tests are evidence, never production execution authority.
- The Myco package is a governed read-only mirror. Implement only upstream or through a governed overlay; do not author under mirror `src`.
- Run focused package checks and the receipt audit after authoring. Run all registered owners and refresh both indexes only at the 50-slice boundary.
- Repository-wide closure remains `UNKNOWN`.

---

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 548 | `assessRegexSafety` |
| 549 | `selfTest` |
| 550 | `regex-worker bootstrap` |
| 551 | `regex-worker matcher` |
| 552 | `regex-worker message handler` |
| 553 | `MatchMode` |
| 554 | `SearchOptions` |
| 555 | `Match` |
| 556 | `SearchResult` |
| 557 | `SearchError` |
| 558 | `SearchOutcome` |
| 559 | `isError` |
| 560 | `escapeRegExp` |
| 561 | `detectRegexIntent` |
| 562 | `resolveSensitivity` |
| 563 | `search.WORD_CHAR` |
| 564 | `buildMatcher` |
| 565 | `buildLooseProbe` |
| 566 | `queryTerms` |
| 567 | `intersect` |
| 568 | `candidates` |
| 569 | `scanLine` |
| 570 | `matchFile` |
| 571 | `matchFileRegex` |
| 572 | `rank` |
| 573 | `searchNames` |
| 574 | `searchNamesRegex` |
| 575 | `search` |
| 576 | `searchFile` |
| 577 | `SNIFF_BYTES` |
| 578 | `looksBinary` |
| 579 | `normalize.WORD_CHAR` |
| 580 | `foldCase` |
| 581 | `wordScanner` |
| 582 | `hasUpper` |
| 583 | `cli-epipe.test.ts module` |
| 584 | `cli-streams.test.ts module` |
| 585 | `index-ceiling.test.ts module` |
| 586 | `path-filter.test.ts module` |
| 587 | `regex-guard.test.ts module` |
| 588 | `search.test.ts module` |
| 589 | `store.test.ts module` |
| 590 | `tokenize.test.ts module` |
| 591 | `version.test.ts module` |
| 592 | `walk-completeness.test.ts module` |
| 593 | `walk.test.ts module` |
| 594 | `flight-boot.mjs module` |
| 595 | `sentinel-bench.mjs module` |
| 596 | `tower-bench.mjs module` |
| 597 | `AiActionProposal` |

### Task 1: Adjudicate Slices 548-566

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/query/regex-guard.ts`
- Read: `packages-galerina/galerina-tools-myco/src/query/regex-worker.js`
- Read: `packages-galerina/galerina-tools-myco/src/query/search.ts`
- Read: focused regex/search tests and package boundary evidence.

- [x] Pin source, worker asset, focused tests, callers, mirror custody, package assets, physical evidence, and both skill commits.
- [x] Record static-regex parsing, module bootstrap, Worker message/structured-clone behavior, search records, JS coercion and exact String/RegExp semantics.
- [x] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 548-566.

### Task 2: Adjudicate Slices 567-582

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/query/search.ts`
- Read: `packages-galerina/galerina-tools-myco/src/util/binary.ts`
- Read: `packages-galerina/galerina-tools-myco/src/util/normalize.ts`
- Read: focused search/tokenization and mirror evidence.

- [x] Pin exact ranges, callers, source/test digests, mirror relationships, and physical evidence.
- [x] Record active Map/Set/Array behavior, filesystem failure paths, worker delegation, ranking/order, limits and clocks, Buffer bytes, Unicode normalization/case/regex semantics.
- [x] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 567-582.

### Task 3: Adjudicate Slices 583-597

**Files:**
- Read: the eleven queued Myco test modules named in the slice map.
- Read: `packages-galerina/galerina-tower-citizen/bench/flight-boot.mjs`
- Read: `packages-galerina/galerina-tower-citizen/bench/sentinel-bench.mjs`
- Read: `packages-galerina/galerina-tower-citizen/bench/tower-bench.mjs`
- Read: `packages-galerina/galerina-tower-citizen/src/ai-governance.ts`
- Read: owning manifests, boundaries, callers and focused tests.

- [x] Pin every module/source/test identity and distinguish test evidence from production authority.
- [x] Record top-level test/benchmark discovery, subprocess/clock/output effects, environment and failure semantics, and the erased `AiActionProposal` public contract.
- [x] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 583-597.

### Task 4: Author, verify, review, and publish the wave

**Files:**
- Create: `docs/reports/slice-548-*-fungi-conversion-2026-08-13.md` through `docs/reports/slice-597-*-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

- [x] Root reconciles all three dossiers against exact live source and authors 50 unique receipts.
- [ ] Run focused Myco and Tower checks, receipt audit, leak checks, and three independent read-only reviews.
- [ ] Commit authored evidence separately from registered owner outputs.
- [ ] Run all graph/owner publishers and the bounded 50-slice close matrix.
- [ ] Commit the final provenance build point, refresh Myco and codebase-memory, and independently prove both exact indexed build points.
- [ ] Keep repository closure `UNKNOWN` and continue with Slice 598.
