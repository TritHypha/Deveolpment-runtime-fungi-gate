# SLIDE V2-D safe-value semantic-memory logical checkpoint

**Date:** 2026-07-29
**Galerina implementation commit:** `cadbd66f`
**Executable integration commit:** `5b98ccaf`
**Canonical producer commit:** `917bef9b`
**Independent wire/import commit:** `8b137394`
**Registry descriptor:** 1,383 LF bytes
**Registry SHA-256:** `a0531c88fa07e5f2b4b2ff2b000cd351ea9abdc1a3cd9b5d87a5ffdd7de3c648`
**Canonical body:** 791 bytes
**Canonical body SHA-256:** `b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38`

## Claim boundary

This checkpoint proves one bounded logical semantic-memory plan, a
deterministic canonical producer, and independent canonical reconstruction.
It does not prove the V2-D semantic digest, detached guarded execution, native
memory safety, LLVM guard preservation, final-artifact safety, containment,
or execution authority.

Every success reports:

- `semanticMemoryBytes: 12`;
- `guardCount: 1`;
- `nativeCertificatePresent: false`; and
- `authorityReleased: false`.

## Implemented

`slide-v2d-memory-model.fungi` appends, without reinterpreting V2-C:

- type 14, a non-address `BoundsGuardToken`;
- opcode 21, `bounds_guard`;
- opcode 22, `array_index_guarded`;
- one function-local runtime-controlled region;
- one immutable, definitely initialized, public `Array<Int32>` object;
- extent 3 × 4 bytes with alignment 4 and exact 12-byte ceilings; and
- one guard descriptor binding function 3, block 0, array/index SSA values,
  guard result 8, access result 9, object 1, and registered failure 4.

The guarded V2-D function uses explicit guard and access instructions before
the existing record/variant path. The guard token is an SSA proof carrier,
not a pointer, capability, handle, serialized authority, or substitute for a
runtime bounds check.

`slide-v2d-memory-validator.fungi` validates:

1. exact V2-D and frozen V2-C registry/semantic bindings;
2. exact resource ceilings and zero forbidden surfaces;
3. dense append-only type/opcode identities;
4. region lifetime, cleanup, ownership, and byte ceiling;
5. object type, extent, element width, alignment, lifetime, mutability,
   initialization, and sensitivity;
6. checked extent multiplication before equality with region/object limits;
7. the complete guarded instruction sequence and no-fallthrough return; and
8. exact guard/access array, index, object, failure, scope, and dominance.

Every refusal exposes zero memory bytes, zero guards, no native certificate,
and no authority.

## Mutation evidence

V2-D passes 30/30. Explicit refusals cover:

- registry and frozen-parent drift;
- a forged native-certificate claim;
- memory, heap, pointer, free, shared-alias, FFI, effect, and capability
  surfaces;
- type-table gaps;
- missing/duplicate regions and objects;
- cleanup, ownership, extent, alignment, multiplication, mutability,
  initialization, and sensitivity drift;
- removed/reordered/misbound guards and accesses;
- changed registered failure or dominance relation; and
- return fallthrough.

The combined frozen V2-C plus V2-D focused suite passes 103/103.

The executable integration suite adds 14/14. It independently revalidates the
two frozen V2-A functions, retains the exact V2-C constant/record/variant
tables, and binds them to the guarded V2-D function and memory descriptors.
Total V2-D logical evidence is 44/44.

The canonical producer adds 6/6 tests. It emits one shortest-form 24-key,
791-byte body and pins its complete SHA-256 digest. Registry, guard, memory,
and authority mutations each refuse with zero partial bytes. Total focused
V2-D logical/canonical evidence is 50/50.

The independent vector gate and structural importer add 13/13 tests without
loading the V2-D producer or encoder. They pin all 791 bytes, refuse every
single-byte mutation, and reconstruct the complete graph, region, object, and
guard records into importer-owned values. Structural mutations and every
refusal expose no partial graph or memory plan. Total focused V2-D evidence is
63/63; the adjacent frozen R1/V2-A/V2-B/V2-C suites pass 246/246.

## Replacement and integration

Nothing is removed at this checkpoint.

Galerina must eventually emit memory objects, regions, initialization facts,
and source bindings once from checked source. Independent SLIDE must decode,
re-derive, and validate the same plan.

The current AST, WAT/Wasm, runtime, database/network, Tower Citizen, Tri-Pipe,
and V2-B components remain. A failed V2-D path cannot select any of them as a
fallback.

## Next safe boundary

Derive the V2-D semantic digest only after independent admission, then add
detached guarded execution with exact guard-before-observation and memory
accounting. LLVM/native work remains blocked.
