# RD-0873 conversion, benchmark and housekeeping handover — 2026-09-13

## Stop state

The Galerina direct-package conversion chapter and its local build/benchmark
run are complete at the bounded development tier. The exact current Galerina
head is `8e0123990b04ba2cfa7a65aa029e3ce7e48656fd` (tree
`1fff4a918d34d3a65dfca1179752a3c9197601fb`), branch `main`, clean and aligned
with `origin/main` at the time of this handover.

The conversion manifest dispositioned all 100 package roots: 94 roots have
95 direct buildable `.fungi` leaves, two roots are explicit manual
host/native boundaries, and four roots contain no eligible TypeScript or
JavaScript source under their declared source roots. The direct leaves live in
`packages/fungi/products/<package-name>`. The original TypeScript and
JavaScript remain retained differential shadows. VOK/native work was outside
this chapter and remains a separate lane.

## Build and benchmark evidence

The regeneration receipt is
`docs/independent-audits/2026-09-13-rd0873-fungi-build-regeneration.json`.
It records 95 Fungi inputs, zero TypeScript inputs, 475 generated artifacts,
820,572 output bytes, and a passing local build. An `Array.includes` WAT
lowering defect was found and repaired; the affected target passed on repeat.
Development manifests are reference-only and do not release production
authority.

The benchmark receipt is
`packages-ts/galerina-devtools-benchmarks/results/benchmark-run-to-graph-latest.json`.
It records a complete measured run from 17:48:17Z to 17:52:26Z with 30
groups, 18 work-equivalent groups, a passing 0.4% noise gate, truth audit and
benchmark guard. The generated measured sheet and charts are in the same
`results/` directory. The run is evidence about the local development build;
it does not prove production SLIDE/VOK authority or whole-project
self-hosting.

The checked Galerina benchmark comparison used the archived
`2026-08-02_galerina-wasm-before-slide` baseline. The separate SLIDE V2-D
comparison was measured on Windows at the current SLIDE head and retained in
the SLIDE repository and Downloads backup. Lyth's retained engine benchmark
did not produce timing data because its adapter calls a stale three-argument
SLIDE API; the Lyth test and typecheck suites still pass.

## Repository custody

- Galerina active worktree: clean `main`, current head above, no merge needed.
- Galerina main checkout: branch `codex/rd-0858-unit4-process-root` has one
  pre-existing `README.md` modification. It is unrelated to this handover and
  remains untouched.
- SLIDE: branch `codex/v2c-independent-frontend` at
  `9674954488c9238c3f41a12dbf47dce87d873e51`; the regenerated checked-index
  JSON and SVG are the only pending changes for this chapter.
- Lyth/Weaver: `main` at `a68eeb5ced8a522b3ab140422c1e7ce84ec887fa`, clean.
  Its repository rule reserves pushes to the owner; no push is performed by
  this handover.
- VOK/Rust: not changed or included in the benchmark.

Historical Galerina worktrees and branches were not merged or pruned. They
contain separate task history and may contain owner or concurrent work. A
future merge must name an exact branch and path manifest first.

## Post-handover custody commits

The housekeeping commits that followed the initial checkpoint are:

- Galerina graph and roadmap refresh: `9572c0486517ea19eeb93650463d3e3032fc432f` (pushed to `origin/main`).
- SLIDE benchmark/documentation checkpoint: `05fdfd43044796aed86cad533c8a87e817b149df` (pushed to its feature branch).
- Lyth local documentation checkpoint: `518cb33603d4217d1e58824ac2ae8d0ce3941767` (local only; owner push rule applies).
- AI-RESTART checkpoint: `d2c888973d97c3da0f639ae448a93b42f7e33882` (local only; owner push rule applies).

The active Galerina and SLIDE trees are clean and their upstream refs match.
Lyth and AI-RESTART are intentionally one local commit ahead because their
repository instructions reserve pushing for the owner.

## Next resume route

Reverify all four repository heads and status before further work. Treat the
95-leaf build as a development checkpoint. Any attempt to convert the two
manual roots, the existing Fungi corpus, SLIDE, Lyth or VOK needs its own
exact-head scope, review and receipt. Keep production authority disabled until
independent SLIDE re-admission, VOK execution, platform durability and owner
authority evidence are complete.

## Files to inspect first

1. `docs/TODO.md`
2. `docs/ROADMAP.md`
3. `docs/security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md`
4. `docs/independent-audits/2026-09-13-rd0873-fungi-build-regeneration.json`
5. `docs/reports/2026-09-13-rd0873-fungi-build-and-benchmark.md`
6. `packages-ts/galerina-devtools-benchmarks/results/benchmark-run-to-graph-latest.json`
