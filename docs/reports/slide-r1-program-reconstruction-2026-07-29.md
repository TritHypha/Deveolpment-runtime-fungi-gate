# SLIDE R1 independent typed-program reconstruction

**Date:** 2026-07-29
**Status:** implemented bounded decode, semantic-validation, and reference-execution checkpoint

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

Result after the semantic validator, semantic binder, and
instruction-driven runtime were added:

```text
25 tests
25 pass
0 fail
```

The tests prove:

- complete root-table reconstruction;
- exact decoded block, instruction, operand, terminator, failure, and K3
  values; and
- no partial graph exposure after malformed-root refusal;
- dense block and SSA identities, definition/use dominance, registered opcode
  shapes and types, declared failures, total terminators, exact CFG successors,
  and the K3 obligation are independently validated;
- unknown opcodes, non-dominating SSA use, type drift, block-identity drift,
  missing failure records, altered K3 successors, and altered obligations
  refuse before dispatch;
- the decoded-program executor matches the detached closed-profile oracle for
  ALLOW, DENY, INDETERMINATE, checked Int32 limits, overflow, and underflow;
  and
- a fresh process executes the canonical bytes without the source fixture,
  encoder object, AST, WAT, or Wasm; and
- the registered semantic binding equals
  `e376c4654c667708662bc22350df955f85db3b22eb429657ad6d2c751aff5627`,
  while structurally or semantically refused input releases no digest; and
- unsupported semantic-profile bytes, an invalid serialized Verdict signature,
  and a forged fourth runtime Verdict all terminate without execution.

## Deliberate limit

`DECODED` remains non-authoritative. Only the separately returned `VALIDATED`
decision permits the instruction-driven reference runtime to dispatch. The R1
profile is still intentionally closed to the frozen four-block fixture: it is
not yet general executable GIR, a safe-value memory proof, a signed `.slide`
payload, or a native execution path.

The previous hard-coded closed-profile executor remains only as a differential
oracle. It is not on the new decoded-program execution path and must not be
removed until the broader serialized mutation corpus and memory gate pass.

## Next gate

Add the remaining malformed-Verdict and unsupported-profile serialized
fixtures, begin the safe-value memory negative corpus, and then generalize the
closed registry without adding an encoder/AST/default fallback.
