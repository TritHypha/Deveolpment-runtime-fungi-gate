# Claude Fungi Worker Pool Design

## Purpose

Use up to three Claude CLI sessions at a time to accelerate independent `.ts`/`.mjs` to
`.fungi` slices while Codex remains the product owner. Workers gather bounded
evidence and prepare isolated changes; they do not own admission, profile
widening, integration, completion claims, commits or pushes.

## Worker topology

- Run no more than three sessions concurrently.
- Cycle through no more than 30 assigned slices under this design, with a
  product-owner admission and verification gate after every three-worker wave.
- Use the Claude CLI Opus alias with high effort.
- Give every editing session its own CLI-managed Git worktree.
- Assign one exact source symbol and one owning package to each worker.
- Never let two workers edit the same package, queue, roadmap, generated owner,
  shared proof helper or public skill repository.

Every new scope begins with a read-only dossier. The first wave covered Slices
38-40. The second wave covers Slices 41-43 after replacing a duplicate Slice 42
scope. The third wave covers Slices 44-46. Codex verifies the current source,
retirement floor, complete owning-package `packageGraph.loadedAssets`, exact and
sibling Fungi assets/tests, governed mirrors, selected SLIDE/VOK
profile and queue scope after each wave. Only admitted candidates enter a
later, worktree-isolated implementation wave.

The fourth wave covers Slices 47-49 and tests regex-dependent text decisions.
The fifth wave covers Slices 50-52 and tests exact record/array and wide
JavaScript numeric boundaries.
The sixth wave covers Slices 53-55 and tests host-module inspection,
crypto/codec/JSON proof validation, and recursive AST text analysis.
The seventh wave covers Slices 56-58 and tests open-untrusted tagged input,
structural platform validation, and shared Unicode text normalisation.
The eighth wave covers Slices 59-61 and tests the canonical `TriState`
heterogeneous record-union and TypeScript type-predicate boundary.

## Mandatory scope preflight

Before a worker starts, Codex must prove all of the following from current
graph, retirement and queue evidence:

1. the exact symbol is live or has an explicit deletion/adjudication purpose;
2. the symbol has not already been converted, superseded or assigned in this
   or an earlier slice;
3. its file and symbol floors do not reserve it to a bootstrap or other
   authority boundary;
4. no concurrent worker owns the package or any shared proof surface;
5. the complete source domain has a named candidate physical profile, or the
   dossier is explicitly a blocker investigation.
6. the live conversion register, every owning-package loaded asset, exact and
   sibling Fungi assets/tests, and governed mirrors show no earlier conversion
   or competing ownership.

A dead symbol is not a conversion candidate merely because its body is easy to
translate. A duplicate is recorded as `SUPERSEDED_BY_EXISTING_FUNGI`, not
counted as a new slice. A profile that represents only a narrowed scalar
convenience input does not prove parity for an object, optional field,
unbounded String or other wider source boundary.

## Required worker authorities

Every worker must read these public skills in full before analysis:

- `../skills/translating-typescript-to-fungi/SKILL.md`
- `../skills/writing-fungi/SKILL.md`

The workspace is supplied to Claude with both skill directories and the SLIDE
repository explicitly mounted. `AGENTS.md`, the exact TypeScript source,
callers, tests, package manifest, live compiler and selected physical profile
remain the source of truth.

For non-interactive Claude, place the prompt argument before the variadic
`--add-dir` option, mount the public skills root, and run a read-only preflight
that returns the YAML names `translating-typescript-to-fungi` and
`writing-fungi`. A prompt that merely names inaccessible paths does not satisfy
the skill requirement; refuse that dossier and keep it advisory.

## Initial independent scopes

| Slice | Exact scope | Floor at selection |
|---:|---|---|
| 38 | `packages-galerina/galerina-web/src/index.ts#isServerOnlyImport` | none |
| 39 | `packages-galerina/galerina-target-js/src/index.ts#isServerOnlyImport` | none |
| 40 | `packages-galerina/galerina-devtools-provenance/src/analyzer.ts#isGateCall` | none |
| 41 | `packages-galerina/galerina-core-network/src/index.ts#isUnsafeNetworkBackend` | none |
| 42 | `packages-galerina/galerina-cpu-kernels/src/index.ts#requiresLowBitKernel` | superseded by Slice 29 |
| 42 replacement | `packages-galerina/galerina-core-tasks/src/check-permissions.ts#isSafeEnvironmentName` | none |
| 43 | `packages-galerina/galerina-devtools-pci/src/pci-checker.ts#containsCardKeyword` | none |
| 44 | `packages-galerina/galerina-core-logic/src/omni/omni-state.ts#isOmniUncertain` | none |
| 45 | `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | none |
| 46 | `packages-galerina/galerina-tools-benchmark/src/index.ts#isBenchmarkReportShareable` | none |
| 47 | `packages-galerina/galerina-tower-citizen/src/key-rotation.ts#isWellFormedCommit` | none |
| 48 | `packages-galerina/galerina-governance-telemetry/src/exposition.ts#isSafeLabel` | none |
| 49 | `packages-galerina/galerina-devtools-fungi-scan/src/inline-fixtures.ts#looksLikeFungi` | none |
| 50 | `packages-galerina/galerina-target-cpu/src/index.ts#canUseLowBitCpuPath` | none |
| 51 | `packages-galerina/galerina-db-postgres/src/index.ts#isPositiveSafeInteger` | none |
| 52 | `packages-galerina/galerina-data-database/src/index.ts#isNonNegativeSafeInteger` | none |
| 53 | `packages-galerina/galerina-core-runtime-wasm/src/seam-adapters.ts#moduleDefinesExport` | none; owned by the approved post-beta compatibility-engine sequence |
| 54 | `packages-galerina/galerina-ext-proof-snarkjs/src/circuit.ts#verifyPhase1Proof` | none |
| 55 | `packages-galerina/galerina-devtools-pci/src/pci-checker.ts#isPaymentFlow` | none |
| 56 | `packages-galerina/galerina-core-config/src/posture.ts#isSecurityPosture` | none |
| 57 | `packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#isPlatform` | none |
| 58 | `packages-galerina/galerina-db-mysql/src/index.ts#isLocalhostHost` | none; shared decision family with PostgreSQL and OpenSearch |
| 59 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriTrue` | none |
| 60 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriFalse` | none |
| 61 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriUnknown` | none |

`galerina-core-security/src/index.ts#isHighRiskPermissionAction` is excluded:
the current retirement owner declares `bounded-bootstrap-floor`.

`galerina-core-compiler/src/i32-arith.ts#isI32Trap` and
`galerina-core-compiler/src/stdlib-registry.ts#getStdlibModuleKind` are also
excluded from the eighth wave because both source files are on the compiler
bootstrap floor.

`requiresLowBitKernel` must not be reconverted. The current repository already
contains the package-owned asset, differential test and physical Slice 29
evidence; its queued classification is `SUPERSEDED_BY_EXISTING_FUNGI`.

The replacement does not erase that refusal record: the original Slice 42
scope stays recorded as superseded, while the replacement receives its own
source dossier and owner decision.

## Worker restrictions

- Do not edit during the dossier wave.
- Do not use raw glob or grep for discovery; use the code graph first and Myco
  only for bounded literal checks.
- Do not run graph-all, full tooling, normal phase-close, monolithic memory
  evaluation or repository-wide indexing.
- Do not invent syntax, host APIs, effects, permissions or wire encodings.
- Do not emit null, NaN, `else if`, `throw`, `try`, `catch`, `for` or `loop` in
  Fungi. Iteration is admitted only as a proved bounded Boolean `while`.
- Do not widen a compiler or SLIDE registry limit to admit a candidate.
- Do not alter TypeScript consumers, delete legacy source or claim retirement.
- Do not modify queue decisions, roadmaps, generated owners or public skills.
- Do not commit or push.

## Required dossier return

Each worker returns one compact Markdown result containing:

1. exact source path, symbol and Git build point;
2. source behavior, input/output domain and source digest;
3. callers, tests, constants, types and observable failure behavior;
4. ambient authority and direct/transitive effects;
5. threadability class;
6. retirement floor and evidence source;
7. decision/effect ledger with every terminal exit;
8. selected candidate asset path and physical profile, or an exact blocker;
9. differential, hostile-input, budget and mutation vectors;
10. classification: `CANDIDATE`, `BLOCKED`, `NO_RUNTIME_BEHAVIOR` or
    `SUPERSEDED_BY_EXISTING_FUNGI`.

## Product-owner gate

Codex independently reads every returned source and diff, rechecks floors and
profile domains, binds the accepted design and queue decisions, and runs all
focused checks. Claude output is advice or an isolated patch, never authority.
Unknown evidence remains blocked. Integration uses explicit paths and local
commits only; the owner performs all pushes.

## Classification accounting

- A physical compile refusal is evidence about the named profile, not a
  conversion success.
- A frontend strict-check is not physical `.slide` or VOK evidence.
- A worker recommendation is non-authoritative until Codex reproduces its
  source, caller, domain and focused-test evidence.
- Dead code follows a deletion/adjudication path; it cannot satisfy a consumer
  switch by receiving an unused Fungi twin.
- Graph content that is current for code but behind an output-only generated
  commit may guide symbol discovery only when the exact source is unchanged;
  formal graph-head freshness remains `UNKNOWN` until the index build point
  matches the repository head.
