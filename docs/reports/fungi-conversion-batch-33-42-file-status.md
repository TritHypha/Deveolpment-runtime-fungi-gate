# Fungi Conversion Batch 33-90 File Status

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
| 35 | `packages-galerina/galerina-core-tasks/src/load-tasks.ts#isTaskEffect` | `packages-galerina/galerina-core-tasks/src/self-hosted/task-effect.fungi` | `packages-galerina/galerina-core-tasks/tests/task-effect-fungi-conversion.test.mjs` | The exact four-plus-four helper graph passes strict check, interpreter, signed Wasm and physical `.slide` publication with independent VOK re-admission, work exhaustion and mutation refusal. | `DONE` |
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
| 45 | `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | `packages-galerina/galerina-devtools-project-graph/src/self-hosted/resource-transition.fungi` | `packages-galerina/galerina-devtools-project-graph/tests/resource-transition-fungi-conversion.test.mjs` | The exact seven-by-seven declared matrix and hostile labels pass interpretation and signed Wasm. At the original Slice 45 pin, physical publication refused and host-side tuple packing was rejected. Slice 65 supersedes the old parameter-count diagnosis with exact current-pin block-ceiling evidence. | `BLOCKED` (physical; superseded diagnosis) |
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
| 63 | `packages-galerina/galerina-core-security/src/index.ts#isHighRiskPermissionAction` | not created | not created | The six-label String decision fits the scalar profile, but its package is a `T1-trust-root` declared `bounded-bootstrap-floor`. The authoritative queue refuses an override; exploratory files were removed. | `BLOCKED_BY_BOOTSTRAP_FLOOR` |
| 64 | `packages-galerina/galerina-devtools-context/src/receipt-generator.ts#isBuiltin` | existing flat asset retained | existing package proof retained | Re-tested under the reconciled pin. Three bounded shapes refuse: flat width, three six-name helpers, and five narrow helpers with shallow composition. No current composite physical profile admits String comparison plus the required function/call graph. | `BLOCKED_BY_COMPOSITE_PHYSICAL_PROFILE` |
| 65 | `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | existing exact asset retained | existing package proof and focused physical refusal retained | The reconciled pin accepts the two-String signature, correcting the stale Slice 45 diagnosis. The unchanged decision and two bounded equivalent shapes all refuse at `SLIDE-REF-LIMIT-002`; no current profile admits the complete transition graph within its physical block ceiling. | `BLOCKED_BY_PHYSICAL_BLOCK_CEILING` |
| 66 | `packages-galerina/galerina-core-compiler/src/stdlib.ts#moneyDecimals` | not created | not created | The leaf is pure and total, and its file ledger row has no explicit declared floor. The authoritative queue nevertheless derives the `T0-compiler` bootstrap floor and refused the exact symbol override. The attempted decision was removed before implementation. | `BLOCKED_BY_BOOTSTRAP_FLOOR` |
| 67 | `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#samePath` | not created | existing registry-generation package test retained | The live trust-root decision combines ASCII Windows-drive detection with explicit `en-US` Unicode locale case folding. The current physical text surface cannot conserve the complete source domain, and host-precomputed normalization would move path identity authority across the border. | `BLOCKED_BY_LOCALE_PATH_SEMANTICS` |
| 68 | `packages-galerina/galerina-core-economics/src/index.ts#selectVectorTier` | not created | existing economics package tests retained | The exported helper accepts the complete `HardwareProfile` record, including two JavaScript `number` fields. The pinned profile has signed-i32 `Int` and no binary64 `Float`; a host-projected vector-tier String is not record parity. | `BLOCKED_BY_HARDWARE_PROFILE_RECORD_ABI` |
| 69 | `packages-galerina/galerina-core-config/src/index.ts#readOptionalBoolean` | not created | existing Core Config tests retained | A runtime key reads an open `Record<string, unknown>` and preserves `true`, `false` and `undefined`. The physical surface has neither dynamic open-record lookup nor `Option<Bool>`. | `BLOCKED_BY_OPEN_RECORD_OPTION_BOOL_ABI` |
| 70 | `packages-galerina/galerina-ext-tritsocket/src/prefilter.ts#packedLen` | not created | existing Tritsocket tests retained | JavaScript addition, division and `Math.floor` operate over the full binary64 `number` domain. Signed-i32 `Int` cannot conserve fractions, non-finite values, signed zero or wider intermediates. | `BLOCKED_BY_BINARY64_FLOOR_DOMAIN` |
| 71 | `packages-galerina/galerina-core-config/src/governance.ts#isGovernanceMode` | not created | existing Core Config tests retained | The three labels fit the String match ceiling, but the exact type guard accepts every JavaScript `unknown`; a String-only flow or host pre-filter narrows the source contract. | `BLOCKED_BY_UNKNOWN_TYPE_GUARD_ABI` |
| 72 | `packages-galerina/galerina-framework-app-kernel/src/registry-index.ts#isStrictlyNewerThanFloor` | not created | existing registry-index and hybrid tests retained | Freshness distinguishes an absent floor and otherwise uses JavaScript UTF-16 lexicographic ordering. The physical surface has neither `Option<String>` nor the exact relational String operation. | `BLOCKED_BY_OPTION_STRING_ORDERING_ABI` |
| 73 | `packages-galerina/galerina-core-logic/src/index.ts#isSafeGalerinaame` | not created | existing complete core-logic package lane retained | The open anchored identifier regex needs exact JavaScript UTF-16 length, code-unit access and traversal, or an admitted regex opcode. Frontend `matchesPattern` is not physical execution and the bounded well-formed text ingress narrows the source domain. Core Logic passes **57/57**. | `BLOCKED_BY_REGEX_TEXT_CHARACTER_ABI` |
| 74 | `packages-galerina/galerina-data-query/src/index.ts#isSome` | not created | existing complete Data Query package lane retained | The exported generic type guard consumes the custom structural `QueryOption<T>` union. Frontend `Option<T>` is not the same API, and the physical surface has no generic arbitrary-payload tagged-union parameter. Data Query passes **19/19**. | `BLOCKED_BY_GENERIC_TAGGED_UNION_ABI` |
| 75 | `packages-galerina/galerina-devtools-package-graph/src/scanner.ts#isSourceFile` | not created | existing complete Package Graph lane retained | Physical two-String suffix execution exists, but the source also consumes configuration-derived dynamic `Array<String>` and the full JavaScript UTF-16 String domain. The physical profile has neither that array parameter nor source-equivalent hostile/oversized behavior. Package Graph passes **28/28**. | `BLOCKED_BY_DYNAMIC_STRING_ARRAY_SUFFIX_ABI` |
| 76 | `packages-galerina/galerina-tower-citizen/src/ai-governance.ts#isTrit` | not created | existing complete Tower-Citizen lane retained | The live type guard accepts JavaScript `unknown`, returns true only for numeric `-1/0/1`, and lets the caller map every malformed value explicitly to DENY. Physical `Verdict` removes the negative domain; signed-i32 `Int` narrows it; boundary refusal is not source false. Tower-Citizen passes **507/507**. | `BLOCKED_BY_UNKNOWN_VERDICT_GUARD_ABI` |
| 77 | `packages-galerina/galerina-tower-citizen/src/quorum.ts#isValidVote` | not created | existing complete Tower-Citizen lane retained | The source accepts open JavaScript objects and its property reads can execute accessors or proxy traps. Physical exact records instead refuse proxies, accessors, inherited and surplus fields before Fungi runs, so they cannot preserve the Boolean malformed path. Tower-Citizen passes **507/507**. | `BLOCKED_BY_UNKNOWN_STRUCTURAL_RECORD_ABI` |
| 78 | `packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#isCrossingAllowed` | `packages-galerina/galerina-devtools-graph-algorithms/src/self-hosted/boundary-crossing.fungi` | `packages-galerina/galerina-devtools-graph-algorithms/tests/boundary-crossing-fungi-conversion.test.mjs` | The complete six-by-four table passes checker, GIR, interpretation and signed WAT/Wasm, with surplus labels denied. Physical package compilation refuses before a handle or bundle exists. Graph Algorithms passes **97/97**. | `BLOCKED_BY_TWO_STRING_PHYSICAL_PROFILE` |
| 79 | `packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#isArchitecture` | not created | existing complete App Kernel lane retained | The exact guard consumes JavaScript `unknown`; physical String ingress preserves the two positive labels but deletes every non-String false case. The existing Fungi admission fold accepts a host-computed validation Boolean and cannot supersede this ingress. App Kernel passes **231/231**. | `BLOCKED_BY_UNKNOWN_ARCHITECTURE_GUARD_ABI` |
| 80 | `packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#stringArrayIsCanonical` | not created | existing complete App Kernel lane retained | The source validates an untrusted dynamic Array with String type, ASCII label, platform allow-list and strict-order checks. The physical profile has no immutable `Array<String>` ingress/traversal boundary, and host scalarization would retain authority. App Kernel passes **231/231**. | `BLOCKED_BY_UNKNOWN_STRING_ARRAY_CANONICALITY_ABI` |
| 81 | `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#isVerifiedRegistryGeneration` | not created | fresh complete App Kernel lane retained | The guard accepts only exact object identity minted into a module-private `WeakSet`; equal or copied records remain false. Current Fungi/SLIDE/VOK values cannot preserve that non-copyable authority provenance. App Kernel passes **231/231**. | `BLOCKED_BY_AFFINE_WEAK_IDENTITY_RECEIPT_ABI` |
| 82 | `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#isPersistedRegistryGeneration` | not created | fresh complete App Kernel lane retained | The exact object must be minted into both private verified and durable WeakSets; verified-only restored generations remain false. Current Fungi/SLIDE/VOK values cannot preserve the dual non-copyable authority provenance. App Kernel passes **231/231**. | `BLOCKED_BY_DUAL_AFFINE_WEAK_IDENTITY_RECEIPT_ABI` |
| 83 | `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#isProductionAdmittedRegistryGeneration` | not created | fresh complete App Kernel lane retained | The guard composes verified, durable and production exact identities with linked-production identity or the governed adapter digest allow-list. Current Fungi/SLIDE/VOK cannot preserve this composite authority graph. App Kernel passes **231/231**. | `BLOCKED_BY_COMPOSITE_AFFINE_PRODUCTION_ADMISSION_ABI` |
| 84 | `packages-galerina/galerina-core-config/src/index.ts#isLoPackageGraphAlias` | not created | fresh complete Core Config lane retained | Anchored ECMAScript `/i` matching is live in host-manifest validation. Physical execution has no regex or case-fold operation; enumerating canonical labels or host normalization changes the accepted domain. Core Config passes **54/54**. | `BLOCKED_BY_CASE_INSENSITIVE_REGEX_TEXT_ABI` |
| 85 | `packages-galerina/galerina-framework-app-kernel/src/production-slide-restore-admission.ts#isAuthenticatedSlideRestoreProfile` | not created | fresh complete App Kernel lane retained | The exact object must be minted into a module-private authenticated-profile WeakSet; an equal spread copy is refused. Current Fungi/SLIDE/VOK cannot preserve this issuer-bound affine seal. App Kernel passes **231/231**. | `BLOCKED_BY_AFFINE_AUTHENTICATED_PROFILE_SEAL_ABI` |
| 86 | `packages-galerina/galerina-governance-telemetry/src/exposition.ts#isFiniteNum` | not created | fresh complete Governance Telemetry lane retained | The total `unknown` guard admits every finite binary64 number and refuses non-numbers, NaN and infinities. The physical surface has neither heterogeneous ingress nor exact binary64. Governance Telemetry passes **21/21**. | `BLOCKED_BY_UNKNOWN_BINARY64_FINITE_GUARD_ABI` |
| 87 | `packages-galerina/galerina-framework-api-server/src/index.ts#isTlsSocket` | not created | fresh complete API Server lane retained | The duck-type guard observes an active object's function-valued property, including possible accessor/proxy behavior. Exact physical records refuse those shapes before Fungi runs and expose no host method-identity ABI. API Server passes **26/26**. | `BLOCKED_BY_HOST_DUCK_TYPED_METHOD_IDENTITY_ABI` |
| 88 | `packages-galerina/galerina-tools-myco/src/query/search.ts#isError` | not created | fresh complete Myco and SLIDE record-ABI lanes retained | The source distinguishes a heterogeneous one-field error/twelve-field result union through JavaScript property presence, including inherited, accessor and proxy observations. The package source is also a read-only mirror whose current upstream bytes differ. Myco passes **80/80** and the exact SLIDE record ABI passes **4/4**. | `BLOCKED_BY_VENDOR_CUSTODY_AND_DYNAMIC_PROPERTY_PRESENCE_ABI` |
| 89 | `packages-galerina/galerina-devtools-impact/src/impact-plan.mjs#isDocumentation` | `packages-galerina/galerina-devtools-impact/src/self-hosted/documentation-path.fungi` | `packages-galerina/galerina-devtools-impact/tests/documentation-path-fungi-conversion.test.mjs` | The exact `docs/` prefix plus three root-file rules pass the live MJS oracle, checked Fungi, GIR, signed Wasm and physical `.slide` publication with independent VOK re-admission and hostile-boundary refusal. Impact passes **9/9** and the governed physical lane passes **10/10**. MJS remains active. | `DONE` (`CANDIDATE`) |
| 90 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vNot` | `packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-not.fungi` | `packages-galerina/galerina-tower-citizen/tests/verdict-not-fungi-conversion.test.mjs` | The complete typed K3 NOT table passes the independent TypeScript oracle, checked Fungi and a dedicated physical `.slide`/VOK typed-Verdict lane. Tower-Citizen passes **509/509** and the physical lane passes **1/1**. Canonical `flip` remains a direct SLIDE-profile follow-on; TypeScript remains active. | `DONE` (`CANDIDATE`) |

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
| `docs/superpowers/specs/2026-08-13-slice-63-bootstrap-floor-adjudication.md` | Fail-closed bootstrap-floor adjudication for core-security's otherwise scalar-compatible decision. | `DONE` |
| `docs/superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md` | Batch work ledger and link to this register. | `IN_PROGRESS` |
| `docs/superpowers/specs/2026-08-13-slices-84-87-boundary-adjudication.md` | Product-owner negative adjudication for the regex/case-fold, affine profile, binary64 `unknown`, and active TLS-object boundaries. | `DONE` |
| `docs/reports/slice-88-myco-search-outcome-guard-fungi-conversion-2026-08-13.md` | Product-owner negative adjudication for the Myco vendor-custody and dynamic object-union boundary. | `DONE` |
| `docs/superpowers/specs/2026-08-13-slice-89-documentation-path-fungi-conversion-design.md` | Bound design for the reference-only documentation-path candidate. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slice-89-documentation-path-fungi-conversion.md` | Test-first implementation and physical-proof plan for Slice 89. | `DONE` |
| `docs/superpowers/specs/2026-08-13-slice-90-vnot-fungi-conversion-design.md` | Bound typed-K3 design and direct-`flip` physical-profile distinction for Slice 90. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slice-90-vnot-fungi-conversion.md` | Test-first implementation and physical-proof plan for Slice 90. | `DONE` |
| `scripts/tests/tower-citizen-vnot-fungi-slide.integration.test.mjs` | Dedicated typed Verdict physical publication, VOK re-admission and hostile-boundary proof for Slice 90. | `DONE` |
| `docs/superpowers/specs/2026-08-13-slice-91-effective-verdict-fungi-conversion-design.md` | Bound two-Verdict Kleene-minimum design for Slice 91. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slice-91-effective-verdict-fungi-conversion.md` | Test-first implementation and physical-proof plan for Slice 91. | `DONE` |
| `scripts/tests/tower-citizen-effective-verdict-fungi-slide.integration.test.mjs` | Dedicated two-Verdict physical publication, VOK re-admission and hostile-boundary proof for Slice 91. | `DONE` |
| `governance/conversion-queue-decisions.json` | Seven current symbol-scoped candidate decisions; blocked follow-on scopes grant no candidate authority. | `DONE` |
| `build/conversion-queue/queue.json` | Generated seven-candidate queue; follow-on blockers do not enter the candidate authority list. | `DONE` |
| `build/conversion-queue/QUEUE.md` | Human-readable generated queue. | `DONE` |
| `scripts/lib/scalar-classifier-fungi-proof.mjs` | Shared interpreter and signed-Wasm differential proof helper. | `DONE` |
| `packages-galerina/galerina-core-compiler/src/interpreter.ts` | Preserve quoted reserved names as String match patterns. | `DONE` |
| `packages-galerina/galerina-core-compiler/tests/wat-string-match.test.mjs` | Interpreter/Wasm regression for quoted reserved names. | `DONE` |
| `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs` | Distinct physical SLIDE/VOK receipts for Slices 33, 34, 35, 36 and 44; exact compile-refusal evidence for Slices 37 and 65; executable seven-pass/eight-refuse flat-match boundary. | `DONE` |
| `governance/phase-close-commands.json` | Register the physical batch test in the governed test inventory. | `DONE` |
| Private `translating-typescript-to-fungi` skill repository | Duplicate-conversion preflight remains binding; private repository custody, bounded reachable-history scanning, pinned CI and protected `main` are verified at `9654753`. | `DONE` |
| Private `writing-fungi` skill repository | The batch-level semantic result remains `NO_SKILL_UPDATE`; later binding authoring rules and private repository custody are verified at `d2d955e`. | `DONE` |

## Shared closure status

The Slice 91 bounded decision is complete. The authored TODO, active roadmap
and live conversion register are updated. Focused source, physical boundary,
roadmap, graph and generated-owner checks are current at their relevant input
build points. The final navigation index is independently refreshed after the
last owned-output commit. The excluded aggregate lanes are not substitutes for
these bounded owners, so repository-wide closure remains `UNKNOWN`.

| Closure item | Status |
|---|---|
| `docs/TODO.md` | `DONE` |
| `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md` | `DONE` (authored section and generated subway block) |
| Retirement and conversion queue | `DONE` at 1,484/1,484, seven scoped candidates and 854 blockers |
| Package, project and KB graphs | `DONE` at 100/201, 5/5 and 4/4 |
| Dev-tool and Fungi-source inventories | `DONE` at 100 packages / 172 tools / 40 proofs and 146 Fungi files |
| Semantic, percentage, status, code-index and subway owners | `DONE` at 3/3 with 971 test nodes, three sections, current status blocks, 974 codes and 5/5 |
| Private Fungi skill repositories | `DONE` (`dc2ef82f` writing skill; `30eb4dd3` translation skill; both remain private custody; Slice 91 required no duplicate rule) |
| Final codebase graph and Myco navigation refresh | `DONE`: the moderate code graph conserves expected nodes and reports `stale: false` at the exact final commit; Myco indexes the non-vendored repository corpus and reports a current build. Exact live counts are read from the tools rather than frozen as authority here. |

## Verified refusal retained outside the batch

`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#requiresAuth`
is `BLOCKED_BY_BOOTSTRAP_FLOOR`. Its negative design record is complete; it is
not one of Slices 33–43 and no Fungi asset was produced.

## Current focused evidence

- Slice 90's dedicated typed-Verdict physical SLIDE/VOK lane passes `1/1`,
  with every K3 row and the complete hostile mutation/refusal matrix inside
  that one bounded test. Earlier shared classifier-lane counts remain their
  own historical checkpoints; they are not combined into a manufactured
  current aggregate.
- Slice 44 proves all eight declared Omni labels plus hostile strings through
  the differential and physical surfaces.
- Slice 65 re-tests Slice 45's transition decision. All 49 declared pairs plus
  hostile labels still pass interpretation and signed Wasm. The pin accepts
  the two-String signature, but three complete equivalent bodies refuse at the
  physical function block ceiling; the original asset is restored.
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
- Slice 35's four-plus-four helper decomposition is now the package-owned asset
  and passes complete interpreter, signed-Wasm and physical SLIDE/VOK proof.
- Slice 37 remains blocked: both a three-helper flat composition and a bounded
  helper tree refused. Widening a registry ceiling is not authorized by these
  probes.
- Slice 65 remains blocked: the unchanged transition graph, a shallow Boolean
  form and an outer nested-match form all refuse with `SLIDE-REF-LIMIT-002`.
  No parameter packing or SLIDE ceiling change is authorized.
- Slice 66 stopped before implementation. The authoritative queue derives the
  compiler bootstrap floor even though the file ledger row has no explicit
  `declaredFloor`; no candidate, asset or test was retained.
- Slice 67 remains blocked without a placeholder asset. Its platform/locale
  path identity is live on registry load, persistence and bootstrap paths; no
  ASCII-only or host-precomputed substitute is authorized.
- Slice 68 remains blocked without a placeholder asset. The exported
  `HardwareProfile` projection crosses a complete record boundary containing
  two JavaScript `number` fields; the pinned physical profile has signed-i32
  `Int` and no binary64 `Float`. A host-projected String is not record parity.
- Slice 69 remains blocked without a placeholder asset. Its live project and
  environment configuration callers depend on a runtime-key read from an open
  unknown-valued record and the distinct `true`/`false`/`undefined` result; the
  pinned physical surface has neither that lookup nor `Option<Bool>`.
- Slice 70 remains blocked without a placeholder asset. Tritsocket's exported
  `packedLen` accepts the full JavaScript binary64 domain and applies addition,
  division and `Math.floor`; signed-i32 `Int` cannot conserve its fractions,
  non-finite values, signed zero or wider intermediates.
- Slice 71 remains blocked without a placeholder asset. Its three governance
  labels fit the String match ceiling, but the exact function is a type guard
  over all JavaScript `unknown` values; a String-only flow or host type
  pre-filter would narrow or retain the decision in TypeScript.
- Slice 72 remains blocked without a placeholder asset. Registry freshness
  distinguishes an absent floor and otherwise uses JavaScript UTF-16 String
  ordering; the pinned surface has neither `Option<String>` nor that exact
  relational text operation.
- Slice 73 remains blocked without a placeholder asset. Its anchored
  identifier regex is live for definition and state-name diagnostics. Current
  physical execution has neither regex nor source-equivalent UTF-16
  length/code-unit traversal, and bounded well-formed text ingress would
  narrow the source domain. Core Logic passes **57/57**.
- Slice 74 remains blocked without a placeholder asset. The exported generic
  `QueryOption<T>` type guard cannot be replaced by a concrete Fungi
  `Option<Int>`, a host-projected tag or a precomputed Boolean. The pinned
  physical type table has no generic arbitrary-payload tagged-union parameter.
  Data Query passes **19/19**.
- Slice 75 remains blocked without a placeholder asset. The reconciled pin has
  exact two-String suffix execution, but not the configuration-derived dynamic
  `Array<String>` parameter or the source's unbounded JavaScript UTF-16 domain.
  Hard-coding default extensions would discard live package configuration.
  Package Graph passes **28/28**.
- Slice 76 remains blocked without a placeholder asset. `isTrit` is a live
  heterogeneous type guard whose false result drives explicit malformed-input
  denial. Physical `Verdict` or `Int` parameters narrow that source domain,
  while boundary refusal is not the same Boolean result. Tower-Citizen passes
  **507/507**.
- Slices 84-87 remain blocked without placeholder assets. Duplicate preflight
  rejected `isLiteralVerificationSuccess` and `isImplicitReturnType` because
  their exact package-owned Fungi proofs already exist; Core Security's
  `isSensitiveHeaderName` was rejected at its bootstrap floor. The four
  admitted scopes retain exact regex/case-fold, affine authenticated-profile,
  heterogeneous binary64 and active host-object boundaries. Their package
  lanes pass **54/54**, **231/231**, **21/21** and **26/26** respectively.
- Slice 89 is a complete reference candidate, not a consumer switch. The exact
  fixed documentation-path decision passes Impact **9/9** and the governed
  physical SLIDE/VOK lane **10/10**; MJS remains active pending retirement
  authority.
- Slice 90 is a complete reference candidate, not a consumer switch or
  whole-file proof. The typed K3 NOT table passes Tower-Citizen **509/509** and
  a dedicated physical SLIDE/VOK lane **1/1**. The pin proves the exhaustive
  typed `check` desugaring, not direct canonical `flip` support.
- Slice 91 is a complete reference candidate, not a consumer switch or
  whole-file proof. The exact two-Verdict K3 minimum passes Tower-Citizen
  **511/511** and a dedicated physical SLIDE/VOK lane **1/1**. All nine rows
  preserve typed Verdict values and release no authority.
