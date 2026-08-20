# Task 2 report — bounded detached-authority closure audit

## Status

Implemented and committed locally; not pushed. The Task 2 detector and its
focused tests are green at implementation commit
`dab487d19f0c85bd458b4de6108f890d3e081203`.

Milestone closure remains **HOLD — independent audit pending**. This authoring
session performed a scoped self-review and fresh verification, but did not
self-certify the security detector as independently audited.

## Commits

- Implementation and tests:
  `dab487d19f0c85bd458b4de6108f890d3e081203`
  (`feat: audit detached authority closure`).
- This report is committed separately. Its SHA is supplied in the task handoff
  because a commit cannot truthfully contain its own SHA.

Both commits are local-only. No push, pull request, merge or registration was
performed.

## RED evidence

Before production code existed:

```text
node --test scripts/tests/detached-slide-authority-path.test.mjs
```

Exit: `1`. Exact cause: `ERR_MODULE_NOT_FOUND` for
`scripts/audit-detached-slide-authority-path.mjs`, imported from the focused
test. The same exact missing-module RED was reproduced after amending the test
to the Task 2 API and result contract, before creating the detector.

A later focused false-positive regression test planted the benign module
`forecast.ts`. It failed as `AST_REENTRY`, demonstrating that substring-only
module matching was unsafe. The matcher was then narrowed to delimited module
segments; the regression passed without weakening the planted red fixtures.

## Implementation evidence

- Exports the exact async surface
  `auditDetachedAuthorityPath({ repoRoot, entryFiles, expectedHead,
  maximumFiles = 256, maximumEdges = 2048 })`.
- Returns a recursively frozen exact `DetachedAuthorityAuditV1` record with
  only the twelve planned fields.
- Queries Git and the maintained codebase-memory CLI through the repository's
  owned-process runner with finite timeout and output bounds. The programmatic
  surface selects the graph project by
  `GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT`; the CLI uses
  `--graph-project`. Neither route accepts a caller-provided freshness
  Boolean, and both independently bind graph root, graph build point,
  repository HEAD and `stale: false`.
- Uses the pinned repository TypeScript compiler API to parse static imports,
  re-exports, literal dynamic imports, renamed imports and namespace
  call/property surfaces. Parse ambiguity, non-literal imports, missing files,
  outside-root imports and unapproved package imports refuse.
- Resolves only canonical repository-relative regular files, rejects symlinks
  and case-variant duplicates, reads each admitted source twice, and compares
  exact bytes before using it.
- Applies explicit caller and hard file/edge ceilings. Any ceiling hit returns
  `DETACHED_AUTHORITY_ANALYSIS_TRUNCATED` with status `REFUSED`.
- Computes `rulesetDigest` from deterministic sorted rule data without
  ambient locale sorting.
- Preserves CLI exit algebra: `0` PASS, `1` material forbidden authority,
  `2` malformed/stale/unresolved/truncated/internal refusal.
- The exact package allow-list is empty in this slice. No package dependency is
  admitted implicitly.

## Tests

Fresh post-implementation-commit evidence:

- `node --test scripts/tests/detached-slide-authority-path.test.mjs` —
  **13/13 PASS**, exit `0`.
- `node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/bounded-closure-receipt.test.mjs` —
  **8/8 PASS**, exit `0`.
- `node --test --test-name-pattern "^4 classifier admits primitive literals" scripts/tests/ts-to-fungi-sandbox.test.mjs` —
  **1/1 PASS**, exit `0`.
- `node --check scripts/audit-detached-slide-authority-path.mjs` and the
  focused test — both exit `0`.
- `git diff --check` for the test plus `git diff --no-index --check` for the
  new detector — no whitespace findings.

The broader proportional sandbox command completed rather than hanging:

```text
node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/ts-to-fungi-sandbox.test.mjs scripts/tests/bounded-closure-receipt.test.mjs
```

It reported **43/57 PASS** and exit `1`. All 14 failures are outside the
Task 2 paths: seven refuse because the independent SLIDE repository is
unavailable, and seven refuse because the older sandbox's own canonical graph
project discovery command returns nonzero in this explicitly named worktree.
The directly used owned-process, receipt and TypeScript parser seams pass in
the isolated commands above. No unrelated sandbox control was changed.

## Graph evidence

A moderate post-commit refresh was rejected as evidence because it excluded
`scripts/` and returned the stale pre-implementation build point despite
saying `status: indexed`.

A full refresh then returned:

- project: `Galerina-detached-authority-detectors`;
- indexed head:
  `dab487d19f0c85bd458b4de6108f890d3e081203`;
- nodes: `63829`, expected nodes: `63829`;
- edges: `164237`, expected edges: `164237`.

A separate status read reported `ready`, `stale: false`, matching graph and
Git heads, and the exact worktree root. A graph probe resolved exported
`auditDetachedAuthorityPath` in
`scripts/audit-detached-slide-authority-path.mjs`.

## Review notes

- Self-review found and fixed the `forecast.ts` substring false positive
  through a new RED/GREEN regression.
- The receipt contains locators, digests, edge identifiers and freshness/result
  metadata only; fixture source bodies and absolute paths are absent.
- Every Task 1 planted class remains red-capable with its exact identifier.
  Unresolved closure and truncation remain refusals, not material findings or
  PASS.
- The implementation/test commit contains exactly:
  `scripts/audit-detached-slide-authority-path.mjs` and
  `scripts/tests/detached-slide-authority-path.test.mjs`.
- No compiler behavior, runtime behavior, conversion report, package script,
  phase-close registration, generated index, Task 3 fixture or Task 4
  composition was changed.

## Concerns

- Independent read-only review is still required for false negatives,
  false positives, truncation and receipt leakage at the exact landed build
  point. No subagent was used because the task explicitly prohibited it.
- The wider sandbox suite remains environment-red as recorded above. Those
  refusals are not hidden or reclassified as green.
- After this report commit, the external graph must be refreshed again before
  any current-HEAD freshness claim or focused audit run.
