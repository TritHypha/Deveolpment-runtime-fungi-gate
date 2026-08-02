# Native VOK W^X Execution Floor Design

**Date:** 2026-08-02
**Status:** owner-approved bounded implementation chapter
**Authorities:** KB RD-0601, RD-0656 and RD-0657

## Goal

Link the existing native VOK authority table to the smallest executable-memory
boundary that can prove an owned object was admitted, converted to a closed
native image, mapped without RWX, executed once and reduced to an ordinary
terminal receipt. This chapter closes the roadmap's native VOK authority-floor
node; it does not claim the general-purpose SLIDE VEO loader is complete.

## Placement and dependency direction

Both crates remain internal implementation modules of the single top-level
`@galerina/core-runtime` package:

```text
packages-galerina/galerina-core-runtime/native/vok-authority/
  src/lib.rs              # public safe affine authority API
  src/native.rs           # private closed parser and fixed emitter
  src/native/platform.rs  # private audited unsafe OS boundary
```

One crate owns the complete boundary. `unsafe` is denied at the crate root and
allowed only for the private platform module. The parser, emitter and execution
entry point are crate-private, so another package cannot depend on a safe raw
executor and bypass the authority table. No Node addon, path loader, dynamic
library or nested Galerina package is introduced.

## Closed object profile

The first executable object is exactly 16 bytes:

| Offset | Bytes | Meaning |
| --- | ---: | --- |
| 0 | 4 | ASCII magic `GVEO` |
| 4 | 1 | object format version `1` |
| 5 | 1 | profile `1` = return one unsigned 64-bit value |
| 6 | 1 | target `1` = x86-64, `2` = AArch64 |
| 7 | 1 | flags, required to be zero |
| 8 | 8 | little-endian return value |

Missing, surplus, wrong-version, wrong-profile, wrong-target or nonzero-flag
bytes refuse before executable memory is allocated. There are no imports,
relocations, constructors, writable globals, paths or caller-supplied machine
instructions in this profile. A fixed internal encoder emits the target stub;
the semantic object supplies only the returned data value.

## Authority and execution sequence

1. The existing eight K3 admission gates mint only for the all-`+1` vector.
2. `open_lease` consumes the admitted handle and revalidates current context.
3. `execute_lease` consumes the lease, revalidates every private field and
   current context, then passes only the private owned object bytes to the
   crate-private native module.
4. The private module parses the closed object, generates the fixed native stub,
   allocates anonymous writable/non-executable memory, copies the stub,
   changes the mapping to readable/executable, flushes the instruction cache,
   queries the current mapping and refuses unless it is executable and not
   writable, then calls the single entry point.
5. The mapping is released and the authority slot is terminally cleared on
   success or failure. No fallback path exists.
6. Success returns ordinary evidence plus a VOK receipt. Both report
   `authority_released = false`; neither can be replayed as a lease.

The OS adapter never requests a writable-and-executable protection. The public
execution method accepts only an affine lease, never bytes or a path. A typed
constructor emits the closed semantic object. Bytes supplied through the
existing generic request constructor cannot bypass the same private
exact-format parser and fixed emitter.

## Randomness

`OsNonceSource` connects the authority table to the operating system CSPRNG:
BCrypt system-preferred RNG on Windows, `getrandom` on Linux and `getentropy`
on macOS. A missing, short, zero or failed result refuses. Deterministic nonce
sources remain test-only and dependency-injected.

## Platform evidence and claim boundary

Windows x86-64 receives live execution and page-query evidence on the current
host. Linux x86-64/AArch64 and macOS x86-64/AArch64 receive source and target
compile checks in this chapter; their independent live receipts remain in the
separate cross-platform release-admission gate.

The following remain outside this bounded floor:

- arbitrary functions, parameters, control flow or general GIR lowering;
- imports, relocations, object-file parsing and component resources;
- hostile-kernel or co-resident-process memory confidentiality;
- physical erasure proof;
- production signing/release authority; and
- a general-purpose replacement for the temporary host runtime.

## Exit evidence

- existing 19,683-vector native/`.fungi` K3 parity stays exact;
- the public authority surface stays safe; `unsafe` exists only in the private
  platform module and no separately depend-able executor manifest exists;
- malformed object classes refuse without allocation or execution;
- a valid object executes once and returns its exact value;
- live Windows page evidence proves executable and not writable immediately
  before the call;
- the adapter source contains no RWX request and exposes no raw-code API;
- OS entropy creates nonzero authority nonces or fails closed;
- focused, package and repository security regressions stay green; and
- roadmap wording distinguishes this floor from the still-bounded general VEO
  implementation and independent platform gates.
