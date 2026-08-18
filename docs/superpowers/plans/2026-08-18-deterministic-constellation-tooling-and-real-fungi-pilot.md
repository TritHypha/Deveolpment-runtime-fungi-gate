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

- [ ] In Lyth, write a failing harness that proves each adapter/schema/domain
  child failure stops the fixed-order command and yields a compact summary.
- [ ] Implement `npm run verify:detached-scalar` without adding an `ALLOW`
  result or production authority.
- [ ] In the graph skill, write an exact Windows path/file-URL invocation test
  that currently fails entry-point detection.
- [ ] Normalize file URLs and Windows/POSIX paths without changing the exported
  probe API or case-sensitive repository identity rules.
- [ ] Run the Lyth focused tests and registered command.
- [ ] Run the graph-skill gold fixtures, duplicate/shadow checks and Windows CLI
  invocation fixture.
- [ ] Commit each repository independently with explicit paths; never push.

## Task 5: Add the conversion gate and atomic run card

**Files:**
- Create: `scripts/lib/fungi-conversion-gate/contracts.mjs`
- Create: `scripts/lib/fungi-conversion-gate/core.mjs`
- Create: `scripts/lib/fungi-conversion-gate/adapters.mjs`
- Create: `scripts/fungi-conversion-gate.mjs`
- Create: `scripts/tests/fungi-conversion-gate.test.mjs`
- Create: `docs/runbooks/fungi-conversion-gate.md`
- Modify: `package.json`

- [ ] Write failing tests for one-to-ten bounds, absolute/escaping/symlink/test-
  overlay outputs, dirty/untracked source, stale digest, duplicate identities,
  exact and normalized corpus shadows, retained `.ts`, 39/40/50 files, two
  reports, second report-only commit and final-tail exception.
- [ ] Add chain-tamper fixtures at source, candidate, checked snapshot, GIR,
  physical package, profile and VOK receipt.
- [ ] Export one gate roster covering preflight, identity, classifier,
  compiler, duplicate/shadow, path, retained source, snapshot/GIR, SLIDE/VOK,
  Lyth and commit policy.
- [ ] Require a controlled failing-child fixture before grading a real run.
- [ ] Produce one canonical body-free run card with `CONVERTED`, `BLOCKED` or
  `MANUAL_REVIEW` per request and `ALLOW`, `HOLD`, `REFUSED` or `ERROR` overall.
- [ ] Bind the card to exact digests and explicitly state no switch, retirement,
  commit, push or production grant occurred.
- [ ] Write atomically and fail with exit 2 on report-write or detector failure.
- [ ] Run:
  `node --test scripts/tests/fungi-conversion-gate.test.mjs`
- [ ] Run:
  `node scripts/fungi-conversion-gate.mjs --self-test`

## Task 6: Add the checked-AST reference manifest to `@galerina/docs`

**Files:**
- Create: `packages-galerina/galerina-docs/src/reference-types.ts`
- Create: `packages-galerina/galerina-docs/src/reference-manifest.ts`
- Create: `packages-galerina/galerina-docs/tests/reference-manifest.test.mjs`
- Create: `packages-galerina/galerina-docs/tests/fixtures/reference/`
- Modify: `packages-galerina/galerina-docs/src/index.ts`
- Modify: `packages-galerina/galerina-docs/package.json`

- [ ] Create failing checked-AST fixtures for exported flows, types, records,
  enums, guards, statics and bitfields, with one private declaration per kind.
- [ ] Add controls for duplicate qualified names, case-only collisions, broken
  type links, unsupported public AST nodes and changed public signatures.
- [ ] Define versioned `GalerinaReferenceManifest` records containing exact
  public signature facts, effects, qualifiers, contracts/governance metadata,
  repo-relative byte locators, digest, build point and owning package.
- [ ] Generate only from canonical parser/checker output. Do not import the
  regex project graph as declaration authority.
- [ ] Prove every supported exported declaration appears once, every private
  declaration appears zero times and unsupported exported AST nodes refuse.
- [ ] Prove repeated generation is byte-identical and a one-byte signature
  mutation invalidates the prior manifest.
- [ ] Run package typecheck and focused tests.

## Task 7: Add deterministic Markdown and static HTML reference views

**Files:**
- Create: `packages-galerina/galerina-docs/src/reference-renderers.ts`
- Create: `packages-galerina/galerina-docs/src/reference-cli.ts`
- Create: `packages-galerina/galerina-docs/tests/reference-renderers.test.mjs`
- Modify: `packages-galerina/galerina-docs/src/index.ts`
- Modify: `packages-galerina/galerina-docs/README.md`
- Modify: `packages-galerina/galerina-docs/package.json`

- [ ] Write failing fixtures for unstable order, absolute path leakage, private
  marker leakage, broken exact-case links, output collision and stale output.
- [ ] Derive `reference.json`, root/package Markdown and static `index.html`
  solely from the admitted manifest.
- [ ] Stable-sort by package/module/qualified name with code-unit ordering.
- [ ] Refuse hand-edited or stale generated files and write the output tree
  atomically.
- [ ] Keep optional graph caller links labelled with graph build point and
  `ASSERTED`/`INFERRED`; omit them when stale without blocking AST docs.
- [ ] Add `docs:reference` and `docs:reference:check` package commands.
- [ ] Run generation twice and compare every output byte.

## Task 8: Register tools and run the complete verification matrix

**Files:**
- Modify: `scripts/dev-tool-registry.json`
- Modify: `governance/phase-close-commands.json`
- Modify: `package.json`
- Regenerate: `build/dev-tool-index/`
- Modify: `docs/TODO.md`
- Modify: `docs/superpowers/plans/2026-08-18-deterministic-constellation-tooling-and-real-fungi-pilot.md`

- [ ] Register the baseline audit, identity self-test, preflight, conversion
  gate and reference checker through their owning registries.
- [ ] Regenerate, never hand-edit, the dev-tool index.
- [ ] Run all new focused tests and each planted-red control.
- [ ] Run package typechecks for compiler and docs.
- [ ] Run detached scalar Galerina/SLIDE/VOK focused integration and Lyth KATs.
- [ ] Run the normal tool-index publisher/check and affected phase-close group.
- [ ] Confirm every generated JSON contains no absolute local paths or source
  bodies and every required owner envelope has an exact build point.
- [ ] Re-index the exact final Galerina commit under its declared project and
  verify node counts, expected counts, indexed HEAD and a new symbol probe.

## Task 9: Run the controlled ten-source real-package pilot

**Files:**
- Create: `build/ts-to-fungi-pilot-2026-08-18/manifest.json`
- Generate: `build/ts-to-fungi-pilot-2026-08-18/run-card.json`
- Generate: `build/ts-to-fungi-pilot-2026-08-18/candidates/`
- Generate: `build/ts-to-fungi-pilot-2026-08-18/records/`
- Modify: `docs/TODO.md`

- [ ] Select exactly ten uncredited real-package symbols from the fresh graph,
  excluding `@galerina/test`, generated code, overlays, prior receipts and
  loaded-asset aliases.
- [ ] Read exact source, callers, focused tests and owning package boundary for
  each symbol before classification.
- [ ] Run the preflight and require all mandatory owners green.
- [ ] Run the sandbox through the conversion gate; do not call the lowerer
  directly and do not manufacture candidates for blocked semantics.
- [ ] Keep every `.ts` byte-identical and record `CONVERTED`, `BLOCKED` or
  `MANUAL_REVIEW` with exact reason codes.
- [ ] Run exact and normalized whole-corpus duplicate/shadow checks including
  all untracked files.
- [ ] Validate every converted candidate through compiler, checked snapshot,
  GIR, physical SLIDE, independent re-admission and VOK receipt.
- [ ] Keep pilot candidates in `build/`; do not copy them into package
  `self-hosted/` roots unless a later real conversion batch reaches the 40-file
  commit floor and passes the report policy.
- [ ] Update TODO with pilot outcomes and the next genuine blocker; do not claim
  production authority, switch or TypeScript retirement.

## Task 10: Review the live overlay fixture corpus without deleting it blindly

**Files:**
- Create: `docs/reports/conversion-overlay-corpus-disposition-2026-08-18.md`
- Modify: `docs/TODO.md`

- [ ] Use the baseline ledger to separate executed construct-bearing KATs,
  source-bound but test-only overlays, generated seal chains and duplicate or
  shadow debt.
- [ ] Record which tests and loadedAssets consume each retained family.
- [ ] Invalidate old aggregate conversion-credit claims for the 2,200 overlays;
  they are fixtures, not real-package conversion.
- [ ] Propose a compact retained KAT set selected by construct/hostile-vector
  coverage, never by sampling the old generator.
- [ ] Record the exact Git range that preserves removed candidates if a later
  owner-approved cleanup proceeds.
- [ ] Do not delete the corpus in this plan. Any removal is a separate reviewed
  commit after its consumers are migrated and the compact KAT set is green.

---

## Final self-review

- [ ] Re-read the design spec and map every requirement to an implemented test,
  command or explicit deferred owner gate.
- [ ] Search the plan and changed files for `TODO`, `TBD`, placeholders, absolute
  local paths, invented syntax and hand-edited generated outputs.
- [ ] Verify public types, JSON schema tags, status enums and exit-code meanings
  agree across the identity resolver, preflight, conversion gate and docs tool.
- [ ] Verify the real conversion baseline, pilot and overlay disposition do not
  double-count scopes or treat fixture overlays as production conversion.
- [ ] Verify no commit contains more than one conversion report and no
  report-bearing conversion commit contains fewer than 40 new real `.fungi`
  except an explicit owner-approved final tail.
- [ ] Verify Tower Citizen, Tri-Pipe and Tri-Fuse roles remain present and no
  tool crosses their authority boundaries.
- [ ] Verify no push occurred.
