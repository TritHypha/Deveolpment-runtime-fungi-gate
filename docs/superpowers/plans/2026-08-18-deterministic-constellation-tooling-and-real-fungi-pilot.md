# Deterministic Constellation Tooling and Real Fungi Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Use
> `superpowers:test-driven-development` for every behaviour change and
> `superpowers:verification-before-completion` before each commit. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repeated manual Galerina/SLIDE/VOK/Lyth checks with bounded,
red-capable tools; publish deterministic checked-AST reference documentation;
audit the already committed real-package TypeScript-to-Fungi work; and run one
ten-source real-package pilot only after the detached scalar chain and every
new gate are green.

**Architecture:** The existing detached scalar branch remains the semantic and
physical foundation: Galerina owns source, checked snapshots and canonical GIR;
SLIDE owns physical `.slide`; VOK owns exact-subject admission; Lyth provides
non-authorizing proof work. New tools exchange only versioned status envelopes
and digest-bound locators. The graph remains a reconstructible index, never an
artifact store or authority source. The converter remains a candidate generator
and retains every `.ts` file. `@galerina/docs` consumes the canonical checked
AST, not the regex navigation graph. No tool commits, pushes, deletes source,
switches a consumer or grants production authority.

**Tech Stack:** Node.js ESM; strict TypeScript; `node:test`; canonical Galerina
parser/checkers; existing TypeScript-to-Fungi sandbox; codebase-memory CLI/MCP;
SHA-256; deterministic JSON/Markdown/static HTML; SLIDE/VOK focused commands;
Lyth TypeScript KATs.

**Spec:**
`docs/superpowers/specs/2026-08-18-deterministic-constellation-tooling-and-reference-design.md`

## Global constraints

- Work in the isolated `codex/detached-scalar-phase1` worktree. Do not alter,
  stage or commit the dirty `codex/rd-0792-synthesize-only` checkout.
- Do not add files under
  `packages-galerina/galerina-test/src/self-hosted/conversion-overlays/`.
- Treat the four committed real-package conversion batches from `5103e1a2`,
  `9e138d11`, `f2eb8dcb` and `4a730a53` as inputs to audit, not templates to
  multiply blindly.
- Treat the detached scalar implementation commits `18199d3a`, `439d69e5`,
  `5541fb05` and `27899111` as the implementation base.
- The graph project for this worktree is
  `Galerina-detached-scalar-phase1-20260818`; its build point must equal the
  exact current commit before graph-derived evidence is authoritative.
- Every new command has a pure core, paired must-pass/must-fail self-tests,
  deterministic versioned JSON, atomic publication and exit codes 0/1/2 for
  `ALLOW`, policy `HOLD`/`REFUSED`, and malformed/error/detector failure.
- A source body, secret, private skill text or absolute local path must never
  enter an index or durable run card.
- TypeScript remains present and byte-identical. No source retirement or
  consumer switch is in scope.
- A report-bearing conversion commit requires at least 40 new real-package
  `.fungi` files, expects 50, changes at most one report and refuses a second
  consecutive report-only commit. The final tail exception stays explicit and
  owner-gated.
- The ten-source pilot is evidence only. Its candidates stay outside the test
  package and outside production loaded assets until their exact chain passes.
- **Hard ordering gate:** complete and freshly verify every non-Fungi
  prerequisite in Tasks 1-8 and Task 10, plus the final self-review, before
  Task 9 may create even a `build/` pilot candidate. Execution order is
  therefore Tasks 1-8, Task 10, final self-review, then Task 9. Until that gate
  is green, tracked and untracked project `.fungi` authoring is prohibited;
  analyzer fixtures already present in the repository may only be read.
- Never push. Stage explicit paths only.

---

## Task 1: Freeze the current real-project conversion baseline

**Files:**
- Create: `scripts/audit-real-fungi-conversion-baseline.mjs`
- Create: `scripts/tests/audit-real-fungi-conversion-baseline.test.mjs`
- Create: `scripts/lib/ts-fungi-drift/core.mjs`
- Create: `scripts/audit-ts-fungi-drift.mjs`
- Create: `scripts/tests/audit-ts-fungi-drift.test.mjs`
- Create: `docs/reports/real-fungi-conversion-baseline-2026-08-18.json`
- Modify: `package.json`

- [x] Write a failing fixture containing one test-overlay output, one missing
  TypeScript owner, one changed source digest and one normalized shadow.
- [x] Require the audit to enumerate committed non-test `.fungi`, identify the
  introducing commit, recover source-binding metadata, verify the retained
  `.ts`, and classify each file as `BOUND`, `UNBOUND`, `STALE` or `SHADOWED`.
- [x] Explicitly exclude the 2,200 conversion overlays from real conversion
  credit while reporting their count and tracked Git range as fixture debt.
- [x] Implement exact-byte and normalized whole-corpus duplicate detection over
  tracked and untracked `.fungi`, with case-sensitive and case-folded paths.
- [x] Emit a compact body-free JSON ledger using repository-relative locators.
- [x] Add a dedicated TypeScript-to-Fungi drift audit. For legacy candidates,
  reconstruct the source build point from the candidate's introducing commit
  and label that provenance `RECONSTRUCTED`; for new run-card candidates,
  require exact recorded source, symbol, candidate, checked snapshot, GIR,
  physical package, profile and VOK receipt digests.
- [x] Distinguish `NO_DRIFT`, `SOURCE_BYTE_DRIFT`, `SYMBOL_DRIFT`,
  `CANDIDATE_BYTE_DRIFT`, `CHAIN_DRIFT`, `UNBOUND` and `ERROR`. Never claim
  semantic equivalence merely because bytes or one returned constant match.
- [x] Add red controls for changed TypeScript bytes, deleted/renamed symbols,
  changed candidate bytes and each exact chain digest, plus a green unchanged
  legacy pair and a fully bound run-card pair.
- [x] Add `audit:real-fungi-conversion-baseline` to `package.json`.
- [x] Add `audit:ts-fungi-drift` to `package.json`.
- [x] Run:
  `node --test scripts/tests/audit-real-fungi-conversion-baseline.test.mjs`
- [x] Run:
  `npm run audit:real-fungi-conversion-baseline`
- [x] Run:
  `node --test scripts/tests/audit-ts-fungi-drift.test.mjs`
- [x] Verify the ledger accounts for all four real-package conversion commits
  without conferring retirement, switch or production authority.

Evidence (2026-08-18): the paired suites pass 10/10. The live body-free
baseline accounts for 2,971 `.fungi`: 771 real-package files and 2,200 excluded
test overlays introduced by 55 commits with zero conversion credit. Exactly 198
files are converter candidates, matching the four real conversion commits as
50 + 50 + 50 + 48. Their candidate bytes and targeted symbol fingerprints are
unchanged, but every owning TypeScript file has later byte changes, so the
drift audit truthfully reports 198 `SOURCE_BYTE_DRIFT`, zero `SYMBOL_DRIFT`,
zero `CANDIDATE_BYTE_DRIFT`, and no semantic-equivalence claim. The baseline
also records 32 normalized shadows among native/non-conversion Fungi, which
remain a HOLD for later corpus disposition rather than conversion credit.

## Task 2: Add the shared graph-project identity resolver

**Files:**
- Create: `scripts/lib/graph-project-identity/contracts.mjs`
- Create: `scripts/lib/graph-project-identity/core.mjs`
- Create: `scripts/lib/graph-project-identity/adapters.mjs`
- Create: `scripts/lib/graph-project-identity/index.mjs`
- Create: `scripts/tests/graph-project-identity.test.mjs`
- Modify: `scripts/lib/ts-to-fungi-sandbox/identity.mjs`

- [x] Write failing tests for logical aliases `galerina`, `slide`, `vok` and
  `lyth`, plus wrong case, wrong root, stale HEAD, unavailable owner, ambiguous
  owner and missing bounded-symbol controls.
- [x] Define a frozen alias table and a small identity envelope containing only
  logical key, declared project, component scope, repo-relative root identity,
  Git HEAD, indexed HEAD, freshness and the bounded symbol locator.
- [x] Implement pure resolution over injected Git/graph observations; never
  derive project identity from a case-folded worktree path.
- [x] Add process adapters for exact Git and codebase-memory CLI envelopes with
  bounded output and typed failures.
- [x] Wire the sandbox identity path to the resolver while preserving explicit
  verified `--project` overrides.
- [x] Prove the old path-shaped-project failure is red and the declared logical
  identity is green for the isolated worktree.
- [x] Run:
  `node --test scripts/tests/graph-project-identity.test.mjs scripts/tests/ts-to-fungi-sandbox.test.mjs`

Evidence (2026-08-18): the pure resolver suite passes 6/6 and the combined
converter suite passes 42/42 against the exact registered worktree project
`Galerina-detached-scalar-phase1-20260818-64db2bbd` at indexed/source HEAD
`64db2bbd44b535e2248dbeadaeb42185405779e8`. A deliberately path-shaped
project guess refuses, while an explicit verified project override remains
root-, case-, build-point-, node-kind- and bounded-symbol-checked. A refresh of
the earlier project name reported `status: indexed` but retained build point
`213c81a0`; the gate treated that as stale and created a new exact owner rather
than accepting the false-green status. Identity envelopes retain locators and
freshness only; they do not copy source bodies or merge cross-owner edges.

## Task 3: Add the constellation preflight

**Files:**
- Create: `scripts/lib/constellation-preflight/contracts.mjs`
- Create: `scripts/lib/constellation-preflight/core.mjs`
- Create: `scripts/lib/constellation-preflight/adapters.mjs`
- Create: `scripts/constellation-preflight.mjs`
- Create: `scripts/tests/constellation-preflight.test.mjs`
- Modify: `package.json`

- [x] Start with ALLOW, required-owner HOLD, stale graph, unavailable owner,
  malformed envelope and injected failing-child fixtures.
- [x] Model Galerina, SLIDE, VOK component and Lyth as separate owner envelopes;
  never invent a merged cross-owner graph edge.
- [x] Check exact repository/index heads, bounded symbols, installed private
  skill identity without bodies, converter/collision tools, detached scalar
  chain commands, output-root writability and Lyth registered command.
- [x] Aggregate by least authority and prove one child denial changes the
  overall verdict.
- [x] Write the selected JSON report atomically and refuse when publication
  cannot complete.
- [x] Add `preflight:detached-scalar` and `preflight:detached-scalar:self-test`.
- [x] Run:
  `node --test scripts/tests/constellation-preflight.test.mjs`
- [x] Run the real preflight and retain any stale/unavailable owner as `HOLD`,
  not a synthetic green result.

Evidence (2026-08-18): the identity and preflight suites pass 11/11; the
built-in self-test proves one aggregate `ALLOW` and one controlled child
`REFUSED`. The real body-free run returns `HOLD`, as required: SLIDE, the VOK
component and Lyth resolve to exact fresh clean graph owners, both private
Fungi skills are represented only by installed SHA-256 identity, and every
Galerina/SLIDE/VOK locator check is available. The Galerina worktree is
truthfully dirty during implementation and Lyth does not yet register
`verify:detached-scalar`, so neither condition is upgraded to success. Atomic
publication is byte-deterministic and a directory-as-target control refuses
without leaving a temporary report.

## Task 4: Register Lyth detached-scalar KATs and repair the Windows graph CLI

**Files:**
- Modify: `../lyth-weaver/package.json`
- Create: `../lyth-weaver/tools/verify-detached-scalar.ts`
- Create: `../lyth-weaver/tools/verify-detached-scalar.test.ts`
- Modify: `../AGENTS/skills/codex-querying-galerina-graphs/scripts/probe.mjs`
- Modify: `../AGENTS/skills/codex-querying-galerina-graphs/scripts/probe.test.mjs`
- Modify: `../AGENTS/skills/codex-querying-galerina-graphs/README.md`

- [x] In Lyth, write a failing harness that proves each adapter/schema/domain
  child failure stops the fixed-order command and yields a compact summary.
- [x] Implement `npm run verify:detached-scalar` without adding an `ALLOW`
  result or production authority.
- [x] In the graph skill, write an exact Windows path/file-URL invocation test
  that currently fails entry-point detection.
- [x] Normalize file URLs and Windows/POSIX paths without changing the exported
  probe API or case-sensitive repository identity rules.
- [x] Run the Lyth focused tests and registered command.
- [x] Run the graph-skill gold fixtures, duplicate/shadow checks and Windows CLI
  invocation fixture.
- [x] Commit each repository independently with explicit paths when it has a
  Git owner; never push. Record a non-repository canonical installation as
  verified-in-place rather than inventing commit custody.

Evidence (2026-08-18): Lyth passes its 3/3 self-test, typecheck and registered
fixed-order KAT command, returning `EVIDENCE_READY` while retaining
`authorityReleased: false`; it is committed locally at `e5c664e8` and not
pushed. The graph skill passes 22/22 unit checks, 12/12 gold cases, installed
skill isolation and a real Windows CLI invocation. Its canonical AGENTS tree
has no `.git` owner, so the verified-in-place repair cannot truthfully be
marked committed without separate repository authority.

## Task 5: Add the conversion gate and atomic run card

**Files:**
- Create: `scripts/lib/fungi-conversion-gate/contracts.mjs`
- Create: `scripts/lib/fungi-conversion-gate/core.mjs`
- Create: `scripts/lib/fungi-conversion-gate/adapters.mjs`
- Create: `scripts/fungi-conversion-gate.mjs`
- Create: `scripts/tests/fungi-conversion-gate.test.mjs`
- Create: `docs/runbooks/fungi-conversion-gate.md`
- Modify: `package.json`

- [x] Write failing tests for one-to-ten bounds, absolute/escaping/symlink/test-
  overlay outputs, dirty/untracked source, stale digest, duplicate identities,
  exact and normalized corpus shadows, retained `.ts`, 39/40/50 files, two
  reports, second report-only commit and final-tail exception.
- [x] Add chain-tamper fixtures at source, candidate, checked snapshot, GIR,
  physical package, profile and VOK receipt.
- [x] Export one gate roster covering preflight, identity, classifier,
  compiler, duplicate/shadow, path, retained source, snapshot/GIR, SLIDE/VOK,
  Lyth and commit policy.
- [x] Require a controlled failing-child fixture before grading a real run.
- [x] Produce one canonical body-free run card with `CONVERTED`, `BLOCKED` or
  `MANUAL_REVIEW` per request and `ALLOW`, `HOLD`, `REFUSED` or `ERROR` overall.
- [x] Bind the card to exact digests and explicitly state no switch, retirement,
  commit, push or production grant occurred.
- [x] Write atomically and fail with exit 2 on report-write or detector failure.
- [x] Run:
  `node --test scripts/tests/fungi-conversion-gate.test.mjs`
- [x] Run:
  `node scripts/fungi-conversion-gate.mjs --self-test`

Evidence (2026-08-18): the gate suite passes 18/18, including a real temporary
Git source-custody check, Windows junction refusal, atomic no-overwrite,
39/40/50 commit thresholds, report toggle, every chain-stage tamper and a
dependency-injected full converted chain. The converter suite separately
passes 36/36 with compact checked-snapshot, profile and VOK receipt digests.
The registered CLI self-test returns the required green/red pair. No project
`.fungi` file is published by this task.

## Task 5a: Add one deterministic construct-analysis engine

**Files:**
- Create: `scripts/lib/fungi-logic-analysis/`
- Create: `scripts/fungi-logic-analysis.mjs`
- Create: `scripts/tests/fungi-logic-analysis.test.mjs`
- Create: `docs/runbooks/fungi-logic-analysis.md`
- Modify: `package.json`

- [x] Build one shared parser/checker-backed engine with focused subcommands
  for `if`, `match`, `check`, `contract`, `flow`, `global`, `vault` and
  `hallmark`; do not create eight unrelated process stacks.
- [x] Derive the construct registry from canonical parser/AST/checker symbols
  and distinguish language constructs from package-specific vault services.
- [x] Emit compact body-free `SUPPORTED`, `BLOCKED` or `MANUAL_REVIEW`
  envelopes with source digest, AST kind, effects, obligations and blocker
  codes; never ask an AI to reclassify a known construct.
- [x] Cache only digest-bound analysis facts and invalidate them on source,
  compiler, profile or graph build-point drift.
- [x] Add red controls for malformed syntax, effectful conditions, incomplete
  matches, failed checks, missing contract evidence, vault capability leakage,
  hallmark misuse and stale cache identities.
- [x] Let the conversion gate consume these envelopes and short-circuit before
  candidate compilation or physical proof when a construct is blocked.
- [x] Register one command with subcommands, one self-test and one runbook.

**Implemented evidence (2026-08-18):** one engine now owns the exact ordered
registry `if | match | check | contract | flow | global | vault | hallmark`.
The analyzer binds source bytes, the complete executable compiler output tree,
the selected profile, analyzer version and graph build point; every envelope
is body-free and denies candidate compilation, physical proof, consumer
switch, TypeScript retirement and production authority. Canonical parser,
type, effect and governance diagnostics participate in each ruling. The
`global` view records the current parser's `FUNGI-VAULT-008` refusal for
`vault global` and `vault session` rather than inventing a construct.

Focused evidence is 14/14 analyzer tests, 18/18 conversion-gate tests and
37/37 TypeScript-to-Fungi sandbox tests against graph project
`Galerina-detached-scalar-phase1-20260818-348b170d`. The registered CLI
self-test returned `SUPPORTED`/`BLOCKED`, and a live scan of tracked real
project source `packages-galerina/galerina-api-protocol-rest/src/index.fungi`
returned `SUPPORTED` with five flows and five contracts. The scan only wrote
an atomic no-overwrite record beneath `build/`; no tracked `.fungi`, test
overlay, consumer or authority surface changed.

## Task 6: Add the checked-AST reference manifest to `@galerina/docs`

**Files:**
- Create: `packages-galerina/galerina-docs/src/reference-types.ts`
- Create: `packages-galerina/galerina-docs/src/reference-manifest.ts`
- Create: `packages-galerina/galerina-docs/tests/reference-manifest.test.mjs`
- Modify: `packages-galerina/galerina-docs/src/index.ts`
- Modify: `packages-galerina/galerina-docs/package.json`

- [x] Create failing in-memory checked-AST KATs for exported flows, types,
  records, enums, guards, statics and bitfields, reusing tracked `.fungi`
  sources where suitable and creating no new `.fungi` fixtures.
- [x] Add controls for duplicate qualified names, case-only collisions, broken
  type links, unsupported public AST nodes and changed public signatures.
- [x] Define versioned `GalerinaReferenceManifest` records containing exact
  public signature facts, effects, qualifiers, contracts/governance metadata,
  repo-relative byte locators, digest, build point and owning package.
- [x] Generate only from canonical parser/checker output. Do not import the
  regex project graph as declaration authority.
- [x] Prove every supported top-level declaration appears once, nested local
  functions appear zero times, unsupported exported AST nodes refuse and an
  invented private top-level spelling is rejected by the canonical parser.
- [x] Prove repeated generation is byte-identical and a one-byte signature
  mutation invalidates the prior manifest.
- [x] Run package typecheck and focused tests.

Evidence (2026-08-18): the manifest KATs pass 6/6 and the complete docs package
passes 38/38 after typecheck/build. The generator consumes canonical
parser/checker output, emits one body-free entry per supported public top-level
declaration, omits nested local `fn` declarations and refuses duplicate names,
case-only collisions, broken links, unsupported nodes and invented private
top-level syntax. Repeated manifests are byte-identical and a signature-byte
change changes the manifest digest. No `.fungi` fixture was created.

Task-6 boundary correction (2026-08-18): the canonical parser and module
registry expose every valid top-level flow/type/record/enum/guard/static/
bitfield declaration; the language has no private top-level spelling. Private
functions are nested local `fn` declarations. The implementation therefore
must not invent private syntax or create `.fungi` fixtures before Task 9. It
uses parser/checker-backed in-memory KATs, proves nested locals are omitted and
keeps invalid private syntax as a parser-refusal control.

## Task 7: Add deterministic Markdown and static HTML reference views

**Files:**
- Create: `packages-galerina/galerina-docs/src/reference-renderers.ts`
- Create: `packages-galerina/galerina-docs/src/reference-cli.ts`
- Create: `packages-galerina/galerina-docs/tests/reference-renderers.test.mjs`
- Modify: `packages-galerina/galerina-docs/src/index.ts`
- Modify: `packages-galerina/galerina-docs/README.md`
- Modify: `packages-galerina/galerina-docs/package.json`

- [x] Write failing fixtures for unstable order, absolute path leakage, private
  marker leakage, broken exact-case links, output collision and stale output.
- [x] Derive `reference.json`, root/package Markdown and static `index.html`
  solely from the admitted manifest.
- [x] Stable-sort by package/module/qualified name with code-unit ordering.
- [x] Refuse hand-edited or stale generated files and write the output tree
  atomically.
- [x] Keep optional graph caller links labelled with graph build point and
  `ASSERTED`/`INFERRED`; omit them when stale without blocking AST docs.
- [x] Add `docs:reference` and `docs:reference:check` package commands.
- [x] Run generation twice and compare every output byte.

Evidence (2026-08-18): the renderer KATs pass 5/5. JSON, Markdown and static
HTML are derived only from the admitted manifest, code-unit sorted and written
through atomic no-overwrite publication. Exact-case links, stale/extra output,
absolute paths, private markers and collisions refuse. Optional caller edges
carry their graph build point and `ASSERTED`/`INFERRED` provenance and disappear
when stale. Two runs are byte-identical.

## Task 8: Register tools and run the complete verification matrix

**Files:**
- Modify: `governance/phase-close-commands.json`
- Modify: `package.json`
- Regenerate: `build/dev-tool-index/`
- Modify: `docs/TODO.md`
- Modify: `docs/superpowers/plans/2026-08-18-deterministic-constellation-tooling-and-real-fungi-pilot.md`

- [x] Register the baseline audit, identity self-test, preflight, conversion
  gate and reference checker through their owning registries.
- [x] Let `scripts/dev-tool-index.mjs` discover root scripts from their
  registered commands and headers; this repository has no hand-maintained
  `scripts/dev-tool-registry.json` and one must not be invented.
- [x] Regenerate, never hand-edit, the dev-tool index.
- [x] Run all new focused tests and each planted-red control.
- [x] Run package typechecks for compiler and docs.
- [x] Run detached scalar Galerina/SLIDE/VOK focused integration and Lyth KATs.
- [x] Run the normal tool-index publisher/check and affected phase-close group.
- [x] Confirm every generated JSON contains no absolute local paths or source
  bodies and every required owner envelope has an exact build point.
- [x] Re-index the exact final Galerina commit under its declared project and
  verify node counts, expected counts, indexed HEAD and a new symbol probe.

Evidence (2026-08-18, before final commit): all directly affected phase-close
entries pass, including the analyzer self-test, conversion gate self-test,
baseline freshness check, conversion-report and slice-close audits, tooling
contract, JS-seam audit, detached-scalar preflight self-test, docs reference
tests (38/38) and graph-project identity tests (6/6). Galerina detached-scalar
integration passes 92/92, SLIDE/VOK passes 24/24, Lyth returns
`EVIDENCE_READY` with `authorityReleased: false`, and the graph skill passes
22/22 unit plus 12/12 gold checks. The full changed-cadence phase-close truthfully
remains repository-wide `FAIL`/release `UNKNOWN` (102 checks: 67 pass, 35
pre-existing or generated-owner failures); its oversized 2,200-overlay corpus
scan also reached the governed timeout. Generated JSON is valid and body-free,
with no absolute local paths or private markers. The final exact-commit graph
refresh remains the sole open pre-Fungi checkbox.

Final graph/preflight receipt (2026-08-18): the tooling commit `bc6f2aaf`
indexed under `Galerina-detached-scalar-phase1-20260818` with `status: indexed`,
27,364/27,364 nodes, 65,719/65,719 edges and exact indexed HEAD
`bc6f2aaf00830a4a088a4434ada329ae64edd91c`; `buildReferenceManifest`
resolved from the new docs source. The default Lyth project exposed an old
build point and was refused. A fresh explicit Lyth project then indexed
992/992 nodes and 1,104/1,104 edges at exact HEAD
`e5c664e8276566956ce9408507c086e1d76878c0`, and its `deriveProofWork` probe
resolved. The real detached-scalar preflight subsequently returned `ALLOW`
for Galerina, SLIDE, VOK and Lyth with all 13 checks green. After this
bookkeeping-only plan commit, Galerina is refreshed once more to bind the final
repository HEAD before Task 9 may run. If the fixed-name project repeats an
older excluded-doc build point, that receipt is refused and a fresh explicit
head-scoped project override is required instead.

## Task 9: Run the controlled ten-source real-package pilot

**Prerequisite:** this task is locked until Tasks 1-8, Task 10 and the final
self-review are complete with fresh evidence. Do not use Task 9 to finish or
work around an earlier prerequisite.

**Files:**
- Create locally: `build/ts-to-fungi-pilot-2026-08-18/manifest.json`
- Generate: `build/fungi-conversion-gate/pilot-2026-08-18-d-run-card.json`
- Generate: `build/ts-to-fungi-sandbox/pilot-2026-08-18-d/candidates/`
- Generate: `build/ts-to-fungi-sandbox/pilot-2026-08-18-d/records/`
- Modify: `docs/TODO.md`

- [x] Select exactly ten uncredited real-package symbols from the fresh graph,
  excluding `@galerina/test`, generated code, overlays, prior receipts and
  loaded-asset aliases.
- [x] Read exact source, callers, focused tests and owning package boundary for
  each symbol before classification.
- [x] Run the preflight and require all mandatory owners green.
- [x] Run the sandbox through the conversion gate; do not call the lowerer
  directly and do not manufacture candidates for blocked semantics.
- [x] Keep every `.ts` byte-identical and record `CONVERTED`, `BLOCKED` or
  `MANUAL_REVIEW` with exact reason codes.
- [x] Run exact and normalized whole-corpus duplicate/shadow checks including
  all untracked files.
- [x] Validate every converted candidate through compiler, checked snapshot,
  GIR, physical SLIDE, independent re-admission and VOK receipt.
- [x] Keep pilot candidates in `build/`; do not copy them into package
  `self-hosted/` roots unless a later real conversion batch reaches the 40-file
  commit floor and passes the report policy.
- [x] Update TODO with pilot outcomes and the next genuine blocker; do not claim
  production authority, switch or TypeScript retirement.

Evidence (2026-08-18): discovery scanned 37 real-package scopes and selected
ten uncredited constants from `artifact-reference-core.ts`,
`artifact-reference.ts` and `checked-module-snapshot.ts`; 27 scopes already
had Fungi credit and were excluded. Exact graph caller reads, the green
`@galerina/core-compiler` package boundary and focused tests
`artifact-reference.test.mjs` and `checked-module-snapshot-v1.test.mjs` were
read before classification. The first gate call correctly held because its
planned manifest/run-card folders were not ignored. Commit `e8431dd6` makes
those local build-evidence paths non-committable, and commit `3ce5ec0e` fixes a
Node 24 Windows `npm.cmd` spawn refusal by running npm's JavaScript CLI through
Node; the regression suite is 19/19.

Fresh graph project `Galerina-detached-scalar-phase1-20260818-3ce5ec0e`
contains 27,364/27,364 nodes and 65,522/65,522 edges at exact HEAD
`3ce5ec0ec7f2d018507c7cffbdc1c25d39d9ef71`. Controlled run
`pilot-2026-08-18-d` is `ALLOW`: all twelve roster checks allow and all ten
requests are `CONVERTED`. Every request independently verifies source,
candidate, checked snapshot, deterministic GIR, physical package/profile and
VOK receipt; Lyth returns `EVIDENCE_READY` with authority unreleased. The
shared receipt-set digest is
`sha256:2abc981ba4ac3558f44c7b44fba832fe0a342ada9cc21ae98637808e1b641d4c`.
The source hashes remain exactly
`0B7A40D0F4A36285C4FA4201CAE85FF00045BB409510F99C7AF57CD2F7343546`,
`4D169BD1AE2AB7D7FC75F77564A9F5A19C0B1D4FB3A83C5BDCFC713995782A68`
and `57B56A9E5454EEBD83FA513A855C20B99337413F790C6AAA762EA34EBC9BC9C9`;
Git reports no changed or untracked TypeScript.

The sandbox's exact and alpha-normalized collision oracle rechecked the ten
final candidates against 2,971 tracked/untracked corpus files and against each
other: zero exact duplicates and zero normalized shadows. The governed
worktree uniqueness audit is also green. Candidates from the two earlier
Lyth-refused runs were removed, leaving exactly the ten final build-only
candidates. No package loadedAsset, consumer, conversion report or TypeScript
file changed; no commit, switch, retirement, push or production authority was
issued for candidates. The next genuine blocker is a later owner-reviewed
batch accumulating at least 40 unique real-project Fungi files (expected 50),
with package placement and consumer-switch evidence; this ten-source pilot
cannot satisfy that publication gate by itself.

Final focused verification is green: docs 38/38, artifact/snapshot 34/34 and
conversion-gate 19/19. The repository-wide TS/Fungi drift report remains a
truthful `HOLD` at its older baseline: 198 source-build-point drifts, with zero
symbol, candidate, chain or unbound drift. That broad hold is not relabelled
green and does not override the pilot's exact three-file digest evidence.

## Task 10: Review the live overlay fixture corpus without deleting it blindly

**Files:**
- Create: `docs/reports/conversion-overlay-corpus-disposition-2026-08-18.md`
- Modify: `docs/TODO.md`

- [x] Use the baseline ledger to separate executed construct-bearing KATs,
  source-bound but test-only overlays, generated seal chains and duplicate or
  shadow debt.
- [x] Record which tests and loadedAssets consume each retained family.
- [x] Invalidate old aggregate conversion-credit claims for the 2,200 overlays;
  they are fixtures, not real-package conversion.
- [x] Propose a compact retained KAT set selected by construct/hostile-vector
  coverage, never by sampling the old generator.
- [x] Record the exact Git range that preserves removed candidates if a later
  owner-approved cleanup proceeds.
- [x] Do not delete the corpus in this plan. Any removal is a separate reviewed
  commit after its consumers are migrated and the compact KAT set is green.

Evidence (2026-08-18): the disposition report accounts for all 2,200 fixture
overlays, 55 package KATs and 55 integration tests. It records 2,020
interpreter-exercised and 1,870 physically re-admitted overlays, 180 interpreter
gaps, 330 physical gaps, zero exact duplicate groups, six alpha-normalized
groups covering 14 files and zero case-only path groups. It preserves the exact
history range `294f937ba6b7cc97c26c9ca889563149fe75afe9..1f154cc9478d89943bd806858fa9ec2749491857`,
invalidates aggregate real-conversion credit, proposes a coverage-selected
compact future KAT set and authorizes no deletion.

---

## Final self-review

- [x] Re-read the design spec and map every requirement to an implemented test,
  command or explicit deferred owner gate.
- [x] Search the plan and changed files for `TODO`, `TBD`, placeholders, absolute
  local paths, invented syntax and hand-edited generated outputs.
- [x] Verify public types, JSON schema tags, status enums and exit-code meanings
  agree across the identity resolver, preflight, conversion gate and docs tool.
- [x] Verify the real conversion baseline, pilot and overlay disposition do not
  double-count scopes or treat fixture overlays as production conversion.
- [x] Verify no commit contains more than one conversion report and no
  report-bearing conversion commit contains fewer than 40 new real `.fungi`
  except an explicit owner-approved final tail.
- [x] Verify Tower Citizen, Tri-Pipe and Tri-Fuse roles remain present and no
  tool crosses their authority boundaries.
- [x] Verify no push occurred.

Self-review evidence (2026-08-18, pre-pilot): the design requirements map to
the identity, preflight, gate, construct-analysis, checked-reference,
baseline/drift, Lyth and cross-owner focused suites or to the explicit
no-switch/no-retirement owner gates. The spec's `.fungi` fixture wording was
resolved by the later hard-ordering constraint and Task-6 boundary correction:
canonical parser/checker-backed in-memory KATs cover every selected declaration
kind without authoring a pre-gate `.fungi` file. Changed-file scans find no new
placeholder, invented syntax, durable absolute local path, private marker or
hand-edited generated index; the only absolute-path strings are deliberate
detector controls or pre-existing TODO evidence. Schemas, status enums and
0/1/2 exit meanings are covered by 53 focused tool tests and 38 docs tests.
There is no tracked or untracked `.fungi` delta, no conversion-report delta,
one non-conversion overlay-disposition report and zero worktree duplicate or
shadow candidates. The ten-source pilot is still absent by design, so it cannot
double-count the baseline. The fresh graph still resolves Tower Citizen and
Tri-Pipe surfaces and the retained Tri-Fuse compiler integration; none is
imported by the docs tool. The local branch has no upstream and no push was
performed. Exact final-commit graph refresh remains the last Task-8 gate.
