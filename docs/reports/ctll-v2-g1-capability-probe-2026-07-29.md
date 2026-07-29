# CTLL v2 G1 Capability Probe

- **Date:** 2026-07-29
- **Branch:** `codex/ctll-v2-architecture`
- **Scope:** current Galerina compiler behavior required by the proposed CTLL
  R1 vertical slice
- **Result:** the source semantics are strong enough to begin a bounded R1
  exporter, but the current GIR is not detached executable GIR

This report distinguishes current Galerina behavior from proposed CTLL
behavior. Passing this probe does not create a `.ctll` container, CTLL
validator, native backend, memory-safety proof, or benchmark result.

## 1. Probe fixture

The source fixture is
`packages-galerina/galerina-core-compiler/tests/ctll-v2/ctll-k3-checked-add-probe.fungi`.
It combines:

- `Verdict` input;
- exhaustive `check` with separate ALLOW, DENY, and INDETERMINATE paths;
- typed `Result<Int, String>` exits;
- checked `Int32` addition.

The standing harness is
`packages-galerina/galerina-core-compiler/tests/ctll-v2-capability-probe.test.mjs`.
It exercises the fixture in the tree-walker and current WAT/Wasm tier and
records the detached-GIR failure.

## 2. Capability matrix

| Required fact | Frontend/checker | Tree-walker | Current WAT/Wasm | Detached CTLL R1 |
|---|---|---|---|---|
| `Verdict` is the decision type | Verified | Verified | Verified as an `i32` ABI value | Specified, not implemented |
| Exhaustive ALLOW/DENY/INDETERMINATE dispatch | `FUNGI-CHECK-001/002` verified | Verified | Verified | Specified, not implemented |
| Invalid fourth Verdict value refuses | Static source cannot construct it | Runtime trap verified | Runtime trap verified | Specified, not implemented |
| DENY is distinct from INDETERMINATE | Verified source arms | Distinct typed `Err` values | Distinct Result host calls/payloads | Specified, not implemented |
| Checked Int32 addition | Accepted | Overflow trap verified | Overflow trap verified | Specified, not implemented |
| Checked trap cannot be wrapped in `Ok` | N/A | Verified after G1 hardening | Constructor is not reached after Wasm trap | Not implemented |
| Typed `Result<Int, String>` | Accepted | Verified | Verified through current host Result bridge | Type specified; encoding/interpreter absent |
| Complete executable body after GIR export | Not applicable | AST available | **No**—WAT needs the separately supplied AST | Not implemented |
| Canonical semantic bytes | No | No | No | Deterministic-CBOR contract only |
| Bounded importer and independent validator | No | No | No | Not implemented |
| Fresh-process reference execution without parser/AST | No | No | No | Not implemented |
| R1 failure registry identities | No; fixture uses probe strings | No | No | Contract only |
| `ctll.memory.safe-value.v1` verification | No | No | No | Contract only |
| Tri-Fuse v2 proof/residual plan | No | Existing WAT experiments are not v2 | Existing WAT experiments are not v2 | Contract only |

The current WAT Result implementation uses host bridge functions. That is
valid evidence for current Wasm parity, but those host handles are outside the
R1 no-address/no-host-handle semantic profile and cannot be copied into CTLL.

## 3. Security defects exposed and closed

The probe and its full-suite verification exposed three current-tier defects:

1. `check` treated every positive runtime trit as ALLOW, while `prefilter`
   classified out-of-range trits by sign or as `maybe`. An untyped host could
   therefore pass `2` through the Wasm `i32` ABI and reach a branch rather than
   trap.
2. the tree-walker allowed a checked arithmetic trap to be wrapped as
   `Ok(runtimeError("IntegerOverflow"))`, reporting the flow as successful,
   while Wasm trapped before the Result constructor.
3. named `trap CONDITION : ERROR_CODE` statements were parsed, governed, and
   lowered to WAT, but the tree-walker had no statement case and silently
   discarded them. Public validation sentinels could therefore continue with
   a default value and return an apparently governed success.

Every declared Verdict parameter is now validated at the tree-walker and Wasm
ABI entry, and the expression/statement `check` and `prefilter` lowerings
retain exact validation as defense in depth. Only `-1`, `0`, and `+1` are
admitted. `Ok`, `Err`, and `Some` propagate hard traps rather than converting
them into application data. Named traps now terminate, emit `FUNGI-INV-000`
and an audit entry carrying `trapKind`, propagate through nested calls, and
exclude a flow from fast tiers that cannot yet prove equivalent enforcement.
Regression coverage challenges forged fourth states, `INT32_MAX + 1`, direct
and nested named traps, and pure-fast-path bypass attempts.

No new diagnostic identifiers were assigned.

## 4. Exact post-GIR AST dependency inventory

`GIRProgram` does not contain `ast`. The public WAT wrapper receives the
original AST as a separate argument and copies it into the internal
`WATGIRInput.ast`. The current code then consumes these AST facts:

| Current consumer | AST fact used | Required R1 replacement | Unsupported behavior |
|---|---|---|---|
| `astHasParamAdmission` | parameter `where` admission anywhere in the unit | declared admission/K3 obligation or explicit profile refusal | Refuse export until represented; never bypass |
| `collectStaticConsts` | top-level integer `static` values and `bitfield` positions | canonical `constants[]` | Refuse non-R1 constant/bitfield forms |
| `buildRecordLayouts` | record names and declaration-order field names | canonical `types[]` with explicit aggregate layout in a later profile | R1 rejects records |
| `buildRecordFieldTypes` / `assertLowerableRecordFields` | record field names and declared types | canonical type table plus profile validator | R1 rejects records and all wide/host layouts |
| `buildEnumVariants` | enum names and declaration-order variants | future canonical enum type | R1 rejects enums |
| `buildFlowReturnTypes` | flow return annotations | `gir_function.result_type` | Refuse unknown or unsupported results |
| `buildFlowParamBases` | ordered parameter type annotations | `gir_function.parameter_types[]` | Refuse unsupported parameter types |
| `extractFlowParamNames` | parameter names used to resolve body identifiers | stable value IDs and entry-block parameters | Refuse unresolved identifiers |
| `findFlowNodeInAST` + `emitWATFromFlowAST` | complete flow bodies, statements, expressions, and branch structure | `blocks[]`, typed SSA instructions, explicit terminators | Refuse every node outside the R1 profile |
| `flowHandlesSecrets` | contract `privacy`/`secrets` declarations | receipt-bound memory/effect obligation; later semantic profile | R1 rejects secret/heap operations |
| `deriveArenaWATMemory` | per-flow arena declarations | `memory_profile_ref` and resource budget | R1 no-address profile rejects arenas |

The current no-AST legacy path can emit an identity body from
`executionPlan`/parameter metadata. The negative probe demonstrates this by
showing that the checked-add instruction disappears and `local.get $p0`
remains. This is not executable-GIR export. A CTLL exporter must either emit
the complete R1 body or refuse; it must not reuse the identity/default/walker
fallback.

## 5. Verification evidence

Commands run from the repository root:

```text
npm.cmd run build
  (from packages-galerina/galerina-core-compiler)
  PASS

node packages-galerina/galerina-core-compiler/dist/cli.js check --strict \
  packages-galerina/galerina-core-compiler/tests/ctll-v2
  PASS

node --test \
  packages-galerina/galerina-core-compiler/tests/ctll-v2-capability-probe.test.mjs \
  packages-galerina/galerina-core-compiler/tests/check-construct.test.mjs \
  packages-galerina/galerina-core-compiler/tests/wat-k3-constructs.test.mjs \
  packages-galerina/galerina-core-compiler/tests/k3-operators.test.mjs \
  packages-galerina/galerina-core-compiler/tests/wat-k3-inline.test.mjs \
  packages-galerina/galerina-core-compiler/tests/wat-phase25-arithmetic.test.mjs \
  packages-galerina/galerina-core-compiler/tests/i32-arith.test.mjs \
  packages-galerina/galerina-core-compiler/tests/gir-version-gate.test.mjs
  PASS: 97 tests

node --test \
  packages-galerina/galerina-core-compiler/tests/governance/trap-decl.test.mjs \
  packages-galerina/galerina-core-compiler/tests/phase43-46-services.test.mjs \
  packages-galerina/galerina-core-compiler/tests/phase42-51-services.test.mjs
  PASS: 63 tests

npm.cmd test
  (from packages-galerina/galerina-core-compiler)
  PASS: 5,225 tests
```

## 6. G1 disposition

Completed:

- positive `.fungi` vertical-slice probe;
- checker/walker/Wasm capability matrix;
- invalid-fourth-state regression and hardening;
- checked-trap/Result differential regression and hardening;
- named-trap runtime, audit, propagation, and fast-tier enforcement;
- exact post-GIR AST fact inventory;
- current no-AST identity behavior exposed as non-CTLL;
- fail-closed `.fungi` preflight for the exact first-slice facts, with ordered
  `CTLL-R1-EXPORT-001..015` refusal identities and missing-fact coverage.

Still open before G1 exits:

- connect the preflight to a compiler-owned adapter that derives its facts,
  then create a dedicated executable-GIR R1 export surface whose unsupported
  result is an explicit refusal rather than the legacy WAT identity path;
- add serialized mutation fixtures for invalid Verdict encoding, altered
  K3 edges, wrapping arithmetic, missing failures, and non-canonical bytes;
- distinguish unsupported, denied, unresolved, arithmetic, and internal
  failures with registered R1 failure records; the preflight refusal names are
  stable policy outcomes, not yet the numeric executable failure registry;
- prove the importer/reference interpreter in a fresh process.

Those remaining items cross into G2 implementation. They must use the R1
contract rather than widening the current summary GIR by implication.
