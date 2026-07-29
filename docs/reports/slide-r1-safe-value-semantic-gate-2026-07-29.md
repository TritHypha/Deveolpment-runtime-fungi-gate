# SLIDE R1 safe-value semantic-memory gate

**Date:** 2026-07-29
**Status:** implemented semantic-memory checkpoint; native certificate absent

## Outcome

`slide-r1-safe-value-verifier.fungi` adds an independent gate after canonical
and semantic admission. For the frozen R1 fixture it verifies:

- the exact `slide.memory.safe-value.v1` profile;
- the closed no-address type and opcode registries;
- checked arithmetic shape;
- total registered terminators;
- the four-block/nine-definition execution ceiling; and
- the absence, by closed registry, of address, index, allocation,
  deallocation, alias, call, FFI, effect, and concurrency operations.

The successful status is deliberately named `SEMANTIC_MEMORY_VALIDATED`, not
`MEMORY_SAFE`. It records that invariants 1–10 of the safe-value contract are
established or vacuous for this no-memory semantic graph. It does not claim
post-lowering guard preservation, final-binary inspection, native isolation,
or a signed memory-safety receipt.

## Fail-closed boundary

The memory gate receives no authority from a profile string. Canonical and
semantic import must first allow. An altered profile, malformed body, unknown
opcode, type/CFG/SSA/failure/K3 drift, or unresolved prior decision yields
`MEMORY_REFUSED` with an empty invariant list.

The registry is walked again even though the semantic validator currently
checks the same opcodes. This is intentional defence in depth: a future
semantic-registry addition must not silently inherit the safe-value profile.

## Evidence

Focused command:

```text
node --test tests/slide-r1-cbor.test.mjs
```

Result:

```text
27 tests
27 pass
0 fail
```

The memory-specific tests prove the canonical no-address fixture is admitted
only at the semantic-memory layer and that altered profiles, a candidate
memory-capable/unknown opcode, and malformed canonical bytes refuse before
memory admission.

## Remaining release gates

General executable GIR must explicitly represent memory objects, checked
indexing, sizes, lifetimes, aliases, resources, FFI handles, and budgets before
this verifier can generalize. Native work additionally requires
post-optimisation guard auditing, final-artifact binding, hostile handle/FFI
tests, isolation, and an independent verifier. Until then, Galerina's current
Wasm containment remains part of the factual production safety case.
