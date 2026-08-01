# Governed Galerina VADE benchmark adapter implementation plan

**Date:** 2026-08-01  
**Status:** approved next dependency-ordered chapter; implementation pending  
**Authority released:** no

## Goal

Let Galerina count one exact independent SLIDE V2-G benchmark receipt without
trusting its path, sibling repository, self-declared provenance or SLIDE's own
positive verdict. The first adapter consumes only the frozen clean-source
receipt from SLIDE commit `b5aab13`; it does not execute production code,
publish a cross-runtime comparison or authorize package retirement.

## Boundary decision

The adapter belongs in the existing flat peer package
`packages-galerina/galerina-devtools-benchmarks`. It must not introduce a new
nested package, npm dependency, sidecar or cross-repository runtime import.

Galerina owns a small reviewed admission contract. The contract pins:

- schema and benchmark identity;
- the complete 40-hex SLIDE source commit;
- exact receipt SHA-256;
- source-body and semantic digests;
- seed, operations, warmups and sample count;
- the exact ordered nine-lane set;
- non-claims and `authorityReleased: false`; and
- expected platform/bootstrap labels for this historical receipt.

The receipt path is location only. Authority comes from exact admitted bytes
and the closed Galerina contract. The adapter independently checks the closed
top-level shape, pinned fields, lane closure, positive finite sample values,
summary/economics arithmetic and non-authorizing labels. It never imports or
calls the SLIDE verifier as its sole oracle.

## Result algebra

The public adapter result is a fresh frozen closed record:

```text
verdict: +1 | 0 | -1
status: ADMITTED_NON_AUTHORIZING | INDETERMINATE | REFUSED
failureId: stable registered string
benchmark: empty on refusal, exact ID on admission
receiptDigest: empty on refusal, exact digest on admission
slideCommit: empty on refusal, exact commit on admission
authorityReleased: false
```

`+1` means only that this historical evidence matches Galerina's reviewed
admission contract. It does not mean production authority or permission to
publish a terminal comparison. Missing evidence is `0` only when the caller
explicitly requests an observational mode; strict devtools and CI mode maps
absence to `-1`. Malformed, ambiguous, stale or mismatched evidence is always
`-1` and `_=>`.

## Task 1 — closed contract and hostile byte intake

**Create:**

- `packages-galerina/galerina-devtools-benchmarks/contracts/slide-v2g-vade-admission-v1.json`
- `packages-galerina/galerina-devtools-benchmarks/src/slide-vade-adapter.mjs`
- `packages-galerina/galerina-devtools-benchmarks/test/slide-vade-adapter.test.mjs`

**Modify:** package `package.json` `packageGraph.loadedAssets` for the contract.

Test first. Require one exact fixed-handle reader with a compiled 1 MiB ceiling
before allocation, regular single-link file admission, size-plus-one bounded
read, pre/post identity and timestamp stability, fatal UTF-8, explicit BOM
refusal and byte-for-byte canonical JSON. Reject proxy/accessor contract input
before traps if a programmatic API accepts an override.

Negative cases must include empty, oversized, changing, directory, symlink,
hard-link, BOM, malformed UTF-8, trailing data, alternate whitespace/order,
literal duplicate key and Unicode-escaped duplicate key. Canonical admitted
bytes are the positive control.

## Task 2 — independent receipt and arithmetic admission

Test first. Recompute the receipt SHA-256 before parsing-derived trust, then
require exact top-level keys and pinned contract fields. Independently verify:

- all nine lanes exist once in the admitted order;
- every lane has the configured operation and sample counts;
- every nanosecond sample is a positive safe integer;
- median, min, max, median absolute deviation and operations/second match the
  raw samples;
- clean, prepared, preparation, warm, verified-demand and refusal lanes retain
  their exact identities;
- preparation, clean-demand, verified-demand, savings, assurance-cost and
  break-even arithmetic re-derive exactly; and
- non-claims and authority remain closed.

Do not copy SLIDE implementation code mechanically. Write the Galerina
recomputation from the public receipt contract so same-bug agreement is less
likely. A mismatched field returns one stable failure ID and no partial facts.

Mutation tests must alter every pinned identity, one raw sample, one summary,
one lane order, the economics, platform label, source commit, receipt digest,
authority and non-claim set.

## Task 3 — devtools command and audit integration

Add a direct-argv, no-shell command such as:

```powershell
npm.cmd run admit:slide-vade -- --input <receipt-path>
```

The CLI prints one bounded reconstructed JSON result and exits zero only for
`ADMITTED_NON_AUTHORIZING`. It never prints the input path, host exception,
stack, receipt body or partial identities on refusal.

Wire a new audit-class gate into the benchmark package and its self-test. The
gate must prove both a valid control and planted mismatches. Do not add the
V2-G timings to `results/latest.json`, report charts or historical comparison
tables in this task.

## Task 4 — full devtools benchmark observation

Only after Tasks 1–3 are green, let the full benchmark orchestration report a
separate `slide-vade-evidence` child. That child consumes the admitted receipt;
it does not rerun or silently regenerate SLIDE. Missing or mismatched evidence
fails the strict/full lane. Quick or developer observation may return explicit
`INDETERMINATE`, never a false green.

Update the benchmark publication audit so this lane is classified as
non-comparative component evidence. It must never satisfy a Galerina subject
lane, work-equivalence certificate or cross-runtime ratio.

## Task 5 — verification and documentation

Run, in order:

```powershell
node --test packages-galerina/galerina-devtools-benchmarks/test/slide-vade-adapter.test.mjs
npm.cmd test --prefix packages-galerina/galerina-devtools-benchmarks
npm.cmd run audit --prefix packages-galerina/galerina-devtools-benchmarks
node packages-galerina/galerina-test/dist/cli.js all --core --json
```

Then run graph-all, the generator contracts and strict phase-close because the
package graph and governed-tool inventories change. Update the package README,
`docs/TODO.md`, the live vertical roadmap, tooling completion report and
generated build indexes. Commit locally; never push.

## Promotion and non-claims

The adapter is green only when every hostile case, exact-byte pin, independent
arithmetic check, audit self-test and full devtools lane passes. Even then it
admits one historical Windows/Node component receipt. It does not establish a
general SLIDE backend, Linux/macOS performance, native code, cryptographic
evidence authentication, package parity, production authority or the deferred
SLIDE/Wasm/Rust/Python comparison.
