# RD-0873 Task 8 assurance — 2026-09-08

Task 8 was rerun sequentially at the exact `main` build point:

- repository HEAD: `055396f41aa912d8b6b76eeb305749a1f3026c86`
- repository tree: `5853bd0927599c090081f21cdfdc21bb3f7bf629`
- at scan start, index: empty and working tree: clean
- local `main` is one documentation commit ahead of `origin/main`

The native first-slice check remains green: strict Fungi checking reports zero
errors and zero governance warnings, and the focused Task 7 test remains 3/3.

The bounded corpus receipts are mixed:

| profile | request digest | result | receipt |
| --- | --- | --- | --- |
| WORKSET (1 file) | `sha256:e53baad8bf6e8f5496e0f2a085dbde234743610f8f197cf49687623415cdca85` | `PASS`, complete, 1/1 | `sha256:fb0f2641b7c5e55fd6ed2de0610f1b725ccc7a380bbd2ac7259614709322fe08` |
| PROJECT (2,720 files, two shards) | `sha256:03369af56c9c6a54fc8f2b7db1102884f74537ac20d5c330c91362bf6a6977bd` | `FINDING`, complete, 2,720/2,720 | `sha256:376bc70e4fa7e8aa5c2ae345316f567f1b5147a178eff348a7af2909fb2e9d91` |

The PROJECT aggregate result digest is
`sha256:355e3b6c4255e7b091dfd225f8ae24e7fd2506341412f9b9985d0ff26cec2510`.
Shard 1 is `FINDING` with result digest
`sha256:dfcc9a91682b6aa5c001badc4357f95ac8990b951a416b98b44fd7b5fb73b9a4`;
shard 2 is `PASS` with result digest
`sha256:de154040af8e8ea78c11cc8ae545abf440ed31623120a628570177acc6ade79b`.
Both shards terminated `COMPLETE` with no unprocessed files. The v2 receipt
stores per-file result digests rather than the diagnostic code list, so this
run proves a completed repository-wide finding but does not identify the
individual mismatching files. A separate read-only diagnostic over shard 1
identified the two mismatches, both plain-mode files returning
`FUNGI-PARSE-002` (`Expected "flow" after "governed floor_2"`):

- `packages-ts/galerina-core-security/src/dss/dss-supervisor.fungi`
- `packages-ts/galerina-core-security/src/dss/trap-handler.fungi`

The two strict negative fixtures in that shard returned their expected owned
diagnostics (`FUNGI-GOV-024` and `FUNGI-SUBSTRATE-001`); they are not the cause
of the aggregate finding. The two plain files were reproduced sequentially at
the current documentation-only `main` head with exit code 1 for each.

Task 8 therefore remains **HOLD**. Task 9 custody/integration review and any
RD-0873 completion merge are blocked until the PROJECT finding is independently
explained or cleared at the same exact build point. No branch or worktree was
created, retired, or rewritten, and no `.fungi` authoring was opened.

Because the PROJECT receipt is non-green, the later Task 8 closure gates
(complete package estate, Myco/Hypha, graph/index/registry fixed points,
independent exact-revision review and chapter-close review) are not represented
as green evidence and were not used to manufacture closure.

Evidence was retained under the ignored `build/fungi-corpus-check/evidence/`
directory and is not treated as a source artifact.
