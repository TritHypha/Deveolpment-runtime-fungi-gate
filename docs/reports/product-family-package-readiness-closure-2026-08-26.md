# Product-family package readiness closure

Status: `HOLD`

This receipt closes the bounded pre-Fungi verification attempt. It does not
authorize integration, publication, `.fungi` authoring or `.gate` authoring.

## Exact identity

- Branch: `codex/product-family-package-readiness`
- Baseline: `c3360c143db4659ae18560322dc6b7a3cf3e122a`
- Audited implementation HEAD: `0aa4bcc08a3a45d25e2393627161ce31a2805c01`
- Audited implementation tree: `4bd3cf39fd05b21b629820d89aa847449a70c5ac`
- Changed tracked paths from baseline: 5,986, dominated by the mechanical
  `packages-galerina/` to `packages-ts/` move and regenerated evidence.
- First unopened native locator:
  `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/`

## Native boundary

- Git reports 2,646 native path changes because the TypeScript-root migration
  mechanically changes path prefixes that contain existing native fixtures.
- Normalizing only `packages-galerina/` to `packages-ts/` yields 3,001 native
  `.fungi`/`.gate` blobs before and after, with zero additions, removals or
  content-identity changes.
- No native package root was opened. No first native file was created or edited.

## Focused product controls

- True-LF candidate: 30/30 PASS, 0 failures, 1.67 seconds.
- Physical-CRLF detached copy: 30/30 PASS, 0 failures, 1.64 seconds.
- The CRLF copy materialized 19 relevant MJS, TypeScript and registry files and
  verified zero files containing lone LF before execution.
- The detached worktree registration was retired. A non-Git directory residue
  containing only the temporary dependency junction remains because the local
  destructive-operation guard refused its deletion.
- A clean-commit replay exposed a mismatch between the product audit fixture
  and the real project-graph checker: informational provenance made an otherwise
  current graph fail after its publication commit. The bounded repair at
  `fb1fde58c62f789b5ed5143fd5666511e2eeac13` adds a content-only, non-mutating
  graph check while retaining the strict full-output check. Both modes pass on
  the clean repair commit, and the product audit binds the checked graph content
  to that commit without trusting the stale informational commit field.

## Full sequential estate

- Command shape: 100 packages, package concurrency 1, test-file concurrency 1.
- Executed: 100/100 packages.
- Passed: 25 packages.
- Failed: 75 packages.
- Observed tests: 1,190.
- Observed timeouts: 0.
- The compiler completed in 130.9 seconds and was not falsely timed out.
- Dominant failure family: packages resolved a missing global TypeScript
  launcher at `AppData/Roaming/npm/node_modules/typescript/bin/tsc` instead of a
  package-local admitted toolchain.
- Independent product failures remain visible: the compiler has four RD-0858
  process-root detector failures, and Tower Citizen reports 8/476 failed.
- Exact total wall time was not durably retained by the runner output contract,
  so total elapsed seconds are `UNVERIFIED` rather than reconstructed.

Result: `HOLD`. Setup refusals are not normalized into product defects, but
they also do not prove the affected packages correct.

## Deterministic generators and indexes

- Graph orchestration: 9/9 PASS.
- Documentation index: 299 indexes and 2,006 documents at fixed point.
- Code index: 987 entries.
- Diagnostic/code registry: 987 entries.
- Contract registry: 3,938 contracts across 2,974 `.fungi` files.
- Unit registry: 157 currencies.
- KB index: 1,956 documents.
- Product boundary audit: PASS over 100 packages and 11,087 edges on clean
  commit `fb1fde58c62f789b5ed5143fd5666511e2eeac13`.
- Registered generator-contract verifier: 17/17 PASS after excluding the two
  native-writing contracts from this non-native chapter.
- Conversion queue: 1,571 classified, 0 whole-file candidates, 7 scoped
  candidates, 917 blocked and 654 bootstrap.
- Historical conversion-slice close remains `HOLD` because old receipts lack an
  exact conversion scope; this chapter did not rewrite those native receipts.

## Exact full graph

- Project: `Galerina-product-family-readiness-0aa4bcc0-full`
- Indexed HEAD: `0aa4bcc08a3a45d25e2393627161ce31a2805c01`
- Nodes: 65,603/65,603.
- Edges: 167,380/167,380.
- Skipped files: 0.
- Discoverable product symbols:
  `loadProductRegistry`, `resolveProductProfile`, `evaluateProductPolicy`,
  `productArtifactKey`, `parseProductCliSelection` and
  `evaluateProductPackageBoundaries`.

## Model-diverse review

- Provider/model: Grok / Expert.
- Submitted: `2026-08-26T20:05:12.481Z`.
- Completed: `2026-08-26T20:06:40.136Z`.
- Conversation:
  `https://grok.com/c/019cce04-a5a3-4bbe-9e61-6ae4e1435b87?rid=b805937d-e6ee-4d3a-87f9-3b66034ab7ad`
- Prompt: 5,016 bytes, SHA-256
  `25b9568ef8ca9d309c175ca7f4acf4f5af614274d8c28ee9c03f806b1ce1167f`.
- Reply: 8,422 UTF-8 bytes, SHA-256
  `eba8687aad36a4f2a53faa0fb1d8826c71e6123244ef8a7eff6e1c8739504dfb`.
- The exact reply bytes are preserved as deterministic gzip/base64 alongside a
  readable copy whose sole byte difference is its terminal LF.
- Grok recommendation: `PROCEED_TO_LOCAL_ADJUDICATION`; it did not mint PASS.

Local adjudication:

- H1 cache contamination: `REJECTED`. The canonical artifact identity binds
  artifact namespace, product, governance class, policy digest, safety profile,
  build mode, physical profile and content digest. Both execution-graph and
  pure-flow cache keys consume it. Tests mutate every closed axis.
- H2 incomplete migration: `REJECTED` for the candidate. `packages-galerina/`
  is absent and has zero tracked paths; topology, Myco, Hypha and the detached
  rollback drill cover the live move boundary.
- H3 product/width bypass: `REJECTED`. Admission refuses Trametes, unknown
  products, governance switches, native-root switches and widths 32/64/256
  before constructing an admitted context or receipt.
- H4 evidence sufficiency: `PARTIAL`. The focused substitution controls are
  direct, but the red full estate prevents a complete cross-package
  producer/consumer claim. This reinforces `HOLD`.

## Independent immutable review

- A fresh read-only Codex CLI review was started against the exact baseline to
  implementation diff using GPT-5.6-sol at high reasoning effort.
- Review session: `01a03fb2-6f80-7d60-ab87-87a7e21141d7`.
- The reviewer stalled after a graph-service elicitation warning and emitted no
  verdict or finding inventory through two further bounded intervals.
- The review was stopped without changing repository bytes.

Result: `EVIDENCE_INSUFFICIENT`. No independent PASS is inferred.

## KB and Git custody

- Governing private RD: `RD-0863` on KB local `main` at
  `5b333d4da7f85b3ac03f418cf7f9748b3c9b10fe`.
- RD query result: `PRIVATE / CURRENT / FRESH`.
- Every known KB topic tip is an ancestor of local KB `main`, but remote
  publication and topic retirement remain `HOLD` because the mandatory memory
  close card reports stale volatile memories and casing drift.
- The Galerina target branch was not integrated. Task 9 is closed by this HOLD.
- No push, merge, native-source change or remote-branch deletion occurred.

## Closure blockers

1. Full package estate: 75/100 packages failed.
2. RD-0858 process-root gate: four detector controls remain red.
3. Tower Citizen: eight tests remain red.
4. Historical conversion-slice receipts lack exact scope.
5. Independent immutable review produced no verdict.
6. KB main publication/retirement gate remains red on memory freshness/casing.
7. Exact full-estate wall time was not durably captured.

## Final disposition

`HOLD`

Task 9 integration is not permitted. The project remains paused before the
first Galerina scalar-1 native package and before every new `.fungi`/`.gate`
file.
