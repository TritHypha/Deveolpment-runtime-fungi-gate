# RD-0873 Task 8 assurance — 2026-09-08 (evidence build point)

Task 8 was rerun after rebuilding the ignored local compiler output. The source
parser already contained the governed-secure change, but the prior scan used a
stale `packages-ts/galerina-core-compiler/dist/` tree. The current evidence is
bound to the exact `main` build point:

- repository HEAD: `0fdc57d70ea551d03c6e8eb0833dd0de3fc8a3cf`
- repository tree: `5f6cce9fafb67c948c4c956e72af6a899ac68749`
- compiler digest: `sha256:fbefa5b23c2b11d359f7a07c461a102fc47d70283b406b3a005d9cf575d300bf`
- index: empty and working tree: clean at scan start
- local `main` is one documentation commit ahead of `origin/main`; no push was made

The compiler was rebuilt locally with its typecheck and build scripts. The
ignored `dist/` output is not a source or release artifact. Both files isolated
by the earlier stale-output diagnostic now pass plain checking with zero errors
and zero governance warnings (advisories remain non-blocking in plain mode).

The fresh bounded corpus receipts are green:

| profile | request digest | result | aggregate receipt | envelope |
| --- | --- | --- | --- | --- |
| WORKSET (1 file) | `sha256:0c6339952c048d103eb09847fc8d9222bbd6fd023b041b0e53e45870387a5667` | `PASS`, complete, 1/1 | `sha256:80bc379e50b13685543ed9a4ae62c86e5e76c95345ff0668dfe3fd0966a0d074` | `sha256:104248e5922f645c71be1f096318f19932980ba8d1cc01e181dda9c9c547acb8` |
| PROJECT (2,720 files, four shards) | `sha256:076e599eddbc371d90d5af009b112775e84373266344072a2ac01a7df2f6e679` | `PASS`, complete, 2,720/2,720 | aggregate result `sha256:14c287db00f4d9672893f5c4140d3c3de52b9d16749e0bf7100c546d8ebbdb53` | `sha256:3c680b5a72e71a6c8edd3cf071d6781aa68784d59e2afd51e4eae2b3fb489daf` |

The four PROJECT shard receipts are, in order:

- `sha256:16b1bec74ee8da5ff3a9468b2c22c94dbf70758358bf570d005af824ab14f49e`
- `sha256:4dc59c3fb41eb75e70bd8480c2f1a3920c5d5878698a3e8f6dec2b8278a426cd`
- `sha256:f74d3eda225942cc6118aacf53b672cef1792278f390a2af7131e839fb618fcf`
- `sha256:253ed062e6d3472d942792628d9dd33010b735fa631f443e0c0633bf09ace2a9`

Focused verification at this same source state is green: the native slice tests
are 3/3, local source-origin tests are 46/46, core-security tests are 28/28,
checked-flow and line-ending controls are 13/13, and the CRLF audit fixture is
3/3. These results do not erase the broader holds. The scalar-oracle suite is
17/25 with eight compiler-build diagnostic failures; the broader source-origin
frame remains non-green with Git-executable and missing pinned-toolchain
failures; the canonical AGENTS bounded-execution audit reports 714 findings;
and memory preflight remains HOLD because two top-level memory files are
unindexed and the Galerina working-set owner is missing.

Task 8 therefore remains **HOLD**. The complete package-estate, Myco/Hypha,
graph/index/registry fixed-point, independent exact-revision, and chapter-close
gates are not all represented by fresh green evidence. Task 9 custody/integration
review and the RD-0873 completion merge remain closed until those gates are
independently rerun and pass at one exact integrated build point. No branch or
worktree was created, retired, or rewritten, and no `.fungi` authoring was
opened.

Evidence is retained under the ignored
`build/fungi-corpus-check/evidence/` directory and is not treated as a source
artifact.
