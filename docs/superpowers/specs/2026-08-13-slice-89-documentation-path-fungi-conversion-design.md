# Slice 89 Documentation Path Fungi Conversion Design

## Decision

Attempt one symbol-scoped reference conversion of
`packages-galerina/galerina-devtools-impact/src/impact-plan.mjs#isDocumentation`.
The TypeScript/MJS source and its `buildImpactPlan` caller remain active. The
candidate can be retained only if the exact caller domain, checked Fungi, GIR,
physical `.slide`, independent VOK re-admission and differential vectors all
agree. Any physical refusal closes the slice as `BLOCKED` and removes the
candidate rather than widening a profile.

The source is internal, non-authorizing and called once for each path after
`canonicalChangedPath` has produced a non-empty canonical repository-relative
String. Its decision table is closed:

| Source rule | Result |
|---|---:|
| starts with `docs/` | `true` |
| equals `README.md` | `true` |
| equals `AGENTS.md` | `true` |
| equals `SECURITY.md` | `true` |
| every other canonical path | `false` |

## Options considered

### 1. One direct pure flow - selected

Use one `pure flow` with a Boolean `if` for the `docs/` prefix, followed by an
exhaustive String `match` for the three exact root files and a terminal `_ =>`
false arm. This is the smallest shape, preserves evaluation order and uses
only separately proved prefix and String-match operations.

Risk: the pinned physical profile may admit each operation independently but
refuse their composed block graph. That refusal is an expected terminal result,
not permission to widen SLIDE.

### 2. Prefix and root-name helper flows - fallback probe only

Split the prefix and exact-name decisions into two pure helpers. This reduces
each function body but adds a call graph and therefore more physical proof
surface. Use it only as a bounded diagnostic if the direct source refuses for
an identified block-shape reason; do not retain it unless the exported flow and
every helper pass physical VOK evidence.

### 3. Host-computed Boolean - rejected

Keep path classification in MJS and pass a Boolean into Fungi. This would leave
the decision authority in the code being replaced and cannot prove conversion.

## Candidate and source custody

The candidate path is
`packages-galerina/galerina-devtools-impact/src/self-hosted/documentation-path.fungi`.
The focused proof belongs at
`packages-galerina/galerina-devtools-impact/tests/documentation-path-fungi-conversion.test.mjs`.
No package metadata currently declares a bootstrap floor or an existing Fungi
asset. The retirement ledger classifies the MJS file in `T3-package-graph` with
`replacement-absent`, `executionAuthority: none` and no declared floor.

The candidate is reference-only. It does not alter the package export surface,
switch the production caller, grant execution authority or authorize MJS
retirement.

## Control and failure shape

The candidate starts with `@version 1`, accepts one `String`, returns `Bool`,
has no effects and uses no `null`, `NaN`, `else if`, exceptions, `for`, or
`loop`. Every input reaches an explicit return; the exhaustive `match` ends in
`_ => return false`.

Threadability is `PARALLEL_PURE`: the selected symbol reads an immutable String
and fixed constants, performs deterministic comparison only, mutates no shared
state and releases no authority. This classification applies only to the
symbol, not the surrounding impact planner.

## Verification

The test must first fail because the candidate is absent. After the minimal
candidate is added, it must prove:

1. the exact source oracle through `buildImpactPlan` for `docs/TODO.md`, nested
   docs, all three root files, `docs`, `docs2/file`, nested `README.md`, package
   source and Unicode canonical paths;
2. candidate strict type/governance acceptance and GIR preservation;
3. physical package compilation, `.slide` publication, independent VOK
   re-admission and typed receipt verification at the pinned SLIDE build point;
4. equal Boolean results for the complete named vector family, plus exhaustion,
   malformed bundle, mutation and surplus-argument refusal where the selected
   profile exposes those controls;
5. the unchanged owning-package suite.

Checker-only, interpreter-only, signed-Wasm-only or host-projected results do
not satisfy the physical gate. TypeScript remains active even after a complete
reference proof; consumer switching and retirement require a later explicit
authority decision.

## Slice-close and skill review

Close the slice with one governed receipt. Review both private Fungi skills at
the end and record either the exact changed-skill commit or an evidence-based
`NO_SKILL_UPDATE`. Update the live conversion register, TODO, status report and
active roadmap. Run only bounded registered owners; repository-wide closure
remains `UNKNOWN` because the crash-linked monolithic lane is excluded pending
its chunked resumable replacement.
