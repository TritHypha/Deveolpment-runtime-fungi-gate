# Fungi Conversion Batch 33-217 File Status

This is the live operational register for the bounded conversion batch. The binding
design and work ledger are in
[`../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md`](../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md).
The current ten-slice decision plan is
[`../superpowers/plans/2026-08-13-slices-208-217-metrics-collector-state.md`](../superpowers/plans/2026-08-13-slices-208-217-metrics-collector-state.md).
Slice 197 closed the last approved graph/index/roadmap boundary. Slice 222 is
the next boundary; crash-linked aggregate lanes remain excluded.

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
| 91 | `packages-galerina/galerina-tower-citizen/src/substrate-model.ts#effectiveVerdict` | `packages-galerina/galerina-tower-citizen/src/self-hosted/effective-verdict.fungi` | `packages-galerina/galerina-tower-citizen/tests/effective-verdict-fungi-conversion.test.mjs` | The complete typed K3 minimum table passes the independent TypeScript oracle, checked Fungi and a dedicated two-Verdict physical `.slide`/VOK lane. Tower-Citizen passes **511/511** and the physical lane passes **1/1**. TypeScript remains active. | `DONE` (`CANDIDATE`) |
| 92 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vOr` | `packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-or.fungi` | `packages-galerina/galerina-tower-citizen/tests/verdict-or-fungi-conversion.test.mjs` | The complete typed K3 maximum table passes the independent TypeScript oracle, checked Fungi and a dedicated two-Verdict physical `.slide`/VOK lane. Tower-Citizen passes **513/513** and the physical lane passes **1/1**. TypeScript and every caller remain active. | `DONE` (`CANDIDATE`) |
| 93 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vAnd` | existing `packages-galerina/galerina-tower-citizen/src/self-hosted/effective-verdict.fungi` | `packages-galerina/galerina-tower-citizen/tests/verdict-and-fungi-supersession.test.mjs` | The direct export and existing Fungi flow match all nine literal K3-minimum rows. A duplicate `verdict-and.fungi` is explicitly refused. Tower-Citizen passes **515/515**, the direct proof **2/2**, and the inherited physical SLIDE/VOK proof **1/1** with zero skips. TypeScript remains active. | `DONE` (`SUPERSEDED_BY_EXISTING_FUNGI`) |
| 94 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#allOf` | not created | existing complete Tower-Citizen lane retained | The arbitrary-length readonly Verdict-array fold includes empty→Unknown, single-element identity, ordered K3 minimum and malformed-element refusal. The selected physical profile admits scalar Bool/Verdict parameters, not `Array<Verdict>` length/index/fold semantics. Host projection is refused. Tower-Citizen passes **515/515**. | `BLOCKED_BY_VERDICT_ARRAY_FOLD_ABI` |
| 95 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#anyOf` | not created | existing complete Tower-Citizen lane retained | The symmetric arbitrary-length Verdict-array fold includes empty→Unknown, single-element identity, ordered K3 maximum and malformed-element refusal. Scalar Slice 92 proof is not array parity; the current physical profile has no admitted array ABI. Tower-Citizen passes **515/515**. | `BLOCKED_BY_VERDICT_ARRAY_FOLD_ABI` |
| 96 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#collapse` | existing `packages-galerina/galerina-tower-citizen/src/self-hosted/authorization-boundary.fungi#collapseVerdict` | `packages-galerina/galerina-tower-citizen/tests/collapse-boundary-fungi-conversion.test.mjs` | The existing direct proof passes all three K3 rows; the physical `.slide`/VOK String lane passes 1/1 with zero skips and hostile/mutation refusal. Tower-Citizen passes **515/515**. TypeScript remains active. | `DONE` (`SUPERSEDED_BY_EXISTING_FUNGI`) |
| 97 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#authorize` | existing `packages-galerina/galerina-tower-citizen/src/self-hosted/authorization-boundary.fungi#authorizeVerdict` | `packages-galerina/galerina-tower-citizen/tests/authorization-boundary-fungi-conversion.test.mjs` | The existing direct proof passes all three K3 rows; the physical `.slide`/VOK Bool lane passes 1/1 with zero skips and hostile/mutation refusal. Tower-Citizen passes **515/515**. TypeScript remains active. | `DONE` (`SUPERSEDED_BY_EXISTING_FUNGI`) |
| 98 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#decideAtBoundary` | not created | existing complete Tower-Citizen lane retained | Exact parity requires the complete boundary record, an absent/present structured diagnostic and optional exactly-once callback effect. The current physical profile has no corresponding Option/record/callback ABI; host reassembly is refused. Tower-Citizen passes **515/515**. | `BLOCKED_BY_OPTION_RECORD_CALLBACK_ABI` |
| 99 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vAndTensor` | not created | `packages-galerina/galerina-tower-citizen/tests/vand-tensor.test.mjs` | Exact parity requires two `Int8Array` inputs, equal-length and per-element validation, bounded index traversal, result allocation and typed-array output. Scalar K3 minimum is not the container boundary. | `BLOCKED_BY_TYPED_ARRAY_TRAVERSAL_ABI` |
| 100 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vAndTensor2D` | not created | `packages-galerina/galerina-tower-citizen/tests/vand-tensor.test.mjs` | The Slice 99 boundary additionally requires full JavaScript-number integer/non-negative shape validation and binary64 multiplication. Signed-i32 narrowing is refused. The shared focused file passes **8/8**. | `BLOCKED_BY_TYPED_ARRAY_BINARY64_SHAPE_ABI` |
| 101 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#consensusTritN` | not created | `packages-galerina/galerina-tower-citizen/tests/consensus-confidence.test.mjs` | Exact parity requires arbitrary Verdict-array traversal, malformed-element refusal, signed accumulation and empty/tie→Unknown behavior. Fixed-arity/scalar proof is insufficient. | `BLOCKED_BY_VERDICT_ARRAY_ACCUMULATOR_ABI` |
| 102 | `packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#collapseConfidence` | not created | `packages-galerina/galerina-tower-citizen/tests/consensus-confidence.test.mjs` | Exact parity requires a three-binary64-field record, optional threshold, finite/NaN/range/normalization/tolerance and strict-argmax semantics. The physical profile has no source-equivalent binary64 record ABI. The shared focused file passes **7/7**. | `BLOCKED_BY_BINARY64_CONFIDENCE_RECORD_ABI` |
| 103 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#asTrit` | not created | existing arithmetic/governance proof retained | The sole number-to-arithmetic-Trit mint validates the complete JavaScript binary64 domain. Physical Int narrows that domain and erases the brand; Verdict assigns governance authority. | `BLOCKED_BY_ARITH_TRIT_BRAND_BINARY64_ABI` |
| 104 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#negTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs` | The internal raw-number helper validates full binary64 input, normalises negative zero and is shared by separate arithmetic/governance faces. Signed i32 narrows the guard. | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 105 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#negT` | not created | direct branded-entry probe retained | The public arithmetic face requires a distinct nominal Trit in source and physical receipts; Int erases it and Verdict crosses an authority boundary. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 106 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#sumTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/governance-algebra-binding.test.mjs` | Balanced-ternary SUM is not K3 governance: `-1 + -1 -> +1`. Treating arithmetic Trit as Verdict could mint Allow-shaped authority. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 107 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#xorTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs` | The arithmetic SUM alias inherits the distinct nominal Trit boundary and complete balanced-ternary table. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 108 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#carryTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs` | The carry digit is arithmetic data, not a governance Verdict; the physical profile cannot preserve that nominal distinction. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 109 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#addTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs` | Exact parity needs `{ sum: Trit; carry: Trit }` with member names and arithmetic type identity. Host packing or scalar decomposition moves record assembly outside the source. | `BLOCKED_BY_ARITH_TRIT_RECORD_ABI` |
| 110 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#mulTrit` | not created | `packages-galerina/galerina-tower-citizen/tests/ternary-ops.test.mjs` | Balanced-ternary multiplication returns arithmetic Trit; it is not governance conjunction and cannot use physical Verdict identity. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 111 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#minTrit` | not created | existing arithmetic/governance proof retained | The internal raw-number primitive validates two binary64 values before serving separately typed faces. Existing K3 minimum proves only the Verdict face. | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 112 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#maxTrit` | not created | existing arithmetic/governance proof retained | The symmetric raw-number primitive retains the same binary64 guard and shared-face boundary. Existing K3 maximum is not internal-source parity. | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 113 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#consensusTrit` | not created | arithmetic/governance and 27-vector proofs retained | The three inputs and result are arithmetic Trits. Majority can outvote a deny-shaped input; physical Verdict would assign authority and physical Int would erase identity. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 114 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#tritBitShift` | not created | packing/fidelity proof retained | The private helper accepts JavaScript binary64 and uses remainder, division and bitwise truncation. Signed-i32 ingress narrows the source domain. | `BLOCKED_BY_BINARY64_BITWISE_INDEX_ABI` |
| 115 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.constructor` | not created | complete focused simulator lane retained | Construction validates number-domain size, allocates mutable `Int32Array`, stamps canaries and retains active logger/governance identities. | `BLOCKED_BY_ACTIVE_OBJECT_TYPED_MEMORY_ABI` |
| 116 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.setScale` | not created | focused scale/lifecycle proof retained | Unrestricted binary64 is stored in live instance state; the physical profile has neither Float nor mutable class-state identity. | `BLOCKED_BY_BINARY64_MUTABLE_INSTANCE_ABI` |
| 117 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.verifyIntegrity` | not created | clean/planted-canary proof retained | Canary corruption must erase secret state and reset the instance before the typed integrity failure crosses the boundary. | `BLOCKED_BY_TYPED_MEMORY_ERASE_FAULT_ABI` |
| 118 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.boundsCheck` | not created | negative/fractional/out-of-range proof retained | The private method compares binary64 index with retained instance size and throws exact `SecurityTrap`; physical Int or host pre-validation narrows behavior. | `BLOCKED_BY_BINARY64_INSTANCE_FAULT_ABI` |
| 119 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.getTrit` | not created | round-trip, packing and illegal-code proof retained | Exact instance bounds, indexed typed-memory read, unsigned bit extraction and distinct `0b11` integrity fault are required. | `BLOCKED_BY_TYPED_MEMORY_BITPACK_ABI` |
| 120 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.eraseOnTrap` | not created | erase-on-failure proof retained | The generic callback executes once and every failure erases complete state before the original failure crosses the boundary. Bare Result propagation is insufficient. | `BLOCKED_BY_HIGHER_ORDER_ERASE_ON_FAILURE_ABI` |
| 121 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.setTrit` | not created | value/bounds/mutation/cleanup proof retained | Exact two-bit read-modify-write acts on live `Int32Array` state and erases the complete instance on any nested failure. | `BLOCKED_BY_TYPED_MEMORY_MUTATION_ABI` |
| 122 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.gate` | not created | gate/governance/audit proof retained | The method coordinates packed state, live GovernanceEnforcer, exact AuditLogger records, mutation and erase-on-failure. Host projection retains authority. | `BLOCKED_BY_ACTIVE_GOVERNANCE_AUDIT_ABI` |
| 123 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#SecurityTrap` | not created | exact error behavior retained | JavaScript Error-class identity, prefixed message, name, `instanceof` and stack observations have no admitted physical equivalent. | `BLOCKED_BY_JAVASCRIPT_ERROR_IDENTITY_ABI` |
| 124 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLIntegrityFault` | not created | exact integrity-error behavior retained | JavaScript Error-class identity and its distinct catch route cannot be reconstructed by a host wrapper without changing authority. | `BLOCKED_BY_JAVASCRIPT_ERROR_IDENTITY_ABI` |
| 125 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TritState` | not created | exhaustive enum behavior retained | Arithmetic Trit enum-object identity and its Reject/Hold/Commit members are not interchangeable with governance Verdict or plain Int. | `BLOCKED_BY_ARITH_TRIT_ENUM_OBJECT_ABI` |
| 126 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#Trit` | not created | nominal type behavior retained | The nominal arithmetic Trit brand is erased by the current physical scalar profile. | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 127 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#encodeTrit` | not created | encoding/failure vectors retained | Exact arithmetic-brand ingress, two-bit encoding and distinct JavaScript Error behavior lack one admitted boundary. | `BLOCKED_BY_BINARY64_TRIT_ENCODING_FAULT_ABI` |
| 128 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#decodeTrit` | not created | decoding/failure vectors retained | Exact binary64 code validation and distinct illegal-code fault behavior cannot be narrowed to physical Int. | `BLOCKED_BY_BINARY64_TRIT_DECODING_FAULT_ABI` |
| 129 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#assertTrit` | not created | validation/failure vectors retained | The guard must preserve binary64 input behavior, nominal arithmetic identity and the exact JavaScript Error exit. | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 130 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.tmacVector` | not created | vector/state/T-MAC proof retained | Stateful typed-array traversal and mutation, retained scale and exact output identity have no admitted physical transaction. | `BLOCKED_BY_TYPED_ARRAY_STATEFUL_TMAC_ABI` |
| 131 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.loadWeights` | not created | load/mutation/failure proof retained | JavaScript number-array validation and active packed-memory mutation cannot be projected through the host without changing semantics. | `BLOCKED_BY_NUMBER_ARRAY_MUTATION_ABI` |
| 132 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.erase` | not created | erase/reset proof retained | Packed state, canaries, binary64 scale and live governance reset form one observable cleanup transaction. | `BLOCKED_BY_TYPED_MEMORY_RESET_CAPABILITY_ABI` |
| 133 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.snapshot` | not created | snapshot/packing proof retained | Reads live integrity-checked packed memory and allocates an ordered number array; immutable array transport is not active-state authority. | `BLOCKED_BY_TYPED_MEMORY_ARRAY_SNAPSHOT_ABI` |
| 134 | `packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.packedByteLength` | not created | packing-size proof retained | Observes retained instance layout; a host-derived scalar would prove a different program. | `BLOCKED_BY_MUTABLE_INSTANCE_SIZE_ABI` |
| 135 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.constructor` | not created | audit modes/tick/egress proof retained | Constructs a mutable audit object with binary64 normalization, callback/capability identity, host directory effect, buffer and sequence state. | `BLOCKED_BY_HOST_AUDIT_OBJECT_ABI` |
| 136 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.append` | not created | event/tick/egress proof retained | Clock, sequence, record, JSON and selected memory/buffer/filesystem/egress effect form one observable transaction. | `BLOCKED_BY_CLOCK_RECORD_EGRESS_TRANSACTION_ABI` |
| 137 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.flush` | not created | batch/egress flush proof retained | Retained capability invocation and durable ordered write must complete before buffer clear; partial failure cannot be projected. | `BLOCKED_BY_ACTIVE_EGRESS_DURABILITY_ABI` |
| 138 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.pendingCount` | not created | pending-before/after-flush proof retained | Reads live mutable buffer length; a host-supplied count loses instance provenance and ordering. | `BLOCKED_BY_MUTABLE_INSTANCE_OBSERVATION_ABI` |
| 139 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.load` | not created | LOAD/lifecycle proof retained | Exact LOAD record construction delegates to the active append transaction. | `BLOCKED_BY_AUDIT_RECORD_APPEND_ABI` |
| 140 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.exec` | not created | EXEC/lifecycle proof retained | Exact EXEC record construction, including input hash, delegates to active append. | `BLOCKED_BY_AUDIT_RECORD_APPEND_ABI` |
| 141 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.trap` | not created | TRAP detail/governance proof retained | Open record spread and collision precedence plus denied active append are not a closed-record ABI. | `BLOCKED_BY_DYNAMIC_RECORD_AUDIT_APPEND_ABI` |
| 142 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.erase` | not created | ERASE/lifecycle proof retained | Optional property/wire state, conditional severity/authority and active append must remain exact. | `BLOCKED_BY_OPTION_RECORD_AUDIT_APPEND_ABI` |
| 143 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.query` | not created | query/lifecycle proof retained | Selects live memory or host JSONL, silently drops malformed rows, applies ordered filters and JavaScript slice semantics. | `BLOCKED_BY_HOST_LEDGER_QUERY_ABI` |
| 144 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.logTransition` | not created | TPL transition/audit proof retained | Binary64 fields, optional/defaulted record members and active append require one admitted graph. | `BLOCKED_BY_BINARY64_OPTION_RECORD_AUDIT_APPEND_ABI` |
| 145 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLogger.getLifecycle` | not created | lifecycle fold proof retained | Active query, array allocation, unknown-value string coercion and membership folds cannot be host-prepared. | `BLOCKED_BY_AUDIT_ARRAY_FOLD_ABI` |
| 146 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#TowerAuditEvent` | not created | event shape/consumer proof retained | Complete heterogeneous record includes open unknown details and optional binary64 tick beyond the admitted descriptor. | `BLOCKED_BY_AUDIT_EVENT_RECORD_ABI` |
| 147 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#EgressSink` | not created | governed egress/chain proof retained | Retained push/flush effect capability requires exact identity, ordering, durability, failure and revocation. | `BLOCKED_BY_ACTIVE_EGRESS_CAPABILITY_ABI` |
| 148 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditFilter` | not created | query/filter proof retained | Optional strings/unions plus JavaScript binary64 limit and truthy/negative-slice semantics exceed the admitted record/Option profile. | `BLOCKED_BY_OPTION_BINARY64_FILTER_RECORD_ABI` |
| 149 | `packages-galerina/galerina-tower-citizen/src/audit-logger.ts#AuditLoggerOptions` | not created | construction/tick/egress proof retained | Optional binary64, retained tick callback and active egress capability are construction behavior, not immutable transport. | `BLOCKED_BY_HOST_CALLBACK_EGRESS_OPTIONS_ABI` |
| 150 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#AttestationPolicy` | not created | policy/key/revocation proof retained | Optional policy fields, hash array, ML-DSA bytes and throwing revocation callback have no exact admitted record/capability ABI. | `BLOCKED_BY_CRYPTO_POLICY_CALLBACK_RECORD_ABI` |
| 151 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#AttestationResult` | not created | exact result-shape proof retained | Boolean with independently optional reason/hash properties is not the pinned record/Option<String> wire surface and grants no verification authority. | `BLOCKED_BY_OPTIONAL_ATTESTATION_RESULT_RECORD_ABI` |
| 152 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestationHash` | not created | canonical-manifest/hash proof retained | Exact UTF-8 canonicalization, SHA-256 and lowercase hex require an independently admitted crypto/manifest ABI. | `BLOCKED_BY_CANONICAL_MANIFEST_SHA256_HOST_ABI` |
| 153 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#signManifest` | not created | signing/tamper proof retained | PEM private-key parsing, exact Ed25519 signing, Buffer and base64 cross key-custody and host-crypto boundaries. | `BLOCKED_BY_ED25519_PRIVATE_KEY_SIGNING_ABI` |
| 154 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#verifyAttestation` | not created | classical verifier proof retained | Shape/hash/pin/key/signature/revocation and caught-failure facts require one independent verifier receipt; the policy twin is narrower. | `BLOCKED_BY_CRYPTOGRAPHIC_ATTESTATION_VERIFIER_ABI` |
| 155 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#generateAttestationKeypair` | not created | keygen/wrong-key proof retained | Host entropy, Ed25519 key objects and private PKCS8 export require isolated key custody and lifecycle receipts. | `BLOCKED_BY_ED25519_KEYGEN_PRIVATE_CUSTODY_ABI` |
| 156 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestBridge` | not created | signed-bridge/delegation proof retained | Missing-manifest Error identity, getters and lifecycle method delegation require an active leased bridge object. | `BLOCKED_BY_ACTIVE_BRIDGE_DELEGATION_OBJECT_ABI` |
| 157 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#generateHybridAttestationKeypair` | not created | hybrid/no-downgrade proof retained | Async dynamic ML-DSA import, random seed, two keygens, PEM and mutable key arrays lack a hybrid custody transaction. | `BLOCKED_BY_HYBRID_KEYGEN_RANDOM_CUSTODY_ABI` |
| 158 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#signManifestHybrid` | not created | hybrid signing proof retained | Canonical bytes, Ed25519/ML-DSA-65, context, private keys, dynamic import, base64 and async failure need one isolated signing ABI. | `BLOCKED_BY_HYBRID_SIGNING_ASYNC_CRYPTO_ABI` |
| 159 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#verifyAttestationHybrid` | not created | hybrid verifier/no-downgrade proof retained | Classical plus PQ verification, optional hash, context, caught errors and dynamic import require an independent hybrid verifier receipt. | `BLOCKED_BY_HYBRID_CRYPTO_VERIFIER_ASYNC_ABI` |
| 160 | `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestBridgeHybrid` | not created | active bridge delegation proof retained | Hybrid signing, missing-manifest Error, getters and lifecycle delegation require an affine active bridge lease. | `BLOCKED_BY_HYBRID_ACTIVE_BRIDGE_DELEGATION_ABI` |
| 161 | `packages-galerina/galerina-inference-bridge-contract/src/precision-types.ts#PrecisionTechnique` | not created | declaration accounted | Erased four-string vocabulary has no runtime body; its future Fungi ABI needs injective exhaustive mapping and surplus refusal. | `NO_RUNTIME_BEHAVIOR` |
| 162 | `packages-galerina/galerina-inference-bridge-contract/src/precision-types.ts#QuantizationMethod` | not created | declaration accounted | Erased seven-string vocabulary has no runtime body; manifest consumers own validation and behavior. | `NO_RUNTIME_BEHAVIOR` |
| 163 | `packages-galerina/galerina-inference-bridge-contract/src/precision-types.ts#SchedulingTechnique` | not created | declaration accounted | Erased two-string vocabulary names scheduling modes but implements no scheduling behavior. | `NO_RUNTIME_BEHAVIOR` |
| 164 | `packages-galerina/galerina-inference-bridge-contract/src/precision-types.ts#InferenceOpClass` | not created | declaration accounted | Erased six-string vocabulary has no body; callers own the unknown-class full-precision floor. | `NO_RUNTIME_BEHAVIOR` |
| 165 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#FixedScale` | not created | declaration accounted | Erased record accepts binary64 numbers despite integer intent and performs no width/range validation. | `NO_RUNTIME_BEHAVIOR` |
| 166 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#BridgeOp` | not created | declaration accounted | Erased object combines typed-array/number union, binary64 and optional fields; producers/consumers own the live boundary. | `NO_RUNTIME_BEHAVIOR` |
| 167 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#BridgeResult` | not created | declaration accounted | Erased object validates neither binary64 results nor native/determinism claims; consumers own verification. | `NO_RUNTIME_BEHAVIOR` |
| 168 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#InferenceBridge` | not created | declaration accounted | Erased active-object interface combines optional attestation, sync/async lifecycle effects and an execution capability; a record is not an affine bridge lease. | `NO_RUNTIME_BEHAVIOR` |
| 169 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#BridgeRegistry` | not created | declaration accounted | Erased `ReadonlyMap` alias performs no registration, duplicate, ownership, revocation or lookup behavior. | `NO_RUNTIME_BEHAVIOR` |
| 170 | `packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#assertDeterminism` | not created | determinism/error proof retained | Exact parity needs the complete binary64/string result object, independently grounded determinism evidence and observable JavaScript Error identity. | `BLOCKED_BY_TYPED_BRIDGE_RESULT_AND_ERROR_IDENTITY_ABI` |
| 171 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#DeterminismMode` | not created | declaration accounted | Erased four-string vocabulary is part of the signed pre-image but proves no determinism evidence; future mapping must be injective and exhaustive. | `NO_RUNTIME_BEHAVIOR` |
| 172 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#CertificationProfile` | not created | declaration accounted | Erased two-string vocabulary grants no certified authority; exact signed-pre-image spelling and surplus refusal remain mandatory. | `NO_RUNTIME_BEHAVIOR` |
| 173 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#BridgeDomain` | not created | declaration accounted | Erased two-string vocabulary performs no validation; future mapping must preserve exact spellings and refuse surplus values. | `NO_RUNTIME_BEHAVIOR` |
| 174 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#ToleranceWitness` | not created | declaration accounted | Erased binary64/string record validates no sample, residual, noise identity or measured provenance. | `NO_RUNTIME_BEHAVIOR` |
| 175 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#BridgeManifest` | not created | declaration accounted | Erased required/optional record grants no signature, hardware or certification authority. | `NO_RUNTIME_BEHAVIOR` |
| 176 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#BridgeAttestation` | not created | declaration accounted | Erased manifest/signature transport performs no decoding, verification, freshness or revocation. | `NO_RUNTIME_BEHAVIOR` |
| 177 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#canonNum` | not created | injectivity proof retained | Exact finite binary64 plus distinct NaN/infinity sentinels cannot cross the current no-NaN Fungi boundary without host projection. | `BLOCKED_BY_BINARY64_NONFINITE_SENTINEL_WIRE_ABI` |
| 178 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#canonicalManifestString` | not created | canonical-preimage proof retained | Ordered optional tiers, nested witness encoding, binary64 and exact `JSON.stringify` bytes form signing authority. | `BLOCKED_BY_EXACT_JSON_BINARY64_OPTION_RECORD_ABI` |
| 179 | `packages-galerina/galerina-inference-bridge-contract/src/manifest.ts#validateManifestShape` | not created | structural-negative proof retained | Complete optional manifest, SHA-256 regex, binary64 ranges, nested invariants and exact reason object lack one admitted boundary. | `BLOCKED_BY_OPEN_MANIFEST_REGEX_BINARY64_RESULT_ABI` |
| 180 | `packages-galerina/galerina-inference-bridge-contract/src/oracle.ts#TernaryOracle` | not created | declaration accounted | Erased interface implements no oracle, authentication or ground-truth proof; execution is an active capability. | `NO_RUNTIME_BEHAVIOR` |
| 181 | `packages-galerina/galerina-inference-bridge-contract/src/oracle.ts#oracleAgrees` | not created | numeric/oracle proof retained | JavaScript ToInt32 over two complete binary64 result records is not ordinary Fungi integer equality. | `BLOCKED_BY_BINARY64_TOINT32_BRIDGE_RESULT_ABI` |
| 182 | `packages-galerina/galerina-inference-bridge-contract/src/index.ts` | not created | public consumer proof retained | Type exports erase, but runtime re-exports and package export-map identity remain a live public ESM boundary. | `BLOCKED_BY_PUBLIC_ESM_EXPORT_AND_MODULE_IDENTITY_ABI` |
| 183 | `packages-galerina/galerina-observability/src/health.ts#HealthStatus` | not created | declaration accounted | Erased UP/DOWN vocabulary performs no validation; exact spelling and surplus refusal remain required. | `NO_RUNTIME_BEHAVIOR` |
| 184 | `packages-galerina/galerina-observability/src/health.ts#HealthKind` | not created | declaration accounted | Erased liveness/readiness vocabulary implements neither aggregation nor routing. | `NO_RUNTIME_BEHAVIOR` |
| 185 | `packages-galerina/galerina-observability/src/health.ts#ComponentHealth` | not created | declaration accounted | Erased status/detail record validates no optional text, length, safety or provenance. | `NO_RUNTIME_BEHAVIOR` |
| 186 | `packages-galerina/galerina-observability/src/health.ts#HealthCheck` | not created | declaration accounted | Erased sync/async callback alias implements no execution, cancellation, timeout or failure rule. | `NO_RUNTIME_BEHAVIOR` |
| 187 | `packages-galerina/galerina-observability/src/health.ts#HealthReport` | not created | declaration accounted | Erased aggregate/open-map record validates neither component keys/results nor derived status. | `NO_RUNTIME_BEHAVIOR` |
| 188 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistryOptions` | not created | declaration accounted | Erased optional timeout/callback record performs no numeric validation or capability control. | `NO_RUNTIME_BEHAVIOR` |
| 189 | `packages-galerina/galerina-observability/src/health.ts#coerce` | not created | health-ingress proof retained | Open host union, null/malformed refusal, optional detail and UTF-16 slice semantics lack one admitted ingress ABI. | `BLOCKED_BY_OPEN_HOST_RESULT_OPTION_STRING_ABI` |
| 190 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.constructor` | not created | construction/timeout proof retained | Two mutable maps, binary64 timeout validation and retained injected or ambient timer callbacks form an active object. | `BLOCKED_BY_MUTABLE_MAP_TIMER_CALLBACK_BINARY64_ABI` |
| 191 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.registerLiveness` | not created | registry mutation proof retained | Arbitrary-key callback retention/replacement, private mutation and exact `this` identity require an affine registry ABI. | `BLOCKED_BY_MUTABLE_CALLBACK_REGISTRY_AND_THIS_IDENTITY_ABI` |
| 192 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.registerReadiness` | not created | registry mutation proof retained | Same active semantics as liveness registration on a distinct readiness map. | `BLOCKED_BY_MUTABLE_CALLBACK_REGISTRY_AND_THIS_IDENTITY_ABI` |
| 193 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.unregister` | not created | dual-map deletion proof retained | Both private maps mutate for one arbitrary key and the identical registry object returns for chaining. | `BLOCKED_BY_DUAL_MUTABLE_MAP_DELETE_AND_THIS_IDENTITY_ABI` |
| 194 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.liveness` | not created | active liveness route proof retained | The method selects the liveness map/kind and delegates to callback/timer evaluation returning a complete asynchronous report. | `BLOCKED_BY_ACTIVE_ASYNC_HEALTH_REGISTRY_ABI` |
| 195 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.readiness` | not created | active readiness route proof retained | The independent readiness map/kind drives traffic-shedding report behavior through the same active evaluator. | `BLOCKED_BY_ACTIVE_ASYNC_HEALTH_REGISTRY_ABI` |
| 196 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.#evaluate` | not created | async aggregation proof retained | Ordered Map snapshot, all-check scheduling, order-preserving completion, open component-map mutation and fail-closed fold lack one admitted ABI. | `BLOCKED_BY_ASYNC_CALLBACK_MAP_AGGREGATION_ABI` |
| 197 | `packages-galerina/galerina-observability/src/health.ts#HealthRegistry.#runOne` | not created | timeout/failure/cleanup proof retained | Callback invocation races an injected timer; callback failures map to DOWN, losing work is not cancelled, and a throwing cleanup currently rejects direct evaluation. | `BLOCKED_BY_TIMER_RACE_CALLBACK_CLEANUP_TRANSACTION_ABI` |
| 198 | `packages-galerina/galerina-observability/src/metrics.ts#StatusClass` | not created | declaration accounted | Erased five-string vocabulary performs no validation or status derivation; exact spelling and surplus refusal remain mandatory. | `NO_RUNTIME_BEHAVIOR` |
| 199 | `packages-galerina/galerina-observability/src/metrics.ts#RequestObservation` | not created | declaration accounted | Erased record validates no exact shape, external labels, status, optional binary64 duration or optional error flag. | `NO_RUNTIME_BEHAVIOR` |
| 200 | `packages-galerina/galerina-observability/src/metrics.ts#LatencySnapshot` | not created | declaration accounted | Erased nested record performs no aggregation, percentile estimation, binary64 validation or cumulative-bucket proof. | `NO_RUNTIME_BEHAVIOR` |
| 201 | `packages-galerina/galerina-observability/src/metrics.ts#RouteMetric` | not created | declaration accounted | Erased rollup validates no labels, closed status map, binary64 rate or nested latency snapshot. | `NO_RUNTIME_BEHAVIOR` |
| 202 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsSnapshot` | not created | declaration accounted | Erased aggregate validates no counters, rates, route ordering, dropped count or overflow state. | `NO_RUNTIME_BEHAVIOR` |
| 203 | `packages-galerina/galerina-observability/src/metrics.ts#Histogram.observe` | not created | histogram mutation proof retained | Complete JavaScript-number validation, live count/sum/min/max, ordered first-bucket mutation and overflow lack one admitted state/numeric ABI. | `BLOCKED_BY_MUTABLE_BINARY64_HISTOGRAM_ABI` |
| 204 | `packages-galerina/galerina-observability/src/metrics.ts#Histogram.#percentile` | not created | interpolation proof retained | Live state, binary64 target/interpolation/clamping, cumulative traversal and overflow estimation lack one physical graph. | `BLOCKED_BY_MUTABLE_BINARY64_INTERPOLATION_ABI` |
| 205 | `packages-galerina/galerina-observability/src/metrics.ts#Histogram.snapshot` | not created | snapshot proof retained | Ordered cumulative materialization, infinity-sentinel conversion, binary64 rounding and four percentile calls remain bound to mutable state. | `BLOCKED_BY_MUTABLE_BINARY64_HISTOGRAM_SNAPSHOT_ABI` |
| 206 | `packages-galerina/galerina-observability/src/metrics.ts#clamp` | not created | comparison proof retained | Three JavaScript numbers preserve NaN pass-through and signed-zero identity; signed-i32 comparison is not equivalent. | `BLOCKED_BY_BINARY64_COMPARISON_AND_NAN_ABI` |
| 207 | `packages-galerina/galerina-observability/src/metrics.ts#round` | not created | rounding proof retained | Multiplication, `Math.round` and division retain binary64 overflow, NaN/infinity, signed-zero and tie-direction behavior. | `BLOCKED_BY_BINARY64_ROUNDING_ABI` |
| 208 | `packages-galerina/galerina-observability/src/metrics.ts#emptyStatusClasses` | not created | fresh-state proof retained | Each call allocates one independent mutable record with five external status keys and zero counters. | `BLOCKED_BY_MUTABLE_STATUS_CLASS_RECORD_ABI` |
| 209 | `packages-galerina/galerina-observability/src/metrics.ts#RouteAccumulator.constructor` | not created | object-construction proof retained | Retained labels plus total/status/error/nested-histogram state require one affine mutable identity. | `BLOCKED_BY_MUTABLE_ROUTE_ACCUMULATOR_IDENTITY_ABI` |
| 210 | `packages-galerina/galerina-observability/src/metrics.ts#RouteAccumulator.snapshot` | not created | route-snapshot proof retained | The method reads live fields, clones status state, derives a binary64 rate and snapshots the nested histogram in order. | `BLOCKED_BY_MUTABLE_ROUTE_METRIC_SNAPSHOT_ABI` |
| 211 | `packages-galerina/galerina-observability/src/metrics.ts#normaliseRoute` | not created | route-label proof retained | Open host input, query removal, JavaScript whitespace regex and UTF-16 truncation lack one admitted text boundary. | `BLOCKED_BY_OPEN_HOST_STRING_REGEX_UTF16_ABI` |
| 212 | `packages-galerina/galerina-observability/src/metrics.ts#statusClassOf` | not created | status-class proof retained | Full binary64 integer/floor behavior plus typed absence cannot be narrowed to signed-i32 ingress. | `BLOCKED_BY_BINARY64_HTTP_STATUS_CLASS_ABI` |
| 213 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsCollectorOptions` | not created | declaration accounted | Erased optional-number record validates neither the positive integer route cap nor defaulting. | `NO_RUNTIME_BEHAVIOR` |
| 214 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsCollector.constructor` | not created | collector-construction proof retained | Private maps/histograms/counters, optional binary64 validation and retained object identity lack one admitted capability. | `BLOCKED_BY_MUTABLE_METRICS_COLLECTOR_BINARY64_ABI` |
| 215 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsCollector.record` | not created | mutation-transaction proof retained | Open hostile property access and contained failures feed ordered global/per-route counter and histogram mutations. | `BLOCKED_BY_OPEN_HOST_RECORD_MUTABLE_METRICS_TRANSACTION_ABI` |
| 216 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsCollector.#routeAccumulator` | not created | dynamic-cardinality proof retained | Dynamic method keys create retained per-method overflow state; `maxRoutes: 1` plus 100 methods yields 101 series, so the claimed global bound is false. | `BLOCKED_BY_DYNAMIC_METHOD_KEY_MUTABLE_CARDINALITY_ABI` |
| 217 | `packages-galerina/galerina-observability/src/metrics.ts#MetricsCollector.snapshot` | not created | collector-snapshot proof retained | Live map materialization/sorting, nested state snapshots, cloned counters and binary64 rate remain one active graph. | `BLOCKED_BY_MUTABLE_METRICS_SNAPSHOT_SORT_ABI` |

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
| `docs/superpowers/plans/2026-08-13-slices-148-157-attestation-boundary.md` | Fail-closed plan for audit configuration and classical/hybrid attestation boundaries. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slices-158-167-hybrid-and-neutral-bridge-types.md` | Fail-closed plan for remaining hybrid functions and neutral Brain/Brawn declarations. | `DONE` |
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
| `docs/superpowers/specs/2026-08-13-slice-92-vor-fungi-conversion-design.md` | Bound two-Verdict Kleene-maximum design for Slice 92. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slice-92-vor-fungi-conversion.md` | Test-first implementation and physical-proof plan for Slice 92. | `DONE` |
| `scripts/tests/tower-citizen-vor-fungi-slide.integration.test.mjs` | Dedicated two-Verdict physical publication, VOK re-admission and hostile-boundary proof for Slice 92. | `DONE` |
| `docs/superpowers/specs/2026-08-13-slice-93-vand-supersession-design.md` | Exact evidence-reuse and no-duplicate design for Slice 93. | `DONE` |
| `docs/superpowers/plans/2026-08-13-slice-93-vand-supersession.md` | Focused direct supersession and inherited physical-proof plan. | `DONE` |
| `packages-galerina/galerina-tower-citizen/tests/verdict-and-fungi-supersession.test.mjs` | Direct nine-row proof that exported `vAnd` is exactly covered by the existing Fungi minimum. | `DONE` |
| `docs/reports/slice-94-allof-fungi-conversion-2026-08-13.md` | Exact array-fold ABI refusal and required exit for Slice 94. | `DONE` |
| `docs/reports/slice-95-anyof-fungi-conversion-2026-08-13.md` | Symmetric K3-maximum array-fold ABI refusal for Slice 95. | `DONE` |
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

The Slice 217 bounded decision is complete. The last scheduled maintenance
boundary was Slice 197; its owners remained current at `691bd33f`. The
post-commit Myco refresh indexed 5,488 files / 83,364 terms and finds Slice 197
in four governed files. Codebase-memory still returns `Transport closed`, so
its exact graph-HEAD freshness remains `UNKNOWN`. Aggregate owners are deferred
to Slice 222 and the excluded aggregate lanes are not substitutes, so
repository-wide closure remains `UNKNOWN`.

| Closure item | Status |
|---|---|
| `docs/TODO.md` | `DONE` through the authored Slice 217 status and Slice 222 queue |
| `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md` | `DONE` at the last scheduled Slice 197 maintenance boundary; next refresh Slice 222 |
| Retirement and conversion queue | `DONE` at 1,486/1,486, seven scoped candidates and 856 blockers |
| Package, project and KB graphs | `DONE` at 100/201, 5/5 and 4/4 |
| Dev-tool and Fungi-source inventories | `DONE` at 100 packages / 172 tools / 40 proofs and 147 Fungi files |
| Semantic, percentage, status, code-index and subway owners | `DONE` at 3/3 with 974 test nodes, three sections, current status blocks, 974 codes and 5/5 |
| Private Fungi skill repositories | `DONE` (`96054a97` writing skill; `1bd80388` translation skill; both remain private custody and unpushed; Slices 193-197 required no skill update) |
| Codebase graph and Myco navigation | `PARTIAL`: Myco indexed 5,488 files / 83,364 terms and proves Slice 197 queryable. Codebase-memory returned `Transport closed`, so no exact final-HEAD structural-navigation receipt exists; do not substitute generated package/project/KB graphs for it. |

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
- Slice 92 is a complete reference candidate, not a consumer switch or
  whole-file proof. The exact two-Verdict K3 maximum passes Tower-Citizen
  **513/513** and a dedicated physical SLIDE/VOK lane **1/1**. All nine rows
  preserve typed Verdict values and release no authority.
- Slice 93 is complete supersession evidence, not a duplicate implementation,
  consumer switch or whole-file proof. The direct export/existing-Fungi lane
  passes **2/2** and the inherited physical minimum lane passes **1/1** with
  zero skips. TypeScript and all callers remain active.
- Slice 94 is a complete blocked adjudication. No placeholder asset exists.
  Exact array shape, empty behavior, fold semantics and malformed-element
  refusal require a physical `Array<Verdict>` ABI that is not currently
  admitted. Tower-Citizen remains green **515/515**.
- Slice 95 retains the symmetric K3-maximum array fold as blocked for the same
  exact container boundary. Scalar `vOr` evidence cannot prove arbitrary
  arrays, the empty case or malformed-element behavior.
- Slice 96 records exact supersession by the existing package-owned
  `collapseVerdict` flow. Direct proof passes **2/2**, physical SLIDE/VOK passes
  **1/1** with zero skips, and no duplicate asset is created.
- Slice 97 records exact supersession by the existing package-owned
  `authorizeVerdict` flow. Direct proof passes **2/2**, physical SLIDE/VOK
  passes **1/1** with zero skips, and only exact Allow authorizes.
- Slice 98 remains blocked without a placeholder asset. The scalar collapse
  and authorize flows do not conserve the nullable structured diagnostic,
  complete boundary record or optional exactly-once callback effect.
- Slices 99 and 100 remain blocked without placeholder assets. The scalar K3
  minimum proof does not conserve exact `Int8Array` traversal/allocation, and
  the 2-D wrapper additionally requires full binary64 shape semantics.
- Slice 101 remains blocked at the arbitrary Verdict-array plus signed
  accumulator boundary. Fixed triples do not prove arbitrary length, malformed
  inputs or empty/tie behavior.
- Slice 102 remains blocked at the binary64 confidence-record boundary. Fungi
  must not carry NaN, while host refusal is not the source's typed Unknown
  result. The shared focused files pass **15/15** and Tower-Citizen remains
  **515/515**.
- Slices 103-112 remain blocked without placeholder assets. Arithmetic Trit
  and governance Verdict share the values `-1/0/+1` but not authority: the
  SUM counterexample maps `-1 + -1` to `+1`. Physical Int erases the brand,
  physical Verdict launders it, and the raw-number helpers additionally retain
  binary64 guard behavior. `addTrit` also needs an exact two-member branded
  record. The focused lane passes **19/19**, the direct branded probe **7/7**,
  TypeScript typecheck passes and Tower-Citizen remains **515/515**.
- Slices 113-122 remain blocked without placeholder assets. The adjacent TPL
  boundaries combine nominal arithmetic Trit, binary64 coercion, mutable
  `Int32Array` instance state, canary integrity, higher-order cleanup, active
  governance and exact audit effects. Cleanup must complete before failure
  crosses the boundary; a plain Result or host wrapper is not parity. The
  focused lane passes **49/49**, TypeScript typecheck passes, and Tower-Citizen
  remains **515/515** with zero skips.
- Slices 123-132 remain blocked without placeholder assets. They conserve exact
  JavaScript Error identity, arithmetic Trit enum/brand identity, binary64
  encoding guards, stateful typed-array T-MAC/load behavior and transactional
  erase/reset effects. TypeScript typecheck, the five focused files **56/56**
  and complete Tower-Citizen **515/515** pass with zero skips. The reusable
  JavaScript Error-identity rule is verified in both private Fungi skills.
- Slices 133-142 remain blocked without placeholder assets. Immutable array and
  record envelopes exist at the pinned SLIDE build point, but they do not admit
  mutable instance state, clocks, callbacks, JSON, filesystem durability or
  governed egress effects. TypeScript typecheck, focused **63/63** and complete
  Tower-Citizen **515/515** pass with zero skips. Both private skills now state
  the reusable immutable-transport versus active-authority boundary.
- Slices 143-147 remain blocked without placeholder assets. They conserve host
  ledger reads/parsing/filtering, exact transition and lifecycle records,
  unknown-value coercion and active egress capability identity. Focused
  **64/64**, TypeScript typecheck and complete Tower-Citizen **515/515** pass
  with zero skips. Skill review is `NO_SKILL_UPDATE`: the current rules already
  cover every reusable boundary. Silent malformed-ledger row loss is separately
  tracked as a priority fail-closed security investigation.
- Slices 148-157 remain blocked without placeholder assets. The two audit
  configuration records retain optional binary64, callback and egress behavior;
  the attestation surfaces retain canonical bytes, key custody, randomness,
  Ed25519/ML-DSA operations, revocation callbacks and active bridge delegation.
  The existing checked Fungi PQ policy twin remains narrower policy evidence,
  never crypto verification. Focused **67/67**, TypeScript typecheck and complete
  Tower-Citizen **515/515** pass with zero skips. Both private skills now forbid
  caller/host-projected cryptographic verdicts at `b53365f` and `b01d64e`.
- Slices 158-160 remain blocked without placeholder assets at the hybrid
  signing, verification and active delegation boundary. Slices 161-167 are
  erased TypeScript declarations with `NO_RUNTIME_BEHAVIOR`; their exact Fungi
  string/record ABI remains prerequisite work for later consumers and file
  retirement. Both package typechecks, neutral contract **12/12**, focused
  consumers **37/37**, and Tower-Citizen **515/515** pass with zero skips. The
  private skills incorporate the approved numeric, benchmark, VOK and
  Lyth/SLIDE evidence rules at `1bd80388` and `96054a97`.
- Slices 168-169 and 171-172 are erased declarations with
  `NO_RUNTIME_BEHAVIOR`; they account interface, registry and signed-manifest
  vocabulary scope without pretending the active boundary has been converted.
  Slice 170 remains blocked at the complete `BridgeResult`, independent
  determinism-provenance and JavaScript Error-identity boundary. Both package
  typechecks, neutral contract **12/12**, focused consumers **27/27**, and
  Tower-Citizen **515/515** pass with zero skips. Skill review is
  `NO_SKILL_UPDATE`; existing exact-record, injective-vocabulary,
  active-capability and Error-identity rules cover the group.
- Slices 173-176 and 180 account erased manifest/oracle declarations as
  `NO_RUNTIME_BEHAVIOR`. Slices 177-179 and 181-182 remain blocked without
  placeholders at exact binary64/non-finite, signed JSON pre-image,
  optional-manifest validation, ToInt32 and public ESM module boundaries.
  Neutral contract **12/12**, Tower-Citizen **515/515**, C++ bridge **21/21**
  and BitNet bridge **7/7** pass with zero skips. Skill review is
  `NO_SKILL_UPDATE`; current exact-wire, numeric-coercion, crypto evidence,
  active-capability and consumer-switch rules cover the group.
- Slices 183-188 account erased health vocabulary, result, callback and option
  declarations as `NO_RUNTIME_BEHAVIOR`. Slices 189-192 remain blocked without
  placeholders at open host-value/text normalization, mutable maps, timer and
  retained callback capabilities, replacement and exact object identity.
  Observability passes **36/36** and focused health/kernel consumers **19/19**,
  both with zero skips. Skill review is `NO_SKILL_UPDATE`; current open-value,
  no-null, text, active-capability and mutable-object rules cover the group.
- Slices 193-197 remain blocked without placeholder assets. Unregister requires
  dual mutable-map deletion plus exact registry identity; liveness/readiness
  retain distinct active maps; evaluation preserves Map order, all-check async
  completion and an open component record; run-one retains callback/timer race,
  fixed callback-failure mapping and cleanup-before-completion. A narrow probe
  proves injected cleanup failure currently rejects direct evaluation, so the
  file-level never-throw claim is separately queued for repair. Observability passes
  **36/36** and focused health/kernel consumers **19/19**, both with zero skips.
  Skill review is `NO_SKILL_UPDATE`; current active-state, async, bounded-loop,
  retained-capability and cleanup rules cover the group.
