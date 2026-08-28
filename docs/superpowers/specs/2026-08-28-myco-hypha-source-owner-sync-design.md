# Myco and Hypha Source-Owner Synchronization Design

## Status

Owner-approved design. Implementation remains non-authorizing until exact-revision review passes.

## Goal

Keep one Git/worktree controller in AGENTS while synchronizing the public Myco and Hypha source
owners with Galerina's repository-local development packages. Preserve Galerina's hermetic build,
local extensions, provenance, and fail-closed evidence boundaries.

## Responsibility split

| Surface | Owner | Responsibility |
|---|---|---|
| Git branch and worktree capture | AGENTS | Enumerate admitted registered worktrees; bind branch/detached state, HEAD, lock and dirty digest; revalidate before reporting. |
| Indexed lexical search | Public Myco | Search one supplied root using its bounded persistent graph. It does not enumerate or select Git branches. |
| Persistent capability facts | Public Hypha | Build/query the reusable fact database, or run one in-memory query. It does not enumerate or select Git branches. |
| Galerina lexical tooling | `packages-ts/galerina-tools-myco` | Keep a pinned partial fork with Galerina-only link scanning and repository-local tests. |
| Galerina passive capability checks | `packages-ts/galerina-devtools-hypha` | Keep database-free CI checks, Galerina-specific query semantics and a mechanically transformed upstream extractor. |

## Binding decisions

- Do not copy AGENTS Git orchestration into Myco or Hypha.
- Do not make AGENTS a Galerina runtime, build or package dependency.
- Do not remove either Galerina package.
- Public Myco owns shared Myco code.
- Public Hypha owns the shared extractor source.
- Galerina-only Myco link scanning remains local unless separately approved for public Myco.
- Galerina Hypha's `name-set-drift` query remains local.
- Every sibling-source lookup must work from a normal checkout and a linked worktree.
- An unavailable or ambiguous source owner refuses; it never guesses or silently skips.
- `.myco/index.json` is protected and outside this change.
- No `.fungi` or `.gate` file is created or modified.

## Current evidence

- AGENTS composes Git custody with sibling Myco/Hypha engines and invokes one admitted worktree at a time.
- Public Myco is at `c4ff2ca3c53e8c8cb8b5f6a7a589a096d85a1fd6` on its hardening branch.
- Galerina Myco still declares upstream snapshot `a48d2c3b5c508ce35346a4dd7aac0278606d10f6`.
- Public Myco changed nine shared source paths after that snapshot; three also carry Galerina-local changes and require three-way reconciliation.
- Public Hypha's current `src/extract.js` digest differs from Galerina Hypha's recorded provenance digest.
- Both Galerina sibling-source scripts currently derive the sibling path from checkout depth; that route is wrong inside `.worktrees/<name>`.

## Source resolution contract

The source-owner scripts consume either:

1. an explicit `--upstream <repository>` path; or
2. a default derived from Git's common directory for the current repository.

The derived default must:

- call Git with a finite timeout and bounded output;
- require an absolute common-directory result;
- resolve the primary repository from the common directory rather than the linked-worktree path;
- derive the sibling repository from the primary repository's parent;
- require the expected bounded regular source or Git repository before use;
- return a bounded refusal without exposing an absolute path in public output.

## Myco synchronization contract

- Safe upstream-only paths are refreshed byte-for-byte from the admitted public commit.
- `src/graph/model.ts`, `src/graph/store.ts` and `src/ingest/indexer.ts` are reconciled three-way.
- Galerina-local `src/cli.ts`, `src/query/path-filter.ts` and `src/query/links.ts` behavior is preserved.
- Package version and lock data are aligned to public Myco `0.2.2` where the private fork contract permits.
- `galerinaVendor` records the exact admitted upstream commit and a freshly reproduced classification.
- The public-source audit must reproduce the declaration from both the primary checkout and the linked worktree.

## Hypha synchronization contract

- `src/extract.mjs` and `src/provenance.json` are generated only by `vendor-extractor.mjs`.
- The generator accepts an explicit upstream repository and has a Git-common-directory default.
- The transform remains deterministic and excludes persistence-only freshness helpers.
- `vendor:check`, self-test and package tests pass from the linked worktree.
- The passive scanner writes nothing unless the caller supplies `--out`.

## Verification

- Public Myco: build and complete package tests.
- Public Hypha: complete self-test/package tests.
- Galerina Myco: public-source RED/GREEN, build, typecheck and complete package tests.
- Galerina Hypha: vendor RED/GREEN, vendor check, self-test and complete package tests.
- Galerina: affected package graph, package-root/tooling governance and bounded phase checks.
- AGENTS: live Myco and Hypha worktree-controller probes against the synchronized public engines.
- Exact candidate: fresh graph, independent LF/physical-CRLF review, no Critical or Important findings.

## Integration

- Public Myco's verified hardening branch is merged into its `main` only after fresh remote comparison and review.
- Public Hypha remains on `master` unless a separate branch rename is approved.
- Galerina's synchronization branch merges back into `codex/rd-0858-unit4-process-root` after exact review.
- Topic branches are removed only after ancestor/recoverability proof and successful merged-state verification.
