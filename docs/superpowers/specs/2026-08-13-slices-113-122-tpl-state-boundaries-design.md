# Slices 113-122 TPL state-boundary design

## Decision

Adjudicate the next ten source-order symbols in
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts` without
creating placeholder Fungi. Retain every symbol in TypeScript unless its full
source contract can cross checked Fungi, GIR, physical `.slide`, independent
VOK re-admission and typed receipts without host projection.

The pinned SLIDE build point is
`ed326eaa14f1a899841cbac8da353d400970367e`. Its checked-Fungi physical type
table admits `Int`, `Bool`, `Verdict`, `String`, `Bytes`, `Array<Int>` and
`Option<Int>`; its safe-value envelope additionally carries a generic record
type. It has no nominal arithmetic Trit, binary64 Float, mutable `Int32Array`
instance, higher-order callback, active logger/governance object or class-state
ABI. A generic record carrier does not prove mutable object identity or method
effects.

## Exact slice decisions

| Slice | Source symbol | Classification | Conserved reason |
|---:|---|---|---|
| 113 | `consensusTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` | Three branded arithmetic Trit inputs and result must remain distinct from governance Verdict. Majority can outvote one deny-shaped input. |
| 114 | `tritBitShift` | `BLOCKED_BY_BINARY64_BITWISE_INDEX_ABI` | The private helper accepts JavaScript binary64, uses remainder, division, truncating `|0` and bit-position arithmetic. Physical i32 ingress narrows the source domain. |
| 115 | `TPLSimulator#constructor` | `BLOCKED_BY_ACTIVE_OBJECT_TYPED_MEMORY_ABI` | Construction validates binary64 size, allocates mutable `Int32Array` state, stamps canaries and retains active logger/governance identities. |
| 116 | `TPLSimulator#setScale` | `BLOCKED_BY_BINARY64_MUTABLE_INSTANCE_ABI` | It stores an unrestricted JavaScript binary64 value in live instance state; no Float or object-state ABI exists. |
| 117 | `TPLSimulator#verifyIntegrity` | `BLOCKED_BY_TYPED_MEMORY_ERASE_FAULT_ABI` | It reads canaries, must erase state before returning typed integrity failure, and re-stamps the instance. |
| 118 | `TPLSimulator#boundsCheck` | `BLOCKED_BY_BINARY64_INSTANCE_FAULT_ABI` | It compares a binary64 index with retained instance size and returns by throwing `SecurityTrap`; narrowing or host validation changes behavior. |
| 119 | `TPLSimulator#getTrit` | `BLOCKED_BY_TYPED_MEMORY_BITPACK_ABI` | Exact indexed `Int32Array` reads, unsigned shifts, illegal-encoding fault and instance bounds are required. |
| 120 | `TPLSimulator#eraseOnTrap` | `BLOCKED_BY_HIGHER_ORDER_ERASE_ON_FAILURE_ABI` | The generic callback, try/catch, mandatory erase-before-rethrow ordering and arbitrary return type must be conserved. |
| 121 | `TPLSimulator#setTrit` | `BLOCKED_BY_TYPED_MEMORY_MUTATION_ABI` | Exact bounds, value guard, two-bit read-modify-write and erase-on-any-trap behavior act on live typed memory. |
| 122 | `TPLSimulator#gate` | `BLOCKED_BY_ACTIVE_GOVERNANCE_AUDIT_ABI` | The method reads/mutates packed state, calls a live GovernanceEnforcer, emits exact AuditLogger records and erases on failure. |

## Security invariants

- Arithmetic Trit must never be relabelled as governance Verdict.
- Fungi source must not use `null`, NaN, `else if`, `throw`, `try/catch`,
  `for` or unbounded `loop` as a shortcut.
- Translating a thrown error to `Result` is insufficient where the source
  requires erase-before-unwind or exact active-object side effects.
- Host pre-validation, host packing, host mutation, host cleanup and
  host-computed governance decisions remain authority and are refused.
- A physical compiler refusal, frontend-only check, historic Wasm proof or
  package-green result is evidence, not conversion success.
- Every blocked slice keeps TypeScript and its callers active.

## Verification boundary

Run TypeScript typecheck; the focused
`ternary-ops.test.mjs`, `governance-algebra-binding.test.mjs`,
`tpl-simulator.test.mjs` and `tpl-bitnet-fidelity.test.mjs` lane; then the
complete Tower-Citizen package. Review both private Fungi skills for the
reusable cleanup-on-failure and active-object findings. Only update a skill if
the current rules do not already require the zero-trust refusal.

Close with ten governed reports, 62/62 receipt validation, the live register,
TODO, assurance status, roadmap, registered generated owners and Myco. Keep
repository-wide closure and codebase-memory final-HEAD freshness `UNKNOWN` if
their bounded owners remain unavailable. Do not push.
