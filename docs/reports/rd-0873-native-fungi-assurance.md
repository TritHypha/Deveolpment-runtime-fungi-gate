# RD-0873 Task 8 assurance — current checkpoint 2026-09-09

The assurance work is on committed `main` at the following storage point:

- repository HEAD: `fd0d75cd9c44109f7771c2189c05f21ff732651b`
- repository tree: `5d753d2c4d4f7e9c527743cdb5d7f61e1cb42177`
- working tree: clean; no push was made

The bounded checks completed at this point are green: developer-tool tests
46/46, package-lock integration 1/1, gate self-tests 6/6, artifact-drift
self-tests 38/38, Golden Pack 11/11 checked plus 11/11 execution vectors, and
private-document leak 0. The silent-overwrite audit completed with exit 0 and
reported three heuristic review candidates; it is advisory evidence, not a
proof of a defect. The final exact-head PROJECT receipt and the governed
phase-close rerun are still pending, so Task 8 remains **HOLD**. Task 9
custody/integration and bulk `.fungi` authoring remain closed until those gates
pass at one exact build point. No branch or worktree was created or changed.

The remainder of this file is the retained evidence ledger from earlier
build points. Its historical digests are not current-head evidence.

# RD-0873 Task 8 assurance — 2026-09-09 (historical evidence build point)

Task 8 was rerun after rebuilding the ignored local compiler output and
refreshing the declared graph, registry, roadmap and conversion-queue outputs.
The current PROJECT evidence is bound to this exact committed `main` build
point:

- repository HEAD: `2bccf496460dc7757f2828c2bafda07eea7e4ebd`
- repository tree: `62f6cf01e2014a03c231197e9121aa15d1e1912d`
- compiler digest: `sha256:3c7325f3d5a4f88405a181cb5e2031b61d41d2bee8dd144784846404e26b591b`
- PROJECT evidence request digest: `sha256:13593cdc1226a43238a553e4349719929927bd14d401954375f47ebc8b23d5bf`
- PROJECT evidence envelope: `sha256:12637c61de97ac28f12f24ccb125ce997fbb10ac027f92dcb4d5049bcecd8642`
- PROJECT aggregate result: `sha256:fa9cb60e8914aef6614823df38dc1eeb7e1ae2a6c5b5dabff03b7b5d48b6f2d7`
- the evidence is retained under the ignored `build/fungi-corpus-check/evidence/`
  directory; no push was made

The compiler was rebuilt locally with its typecheck and build scripts. The
ignored `dist/` output is not a source or release artifact. Both files isolated
by the earlier stale-output diagnostic now pass plain checking with zero errors
and zero governance warnings (advisories remain non-blocking in plain mode).

The fresh bounded corpus receipts are green:

| profile | request digest | result | aggregate receipt | envelope |
| --- | --- | --- | --- | --- |
| WORKSET (1 file) | `sha256:11ca02e162cd2e6e666950f84d41aa7980ac556aec2969515ae9e5782d17413d` | `PASS`, complete, 1/1 | `sha256:ab9b24bb0a39a46b92b399d979874036d65a7eef333c3150ecae89002b635686` | `sha256:5e8c78813c7b1f2d372d3e8f04f49edcffb90f2b2b62f970c7127e8d41bad47d` |
| PROJECT (2,720 files, four shards) | `sha256:13593cdc1226a43238a553e4349719929927bd14d401954375f47ebc8b23d5bf` | `PASS`, complete, 2,720/2,720 | aggregate result `sha256:fa9cb60e8914aef6614823df38dc1eeb7e1ae2a6c5b5dabff03b7b5d48b6f2d7` | `sha256:12637c61de97ac28f12f24ccb125ce997fbb10ac027f92dcb4d5049bcecd8642` |

The four PROJECT shard receipts are, in order:

- `sha256:d737391f3fcf72cc81c0b40476d596f65b420dbf27461dceafbe7ccdacfa88fb`
- `sha256:18a04e2e13fb3cc3c6473cd30c59d71725caf6e55d57ee64d2bddd5693a26c8a`
- `sha256:40c909148af2687704aea69df9654666096165043318bd564c174ffa8bb09f87`
- `sha256:16a59868cf56bcabaeade416eefcb6dba78c5c5f402f8dada9af7434558eadc8`

Focused verification at this same source state is green: the native slice tests
are 3/3, local source-origin tests are 46/46, core-security tests are 28/28,
checked-flow and line-ending controls are 13/13, and the CRLF audit fixture is
3/3. The graph fixed-point route is green at 10/10, the generator-contract
cadence is 20/20, and the current-head conversion queue check passes when bound
to the approved pinned `mingit-2.55.0.2` executable. These results do not erase
the broader holds. The diagnostic collision gate reports a C1 reuse of
`FUNGI-PARSE-002`; example diagnostics has one new regression in
`368-contract-ai-flow` (it declares `none` but emits
`FUNGI-HINT-COMPUTE-001`, `FUNGI-VALUESTATE-008` and `FUNGI-TIER-001`); the
scalar-oracle suite is 17/25 with eight compiler-build diagnostic failures; the
broader source-origin frame remains non-green with Git-executable and missing
pinned-toolchain failures; the canonical AGENTS bounded-execution audit reports
714 findings; and memory preflight remains HOLD because two top-level memory
files are unindexed and the Galerina working-set owner is missing.

The final governed phase-close attempt passed the graph, queue, generator,
provenance and roadmap controls before reaching the corpus child, but it was
stopped after a bounded observation because the Windows corpus workers did not
produce a terminal result. The phase-close attempt also recorded the
diagnostic-collision and example-diagnostics failures above. Task 8 therefore
remains **HOLD**. The complete package-estate, Myco/Hypha, independent
exact-revision, scalar-oracle, source-origin and custody gates are not all
represented by fresh green evidence. Task 9 custody/integration review and the
RD-0873 completion merge remain closed until those gates are independently
rerun and pass at one exact integrated build point. No branch or worktree was
created, retired, or rewritten, and no `.fungi` authoring was opened.

Evidence is retained under the ignored
`build/fungi-corpus-check/evidence/` directory and is not treated as a source
artifact. This documentation and generated-output commit is later than the
recorded evidence build point, so any integration decision requires a fresh
exact-head rerun; the receipts do not authorize a merge.

The earlier read-only graph refusal was resolved through the declared ownership
and fixed-point route. The source-origin parser entry now has an exact
reason-bearing `allowOrphans` declaration for its dedicated observation
toolchain, all declared graph/index/roadmap writers were refreshed, and the
aggregate `node scripts/graph-all.mjs --check --json --quiet` passes all ten
children when the real sibling KB owner is explicitly bound. No generated
writer reported drift, and no external KB bytes were modified.
