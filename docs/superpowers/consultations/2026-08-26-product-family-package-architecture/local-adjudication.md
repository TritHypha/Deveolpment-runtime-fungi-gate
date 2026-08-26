# Local adjudication of the product-family architecture review

**State:** ADJUDICATED; DESIGN REVIEW PENDING

**Exact repository graph:** `Galerina-trametes-architecture-c3360c1-full`

**Exact Git target:** `c3360c143db4659ae18560322dc6b7a3cf3e122a`

**External recommendation:** `REVISE_BEFORE_PLANNING`

The external response is advisory. This record checks its actionable claims
against exact graph/source evidence and records which corrections entered the
design.

## Evidence anchors

- `packages-galerina/galerina-core-compiler/src/cli.ts:381` — `compileFile`.
- `packages-galerina/galerina-core-compiler/src/runtime.ts:93` — `admitRuntime`.
- `packages-galerina/galerina-core-compiler/src/governance-verifier.ts:4401` — `verifyGovernance`.
- `packages-galerina/galerina-core-compiler/src/gir-emitter.ts:764` — `computeGIRHash`.
- `packages-galerina/galerina-core-compiler/src/execution-graph.ts:334` — `executionGraphCacheKey`.
- `packages-galerina/galerina-core-compiler/src/pure-flow-cache.ts:208` — `pureFlowCacheKey`.
- `packages-galerina/galerina-core-compiler/src/requirement-process-protocol.ts:303` — `validateLauncherRequest`.
- `packages-galerina/galerina-core-compiler/src/cli.ts:926` — current argument parser.

## Vector decisions

| Vector | Local result | Design action |
|---|---|---|
| Taxonomy | SUSTAINED WITH NARROWING | Keep owner-selected `packages-ts/` and `packages/`; close the native root as `packages/fungi/` and `packages/gate/`. |
| Extensibility | SUSTAINED | Add one closed versioned product registry; keep future products registry-driven rather than pairwise. |
| Authority isolation | SUSTAINED AS FUTURE GAP | Direct governance calls are exact. Add a neutral policy seam before Trametes admission. No present cross-product exploit is claimed because only Galerina is admitted. |
| CLI identity | SUSTAINED | Keep product, safety, build mode and width separate. Refuse governance-off and ambient defaults. |
| Migration | SUSTAINED | Registry/seam/identity first; logical alias second; physical Git move only after graph and rollback gates. |
| Fungi/Gate custody | SUSTAINED WITH OWNER ROOT | Native families are typed below `packages/`; Gate remains lab-only and outside GIR/SLIDE/VOK authority. |
| Performance | SUSTAINED | Existing passive benchmark cannot establish Trametes value because governance is outside its timed loop. |
| Assurance | SUSTAINED | Add product-boundary graph checks, one-field negative controls, scalar-only preservation and an explicit pre-Fungi pause. |

## Exact source findings

### Direct governance coupling

`compileFile` and `admitRuntime` call `verifyGovernance` directly. The review is
correct that a second product cannot safely be represented by directory naming
alone. The design introduces a product-neutral seam while retaining the current
Galerina verifier as the only admitted adapter.

### Cache and artifact binding

Current helpers bind these fields:

```text
executionGraphCacheKey = flowName + sourceHash
pureFlowCacheKey       = optional sourceTag + flowName + argument fingerprints
computeGIRHash         = canonical width-independent GIR bytes
```

None currently binds a product identity. That is a real readiness gap before a
second product, but it is not evidence of a current Trametes-to-Galerina cache
attack because Trametes is not implemented or admitted. The design preserves
the semantic GIR hash and wraps reusable artifacts in a product-bound admitted
identity.

### Physical profiles

`validateLauncherRequest` accepts only the exact scalar profile constant and
refuses every other runtime profile. This sustains the current state:

```text
1    admitted
64   negative/refusal control
32   not implemented
256  not implemented
```

The registry may represent future widths, but its executable Galerina set stays
`{1}` until each separate profile chapter passes.

## External precedent checked locally

- Cargo workspaces separate workspace membership from package selection and
  identity: <https://doc.rust-lang.org/cargo/reference/workspaces.html>.
- Cargo package ID specifications add qualifiers when a dependency graph is
  ambiguous: <https://doc.rust-lang.org/cargo/reference/pkgid-spec.html>.
- Bazel visibility fails dependency violations during analysis and defaults
  ordinary targets to private absent an explicit public contract:
  <https://bazel.build/concepts/visibility>.
- Android SELinux policy guidance keeps vendor and platform policy namespaces
  separated: <https://source.android.com/docs/security/features/selinux/customize>.

These sources support separation and fail-closed package boundaries. They do
not prescribe Galerina's exact directory names or authorize implementation.

## Outcome

The external `REVISE_BEFORE_PLANNING` recommendation is satisfied at the design
level by the accompanying spec and implementation plan. This is not an
implementation PASS. Independent review, exact documentation fixed point, Git
Custody evidence and the hard pre-Fungi pause remain required.
