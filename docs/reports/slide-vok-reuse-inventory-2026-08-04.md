# Galerina to SLIDE/VOK reuse inventory

Status: binding engineering disposition, refreshed 2026-08-04
Authority: the decisions below control implementation planning; production
admission still requires the named evidence

## Decision

Use old work by verified fragment. Do not rebuild the old DSS/Wasm architecture
as a unit, and do not discard it as a unit.

- Keep proven target-neutral semantics, contracts, tests and corpora.
- Adapt mechanisms whose trust model remains correct but whose interface is
  tied to Wasm or the previous supervisor.
- Keep compatibility implementations only as optional executors or oracles.
- Completely replace code which owns ambient host authority, WebAssembly
  memory, sidecar isolation or production dispatch under the old model.

The largest genuinely new work is the general independent execution path:
complete detached GIR, general target lowering and final-object verification,
isolated host execution, and production evidence for every source and host
boundary.

The live terminal verifier currently reports:

| Debt | Current | Required |
|---|---:|---:|
| Tracked package TypeScript paths | 497 | 0 |
| Categorised implementation TypeScript paths | 482 | 0 |
| Unexecuted production `.fungi` sources | 111 | 0 |
| Unowned host boundaries | 38 | 0 |
| Package-local `node_modules` trees | 95 | 0 |
| Nested native package identities | 1 | 0 |
| Exact post-SLIDE refusals | 246 | 0 |

These are live debt instances, not 246 designs which must be invented.

## Disposition vocabulary

| Disposition | Meaning |
|---|---|
| `KEEP` | Preserve the implementation and tests; rebind current identity and receipts where required. |
| `ADAPT` | Preserve the proven semantics or mechanism behind a new typed SLIDE/VOK contract. |
| `ORACLE` | Keep for differential, compatibility or hostile testing; it grants no production authority. |
| `REDO` | Reimplement from the contract and retained tests because the old code owns an incompatible host, memory, authority or isolation assumption. |
| `RETIRE-AFTER-PARITY` | Keep the current path until its exact replacement has passed all admission, parity and rollback gates. |

No fragment is admitted because it is old, shipped, `.fungi`, tested or local.
The accepting component independently verifies its canonical inputs, policy,
K3 result, freshness and provenance. Any missing, altered, stale, surplus or
indeterminate fact refuses with no legacy fallback.

## Seven-gate reuse map

| Gate | Existing work to keep or adapt | Binding call | Work still required |
|---|---|---|---|
| 1. Complete frontend/GIR | Real parser, type/value/effect/governance/escape/name checks; seven self-hosted compiler-stage specifications; V2-E fixtures; source maps and diagnostics; SLIDE Contract 19 and V2-C/V2-D/V2-E validators | `KEEP` checks/specifications; `ADAPT` exporters; `REDO` every post-GIR AST/WAT recovery path | Emit complete detached CFG/SSA, types, K3, failures, memory, effects, capabilities and budgets. Prove byte-identical clean exports, hostile mutations, stable refusals and self-build without AST recovery. |
| 2. Independent execution | Semantic registries, safe-value/K3 contracts, DSS capability/V_DPM logic; V2-C executor, V2-D core, checked compilers and current immutable/control-flow/loop profiles | `KEEP` proven opcode semantics; `ADAPT` DSS decisions into typed gates; `REDO` ambient runtime access | Widen registered profiles until every admitted instruction, terminator, call, effect and memory action executes independently with deterministic budgets and no fallback. |
| 3. VOK lowering/final object | K3 and Tri-Fuse equivalence tests, target descriptors, Wasm differential vectors; VOK, Portable VEO, eight-gate admission, affine leases and RW-to-RX floor | `KEEP` VOK evidence/lease machinery; `ADAPT` target lowerers; `ORACLE` Wasm final behaviour; `REDO` any target verifier which trusts producer claims | General deterministic lowering and independent object parsing/verifying which binds source, GIR, recipe, target, bytes, imports, layout and policy. Prove W^X, relocations, CFG/guards/resources and platform receipts. |
| 4. Production `.slide` bundle | Receipt-last publication, registry signing and crypto-agility; SLIDE Contracts 30/34/35/37/38, manifest CLI, physical boundary and checked loader | `KEEP` canonical envelope and receipt-last mechanics; `ADAPT` signing/durability; `REDO` searching, nearest-match or fallback loaders | General member identities, hybrid suite/epoch metadata, independent two-path admission, rollback/revocation state and isolated least-authority execution. |
| 5. Execution/host receipts | Schema-v3 post-SLIDE verifier, registry roles, Tower Citizen, Tri-Pipe and platform receipts; typed package receipt v2, VOK receipts, effect broker and durable nonce authority | `KEEP` verifier/schema; `ADAPT` Tower/Tri-Pipe consumers and typed host adapters; `REDO` Boolean or self-attested authority | Generate authentic per-source/per-boundary evidence, bind repository/artifacts/platform, complete offline ceremony, and prove replay/freshness/revocation/mutation refusal. |
| 6. Flat package authority | 98-peer root lock, exact direct-peer resolver, package graph/provenance and registry checks; SLIDE Contract 33 and checked multi-package route | `KEEP` topology/generators; `ADAPT` general effects/capabilities; `REDO` nested dependency resolution; `RETIRE-AFTER-PARITY` package-local dependency trees | Sign the deterministic root graph, refuse all identity/graph conflicts, move the nested greeting identity to the top level, and prove one admitted identity resolves to one admitted instance. |
| 7. Per-file authority switch | 29 twin candidates, Round 9 evidence, existing tests and current checked source-to-package route | `KEEP` tests and sound `.fungi`; `ADAPT` each public surface; `ORACLE` frozen TypeScript after switch; `RETIRE-AFTER-PARITY` TypeScript | Translate, check, build, execute, compare positive/refusal/mutation behaviour, admit receipt, switch all consumers, then delete the exact TypeScript path. Compiler/bootstrap retires last after exact fixpoint. |

## DSS and Wasm fragment decisions

| Existing fragment | Binding call | Destination or reason |
|---|---|---|
| `src/dss/vdpm.fungi` | `KEEP` semantics, `ADAPT` authority binding | Preserve K3 capability, breaker, quarantine and emergency transitions. Feed a registered VOK/Tower decision; it must not issue its own lease. |
| `src/dss/capability-map.fungi` | `KEEP` + `ADAPT` | Preserve the closed mapping and deny-by-default unknown effect rule behind the canonical capability registry. |
| `src/dss/dag-validator.fungi` | `ADAPT` | Reuse topology-first edge rules for action/package graph admission; VOK independently binds the accepted graph. |
| `src/dss/dss-supervisor.fungi` | `ADAPT` decisions; `REDO` production supervisor shell | Preserve bootstrap state, trap routing and capability-before-use ordering. Implement execution as target-neutral receipts and VOK gates, not an ambient sidecar. |
| `src/dss/dwi-allocator.fungi` | `ADAPT` identity/budget semantics; `REDO` allocator authority | Map caller and fuel bounds to artifact-bound VOK leases. VOK owns allocation and execution authority. |
| `src/dss/emergency-sm.fungi` | `KEEP` + `ADAPT` | Preserve explicit fail-closed escalation transitions as Tower/VOK policy input with typed audit receipts. |
| `src/dss/trap-handler.fungi` | `ADAPT` | Preserve typed trap/eviction classification. Reissue it as terminal failure/audit receipts; no direct host effect without a lease. |
| `src/dss/epilogue-receipt.fungi` | `ADAPT` | Preserve useful semantic fields but use current versioned SLIDE receipt and cryptographic provenance rules. |
| `src/dss/mmcp-registry.fungi` | `ADAPT` | Preserve bounded view-mask decisions as safe-value memory/host-queue input. Never expose ambient process memory. |
| DSS Stage-A differential/law tests | `KEEP` as `ORACLE` | Permanent cross-backend regression corpus; never production authority. |
| Wasmtime oracle package | `KEEP` as `ORACLE` | Retain flat and development-only for fuel, reset, attestation, V_DPM and Wasm compatibility evidence. |
| `verifyWasm` | `ADAPT` its invariants; keep code in optional Wasm executor | Carry attestation-first, hash/signature and closed-import rules into generic artifact admission. The Wasm-specific implementation does not validate native `.slide`. |
| `admitAndInstantiate` | `ADAPT` ordering/tests; `REDO` native implementation | Preserve verify-before-link and violation classification. Completely replace `WebAssembly.instantiate`, `WebAssembly.Memory` and `bindMemory` on the native SLIDE path. |
| `createHostRuntime` and Wasm seam adapters | `ORACLE`; selectively `ADAPT` mechanics | Re-express useful fuel/reset/bounded-call mechanics through typed affine RPC. Completely replace ambient import-object and sidecar authority. |
| WAT emitter/assembler and Wasm runtime | `RETIRE-AFTER-PARITY` on primary path; optional later | Keep current builds working and preserve compatibility. A failed SLIDE admission never selects Wasm automatically. |
| Goal B/C test files | `KEEP` real tests; `REDO` placeholders | Port real fuel/crash properties into backend-neutral tests. Replace always-pass placeholders only with executable evidence. |

## Component calls outside DSS

| Component | Binding call |
|---|---|
| Compiler parser/checkers and seven self-hosted stages | `KEEP`; extend rather than rewrite. Complete GIR and self-hosting are new layers over them. |
| Current WAT/Wasm backend | Keep as `ORACLE` and optional compatibility backend; remove from the mandatory path only after native parity. |
| Tower Citizen | `KEEP` the component and virtual Tri-1/K3 role; `ADAPT` it to consume exact VOK/SLIDE receipts. It is not removed. |
| Tri-Pipe | `KEEP` the component and routing role; `ADAPT` routes to typed leases and receipts. It is not removed. |
| Tri-Fuse | `KEEP` semantic obligation/equivalence knowledge; `REDO` backend-welded authority as one backend-neutral planner/verifier. |
| Registry signing, rotation and crypto-agility | `KEEP` interfaces and verified ceremonies; `ADAPT` `.slide` identities. Algorithm modules remain replaceable by suite/epoch, without changing application semantics. |
| Flat root lock and package graph tooling | `KEEP`; extend to signed production authority. Do not recreate npm-style nested dependencies. |
| Existing `.fungi` twins and conversion staging | Reconcile case by case. Promote only executed parity; never rewrite a sound twin merely to increase a conversion count. |
| Node/TypeScript bootstrap | `RETIRE-AFTER-PARITY`; do not delete before clean `.fungi -> .slide` execution and consumer switch. |
| Package-local `node_modules` | `REDO` dependency ownership through the signed flat root, then remove all 95 physical trees. |
| Old production `dss-host` sidecar | `REDO` as target-neutral VOK/typed host adapters. Retain only compatible algorithms, invariants, tests and oracle fixtures. |

## Reuse-driven package order

| Priority | Package/surface | Reuse before writing new code | Remaining work |
|---:|---|---|---|
| 1 | Compiler frontend/self-hosted stages | Checks, 59 `.fungi` sources, seven authoritative specifications and parity suites | Complete detached GIR and bootstrap fixpoint; retire 105 TypeScript paths last |
| 2 | `galerina-core-logic` | K3 operators, diagnostics and tests | Translate 21 TypeScript paths through general executable profiles |
| 3 | Tower Citizen | K3 governance, leases, key rotation, audit and four `.fungi` sources | Translate 33 paths and consume exact receipts |
| 4 | Tri-Pipe | Route contracts and K3 routing | Translate three paths and bind routes to leases/receipts |
| 5 | App kernel/registries | Twelve `.fungi` sources plus generation/rotation tests | Reconcile twins, then translate/admit remaining surface |
| 6 | Security/sentinels/DSS | Decision core, capability maps, trap/audit semantics and hostile tests | Re-admit at VOK and replace or own each host boundary |
| 7 | Myco and graph devtools | Algorithms, incident fixes, graph/provenance tests | Translate after collections/graphs/regex/host-worker profiles exist |
| 8 | Remaining T1/T2/T3 packages | Public API tests and Round 9 classifications | Translate in flat dependency order and admit per file |

## Work which must be newly implemented

Old DSS/Wasm work cannot close these requirements:

1. complete detached executable GIR for every admitted construct;
2. general frontend-neutral SLIDE execution with effects, calls, memory and
   deterministic resource ceilings;
3. general target lowering and independent final native-object verification;
4. isolated target-neutral execution through affine capability RPC;
5. authentic production evidence for every source, boundary and platform;
6. signed general flat package authority and production resolution;
7. source-to-SLIDE bootstrap fixpoint; and
8. per-file consumer switches and physical TypeScript/npm retirement.

## Minimum-rework implementation order

```text
freeze reuse decisions + differential corpora
  -> complete detached GIR using the existing frontend/stage specifications
  -> widen existing SLIDE profiles in dependency-driven construct order
  -> general VOK lowerer + independent final-object verifier
  -> extend existing bundle/publisher/loader and receipt verifier
  -> admit Tower Citizen, Tri-Pipe and typed host adapters
  -> sign and activate the one-root package graph
  -> convert T1 then T2 then T3, switching one proven file at a time
  -> self-host compiler last and prove the exact bootstrap fixpoint
  -> remove final TypeScript paths and package-local dependency trees
```

Current WAT/Wasm execution, TypeScript and npm bootstrap dependencies stay
alive until their exact consumers have switched. Early deletion would destroy
working evidence and make a clean build impossible.

## Regression rules

- Do not reintroduce `DSS.wasm supervisor (#102–106)` as one undifferentiated
  future build.
- Keep the shipped DSS decision core and optional Wasm oracle visible.
- Move a fragment to production `KEEP` only after its new accepting boundary
  independently verifies it.
- A `REDO` decision preserves relevant tests, failure codes, corpus vectors
  and semantic requirements.
- Change no deletion count until the terminal verifier observes the physical
  source, execution, host and topology change.
- Tower Citizen and Tri-Pipe remain architectural components.

## Controlling evidence

- [`full-fungi-to-slide-retirement-blockers-2026-08-02.md`](full-fungi-to-slide-retirement-blockers-2026-08-02.md)
- [`roadmap-legacy-runtime-reconciliation-2026-08-04.md`](roadmap-legacy-runtime-reconciliation-2026-08-04.md)
- [`../architecture/flat-package-topology-and-post-slide-migration.md`](../architecture/flat-package-topology-and-post-slide-migration.md)
- [`../security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md`](../security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md)
- independent SLIDE Contract 19 and Contracts 28 through 62
- independent SLIDE `docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- `node scripts/ts-retirement-graph.mjs --post-slide --json`
