# SLIDE R1 independent typed-program reconstruction

**Date:** 2026-07-29  
**Status:** implemented bounded checkpoint; semantic authority not yet granted

## Outcome

`packages-galerina/galerina-core-compiler/src/self-hosted/slide-r1-program-importer.fungi`
now reconstructs the canonical SLIDE R1 body into records owned by the importer:

- root format/profile/memory and function fields;
- parameter and result types;
- blocks;
- instructions, operands, and immediates;
- terminators and successors;
- failures; and
- K3 obligations.

The module combines only with the independent bounded canonical-CBOR
primitives. It does not call the encoder, exact-vector validator, fixed
structural-admission flow, source parser, AST, WAT, Wasm, cache, or ambient
registry.

## Fail-closed boundary

Canonical decoding and local ceilings run before a program is exposed.
Malformed, truncated, non-canonical, oversized, or suffixed input returns a
denial decision and an empty no-authority program. The decoder performs no
fix-up and does not replace missing bytes with fixture defaults.

Profile identifier strings are admitted by exact canonical byte comparison.
Numeric graph fields are read from the candidate body and retained in the
decoded records; they are not copied from the encoder object.

## Evidence

Focused command:

```text
node --test tests/slide-r1-cbor.test.mjs
```

Result:

```text
16 tests
16 pass
0 fail
```

The new tests prove:

- complete root-table reconstruction;
- exact decoded block, instruction, operand, terminator, failure, and K3
  values; and
- no partial graph exposure after malformed-root refusal.

## Deliberate limit

`DECODED` is not `VALIDATED` and grants no execution authority. General
closed-registry CFG reachability, dense/unique identities, SSA definition/use
and dominance, exact types, terminators, failure records, K3 totality, and
memory-profile semantics are the next gate. The existing closed-profile
executor remains a differential oracle only.
