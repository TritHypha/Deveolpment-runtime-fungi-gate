# RD-0873 Fungi build regeneration and benchmark

Date: 2026-09-13  
Branch: `main`  
Commit under test: `675e1048304b11e109b1de4f68af97ebc64f5949`

## Build regeneration

The conversion manifest accounts for all 100 package roots. It contains 95 direct
`.fungi` leaves: 94 directly buildable package roots, two manual host-boundary
roots, and four roots with no eligible TypeScript/JavaScript source. The six
non-direct roots were dispositioned and no conversion wave remains unclassified.

The standalone build was run once per direct leaf from its own
`packages/fungi/products/<package>` directory with the local `galerina.mjs`
compiler. The run consumed 95 `.fungi` inputs and zero TypeScript inputs and
produced 475 artifacts (WASM, WAT, CBOR manifest, JSON manifest, and governance
impact record per input), totalling 820,572 bytes. All 95 builds passed.

The first attempt found an emitter gap: `Array.includes` fell through to a
dangling `$includes` call. The compiler now aliases `includes` to the existing
typed array/string bridge, was rebuilt, and the affected target passed on the
repeat run. This is recorded in the [build receipt](../independent-audits/2026-09-13-rd0873-fungi-build-regeneration.json).

These are local development manifests. They are signed with the development
key path and do not release production authority; the retained TypeScript
compiler/bootstrap and host-boundary sources remain deliberate shadows.

## Full benchmark

The full publisher completed with exit status 0 at
`2026-09-13T17:52:26Z`. Its measured stages all passed:

- 30 benchmark groups were measured;
- 18 work-equivalent groups aligned to one unit;
- the noise gate passed with a 0.4% control spread;
- the truth audit passed, including six checksum-identity controls and the
  checked/verified million-iteration source pair;
- the benchmark guard reported no attributable regression;
- production SLIDE remains unmeasured and non-authorizing.

The generated [benchmark run receipt](../../packages-ts/galerina-devtools-benchmarks/results/benchmark-run-to-graph-latest.json),
[measured sheet](../../packages-ts/galerina-devtools-benchmarks/results/benchmark-sheet-latest.csv),
[current chart](../../packages-ts/galerina-devtools-benchmarks/results/benchmark-chart-latest.html),
and [standalone chart](../../packages-ts/galerina-devtools-benchmarks/results/benchmark-chart-standalone.html)
are derived directly from `results/latest.json`.

The separate [current-versus-archive chart](../../packages-ts/galerina-devtools-benchmarks/results/benchmark-compare-latest.html)
uses the `2026-08-02_galerina-wasm-before-slide` archive as its baseline. The
history receipt compares the current run with the prior local run from
2026-09-10. The largest measured changes were matrix-multiply Python (+346.1%
in the local-run history), JSON-parse Node.js (-67.0%), and Galerina manifest
low-memory (+63.0%); the guard classified the movers as noise, structure, or
environment effects rather than an attributable regression.

The benchmark charts are performance observations. They do not promote the
reference-only SLIDE lane to production authority and do not prove that the
whole project is self-hosting.
