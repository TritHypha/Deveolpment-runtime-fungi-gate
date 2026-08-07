# `.gate` diagnostic codes — the complete catalogue

**107 codes.**

**GENERATED FILE — do not edit by hand.** Regenerate with:

```bash
node packages-galerina/galerina-core-compiler/scripts/write-gate-code-reference.mjs
```

Derived from the compiler source declaration sites; a test fails if this
file drifts from a fresh generation. [RULES.md](RULES.md) holds the
invariants with their reasoning — this file answers the narrower question
*"what does this code mean?"* for **every** code, including the ones too
mechanical to earn an essay.

A message shown with `…` interpolates detail at emit time; the static part
is what is searchable here.

## GATE-PARSE-* (27)

Tier 1 — syntax. The literal `@gate 3.0.0` header, block order, part/wire grammar, and the GD-006 input ceilings (`GATE_V3_LIMITS`).

| code | name | message |
|---|---|---|
| `GATE-PARSE-002` | `GATE_V3_BAD_VERSION_HEADER` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-003` | `GATE_V3_NON_ASCII` | semantic source must contain ASCII only |
| `GATE-PARSE-004` | `GATE_V3_MISSING_CIRCUIT` | missing CIRCUIT declaration |
| `GATE-PARSE-005` | `GATE_V3_MALFORMED_CIRCUIT` | malformed CIRCUIT declaration |
| `GATE-PARSE-006` | `GATE_V3_MISSING_INTENT` | expected INTENT followed by one quoted string |
| `GATE-PARSE-008` | `GATE_V3_MISSING_REQUIRES` | expected 'REQUIRES:' |
| `GATE-PARSE-009` | `GATE_V3_MALFORMED_REQUIREMENT` | malformed requirement |
| `GATE-PARSE-010` | `GATE_V3_MISSING_PARTS` | expected 'PARTS:' |
| `GATE-PARSE-011` | `GATE_V3_NO_PARTS` | a circuit requires at least one PART |
| `GATE-PARSE-012` | `GATE_V3_MISSING_WIRES` | expected 'WIRES:' |
| `GATE-PARSE-013` | `GATE_V3_NO_WIRES` | a circuit requires at least one WIRE |
| `GATE-PARSE-014` | `GATE_V3_MISSING_END` | expected 'END' |
| `GATE-PARSE-015` | `GATE_V3_TRAILING_CONTENT` | unexpected content after END |
| `GATE-PARSE-016` | `GATE_V3_MALFORMED_PARAM` | malformed parameter |
| `GATE-PARSE-018` | `GATE_V3_MALFORMED_PART` | part must be enclosed in '[' and ']' |
| `GATE-PARSE-019` | `GATE_V3_INEXACT_COMPONENT` | malformed part or non-exact component version |
| `GATE-PARSE-020` | `GATE_V3_MALFORMED_ARGUMENT` | malformed component argument |
| `GATE-PARSE-021` | `GATE_V3_MALFORMED_WIRE` | malformed wire |
| `GATE-PARSE-022` | `GATE_V3_INVALID_ENDPOINT` | invalid endpoint |
| `GATE-PARSE-025` | `GATE_V3_INVALID_LITERAL` | invalid literal |
| `GATE-PARSE-028` | `GATE_V3_SET_NESTING_EXCEEDED` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-029` | `GATE_V3_SET_CARDINALITY_EXCEEDED` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-030` | `GATE_V3_IDENTIFIER_TOO_LONG` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-031` | `GATE_V3_TOO_MANY_ARGUMENTS` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-032` | `GATE_V3_TOO_MANY_PARTS` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-033` | `GATE_V3_TOO_MANY_WIRES` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |
| `GATE-PARSE-034` | `GATE_V3_FILE_TOO_LARGE` | *(declared in `gate-v3-parser.ts`; message assembled at emit site)* |

## GATE-REGISTRY-* (16)

Tier 2a — the component registry. Closed-schema validation of contracts BEFORE any normalisation; a malformed entry never reaches a downstream check.

| code | name | message |
|---|---|---|
| `GATE-REGISTRY-001` | `GATE_V3_REGISTRY_NOT_OBJECT` | registry must be an object |
| `GATE-REGISTRY-002` | `GATE_V3_REGISTRY_BAD_VERSION` | registry version must be exactly 1.0.0 |
| `GATE-REGISTRY-003` | `GATE_V3_REGISTRY_COMPONENTS_NOT_ARRAY` | registry components must be an array |
| `GATE-REGISTRY-004` | `GATE_V3_REGISTRY_DUPLICATE_COMPONENT` | duplicate component |
| `GATE-REGISTRY-005` | `GATE_V3_REGISTRY_DIGEST_MISMATCH` | declared registry digest does not match canonical content |
| `GATE-REGISTRY-006` | `GATE_V3_REGISTRY_BAD_COMPONENT_SHAPE` | component entry has an invalid identity/port shape |
| `GATE-REGISTRY-007` | `GATE_V3_REGISTRY_TYPES_NOT_ARRAY` | registry types must be an array when present |
| `GATE-REGISTRY-008` | `GATE_V3_REGISTRY_BAD_TYPE_SHAPE` | type entry has an invalid identity/domain shape |
| `GATE-REGISTRY-009` | `GATE_V3_REGISTRY_DUPLICATE_TYPE` | duplicate type |
| `GATE-REGISTRY-010` | `GATE_V3_REGISTRY_UNKNOWN_PORT_TYPE` | component uses a type absent from the catalogue |
| `GATE-REGISTRY-011` | `GATE_V3_REGISTRY_MALFORMED_ENTRY` | malformed entry in a component list |
| `GATE-REGISTRY-012` | `GATE_V3_REGISTRY_DUPLICATE_DECLARATION` | duplicate declaration in a component contract |
| `GATE-REGISTRY-013` | `GATE_V3_REGISTRY_BAD_COPYABLE` | copyable must be absent or a Boolean |
| `GATE-REGISTRY-014` | `GATE_V3_REGISTRY_SURPLUS_FIELD` | unknown field on a contract entry (the schema is closed) |
| `GATE-REGISTRY-015` | `GATE_V3_REGISTRY_BAD_VOCABULARY` | malformed vocabularies block |
| `GATE-REGISTRY-016` | `GATE_V3_REGISTRY_VARIANT_VIOLATION` | variant family violation |

## GATE-RESOLVE-* (20)

Tier 2b — resolution of a circuit against its registry: components exist at the pinned version, required inputs are wired, declared decision arms are routed.

| code | name | message |
|---|---|---|
| `GATE-RESOLVE-001` | `GATE_V3_DUPLICATE_PARAMETER` | duplicate parameter |
| `GATE-RESOLVE-002` | `GATE_V3_DUPLICATE_PART` | duplicate part instance |
| `GATE-RESOLVE-003` | `GATE_V3_DUPLICATE_ARGUMENT` | duplicate argument |
| `GATE-RESOLVE-004` | `GATE_V3_UNKNOWN_PARAM_REF` | unknown parameter reference |
| `GATE-RESOLVE-005` | `GATE_V3_UNKNOWN_INPUT` | unknown input |
| `GATE-RESOLVE-006` | `GATE_V3_UNKNOWN_SOURCE` | unknown source instance |
| `GATE-RESOLVE-007` | `GATE_V3_UNKNOWN_TARGET` | unknown target instance |
| `GATE-RESOLVE-008` | `GATE_V3_DUPLICATE_SET_VALUE` | set literal contains a duplicate value |
| `GATE-RESOLVE-101` | `GATE_V3_COMPONENT_ABSENT` | component is absent from the registry |
| `GATE-RESOLVE-102` | `GATE_V3_COMPONENT_INADMISSIBLE` | component has a non-admissible status |
| `GATE-RESOLVE-103` | `GATE_V3_UNKNOWN_ARGUMENT` | unknown argument |
| `GATE-RESOLVE-104` | `GATE_V3_ARGUMENT_TYPE` | argument value does not match its declared type |
| `GATE-RESOLVE-105` | `GATE_V3_MISSING_ARGUMENT` | missing required argument |
| `GATE-RESOLVE-106` | `GATE_V3_UNKNOWN_OUTPUT_PORT` | unknown output port |
| `GATE-RESOLVE-107` | `GATE_V3_UNKNOWN_INPUT_PORT` | unknown input port |
| `GATE-RESOLVE-108` | `GATE_V3_UNKNOWN_TYPE` | type is absent from the registry catalogue |
| `GATE-RESOLVE-109` | `GATE_V3_NO_TYPE_CATALOGUE` | the strict profile requires a non-empty type catalogue |
| `GATE-RESOLVE-110` | `GATE_V3_REQUIRED_INPUT_UNWIRED` | required input port has no producer |
| `GATE-RESOLVE-111` | `GATE_V3_DECISION_ARM_UNROUTED` | declared decision arm is not routed |
| `GATE-RESOLVE-112` | `GATE_V3_ARGUMENT_OUT_OF_RANGE` | argument value violates its declared range |

## GATE-WIRE-* (9)

Tier 2c — exact nominal wire typing. No generics, no implicit conversion; `GATE-WIRE-101` is the type wall.

| code | name | message |
|---|---|---|
| `GATE-WIRE-001` | `GATE_V3_BAD_RETURN_PORT` | the single return terminal is OUT.value |
| `GATE-WIRE-002` | `GATE_V3_DUPLICATE_CONSUMER` | consumer already has a producer |
| `GATE-WIRE-003` | `GATE_V3_UNUSED_INPUT` | input is never connected |
| `GATE-WIRE-004` | `GATE_V3_DISCONNECTED_PART` | part is disconnected |
| `GATE-WIRE-005` | `GATE_V3_NO_OUT_PATH` | circuit has no successful OUT.value path |
| `GATE-WIRE-006` | `GATE_V3_TERMINAL_PRODUCES` | terminal cannot produce a value |
| `GATE-WIRE-007` | `GATE_V3_INPUT_CONSUMES` | input cannot consume a value |
| `GATE-WIRE-101` | `GATE_V3_WIRE_TYPE_MISMATCH` | wire type mismatch (no implicit conversion) |
| `GATE-WIRE-102` | `GATE_V3_NONCOPYABLE_FANOUT` | non-copyable output has more than one consumer |

## GATE-TERM-* (4)

Tier 3a — termination: a part-to-part cycle always refuses. TERM-003 (unbounded) unless some STEP of the cycle has every parallel wire bounded, then TERM-004 (annotated as bounded, pending a registered state contract and termination proof). SEMANTICS §4.

| code | name | message |
|---|---|---|
| `GATE-TERM-001` | `GATE_V3_DUPLICATE_BUDGET` | duplicate budget |
| `GATE-TERM-002` | `GATE_V3_INVALID_BUDGET` | budget must be a positive integer |
| `GATE-TERM-003` | `GATE_V3_UNBOUNDED_CYCLE` | unbounded component cycle |
| `GATE-TERM-004` | `GATE_V3_UNPROVED_CYCLE` | cycle requires a registered state contract and canonical termination proof |

## GATE-AUTH-* (2)

Tier 3b — K3 authority shape: three-valued deciders route allow/deny/indeterminate exhaustively.

| code | name | message |
|---|---|---|
| `GATE-AUTH-001` | `GATE_V3_MISSING_DENY_ARM` | authority part has allow but no deny route |
| `GATE-AUTH-002` | `GATE_V3_MISSING_INDETERMINATE_ARM` | authority part has allow but no indeterminate route |

## GATE-LIVE-* (2)

Tier 3c — liveness: every part reachable from IN, every terminal reachable.

| code | name | message |
|---|---|---|
| `GATE-LIVE-001` | `GATE_V3_ORPHAN_SOURCE` | part declares required inputs but none are wired and it is unreachable from any circuit input |
| `GATE-LIVE-002` | `GATE_V3_DEAD_END` | part declares outputs but none are wired and it reaches no terminal |

## GATE-EFFECT-* (2)

Tier 4a — the effect envelope at the circuit boundary.

| code | name | message |
|---|---|---|
| `GATE-EFFECT-001` | `GATE_V3_DUPLICATE_CAPABILITY` | duplicate capability |
| `GATE-EFFECT-002` | `GATE_V3_DUPLICATE_EFFECT` | duplicate effect |

## GATE-SEM-* (14)

Tier 5 — the semantic passes over the GateGraph: privacy domination and separation (002/003), decision shape (004), construction (005), budgets (006), vocabularies (007/008), envelope (009/010), deny-arm containment (011), canonical effect names (012), taint-to-sink (013), zone domination (014).

| code | name | message |
|---|---|---|
| `GATE-SEM-001` | `GATE_V3_CYCLE_REACHED_SEMANTIC_TIER` | a component cycle reached the semantic tier (upstream refusal GATE-TERM-003/004 was bypassed) |
| `GATE-SEM-002` | `GATE_V3_CUT_DOES_NOT_DOMINATE_EGRESS` | egress is reachable on a path that bypasses every declared cut (domination violated) |
| `GATE-SEM-003` | `GATE_V3_TAINT_REACHES_EGRESS_PAST_CUTS` | taint reaches egress with every declared cut removed (separator violated, RD-0229) |
| `GATE-SEM-004` | `GATE_V3_UNDECLARED_DECISION_SHAPE` | component's outputs are shaped like a three-valued decision (three outputs, one shared type) but the contract does not declare decision: true |
| `GATE-SEM-005` | `GATE_V3_NON_SOURCE_TYPE_AS_PARAMETER` | a non-source type enters as a circuit parameter — its constructor/verifier never runs inside the governed drawing |
| `GATE-SEM-006` | `GATE_V3_BUDGET_CEILING_EXCEEDED` | worst-case composed wire budget exceeds the ceiling REQUIRES declares |
| `GATE-SEM-007` | `GATE_V3_REASON_OUTSIDE_VOCABULARY` | terminal reason is not in the registry's declared vocabulary for its family |
| `GATE-SEM-008` | `GATE_V3_REASONS_UNCHECKED` | terminal reasons are UNCHECKED — the registry declares no vocabulary for this family |
| `GATE-SEM-009` | `GATE_V3_EFFECT_OUTSIDE_ENVELOPE` | component effect is not covered by the circuit's declared REQUIRES envelope |
| `GATE-SEM-010` | `GATE_V3_CAPABILITY_OUTSIDE_ENVELOPE` | component capability is not covered by the circuit's declared REQUIRES envelope |
| `GATE-SEM-011` | `GATE_V3_NON_ALLOW_ARM_REACHES_EGRESS` | a deny/indeterminate arm reaches OUT without an intervening decision (a refusal is flowing into success) |
| `GATE-SEM-012` | `GATE_V3_UNKNOWN_EFFECT_NAME` | effect name is not in the canonical effect vocabulary |
| `GATE-SEM-013` | `GATE_V3_TAINT_REACHES_GOVERNED_SINK` | taint reaches a governed sink (an egress-class effect) without passing a declared cut |
| `GATE-SEM-014` | `GATE_V3_SEMANTIC_ZONE_NOT_GATED` | a semantic-zone part is reachable without passing a zone gate's allow arm |

## GATE-ADMIT-* (11)

Tier 6 — G7 admission: building the statement an admission envelope signs over. Construction fails closed on any missing binding; the verdict is computed, never accepted as input. NOTE the G4 capability envelope (SEM-009/010) is a different surface — same word, different job.

| code | name | message |
|---|---|---|
| `GATE-ADMIT-001` | `GATE_V3_ADMISSION_NO_TARGET` | admission requires a non-empty target; an admission is target-scoped, never universal |
| `GATE-ADMIT-002` | `GATE_V3_ADMISSION_PROOFS_ABSENT` | admission requires the proof set; a circuit whose proofs were never evaluated cannot be admitted or refused, only rejected here |
| `GATE-ADMIT-003` | `GATE_V3_ADMISSION_VERIFIER_UNIDENTIFIED` | admission requires the verifier version and rule-set identity; a verdict with no verifier identity cannot be re-checked |
| `GATE-ADMIT-004` | `GATE_V3_ADMISSION_UNRESOLVED_COMPONENT` | admission requires every part's implementation digest; a part with no resolved contract cannot be bound |
| `GATE-ADMIT-005` | `GATE_V3_ADMISSION_SOURCE_TAMPERED` | source bytes in hand do not match the admitted source digest |
| `GATE-ADMIT-006` | `GATE_V3_ADMISSION_WRONG_REGISTRY` | registry in hand does not match the admitted registry digest; admission under one component catalogue is not admission under another |
| `GATE-ADMIT-007` | `GATE_V3_ADMISSION_WRONG_TARGET` | target in hand does not match the admitted target; a universal admission is not an admission |
| `GATE-ADMIT-008` | `GATE_V3_ADMISSION_PROOFS_DISAGREE` | statement proofs disagree with recomputation from the artifacts in hand |
| `GATE-ADMIT-009` | `GATE_V3_ADMISSION_SUBSTITUTED_CIRCUIT` | circuit in hand does not match the admitted circuit digest; the envelope is internally consistent but was issued for a different circuit |
| `GATE-ADMIT-010` | `GATE_V3_ADMISSION_NOT_A_STATEMENT` | value is not a gate-v3-admission.v1 statement |
| `GATE-ADMIT-011` | `GATE_V3_ADMISSION_VERDICT_NOT_ADMITTED` | statement is authentic and records a refusal; a refused admission does not become admissible by verifying |

