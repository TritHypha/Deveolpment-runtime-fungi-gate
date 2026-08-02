# Native VOK Authority Table Design

**Date:** 2026-08-02
**Status:** baseline implemented; extended by the RD-0662 W^X floor
**R&D:** `ZTF-Knowledge-Bases/RD-0660-native-vok-authority-table.md`

The non-goals and exit evidence below describe this completed baseline chapter.
RD-0662 later adds one private W^X/OS module in the same crate: `unsafe` remains
denied outside that module and the public handle/table surface remains safe.

## Goal

Add the smallest native floor that can represent the runtime half of
`Authority<Tag>` without creating a new top-level package, accepting a
serializable handle, or claiming W^X execution before it exists.

## Home and boundary

The implementation lives in `@galerina/core-runtime`:

```text
packages-galerina/galerina-core-runtime/
  src/self-hosted/vok-authority-admission.fungi
  native/vok-authority/
    Cargo.toml
    Cargo.lock
    src/lib.rs
    tests/
```

This is one package with one public owner. The native directory is an
irreducible floor, not a child plugin or npm-style nested package. It imports no
Galerina workspace package and exposes no Node sidecar.

## Responsibility split

| Surface | Owns | Must not own |
|---|---|---|
| `.fungi` twin | exact K3 min fold over eight admission facts plus live-handle state | native slots, randomness, executable memory |
| native table | opaque types, bounded slots, generation/nonces, context checks, transitions, logical clear | component policy, proposal scoring, crypto, W^X |
| later host adapter | OS CSPRNG and opaque VM/component-resource transfer | application policy |
| later VEO loader | anonymous owned-byte W^X map and terminal execution receipt | minting from data |

## Public native model

```rust
pub enum Trit { Refuse = -1, Unknown = 0, Admit = 1 }

pub struct AuthorityContext { /* exact digests + policy/revocation epochs */ }
pub struct MintRequest { /* tag, context, eight gates, bounded owned bytes */ }
pub struct AdmittedObjectHandle { /* private, non-cloneable */ }
pub struct LeaseHandle { /* private, non-cloneable */ }
pub struct VokReceipt { /* value-only, authority_released always false */ }

pub trait NonceSource {
    fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure>;
}

pub struct AuthorityTable<N: NonceSource> { /* fixed bounded table */ }
```

The first table is deliberately `!Send + !Sync`. Parallel transfer requires a
future explicit runtime channel contract; accidental cross-thread aliasing is
not admitted now.

## Operations

1. `new` validates capacity, byte ceiling and a nonzero table-instance nonce.
2. `mint_admitted` validates the exact tag, byte bound, eight trits and current
   context, then obtains a fresh nonzero object nonce. Only an all-`+1` vector
   mints.
3. `open_lease` consumes the admitted handle and revalidates every private field
   plus current context. It advances generation and obtains a second nonce.
4. `consume_lease` consumes the lease, validates current context and terminal
   outcome, logically clears owned bytes, advances generation and returns a
   value-only receipt.
5. `advance_context` accepts only monotonic policy/revocation epochs and eagerly
   revokes older entries. Regression refuses.
6. table drop logically clears all remaining owned bytes.

Every error carries K3 outcome plus a stable failure identifier. `Unknown` and
`Refuse` both block; neither path returns a handle.

## Non-goals for this chapter

- no Node/TypeScript mint implementation;
- no public FFI that accepts raw handle bytes or integers;
- no serialization, cloning, borrowing or cross-thread transfer;
- no OS CSPRNG implementation or custom cryptography;
- no W^X map or VEO execution;
- no production `authorityReleased: true`; and
- no deletion of existing Galerina or SLIDE components.

## Exit evidence

- `.fungi` and Rust folds agree with `min` for all `3^9 = 19,683` vectors;
- safe public handles cannot be constructed, cloned, serialized or transferred
  between threads;
- internal hostile tests alter each private field and always refuse;
- stale generation, repeated nonce, wrong table/tag/context, epoch regression,
  second lease, receipt replay and capacity exhaustion refuse;
- all code is `unsafe`-free and formatted/linted;
- core-runtime, complete Galerina and security/tooling gates remain green; and
- documentation remains explicit that the native floor is not linked into the
  production execution path.
