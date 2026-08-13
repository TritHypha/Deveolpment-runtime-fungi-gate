# Slices 123-132 TPL support and bulk-operation design

## Decision

Adjudicate ten remaining support and bulk-operation symbols in
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts`. Do not create
placeholder Fungi. Preserve source error identity, arithmetic-Trit identity,
binary64 guards, packed encodings, mutable typed memory, cleanup ordering,
active governance state and audit effects.

The pinned SLIDE build point remains
`ed326eaa14f1a899841cbac8da353d400970367e`. Its physical checked-Fungi surface
has no JavaScript Error-class identity/stack, nominal arithmetic Trit, Float,
mutable `Int32Array` instance, active GovernanceEnforcer/AuditLogger capability
or transactional cleanup ABI.

## Exact decisions

| Slice | Symbol | Classification | Exact exit |
|---:|---|---|---|
| 123 | `SecurityTrap` | `BLOCKED_BY_JAVASCRIPT_ERROR_IDENTITY_ABI` | Extends JavaScript Error and owns exact name/message prefix/instance identity and stack behavior. |
| 124 | `TPLIntegrityFault` | `BLOCKED_BY_JAVASCRIPT_ERROR_IDENTITY_ABI` | Distinct Error class and prefix must remain distinguishable from SecurityTrap. |
| 125 | `TritState` | `BLOCKED_BY_ARITH_TRIT_ENUM_OBJECT_ABI` | Runtime object identity/names map to arithmetic states, not governance Verdict authority. |
| 126 | `Trit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` | Type-only source declaration is still the nominal boundary required by all arithmetic consumers; no physical type ID exists. |
| 127 | `encodeTrit` | `BLOCKED_BY_BINARY64_TRIT_ENCODING_FAULT_ABI` | Complete JavaScript-number guard, exact 2-bit code map and SecurityTrap failure are required. |
| 128 | `decodeTrit` | `BLOCKED_BY_BINARY64_TRIT_DECODING_FAULT_ABI` | Complete numeric selector and distinct illegal-`0b11` integrity fault are required. |
| 129 | `assertTrit` | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` | Raw JavaScript-number guard and SecurityTrap identity cannot be narrowed to i32 refusal. |
| 130 | `TPLSimulator#tmacVector` | `BLOCKED_BY_TYPED_ARRAY_STATEFUL_TMAC_ABI` | Int32Array ingress, mutable packed weights, JS-number accumulator/scale, bounded loop, integrity check and audit effect form one transaction. |
| 131 | `TPLSimulator#loadWeights` | `BLOCKED_BY_NUMBER_ARRAY_MUTATION_ABI` | Readonly JavaScript-number array, default start, bounded mutation and erase-on-any-failure must be conserved. |
| 132 | `TPLSimulator#erase` | `BLOCKED_BY_TYPED_MEMORY_RESET_CAPABILITY_ABI` | Typed-memory fill, canary reset, scale reset and live GovernanceEnforcer reset are one observable cleanup operation. |

## Verification and cadence

Run typecheck plus `ternary-ops`, `governance-algebra-binding`, `tpl-simulator`,
`tpl-bitnet-fidelity` and `bridge` focused files, then the complete
Tower-Citizen package. Review both private skills; update only a reusable
missing rule. Publish ten receipts and the live file-status working tab.

This is the first group in the owner-approved 25-slice window Slices 123-147.
Defer roadmap, subway, project graph, code index and navigation re-index until
Slice 147. Per-slice reports and focused tests remain mandatory. Repository-
wide closure remains `UNKNOWN`; do not run crash-linked aggregate lanes or push.
