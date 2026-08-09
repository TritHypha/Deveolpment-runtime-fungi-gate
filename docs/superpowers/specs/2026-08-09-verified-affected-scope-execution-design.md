# Verified affected-scope execution design

Date: 2026-08-09
Status: accepted implementation design

## Problem

The complete Galerina phase-close is correct but structurally expensive. A
measured normal run took 645.1 seconds and the exhaustive lane took 1,077.4
seconds. The runner rechecks the complete repository even when a change is
confined to one flat package or one documentation surface. Parallelism can
reduce wall time, but it cannot justify work that did not need to run.

## Decision

Add a flat `galerina-devtools-impact` package plus a root executor. The planner
derives changed paths from Git bytes, maps package paths through the declared
workspace, expands reverse package dependencies, and emits a deterministic
command plan. It never releases production or release authority.

Three cadences remain distinct:

1. `changed` - frequent, affected-scope, explicitly non-authorizing;
2. `chapter` - affected subgraph plus shared governance checks, future work;
3. `full` - existing normal/exhaustive phase-close, infrequent and required for
   release authority.

## Fail-closed escalation

The planner emits `FULL_REQUIRED` when a change touches the compiler, root
runtime, workspace declaration, governance/tool policy, package topology, an
unknown root path, or a path it cannot classify. It must not guess a smaller
closure. A caller may then run the existing full phase-close explicitly.

Package-local changes select the changed package and every transitive reverse
dependency that has a declared test. Documentation-only changes select the
path-leak, private-document-leak and documentation-drift gates. Generated
evidence is not treated as source authority.

## Evidence and security boundary

The plan binds:

- sorted unique changed paths;
- the exact workspace package identities;
- seed and reverse-dependency package sets;
- escalation reasons;
- ordered commands;
- `authorizing: false`.

Unknown dependency metadata, malformed manifests, Git discovery failure or an
empty/malformed command must refuse. The executor uses the existing owned
process-tree boundary and returns a separate result for every command. A green
affected-scope result is iteration evidence, not a substitute for full release
admission.

## Scheduler resource policy

The package runner may overlap two ordinary flat packages with two Node test
files each. The compiler runs first and alone; declared test commands that
escape their package run serially; graph-project remains last and alone. This
keeps shared writers out of the parallel lane.

## Measured baseline

- normal phase-close: 645.1 seconds;
- exhaustive phase-close: 1,077.4 seconds;
- old full package aggregate: 416.9 seconds;
- unsafe package overlap experiment: 242.1 seconds, rejected as authority;
- compiler-first isolated package scheduler: 269.2 seconds, 99/99 packages and
  9,464/9,464 tests;
- Fungi corpus unchanged-compiler path: 79.6 seconds before, 3.2 seconds after
  exact-content cache binding.

## Deferred work

A later chapter may add authenticated affected-closure receipts and make a
chapter lane authorizing for internal integration. That requires exact source,
tool, dependency-graph and platform bindings. It is not inferred here.
