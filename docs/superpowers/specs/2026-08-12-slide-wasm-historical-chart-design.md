# Galerina/SLIDE and Galerina/WASM historical chart design

## Goal

Publish a second, offline benchmark chart containing only Galerina/SLIDE and
Galerina/WASM, derived from the retained JSON benchmark records without
manufacturing a production SLIDE measurement.

## Evidence boundary

The retained Galerina benchmark corpus contains historical `wasm` lanes. It
contains no production `slide` lane. The 2026-08-12 record contains one
`slideReference` lane for `verified-native-operation`; it does not share a
workload with a Wasm observation and must not be promoted into production
authority.

The chart therefore reports measurement coverage rather than a speed ratio:

- Galerina/WASM is a historic measured lane.
- Galerina/SLIDE is shown as production-unmeasured, with its one reference-only
  observation disclosed separately.
- No winner, place, percentage improvement, or cross-unit comparison is
  published.

## Artifact

Create `packages-galerina/galerina-devtools-benchmarks/results/benchmark-slide-vs-wasm-history-latest.html`
as a self-contained, mobile-first HTML page. It uses Roboto with a system-font
fallback, contains no script or external dependency, and records the exact
source files, SHA-256 digests, run timestamps, and Galerina/SLIDE revisions.

The visual has exactly two product rows. It distinguishes measured production
evidence, reference-only evidence, and absent evidence without converting any
of those states into a trust Boolean.

## Failure handling

Generation refuses malformed JSON, missing provenance, digest mismatch,
unexpected production `slide`, or any attempt to compare lanes without a
shared admitted workload and unit. The already-published chart is not replaced
when generation refuses.

## Verification

Focused tests prove the two-row shape, source/digest disclosure, offline HTML,
reference-only labelling, and the absence of winner/performance claims. The
benchmark package test and integrity audit must remain green.
