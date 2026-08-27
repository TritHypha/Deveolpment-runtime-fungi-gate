# RD-0858 Unit 4 scalar-oracle assurance

Date: 2026-08-27

## Identity

- Branch: `codex/rd-0858-unit4-scalar-oracle`.
- Frozen implementation candidate: `c2c48b526fda8d5a5821fa4a9d720d67c0013e01`.
- Frozen implementation tree: `aa0c90555da646e8f2f81a6010e17f85c61205dc`.
- Start boundary: `9a64384f10b150609331935108e6ac056c82075f`.
- Platform: Windows; Node `v24.18.0`; Rust/Cargo `1.96.1`.
- Authority: non-authorizing. No production switch, GIR/SLIDE/VOK admission,
  TypeScript retirement, width `64`/`256`, runtime rescue or `.gate` authority.

## Checked

- [x] Fixed scalar source and checked artifact are byte-bound and deterministic.
- [x] Registry admits only the protected artifact identity and digest.
- [x] The worker decodes checked bytes only and executes one scalar operation.
- [x] Terminal receipt algebra covers every closed row plus missing evidence.
- [x] TypeScript and Rust adapters preserve truthful exits and remain
  non-authorizing.
- [x] Causal controls delete every terminal row and the authority guard.
- [x] Profile selection is fixed to scalar `1`; there is no fallback or
  substitution.

## Sequential evidence

- Focused true-LF estate: 106/106.
- Focused physical-CRLF estate: 106/106.
- Core compiler: 6,753/6,753 tests across 1,292 suites.
- Task 5 focused boundary: 86/86.
- Repaired dependent package suites: 299/299 across nine packages.
- Product boundary: 10/10; 100 packages; 10,710 edges.
- Fungi golden controls: 11/11 examples and 11/11 vectors.
- Typecheck/build: PASS.
- Rust format/test: PASS.
- WAT drift, code index, code registry, conversion queue, status and coverage:
  PASS after deterministic regeneration.
- Code inventory: 987/987 codes; zero registry phantoms.
- Contract registry: 3,939 contracts across 2,975 `.fungi` files.
- Documentation index: 299 indexes and 2,012 documents at deterministic
  fixed point.
- Repository-owned graph orchestrator: 9/9 generation/check children PASS at
  deterministic fixed point.
- Complete governed tooling estate: PASS in 325,940 ms under concurrency `1`.
- Complete core-package estate: PASS in 103,918 ms.
- Conversion controller estate: 49/49 after the repository-wide source-encoding
  preflight was made independent of the ten-candidate selection limit.
- Final effective phase-close state: 94/96 current. The only two non-green
  entries are the inherited historical conversion-receipt scope refusal and
  the bounded Fungi corpus watchdog.

## Controlled-red evidence

- Artifact byte mutation refuses before execution.
- Artifact identity, digest, locator and registry mismatch refuse.
- Source parsing and compiler loading inside the worker refuse.
- Missing, duplicate, reordered or contradictory terminal rows refuse.
- Worker identity/result mismatch and incomplete execution refuse.
- Runtime profile rescue, silent profile substitution and authorizing receipt
  fields remain absent.
- Historical conversion-slice receipts with missing exact scope remain HOLD;
  dated evidence was not rewritten to manufacture green.
- The full Fungi corpus watchdog remains HOLD at its existing 600-second bound.

## Graph and discovery receipts

- Myco selected-worktree query: `COMPLETE` / `HIT` at exact candidate HEAD;
  freshness remains `UNKNOWN` by the controller's deliberate `--no-refresh`
  contract, so it is locator evidence only.
  Report digest:
  `76a0ed434960a81cc2f2663f0f6cf618107e853011bd5da7fea3bcdd7c5c6054`.
- Hypha selected-worktree query: `COMPLETE` / `HIT`, `FRESH`, exact candidate
  HEAD. Report digest:
  `fde677bc789bebaad99eccf310eb76a9ffb431d7a05d8e47f83f982919b4bb6e`.
- Hypha reports 12 existing `governedFlowDecl` kind-set gaps. They are retained
  as review findings and are outside this scalar artifact's changed surface.
- Standalone Hypha layout repair: local commit `9a15296b`; independent review
  PASS, Critical 0 / Important 0 / Minor 0; current and legacy layouts pass,
  missing and ambiguous layouts refuse.
- Interim complete external graph at the encoding-repair commit: 66,032/66,032
  nodes, 171,202/171,202 edges, zero skipped files. A final exact review-target
  refresh is required after this receipt is committed.
- Repository project graph: 10,960 nodes and 10,857 edges; SHA-256
  `f46972b1a8cf4afa6b5b36da4432542bcd02d8c5a7c3a8866a9e705d7d2c8506`.
- Code Logic Workbench capsule: `HOLD`, non-authorizing, with only `GIR` and
  `ADMISSION` unknown because both are outside this scalar chapter. Request
  digest:
  `0777860fb0fe56fa125651d82fd3326311bfa427badf86e48febede9ee41a890`;
  profile digest:
  `3f1a3ff1fdac4e458ec6976a2e2cc8077260254f673ac4e6704467bc9d6c9568`.

## Phased repository gate state

- The governed phase-close runner executed all 96 registered checks
  sequentially.
- The first pass reported seven non-green entries. Five were stale generated
  evidence or predecessor-receipt consequences: `graph:all`, `code-index`,
  `doc:roadmap-drift`, `fungi:golden` and `semantic:coverage`.
- Deterministic regeneration closed all five: graph generation/check is 9/9,
  code index is 987/987, roadmap is 3/3, golden evidence is 11/11 examples and
  11/11 vectors, and semantic coverage independently accepts the exact
  graph-all JSON receipt.
- `audit:conversion-slice-close` remains REFUSED because historical slice
  receipts omit exact conversion scope. Dated evidence was not rewritten.
- `fungi:corpus-check` remains HOLD after active progress reached its governed
  600,000 ms watchdog. It is not normalized to a correctness failure or PASS.
- Effective current state is therefore 94/96, with no open scalar-profile
  correctness root.

## Current verdict

`HOLD` at the intentional GIR/admission boundary. Scalar implementation and
repository assurance are closed apart from the two inherited global HOLDs.
The final exact-head external graph, independent exact-revision review and
multi-vector chapter challenge remain required before local integration.
