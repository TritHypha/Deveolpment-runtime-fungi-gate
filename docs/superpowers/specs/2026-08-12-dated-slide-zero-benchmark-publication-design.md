# Dated SLIDE-zero benchmark publication design

## Purpose

Publish a self-contained benchmark chart and HTML table for Rust, Go, Node.js, Python, and Galerina/SLIDE, with exact provenance and a truthful migration boundary.

## Decision

- A production `slide` measurement is the only valid zero baseline for the requested comparison.
- When that lane exists and is work-equivalent, Galerina/SLIDE is `0`; faster peers are positive and slower peers are negative.
- When no production `slide` lane exists, publication remains useful but visibly reports `DEFERRED_NO_SLIDE_LANE`. It does not relabel `wasm`, `slideReference`, or another observation as production SLIDE, and it emits no fabricated ranking.
- Archived Galerina/Wasm is recorded separately using the transition contract's exact archive directory and SHA-256 digest.
- Every publication records one UTC generation timestamp, the Galerina and SLIDE Git revisions, toolchain versions, the exact `latest.json` SHA-256 digest, the transition contract identity, and the frozen Wasm reference.
- The HTML chart and table are self-contained, mobile-first, use a Roboto-first system font stack, contain no script, and fetch no external resource.
- Only Rust, Go, Node.js, Python, and production SLIDE participate in the requested placement. Missing runtime implementations are disclosed per benchmark instead of being silently filled.

## Outputs

- Stable latest chart and table files for convenient viewing.
- Immutable UTC-date-stamped copies for custody and comparison.
- A machine-readable metadata sidecar binding the same timestamp and references.

## Verification

Pure tests use hand-derived fixtures to prove sign direction, zero placement, winner and Galerina place, exact deferred behaviour, escaping, offline HTML, and provenance rendering. Package tests and audits then run against the real publication.
