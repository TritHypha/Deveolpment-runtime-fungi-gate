# Historical SLIDE/WASM benchmark chart visual QA

## Scope

- Reference: owner-supplied 2026 benchmark screenshot with a dark, per-workload diverging chart.
- Implementation: `packages-ts/galerina-devtools-benchmarks/results/benchmark-slide-vs-wasm-history-latest.html`.
- Intended desktop comparison viewport: 2048 × 2048.
- Responsive requirement: retain the full comparison canvas through horizontal scrolling on narrow mobile and tablet viewports.

## Implemented visual correspondence

- Dark chart surface with restrained grid and row separators.
- One horizontal row per historic WASM workload.
- Centred `WASM = 0 baseline` axis.
- Slower values extend left and use orange; faster values extend right and use teal.
- Each row displays the recorded historic WASM measurement and unit for reference.
- A production SLIDE bar is emitted only for an admitted, same-workload, same-metric, same-unit result.
- The current record therefore renders `SLIDE not measured` at zero rather than manufacturing a bar.

## Verification performed

- Focused report tests: 4/4 passed.
- Benchmark package tests: 67/67 passed.
- Benchmark truth audit: passed.
- Offline and passive page invariants: no external URL and no script execution.

## Visual comparison limitation

The Codex in-app browser refused to reload the local `file:` page under its URL safety policy. No alternate browser route was used. A fresh rendered screenshot could therefore not be captured for a truthful same-viewport comparison in this run.

## Final result

blocked
