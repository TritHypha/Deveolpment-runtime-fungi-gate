# Zero-Trust Tooling and Test Refactor Design

**Date:** 2026-07-29

**Status:** owner-delegated design selected for implementation

**Scope:** `packages-galerina/galerina-devtools-*`,
`packages-galerina/galerina-test`, root build/test/audit/generator scripts, and
their governed artifacts

## 1. Outcome

Galerina will have one mechanically complete account of its tests, audits,
generators, graphs, indexes, reports, and operator-only tools. A green
aggregate will mean every required child actually ran, its result was
understood, and no unknown package, tool, source asset, failure, skip, stale
build, missing output, or unexplained orphan was ignored.

This refactor retains the existing specialist tools where they are sound. It
adds a policy-backed orchestration and coverage layer instead of replacing
proven detectors with one large framework.

## 2. Evidence that requires the refactor

The 2026-07-29 inventory established:

- 14 `galerina-devtools-*` packages plus `galerina-test` have green local
  suites;
- `scripts/run-all-tests.cjs --list` reports 94 suites but excludes
  `galerina-devtools-benchmarks` and `galerina-tools-myco`;
- the benchmark package has three executable test files, but its script does
  not use the standard `node --test` protocol, so the generated index records
  zero tests;
- Myco currently has 52 tests, while `version.json` retains an older count of
  29 and the root aggregate omits the package;
- `run-all-tests.cjs` can bypass a package's build whenever `dist/` exists,
  allowing source changes to be tested against stale output;
- `run-phase-close.mjs` computes failed children but ends with
  `process.exit(0)`;
- `audit-gate-selftests.mjs` reports 13 audit/lint gates as advisory because
  their anti-neutering evidence is absent;
- the generated dev-tool index reports 34 audit/lint tools outside
  phase-close, but `dev-tool-index.mjs --check` ignores that gap and still
  succeeds;
- tool category, self-test, and cadence facts are inferred from filenames and
  source-string mentions, which can misclassify a tool without executing it;
- the regenerated compiler boundary reports 55 orphans, including the new
  SLIDE V2-C/V2-D/V2-E `.fungi` stages, but the boundary remains `PASS`; and
- `galerina-test` exposes only the older unit, e2e, R6 Stage-A/Stage-B, and
  walker/bytecode/Wasm fidelity lanes. It has no named SLIDE conformance lane.

These are orchestration and evidence defects. A passing specialist test does
not compensate for an aggregate that omits it or reports failure as success.

## 3. Chosen architecture

### 3.1 Derived inventory plus authoritative exception policy

Discovery remains automatic:

- packages come from `galerina.workspace.json`;
- script tools come from tracked `scripts/*.mjs` and `scripts/*.cjs`;
- package source and test files come from declared package roots;
- generated outputs come from generator declarations; and
- SLIDE compiler assets come from explicit package entry-point declarations.

The derived inventory is compared with a small authoritative policy file.
The policy records exceptions only; it does not hand-copy every discovered
tool. Default rules are strict:

- a workspace package must have a runnable, countable test suite;
- an audit/lint must be blocking in a named cadence and have executable
  anti-neutering evidence;
- a generator must have deterministic check/idempotence evidence and declared
  outputs;
- a source file must be reachable or explicitly declared as an independently
  loaded asset/entry point;
- a runner must propagate every child failure and timeout; and
- an unknown classification is a refusal.

An exception requires an exact subject, class, reason, evidence owner, and
review condition. Missing, malformed, duplicate, stale, or unused exceptions
fail closed. The empty registry package is expected to be the only initial
no-test package exception.

### 3.2 Four execution tiers

| Tier | Contents | Verdict |
|---|---|---|
| `phase-close` | deterministic tests, self-tests, audits, graph/index checks, source/build freshness, and generated-artifact drift | blocking |
| `exhaustive` | full package suite, heavy mutation/differential checks, complete generator execution, and independent SLIDE checks | blocking |
| `benchmark-integrity` | benchmark units, units-of-work, checksums, noise refusal, chart escaping, and fault injection | blocking |
| `benchmark-measure` | timed cross-runtime performance collection | evidence only; never a security verdict |

Timed measurements remain separate because machine noise is not a trustworthy
authority decision. Missing benchmark integrity evidence is blocking; a
performance regression is reported with its measurement provenance and does
not masquerade as a security failure.

### 3.3 Honest runners

`run-all-tests.cjs` will:

- discover from the workspace, not from a regex that recognises only selected
  test-script spellings;
- run every declared package test script, including benchmarks and Myco;
- execute the package's real build/typecheck/test chain instead of bypassing
  it when `dist/` exists;
- require a parseable test count and zero failures from every test-bearing
  package;
- refuse missing packages, missing scripts, empty suites, timeouts, signals,
  and unparseable summaries;
- permit a no-test package only through the governed exception policy; and
- emit canonical counts only after a complete, clean, build-current run.

`run-phase-close.mjs` will:

- exit non-zero when any blocking child fails;
- reserve explicit `--report-only` for a human-requested advisory run;
- identify every skip and its policy authority;
- refuse an unknown exit status or missing prerequisite;
- expose a machine-readable result for regression tests; and
- run the tooling-contract audit so newly added tools cannot be invisible.

### 3.4 Standard package test contract

Every TypeScript devtools package and `galerina-test` will use:

```text
typecheck -> build -> node --test
```

Package-local tests continue to exercise their public `dist/` surface, but
that surface is rebuilt in the same command. The benchmark package will use
`node --test test/*.test.mjs`; its timed runners remain separate scripts.
Myco keeps its upstream-owned custom runner because it already emits the
standard Node test summary; the Galerina mirror rule forbids editing its
vendored source directly.

### 3.5 Explicit source-asset ownership

`galerina-devtools-package-graph` will accept explicit package entry points or
loaded assets in `packageGraph` metadata. It will validate that each declared
path exists, lies inside the package, and is not duplicated. Unexplained
orphans become boundary violations under `--check`.

The compiler package will declare its self-hosted `.fungi` stages, including
SLIDE V2-A through V2-E and the general checked-source adapter, as compiler
assets/entry points. This records how independently composed stages enter the
compiler without inventing false `.fungi` imports.

### 3.6 First-class SLIDE test lane

`galerina-test` will add a named `slide` check that:

- runs the in-repository `slide-*.test.mjs` compiler conformance set;
- requires a non-empty discovered corpus;
- reports the exact test count and child exit;
- refuses missing or stale compiler output;
- remains non-authorizing; and
- does not claim independent SLIDE verification unless the sibling SLIDE
  repository is explicitly supplied and its independent suite succeeds.

The `all` aggregate will include this lane. R6 and Wasm fidelity remain in
place as current implementation and differential evidence until SLIDE's
documented replacement gates pass. `.gate` remains header-only and on hold.

### 3.7 Generators and governed artifacts

Every generator/indexer must declare:

- inputs;
- outputs;
- whether outputs are tracked or ignored;
- deterministic/check mode;
- provenance behavior;
- clean-tree expectations; and
- the cadence tier that verifies it.

The exhaustive close will run the graph, code index/registry, dev-tool index,
unit/contract registries, status views, SBOM, and relevant knowledge indexes.
Tracked output is then re-run or checked for idempotence. A generator that
silently omits a removed/renamed package, carries stale source facts, writes
outside its declared output set, or cannot prove output provenance fails.

Generated changes that accurately describe current source are reviewed and
committed. Timestamp-only churn must be removed or isolated from semantic
drift checks.

## 4. Error and zero-trust rules

- Unknown means failure, never success.
- Empty discovery is failure unless an exact empty state is governed.
- A skipped check never contributes to a green count.
- Advisory debt is explicit, shrink-only, and cannot expand silently.
- A child timeout, signal, null status, malformed JSON, or unparseable summary
  is a failure.
- A generated report cannot claim `PASS` while carrying unexplained orphans.
- A stale `dist/` cannot satisfy a source-level test claim.
- A benchmark comparison cannot use mismatched units or unstable controls.
- A Wasm result cannot be relabelled as SLIDE evidence.
- A Galerina-side SLIDE check cannot be relabelled as independent verification.
- Existing owner changes in `galerina-tri-regex/AUDIT.md` and `.codex/` remain
  outside this work.

## 5. Verification and completion

The refactor is complete only when fresh evidence proves:

1. every discovered workspace package is tested or governed as no-test;
2. every audit/lint is blocking in a declared tier and has live anti-neutering
   evidence, or has an exact reviewed exception;
3. every generator is declared, executed, provenance-checked, and
   idempotence/drift-checked;
4. every requested devtools package and `galerina-test` passes typecheck,
   build, and tests;
5. root all-tests includes benchmarks and Myco with accurate counts;
6. a planted child failure makes each aggregate exit non-zero;
7. the compiler package has no unexplained SLIDE/self-hosted orphans;
8. `galerina-test slide` is non-vacuous and the `all` aggregate includes it;
9. strict phase-close, exhaustive close, full package tests, graph integrity,
   generated indexes, provenance, and independent SLIDE checks pass;
10. generated artifacts and living counts match the verified run; and
11. all three SLIDE/Galerina TODO ledgers identify what was replaced, retained,
    rebuilt, still open, and where the evidence lives.

All fixes use RED-to-GREEN regression tests. Commits remain local and are
never pushed.

## 6. Alternatives rejected

### Patch-only runner fixes

Fixing the two known aggregate defects would be quick, but filename/string
heuristics, advisory anti-neutering gaps, undeclared generators, and
unexplained source orphans would remain. A new tool could still disappear
from coverage silently.

### One replacement tooling framework

Consolidating every specialist detector into one package could eventually
simplify orchestration, but it creates a large simultaneous trust migration
and risks discarding proven tests. The selected policy layer makes current
tools accountable first and permits later consolidation with evidence.
