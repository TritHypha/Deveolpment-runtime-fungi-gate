# Verified affected-scope scheduler report

Date: 2026-08-09
Status: implementation and complete 100-package phase closure verified

## Outcome

Galerina now has two separate verification purposes:

- frequent affected-scope evidence for iteration, always non-authorizing;
- complete normal/exhaustive phase-close for chapter and release authority.

The distinction reduces waiting without weakening the full gate.

## Root cause

Task Manager evidence showed the normal phase at roughly one core while memory
and disk were lightly loaded. Source inspection confirmed why:

- `run-phase-close.mjs` invoked every gate synchronously;
- `run-all-tests.cjs` invoked packages synchronously;
- its old concurrency ceiling applied only to test files inside one package;
- curriculum and Fungi corpus gates repeatedly started a compiler process for
  each source;
- the Fungi corpus cache invalidated on timestamps after byte-identical builds.

The package aggregate occasionally reached 100% CPU inside one package, so
unrestricted nested parallelism would have been unsafe.

## Measured evidence

| lane | before | measured successor | change |
|---|---:|---:|---:|
| normal phase-close | 645.1s | 567.6s / 89 of 89 | -12.0% |
| exhaustive phase-close | 1,077.4s | 838.5s / 90 of 90 | -22.2% |
| complete package aggregate | 416.9s | 262.0s | -37.2% |
| Fungi corpus, unchanged compiler | 79.6s | 3.2s | -96.0% |

The registered successor passed **100/100 packages and 9,470/9,470 tests** in
262.0 seconds with zero failures. The exhaustive closure independently ran the
same complete lane in 263.8 seconds. Normal phase-close passed **89/89** and
exhaustive phase-close passed **90/90**. These close the structural chapter;
they do not authenticate platform, signing, durability or production release.

An earlier 242.1-second package experiment overlapped compiler build authority
with compiler consumers. It passed but was rejected as authorizing evidence.
The admitted scheduler isolates the compiler first and costs 27.1 seconds more.

## Scheduler rules

1. `galerina-core-compiler` runs first and alone.
2. A declared package test containing a parent-directory escape runs alone.
3. Ordinary flat packages run through two package slots.
4. Each ordinary package receives at most two Node test-file slots.
5. `galerina-devtools-graph-project` runs last and alone.
6. Results are reported in deterministic workspace order, not completion order.
7. Every child remains inside the existing owned process-tree boundary.

## Affected-scope planner

`@galerina/devtools-impact` reads Git changes, includes untracked paths, maps
the declared flat package topology and expands reverse dependencies. Its root
executor uses owned child processes. Use:

```powershell
node scripts/run-impact-check.mjs --base HEAD
node scripts/run-impact-check.mjs --base HEAD --execute
```

Compiler, root runtime, workspace, package-manifest, governance, unknown and
malformed changes return `FULL_REQUIRED` with no guessed partial command.
Documentation-only changes select path-leak, private-document-leak and
documentation-drift gates. Package changes select the changed packages and
their transitive workspace dependants.

Every plan and execution report says `authorizing: false`. Complete phase-close
remains mandatory at every chapter/release boundary even when the affected lane
is green.

## Remaining optimization

The largest normal-phase cost is now curriculum diagnostics: 238 files start
the compiler separately and cost about 115 seconds. The preferred successor is
a batch compiler-check protocol returning one exact verdict per input. It must
preserve per-file diagnostic identity and fail the whole batch on a missing,
duplicated or malformed row. GPU execution is not a useful fit for this
filesystem/parser/branch-heavy workload.
