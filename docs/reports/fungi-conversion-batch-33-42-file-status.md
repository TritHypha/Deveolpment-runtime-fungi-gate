# Fungi Conversion Batch 33-62 File Status

This is the live operational register for the bounded conversion batch. The binding
design and work ledger are in
[`../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md`](../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md).
The active roadmap is updated once at the bounded batch exit.

## Slice 63 entry gate

The pin-bound SLIDE capability reconciliation is complete at reference commit
`99a75a6` with a verified 91-file manifest and **1,015/1,015** SLIDE tests. The
exact capability matrix is recorded in
`slide-capability-reconciliation-slice-63-2026-08-13.md`. This permits candidate
selection, not retirement or production authority. Aggregate roadmap, graph
and index closure is deferred until the next 25-slice boundary; every slice
still requires its own strict, physical, VOK and differential proof.

## Status vocabulary

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No candidate authority or implementation exists. |
| `PENDING` | Selected or required, but work has not begun. |
| `IN_PROGRESS` | Work exists but its required proof is incomplete. |
| `DONE` | The file's current batch responsibility has fresh focused evidence. |
| `ERROR` | A reproducible failure is under investigation. |
| `BLOCKED` | A verified authority or capability boundary prevents completion. |

## Slice files

| Slice | TypeScript/MJS source | Fungi asset | Focused test | Physical status | Overall |
|---:|---|---|---|---|---|
| 33 | `packages-galerina/galerina-core-config/src/index.ts#isEnvironmentMode` | `packages-galerina/galerina-core-config/src/self-hosted/environment-mode.fungi` | `packages-galerina/galerina-core-config/tests/environment-mode-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 34 | `packages-galerina/galerina-core-runtime/src/structured-await.ts#isTerminalScope` | `packages-galerina/galerina-core-runtime/src/self-hosted/terminal-scope.fungi` | `packages-galerina/galerina-core-runtime/tests/terminal-scope-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 35 | `packages-galerina/galerina-core-tasks/src/load-tasks.ts#isTaskEffect` | `packages-galerina/galerina-core-tasks/src/self-hosted/task-effect.fungi` | `packages-galerina/galerina-core-tasks/tests/task-effect-fungi-conversion.test.mjs` | The flat eight-label match exceeds the current physical wide-control ceiling. A two-helper, four-plus-four exact decomposition compiles and executes the first, last and surplus vectors; the bound design and asset still need amendment. | `IN_PROGRESS` |
| 36 | `packages-galerina/galerina-data-model/src/index.ts#isResponseSafeClassification` | `packages-galerina/galerina-data-model/src/self-hosted/response-safe-classification.fungi` | `packages-galerina/galerina-data-model/tests/response-safe-classification-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. The earlier refusal was the harness supplying a surplus text-work budget to an exact step-only profile. | `DONE` |
| 37 | `packages-galerina/galerina-devtools-context/src/receipt-generator.ts#isBuiltin` | `packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi` | `packages-galerina/galerina-devtools-context/tests/builtin-name-fungi-conversion.test.mjs` | The flat eighteen-label match exceeds the current physical wide-control ceiling. Tested helper decompositions also refuse because the current profile cannot compose the required wide control-flow and function graph. No physical claim is made. | `BLOCKED` |
| 38 | `packages-galerina/galerina-web/src/index.ts#isServerOnlyImport` | not created | not created | The exact 28-name membership decision exceeds the freshly proved seven-arm physical String-match ceiling; the smaller 18-label Slice 37 helper shapes already refuse. Live graph confirms one production caller and two focused test callers; the package passes 25/25. No profile widening is authorized. | `BLOCKED` |
| 39 | `packages-galerina/galerina-target-js/src/index.ts#isServerOnlyImport` | not created | not created | The exact 28-name membership decision exceeds the current 16-block physical ceiling; the 256-byte and well-formed-Unicode physical boundaries also narrow the unbounded TypeScript String domain. Live graph confirms the production/test callers and the package passes 13/13. No narrowing or profile widening is authorized. | `BLOCKED` |
| 40 | `packages-galerina/galerina-devtools-provenance/src/analyzer.ts#isGateCall` | not created | not created | The live graph proves its only caller is nested inside `analyzeFlowAst`, which itself has zero callers. A reference twin could never satisfy live differential or consumer-switch retirement gates. Owner classification is blocked pending dead-code deletion adjudication; the package remains green 25/25. | `BLOCKED` |
| 41 | `packages-galerina/galerina-core-network/src/index.ts#isUnsafeNetworkBackend` | not created | not created | The physical frontend has no exact boundary for the source's nominal six-field record with optional Boolean state. A scalar bridge would move the absence decision back into TypeScript. The live graph also shows its caller is package-test-only; core-network remains green **192/192**. | `BLOCKED` |
| 42 | `packages-galerina/galerina-cpu-kernels/src/index.ts#requiresLowBitKernel` | `packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi` | `packages-galerina/galerina-cpu-kernels/tests/low-bit-kernel-routing-fungi-conversion.test.mjs` | Already proved in Slice 29; no duplicate conversion is permitted. | `DONE` (`SUPERSEDED_BY_EXISTING_FUNGI`) |
| 42 replacement | `packages-galerina/galerina-core-tasks/src/check-permissions.ts#isSafeEnvironmentName` | not created | not created | The source is an open regular-language decision over an unbounded JavaScript String. The selected physical profile has no Boolean `while`, text length or character accessor, and its bounded well-formed text admission narrows the source domain. Core-tasks remains green **9/9**. | `BLOCKED` |
| 43 | `packages-galerina/galerina-devtools-pci/src/pci-checker.ts#containsCardKeyword` | not created | not created | Physical text containment exists, but exact JavaScript case folding does not; the bounded well-formed physical text domain is narrower too. Devtools-pci remains green **29/29**. | `BLOCKED` |
| 44 | `packages-galerina/galerina-core-logic/src/omni/omni-state.ts#isOmniUncertain` | `packages-galerina/galerina-core-logic/src/self-hosted/omni-uncertain.fungi` | `packages-galerina/galerina-core-logic/tests/omni-uncertain-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 45 | `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | `packages-galerina/galerina-devtools-project-graph/src/self-hosted/resource-transition.fungi` | `packages-galerina/galerina-devtools-project-graph/tests/resource-transition-fungi-conversion.test.mjs` | The exact seven-by-seven declared matrix and hostile labels pass interpretation and signed Wasm. Physical publication is blocked because the selected profile accepts one scalar argument, not the required two-String boundary; host-side tuple packing is refused. | `BLOCKED` (physical) |
| 46 | `packages-galerina/galerina-tools-benchmark/src/index.ts#isBenchmarkReportShareable` | not created | not created | The source consumes two nested records, including an eleven-field report. The selected physical profile cannot preserve the exact record boundary; flattening or precomputing would move authority into the host. The owning package remains green **9/9**. | `BLOCKED` |
| 47 | `packages-galerina/galerina-tower-citizen/src/key-rotation.ts#isWellFormedCommit` | not created | not created | TriRegex certifies the hex alphabet pattern, but the complete source has an unbounded case-insensitive character predicate and a reachable non-String `false` path. Fungi/SLIDE has no exact executable boundary. Tower-Citizen remains green **507/507**. | `BLOCKED` |
| 48 | `packages-galerina/galerina-governance-telemetry/src/exposition.ts#isSafeLabel` | not created | not created | TriRegex certifies the bounded alphabet pattern, but Fungi `matchesPattern` is not lowered to execution or WAT and SLIDE has no regex/text-character iteration profile. Governance telemetry remains green **21/21**. | `BLOCKED` |
| 49 | `packages-galerina/galerina-devtools-fungi-scan/src/inline-fixtures.ts#looksLikeFungi` | not created | not created | Two patterns require unsupported word-boundary semantics; all three lack an executable Fungi/SLIDE regex boundary and the physical text domain is narrower. Fungi scan remains green **25/25**. | `BLOCKED` |
| 50 | `packages-galerina/galerina-target-cpu/src/index.ts#canUseLowBitCpuPath` | not created | not created | The source consumes a capability record and searches its SIMD array. The current physical profile cannot preserve that record/array ABI; host-precomputed feature booleans are forbidden. CPU target remains green **3/3**. | `BLOCKED` |
| 51 | `packages-galerina/galerina-db-postgres/src/index.ts#isPositiveSafeInteger` | not created | not created | JavaScript safe integers extend through `2^53 - 1`, while checked-Fungi `Int` lowers to signed i32 and has no exact binary64 safe-integer predicate. PostgreSQL remains green **24/24**. | `BLOCKED` |
| 52 | `packages-galerina/galerina-data-database/src/index.ts#isNonNegativeSafeInteger` | not created | not created | The same complete safe-integer domain cannot be represented by the current i32 physical profile; declaring the input as `Int` would delete the source's binary64 guard. Database remains green **22/22**. | `BLOCKED` |
| 53 | `packages-galerina/galerina-core-runtime-wasm/src/seam-adapters.ts#moduleDefinesExport` | not created | not created | The source requires Wasm validation/reflection and module-controlled export iteration. Its complete replacement is already sequenced in the approved post-beta narrow Fungi Wasm compatibility-engine plan. Runtime Wasm remains green **27/27**. | `BLOCKED` |
| 54 | `packages-galerina/galerina-ext-proof-snarkjs/src/circuit.ts#verifyPhase1Proof` | not created | not created | Two records, SHA-256 proof recomputation, Node base64/UTF-8, JSON parsing and asymmetric exception behavior have no exact current physical boundary. The proof extension remains green **10/10**. | `BLOCKED` |
| 55 | `packages-galerina/galerina-devtools-pci/src/pci-checker.ts#isPaymentFlow` | not created | not created | Recursive AST flattening, JavaScript case folding, `Array<String>` membership and full-program text work exceed the current exact Fungi/SLIDE surface. PCI remains green **29/29**. | `BLOCKED` |
| 56 | `packages-galerina/galerina-core-config/src/posture.ts#isSecurityPosture` | not created | not created | The source is total over open JavaScript `unknown`; a String-only twin deletes the non-String `false` domain. Core Config remains green **54/54**. | `BLOCKED` |
| 57 | `packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#isPlatform` | not created | not created | The open `unknown` predicate is part of exact descriptor/host validation. The existing broader Fungi fold accepts precomputed Booleans and does not supersede the untrusted structural ingress. App Kernel remains green **231/231**. | `BLOCKED` |
| 58 | `packages-galerina/galerina-db-mysql/src/index.ts#isLocalhostHost` | not created | not created | JavaScript trim plus full Unicode lowercase has no admitted non-host-authoritative physical profile. The identical MySQL/PostgreSQL/OpenSearch TLS-bypass decision must remain one governed family. MySQL remains green **24/24**. | `BLOCKED` |
| 59 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriTrue` | not created | not created | The leaf comparison is pure, but the public input is the canonical heterogeneous `TriState` record union. A scalar String, enum or i32 tag would not prove that record boundary. Core Logic remains green **57/57**. | `BLOCKED` |
| 60 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriFalse` | not created | not created | Same exact record-union and TypeScript type-predicate boundary as Slice 59; no host-side discriminant projection is authorized. Core Logic remains green **57/57**. | `BLOCKED` |
| 61 | `packages-galerina/galerina-core-logic/src/tri/tri-state.ts#isTriUnknown` | not created | not created | The unknown variant additionally carries `Array<UnknownReason>` with an optional source field. No exact physical admission exists for the complete union. Core Logic remains green **57/57**. | `BLOCKED` |
| 62 | `packages-galerina/galerina-core-sentinel-state/src/state-serializer.ts#isWeakKey` | not created | not created | Exact parity requires `Option<Bytes>`, the 32-byte threshold and a bounded all-zero byte scan. The selected physical profile admits `Bytes` equality and `Option<Int>`, but no Bytes length/index/traversal route. Sentinel State passes **26/26**. | `BLOCKED` |

## Shared implementation and governance files

| File | Responsibility | Status |
|---|---|---|
| `docs/superpowers/specs/2026-08-12-five-scalar-classifiers-fungi-conversion-design.md` | Bound design for Slices 33–37. | `DONE` |
| `docs/superpowers/specs/2026-08-12-five-follow-on-fungi-conversions-design.md` | Product-owner negative adjudication for Slices 38–43, including the superseded original Slice 42 scope. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-44-46-fungi-conversion-design.md` | Product-owner design and physical adjudication for Slices 44-46. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-47-49-regex-boundary-adjudication.md` | Product-owner negative adjudication and R&D trigger for Slices 47-49. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-50-52-wide-boundary-adjudication.md` | Product-owner negative adjudication and R&D triggers for the record/array and wide-number boundaries in Slices 50-52. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-53-55-host-and-recursive-boundary-adjudication.md` | Product-owner negative adjudication and existing/future implementation routes for Slices 53-55. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-56-58-tagged-input-and-normalisation-adjudication.md` | Product-owner negative adjudication for open-untrusted and Unicode-normalisation boundaries in Slices 56-58. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-59-61-tristate-record-union-adjudication.md` | Product-owner negative adjudication for the canonical TriState heterogeneous record-union boundary in Slices 59-61. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slice-62-weak-key-bytes-adjudication.md` | Product-owner negative adjudication for the optional Bytes, bounded traversal and key-custody boundary in Slice 62. | `DONE` |
| `docs/superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md` | Batch work ledger and link to this register. | `IN_PROGRESS` |
| `governance/conversion-queue-decisions.json` | Seven current symbol-scoped candidate decisions; blocked follow-on scopes grant no candidate authority. | `DONE` |
| `build/conversion-queue/queue.json` | Generated seven-candidate queue; follow-on blockers do not enter the candidate authority list. | `DONE` |
| `build/conversion-queue/QUEUE.md` | Human-readable generated queue. | `DONE` |
| `scripts/lib/scalar-classifier-fungi-proof.mjs` | Shared interpreter and signed-Wasm differential proof helper. | `DONE` |
| `packages-galerina/galerina-core-compiler/src/interpreter.ts` | Preserve quoted reserved names as String match patterns. | `DONE` |
| `packages-galerina/galerina-core-compiler/tests/wat-string-match.test.mjs` | Interpreter/Wasm regression for quoted reserved names. | `DONE` |
| `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs` | Distinct physical SLIDE/VOK receipts for Slices 33, 34, 36 and 44; exact compile-refusal evidence for Slices 35, 37 and 45; executable seven-pass/eight-refuse profile boundary. | `DONE` |
| `governance/phase-close-commands.json` | Register the physical batch test in the governed test inventory. | `DONE` |
| Private `translating-typescript-to-fungi` skill repository | Duplicate-conversion preflight remains binding; private repository custody, bounded reachable-history scanning, pinned CI and protected `main` are verified at `9654753`. | `DONE` |
| Private `writing-fungi` skill repository | The batch-level semantic result remains `NO_SKILL_UPDATE`; later binding authoring rules and private repository custody are verified at `d2d955e`. | `DONE` |

## Shared closure status

The bounded batch owner exit is complete. The authored TODO and active roadmap
are updated; every listed generated owner is regenerated and independently
current. Final navigation-index publication remains in dependency order. The
excluded aggregate lanes are not substitutes for these bounded owners, so
repository-wide closure remains `UNKNOWN`.

| Closure item | Status |
|---|---|
| `docs/TODO.md` | `DONE` |
| `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md` | `DONE` (authored section and generated subway block) |
| Retirement and conversion queue | `DONE` at 1,458/1,458, seven scoped candidates and 829 blockers |
| Package, project and KB graphs | `DONE` at 100/201, 5/5 and 4/4 |
| Dev-tool and Fungi-source inventories | `DONE` at 100 packages / 172 tools / 40 proofs and 142 Fungi files |
| Semantic, percentage, status, code-index and subway owners | `DONE` at 3/3 with 956 test nodes, three sections, current status blocks, 974 codes and 5/5 |
| Private Fungi skill repositories | `DONE` (`d2d955e` writing skill; `9654753` translation skill; both private workflows green, protected `main` requires `verify`, and GitHub reports `PRIVATE`) |
| Final codebase graph and Myco navigation refresh | `UNKNOWN` for exact-HEAD graph freshness: content is complete at 51,502/51,502 nodes and 137,475/137,475 edges and Slice 62 is queryable, but the index retained build point `e40f63ba` after later excluded-only documentation/output commits. Myco is current at 5,167 files and Slice 62 is queryable. |

## Verified refusal retained outside the batch

`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#requiresAuth`
is `BLOCKED_BY_BOOTSTRAP_FLOOR`. Its negative design record is complete; it is
not one of Slices 33–43 and no Fungi asset was produced.

## Current focused evidence

- Governed focused physical lane: `8/8` passed, `0` failed, `0` skipped. The
  eight checks are four complete physical proofs, three exact compile refusals,
  and one executable profile-boundary check; the refusals are not conversion
  success.
- Slice 44 proves all eight declared Omni labels plus hostile strings through
  the differential and physical surfaces.
- Slice 45 proves all 49 declared transition pairs plus hostile labels through
  interpretation and signed Wasm; its two-argument physical boundary remains
  an exact refusal.
- Slice 46 remains blocked at the nested-record boundary and has no placeholder
  Fungi asset.
- Slices 47-49 remain blocked at the executable regex/text boundary. Their
  owning packages pass **507/507**, **21/21**, and **25/25** respectively.
- TriRegex certifies the Slice 47 and 48 patterns, but an exact Fungi probe
  proves `matchesPattern` is unresolved in execution and WAT. Slice 49 also
  needs unsupported word-boundary semantics.
- Slices 50-52 remain blocked without placeholder assets. Slice 50 requires an
  exact physical record/array ABI; Slices 51-52 require numeric parity beyond
  i32. Their owning packages pass **3/3**, **24/24**, and **22/22**.
- The compiler integer-range lane passes **7/7** and independently proves the
  current `Int` to signed-i32 boundary. The earlier JSON safe-integer design
  reaches the same refusal and created no superseding Fungi asset.
- Slices 53-55 remain blocked without placeholder assets. Their package lanes
  pass **27/27**, **10/10**, and **29/29**. Slice 53 is owned by the existing
  post-beta compatibility-engine plan; Slices 54-55 need exact host/record and
  recursive-AST/text boundaries.
- Preflight rejected `qualifierEscalated`, `permitData`, and `is64BitWatType`
  as duplicates of existing package-owned Fungi conversions.
- Slices 56-58 remain blocked without placeholder assets. Their package lanes
  pass **54/54**, **231/231**, and **24/24**. Slices 56-57 require an exact open
  untrusted/structural physical boundary; Slice 58 requires one shared,
  non-host-authoritative Unicode trim/case-fold profile for all three database
  mirrors.
- Preflight rejected `isValidStrategy` and `powerRank` as duplicates and
  `isHighRiskPermissionAction` at its declared bootstrap floor.
- Slices 59-61 remain blocked without placeholder assets. Their shared Core
  Logic lane passes **57/57**. The three leaves are `PARALLEL_PURE`, but no
  exact physical `TriState` record-union admission exists and a scalar/tag
  shortcut would move projection authority into the host.
- Preflight rejected `isI32Trap` and `getStdlibModuleKind` at the compiler
  bootstrap floor before the replacement wave was assigned.
- Slice 62 closes the exact 30-slice run as blocked without a placeholder
  asset. Sentinel State passes **26/26**; the current physical profile cannot
  conserve `Option<Bytes>`, byte length, bounded byte traversal or immutable
  key custody.
- A generated one-flow probe establishes the current flat-match boundary:
  seven explicit String labels compile; eight and above refuse.
- Slice 35's four-plus-four helper decomposition compiled to the bounded
  wide-control profile and returned `true`, `true`, and `false` for the first,
  last, and surplus probes respectively.
- Slice 37 remains blocked: both a three-helper flat composition and a bounded
  helper tree refused. Widening a registry ceiling is not authorized by these
  probes.
