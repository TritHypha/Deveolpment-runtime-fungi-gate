# SLIDE V2-C required mutation and exit audit

**Date:** 2026-07-29
**Galerina closure commit:** `756d54a0`
**Independent SLIDE producer commit:** `2496af3`
**Result:** V2-C exit gate satisfied; no Galerina component cut authorized

## Evidence boundary

The audit distinguishes three gates:

1. the exact 732-byte first-fixture identity;
2. the general bounded V2-C structural/semantic profile; and
3. execution of only independently decoded and admitted records.

A bounded raw-byte constant may be valid under the general profile while
failing the exact fixture identity. This is intentional. No signature,
producer origin, filename, cache, or prior success grants admission.

## Required matrix

| Required mutation/invariant | Authoritative evidence | Result |
|---|---|---|
| Invalid and overlong UTF-8 | `slide-v2c-aggregate-logical.test.mjs`: payload mismatch and `c0 af` overlong payload | Refused |
| Text and byte ceilings/lower bounds | Explicit text overflow, byte overflow, and empty-byte mutations | Refused |
| Array/record/variant ceilings | Array operand surplus plus record-field and variant-case overflow mutations | Refused |
| Copy, nesting, and step exhaustion | `slide-v2c-runtime.test.mjs`: exact/undersized copy and step budgets; exact/undersized depth budgets | Refused before result exposure |
| Duplicate/missing/reordered roots/descriptors | Exact-vector all-offset mutation; importer wrong count/reorder; duplicate record, missing variant, reordered fields | Refused with no partial graph |
| Unknown type/opcode/constant/encoding/field/case IDs | Type gap, unknown opcode, constant immediate, encoding, field, and case identity mutations | Refused |
| Field/case type mismatch | Record-field and variant-case payload type drift | Refused |
| Dynamic field/case selection | Field and case immediate drift | Refused |
| Out-of-range checked index | Runtime indices `-1`, `3`, Int32 minimum and maximum | Typed registered failure 4 |
| Removed/changed checked guard | Aggregate checked-index opcode mutations | Refused before execution |
| Mutable/address/allocation/deallocation/FFI opcode | Closed dense opcode registry plus unknown-opcode mutation/import tests | Refused |
| Effect/capability/lease/host-call injection | Effect/capability identities, function request, host-call and memory ceilings | Refused; no authority |
| Back edge or fallthrough | Back-edge ceiling and return-successor mutations | Refused |
| Parent/V2-B sidecar/registry drift | Parent, authority-sidecar, and registry descriptor digest mutations | Refused |
| Partial/default graph | Importer empty/truncated/suffixed/non-shortest/unknown-opcode cases | Empty graph; no fallback |
| Invalid fourth Verdict | Frozen R1/V2-A invocation-boundary suites | Terminal runtime error/fail closed |
| Frozen R1/V2-A/V2-B invariance | Adjacent regression suite | 117/117 |
| Every canonical byte offset | Independent exact-vector suite | 732/732 mutations refused |
| Second producer | Independent symbolic SLIDE reference frontend and cross-project tests | Exact body; 8/8 |

## Verification

- corrected V2-C suites: 73/73;
- adjacent frozen R1/V2-A/V2-B suites: 117/117;
- independent SLIDE frontend/cross-conformance: 8/8;
- authority released by every V2-C producer, validator, importer, runtime, and
  cross-project result: false.

## Exit decision

The six V2-C exit conditions in
`../../../triLowLevel-v2/24-V2-C-IMMUTABLE-AGGREGATE-INCREMENT.md` are
satisfied.

This permits V2-D semantic-memory work to begin. It does not authorize removal
of Galerina AST recovery, WAT/Wasm, runtime, database/network, Tower Citizen,
Tri-Pipe, or V2-B components. Those cuts remain behind V2-E
frontend-receipt/source-map parity and the detailed integration gates.
