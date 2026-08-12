# Verified SLIDE Reference Benchmark Design

## Purpose

Finish the benchmark presentation with a real Galerina/SLIDE measurement while preserving the existing production-authority boundary.

## Decision

The page will carry two distinct comparison panels:

1. A same-work, same-unit one-million-read comparison using the independently verified SLIDE reference measurement. Galerina/SLIDE reference is `0`; faster peers are positive and slower peers are negative.
2. The existing historic Galerina/WASM panel. Historic WASM remains `0` for each archived workload and is not silently paired with a different SLIDE workload.

The measured SLIDE panel is explicitly `MEASURED_NON_AUTHORIZING`, K3 `0`, reference-only, and releases no production authority. The production SLIDE result remains deferred. The page must not rename `slideReference` to `slide`, count it as production, or infer a production winner.

## Inputs and trust boundaries

- SLIDE produces the verified-loop publication through its registered benchmark entry point.
- Galerina admits only the pinned publication whose byte digest, SLIDE commit, host facts, evidence digest, lane identities, sample count, work count, result, and authority flags match the closed admission contract.
- The peer comparison consumes only the `verified-native-operation` row and admits a runtime when it reports the exact result `999999`, exactly one million iterations, a positive finite throughput, and `element-reads/s`.
- Rust, Rust AVX2, Node.js and Python are rendered when admitted. Go is rendered as unavailable until an equivalent implementation exists; it is never filled from another workload.
- Archived WASM remains independently digest-bound and is shown for reference in its own panel.

## Presentation

The page follows the approved dark horizontal-bar shape. Each bar is placed around a central zero axis. Percentage is `(peer throughput - SLIDE throughput) / SLIDE throughput * 100`. The SLIDE baseline is always exactly `0` in the reference panel. The page is self-contained, script-free, mobile-first, and uses a Roboto-first font stack.

## Refusal behaviour

The measured panel is omitted and replaced with an explicit refusal when the SLIDE reference is absent, malformed, mismatched, non-positive, unit-incompatible, or not reference-only. Production status remains deferred in every case unless a separate admitted production `slide` lane exists.

## Verification

Focused tests must prove the sign convention, exact zero baseline, peer ordering, missing-Go disclosure, production/reference separation, rejection of a disguised production claim, HTML escaping, and absence of scripts or external resources. The refreshed SLIDE publication and Galerina admission contract must pass their existing independent verifiers before the benchmark is republished.

