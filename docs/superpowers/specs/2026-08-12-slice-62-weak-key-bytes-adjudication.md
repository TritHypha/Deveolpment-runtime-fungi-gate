# Slice 62 Weak-Key Bytes Adjudication

## Decision

Slice 62 is `BLOCKED`. No `.fungi` asset, manifest entry, differential test or
candidate authority is created.

The exact TypeScript decision consumes `Uint8Array | undefined`, rejects a
missing or shorter-than-32-byte key, and scans every remaining byte until a
non-zero byte is found. Galerina recognizes `Bytes`, but the selected physical
SLIDE path cannot preserve this complete boundary: it admits `Bytes` and
`Option<Int>`, not `Option<Bytes>`, and its collection length/index operations
are restricted to `Array<Int>`. Its current `Bytes` lowering proves equality,
not byte length, indexed access or bounded traversal.

## Exact scope and evidence

| Slice | Exact symbol | Live callers | Result |
|---:|---|---|---|
| 62 | `packages-galerina/galerina-core-sentinel-state/src/state-serializer.ts#isWeakKey` | `StateSerializer` constructor, `serialize`, and `verify` | `BLOCKED` |

The source SHA-256 at the reviewed build point is
`DEB36C7F02DC9BEE362C657A6698D70C871F53AC49307075198F81D6D6C1460F`.
The owning package passes **26/26** with zero failures.

The conversion queue classifies the owning file as
`BLOCKED/DOSSIER_REQUIRED`. The retirement owner records no replacement and no
declared formal floor. The package's existing `cold-boot.fungi` asset explicitly
keeps `StateSerializer` crypto and byte movement on the host floor and twins
only the cold-boot restore decision. It does not supersede `isWeakKey`.

## Exact behavior and domain

The function has four observable routes:

1. `undefined` returns `true`;
2. a byte array shorter than 32 bytes returns `true`;
3. the first non-zero byte in an array of at least 32 bytes returns `false`;
4. an all-zero array of at least 32 bytes returns `true`.

The source accepts every `Uint8Array` length, not only 32 bytes. Its result is
therefore not equivalent to equality with one 32-byte zero constant. The scan
also has an early exit whose order and work bound are observable at the
execution-profile level.

All current production callers pass a value only after a handle or resolved
key has been validated as `Uint8Array`. That caller fact does not erase the
declared `undefined` branch from the exact symbol contract. A Bytes-only helper
would be a narrower decomposition, not a replacement for this symbol.

## Language and physical findings

- Galerina's live type registry contains `Byte` and `Bytes`.
- No tracked `.fungi` source currently demonstrates a checked Bytes operation
  for this decision family.
- The checked-Fungi SLIDE compiler assigns a physical type ID to `Bytes`.
- Its generic parser admits `Option<Int>` only; `Option<Bytes>` is not an
  admitted signature type.
- Its `.count()` and `.get()` expressions type-check and lower only for
  `Array<Int>`.
- Its current `Bytes` branch lowering supports equality between two Bytes
  values, which cannot express the 32-byte threshold or all-zero traversal.
- Host-provided length, zero-ness or an optional tag would move the security
  decision outside the Fungi artifact and is refused.

Frontend acceptance of `Bytes`, or a host bridge that supplies a precomputed
Boolean, is not physical parity.

## Decision and effect ledger

| Source operation | Proven subject | Required Fungi route | Effects | Current result |
|---|---|---|---|---|
| missing-key branch | `Uint8Array | undefined` | `Option<Bytes>` exhaustive `match` | none | physical signature unsupported |
| `key.length < 32` | byte length | exact bounded Bytes length operation | none | no admitted operation |
| `for (const byte of key)` | finite byte traversal | bounded Boolean `while` with monotonic index and explicit exit | none | Bytes index/traversal unsupported |
| `byte !== 0` | `Byte` comparison | Boolean `if` and terminal `return false` | none | leaf comparison expressible only after indexed access exists |
| completed scan | all bytes observed zero | terminal `return true` | none | blocked by traversal |

The function has no direct ambient effect, but it participates in signing-key
admission. Custom providers can return externally owned `Uint8Array` objects,
including potentially shared or concurrently mutable backing storage. Until
custody proves an immutable snapshot from validation through HMAC use, its
threadability is `SERIAL_HARD_PATH`, not `PARALLEL_PURE`.

## Required future proof

Before reopening this slice, one reviewed route must provide:

1. exact `Option<Bytes>` physical admission, or an owner-approved replacement
   contract that conserves the missing-key branch outside TypeScript;
2. bounded Bytes length and indexed byte access in Fungi, GIR, `.slide`,
   independent re-admission and VOK;
3. an explicit maximum byte length and work receipt for the Boolean `while`;
4. immutable key custody from validation through use, including refusal or
   snapshotting for shared/mutable backing storage;
5. differential vectors for undefined, lengths 0, 31, 32 and greater than 32,
   all-zero arrays, and a non-zero byte at the first, middle and last position;
6. direct source-oracle coverage for the currently untested short-key branch;
7. an explicit decision whether `StateSerializer` byte/crypto logic remains a
   declared host floor or becomes a physical Fungi/SLIDE family.

No scalar Boolean, host-computed length, host-computed zero-ness, fixed
32-byte-only narrowing or ambient global error route is permitted.

## Consultant and skill review

The short Claude challenge read and named both public Fungi skills, considered
only this exact question, and independently returned `BLOCKED` for the same
`Option<Bytes>`, byte-length and indexed-traversal gaps. Its response is
advisory; Codex independently verified the graph callers, source digest, queue
and retirement rows, package asset, package test lane, Galerina type registry
and SLIDE physical operations.

`NO_SKILL_UPDATE` applies to both public skills. A fresh-context baseline
without either skill already refused the candidate because equality is not
byte inspection and `Option<Int>` does not admit `Option<Bytes>`. The current
translation skill also requires exact physical domains and rejects invented
host APIs; the writing skill requires exact physical types, bounded Boolean
`while` and explicit absence. Adding a Slice-62-specific restatement would add
noise without closing a demonstrated reasoning gap.

## Authority retained

TypeScript remains the executing reference. This decision authorizes no
consumer switch, deletion, retirement, production, signing, release, profile
widening or push. Repository-wide closure remains `UNKNOWN` because the
crash-linked aggregate lanes remain excluded.
