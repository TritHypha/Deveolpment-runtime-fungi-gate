# Native VOK authority table evidence report

**Date:** 2026-08-02

**Status:** experimental native floor; not linked into Galerina execution

**R&D:** `ZTF-Knowledge-Bases/RD-0660-native-vok-authority-table.md`

## Outcome

The first bounded VOK authority table now exists inside
`@galerina/core-runtime/native/vok-authority`. It is an unsafe-free,
dependency-free Rust floor below the `.fungi` nine-gate decision surface. It
does not execute object bytes, expose an FFI handle, call an OS random source or
set `authority_released` true.

Implemented controls:

- opaque non-`Clone`, non-`Copy`, non-`Send`, non-`Sync` admitted and lease
  types with private fields and redacted debug output;
- exact table, slot, generation, nonce, tag, target, policy, verifier and epoch
  checks on every transition;
- fixed table/object bounds, a deterministic free list and a hard-bounded exact
  nonce-history set;
- injected nonce source with zero, repeat, unavailable and budget-exhaustion
  refusal;
- consume-by-value admitted-to-lease and lease-to-value-only-receipt changes;
- monotonic context advance, eager revocation, logical owned-byte clearing and
  generation-overflow retirement; and
- no parser, integer decoder, Boolean shortcut, serialization dependency or
  ordinary receipt-to-authority conversion.

## Verification

| Gate | Fresh result |
|---|---:|
| native unit/hostile tests | 21/21 |
| public compile-fail doctests | 12/12 |
| native eight-gate mint vectors | 6,561/6,561; one mints |
| native nine-gate vectors | 19,683/19,683; one authorizes |
| native versus `.fungi` byte parity | 19,683/19,683 exact |
| `cargo fmt --check` | pass |
| `cargo clippy --all-targets --locked --offline -- -D warnings` | pass |
| `cargo deny check` | advisories, bans, licenses and sources pass |
| `cargo audit --no-fetch` | 1 local crate; no vulnerable dependency |
| Grype directory scan, high fixed threshold | no vulnerabilities found |

The app-backed Codex Security scan was opened but had not received its separate
Start-scan acknowledgement. It is therefore not counted as passed evidence.

## Benchmark method

`vok-benchmark` is a versioned, release-mode, dependency-free harness. Each run
contains 99 samples and 1,000 operations per sample. Lane order rotates between
samples. The three lanes are:

1. `null_owned_value`: allocate and consume the same three-byte owned value;
2. `checked_btree`: insert, exact-read and remove a keyed value from a standard
   checked tree; and
3. `vok_affine_cycle`: mint, exact open and exact consume through the complete
   VOK table, including two nonce admissions, context checks, logical clearing
   and a value-only receipt.

Host: Intel Core i9-9900K, Windows 10 Pro 10.0.19045, Balanced power plan,
`rustc 1.96.1`. Values are nanoseconds per operation.

| Run | Lane | min | p25 | median | p75 | max |
|---:|---|---:|---:|---:|---:|---:|
| 1 | null owned value | 41 | 41 | 43 | 44 | 62 |
| 1 | checked tree | 85 | 85 | 87 | 87 | 112 |
| 1 | VOK affine cycle | 493 | 500 | 512 | 517 | 785 |
| 2 | null owned value | 42 | 59 | 60 | 61 | 65 |
| 2 | checked tree | 84 | 109 | 109 | 111 | 115 |
| 2 | VOK affine cycle | 494 | 725 | 738 | 742 | 759 |
| 3 | null owned value | 41 | 41 | 42 | 62 | 66 |
| 3 | checked tree | 84 | 85 | 86 | 109 | 112 |
| 3 | VOK affine cycle | 494 | 510 | 514 | 739 | 773 |

Median ratios are:

```text
run 1: VOK / checked = 512 / 87  = 5.89x
run 2: VOK / checked = 738 / 109 = 6.77x
run 3: VOK / checked = 514 / 86  = 5.98x

run 1: VOK / null = 512 / 43 = 11.91x
run 2: VOK / null = 738 / 60 = 12.30x
run 3: VOK / null = 514 / 42 = 12.24x
```

The similar relative ratios and bimodal third-run quartiles indicate host clock/
power-state sensitivity. Absolute values are laboratory evidence only. They do
not establish production latency, cross-platform performance, W^X execution
speed or an advantage over an executable SLIDE backend.

![Native VOK benchmark chart](../diagrams/native-vok-authority-benchmark-2026-08-02.svg)

## Still open

- production Windows, Linux and macOS CSPRNG adapters;
- opaque Galerina VM/component-resource transfer;
- same-process hostile-memory isolation/integrity;
- physical erasure evidence rather than logical clearing;
- owned-byte W^X loading and VEO execution;
- independent cross-platform reproduction; and
- the acknowledged app-backed security scan.

Until those gates close, this table is testable research infrastructure and not
production execution authority.
