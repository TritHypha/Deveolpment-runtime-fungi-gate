# Generic Runtime Authority Type Design

**Date:** 2026-08-02  
**Status:** approved under the owner's standing autonomous implementation
direction; implementation remains evidence-gated

## Goal

Add the smallest compiler-enforced `.fungi` type mechanism needed for SLIDE
VOK admitted objects and leases to be non-forgeable and consume-once without
changing normal Galerina value semantics or pretending that the current Node
bootstrap is a native authority runtime.

## Public source form

```fungi
type SlideVOKLease = Authority<"slide.vok.lease.v1">
```

`Authority` is a built-in generic type constructor with exactly one ASCII tag
argument. Production APIs expose named aliases. Two tags are distinct.

The first release deliberately has no authority borrowing syntax. Passing,
returning or rebinding an authority value transfers it and consumes the source.
This is a fail-closed subset that can later gain explicit borrowing without
weakening existing programs.

## Compiler components

### Type checker

- recognize `Authority<Tag>` as a one-argument built-in generic;
- require a non-empty quoted or bare ASCII tag;
- register aliases whose RHS is `Authority<Tag>` as authority types;
- reject ordinary literal/record values assigned to an authority alias;
- preserve exact alias/tag identity during assignment and return checking.

### Value-state checker

- collect authority aliases before walking executable nodes;
- mark parameters and explicitly typed bindings with the exact authority type;
- propagate the type through a direct move assignment;
- mark a source consumed when transferred to another binding, call or return;
- reject every later use with a dedicated diagnostic and related first-use
  location;
- reject authority at serialization and persistent-storage sinks;
- inspect nested call arguments so wrapping a handle does not evade checking.

### Diagnostic ownership

Keep the Passport-specific `FUNGI-AFFINE-001` meaning unchanged. Add new
diagnostics for the generic authority family so one code retains one fault:

- `FUNGI-AFFINE-002` - authority value consumed more than once;
- `FUNGI-AFFINE-003` - authority value crosses a serialization or persistent
  storage boundary;
- `FUNGI-TYPE-035` - invalid `Authority<Tag>` construction or tag.

The generated registry and code index remain authoritative and must be
regenerated through repository tools.

## First VOK consumer

Add one self-hosted `.fungi` contract file declaring distinct VOK admitted
object and lease authority aliases plus serializable receipt/evidence records.
It must clearly state that native runtime minting and authority release remain
closed. The file becomes a loaded asset only after strict parser, type, effect,
value-state, governance and emitter checks pass.

The compiler source-use checker is not the final runtime. Native VOK must later
back each authority value with a private slot and generation/epoch, resolve it
against current policy and execute owned bytes. Until then every VOK result
continues to report `authorityReleased: false`.

## Compatibility

- Ordinary records, primitives and collections keep current value semantics.
- Existing Passport behavior and `FUNGI-AFFINE-001` do not change.
- Existing governed `resource` declarations do not change.
- Reserved `move`/`borrow` syntax is not activated for general values.
- Wasm remains an optional compatibility target; this type is Galerina/VOK
  authority, not a Wasm handle alias.

## Security invariants

1. Names and fields never mint authority.
2. Only an exact current authority type can cross an authority parameter.
3. A binding can authorize at most one transfer.
4. `0` or unknown use-state refuses at `_=>`.
5. Serialization, storage and nested wrapper tricks cannot preserve authority.
6. A receipt is evidence and cannot be used as an authority value.
7. Source checking does not release native authority.

## Acceptance evidence

- focused RED/GREEN tests for generic arity/tag, incompatible tags, transfer,
  duplicate use, nested duplicate use and serialization/storage refusal;
- no affine diagnostic for ordinary values;
- existing Passport tests unchanged and green;
- full core-compiler test suite green;
- strict/effects/emitter validation for the VOK `.fungi` consumer;
- code registry/index and relevant language docs regenerated and drift-clean;
- full repository checks proportionate to changed surfaces.

## Deferred, explicitly non-authorizing work

- general borrow and lifetime checking;
- mandatory-consumption-at-scope-exit (linear rather than affine values);
- native private handle table and W^X execution mapping;
- cross-process transfer protocol;
- independently verified production authority.

