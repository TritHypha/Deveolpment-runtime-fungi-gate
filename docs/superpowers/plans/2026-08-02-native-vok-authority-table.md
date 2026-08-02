# Native VOK Authority Table Implementation Plan

> Execute task-by-task with test-driven development. Observe each required RED
> before writing its production implementation. Complete steps use `- [x]`;
> pending steps use `- [ ]`.

**Goal:** implement the bounded, non-authorizing native VOK authority-table
floor selected by RD-0660 while keeping K3 policy in `.fungi` and leaving OS
CSPRNG, VM-resource transfer and W^X execution explicitly open.

**Home:** `packages-galerina/galerina-core-runtime`; no new top-level package.

## Task 1 - `.fungi` nine-gate decision surface

- [x] Add a failing loaded-asset test for
  `src/self-hosted/vok-authority-admission.fungi`.
- [x] Add failing truth-table tests for `vokAuthorityVerdict` and its exact
  `min` behavior, including malformed trits and every single `0/-1` gate.
- [x] Implement the smallest `.fungi` `vAnd`/nine-input fold using flat exits
  and the project coding standard.
- [x] Compile and execute it through the governed compiler path.
- [x] Add the source to `packageGraph.loadedAssets` and commit the slice.

## Task 2 - native crate skeleton and opaque types

- [x] Add failing Rust compile-fail/unit tests proving handles are not publicly
  constructible, `Clone`, `Copy`, `Send` or `Sync`, and debug is redacted.
- [x] Add `native/vok-authority` with `#![forbid(unsafe_code)]`, no runtime
  dependency and a committed lockfile.
- [x] Implement `Trit`, exact tag/context types, stable errors, private handle
  types and injected `NonceSource`.
- [x] Run `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
  `cargo test --all-targets` and doctests; commit the slice.

## Task 3 - bounded mint table

- [x] Write RED tests for invalid capacity/byte ceilings, malformed tags,
  missing or repeated nonces, non-all-positive gates and capacity exhaustion.
- [x] Implement fixed-capacity slots, deterministic free-list, private initial
  generation and per-table/per-object nonce validation. Generation transitions
  and overflow retirement remain Task 4.
- [x] Exhaustively test all `3^8 = 6,561` admission vectors; one mints.
- [x] Verify no ordinary evidence/proposal/receipt type enters the mint API;
  commit the slice.

## Task 4 - affine lease and revocation state machine

- [ ] Write RED hostile tests for forged table/slot/generation/nonce/tag,
  copied stale admitted handles, second lease, stale lease, wrong context,
  context regression and receipt replay.
- [ ] Implement consume-by-value admitted-to-lease and lease-to-receipt
  transitions, advancing generation and nonce on each transition.
- [ ] Implement monotonic context advance with eager revocation and logical
  byte clearing; generation overflow retires the slot.
- [ ] Exhaustively verify the combined `3^9 = 19,683` K3 state space and commit.

## Task 5 - parity, hostile assurance and benchmark

- [ ] Add a deterministic native vector runner or fixture so Rust and `.fungi`
  results are compared rather than merely tested separately.
- [ ] Run mutation/security checks against the native and `.fungi` surfaces.
- [ ] Add a bounded benchmark with at least 99 samples comparing VOK mint/open/
  consume with a null baseline and a simpler checked map; report medians,
  dispersion and honest overhead without a speed claim.
- [ ] Record that deterministic test nonces are not production entropy.

## Task 6 - documentation, generated artifacts and fixed point

- [ ] Update core-runtime README/TODO, root TODO, architecture and vertical
  roadmap with implemented and still-open boundaries.
- [ ] Update RD-0660 evidence checkboxes and the rolling R&D table.
- [ ] Regenerate code index, registry, package graphs, dev-tool index, status,
  roadmap, percent audit and governed test counts in canonical order.
- [ ] Run focused tests, core-runtime, compiler, aggregate packages, graphs,
  audits, security scan and strict/exhaustive phase-close.
- [ ] Review for secrets, private paths, full nonessential key IDs, generated
  drift and any `authorityReleased: true` claim.
- [ ] Commit Galerina and KB separately; never push.

## Production gates intentionally left open

- verified OS CSPRNG adapters on Windows, Linux and macOS;
- opaque Galerina VM/Wasm-component resource transfer;
- process isolation / memory-integrity evidence under the hostile-memory model;
- physical erasure evidence;
- native owned-byte W^X VEO execution; and
- independent cross-platform reproduction.
