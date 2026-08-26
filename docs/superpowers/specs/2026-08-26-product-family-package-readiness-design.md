# Product-family package readiness design

**Status:** DRAFT; MULTI-VECTOR ADJUDICATION COMPLETE; INDEPENDENT REVIEW PENDING

**Date:** 2026-08-26

**Exact source build point:** `c3360c143db4659ae18560322dc6b7a3cf3e122a`

**Planning branch:** `codex/product-family-package-readiness`

**Scope:** package architecture, product identity, authority separation, width
readiness, migration and pre-Fungi gates. This chapter creates documentation
only. It does not move a package, change compiler behavior, create a `.fungi`
file, admit Trametes or authorize Gate synthesis.

## 1. Decision

Adopt an extensible product-family architecture with these rules:

1. `Galerina`, `Trametes` and later products are registered product identities,
   not top-level language families.
2. TypeScript bootstrap packages eventually move from `packages-galerina/` to
   `packages-ts/` through a controlled compatibility migration.
3. Future native source lives below a typed native root:
   `packages/fungi/` for `.fungi` packages and `packages/gate/` for `.gate`
   laboratory packages. These remain locator contracts, not materialized
   directories, until the applicable native-source chapter opens.
4. Shared code is capability-scoped. A generic `zero-trust` or `shared` label
   does not make a package authorizing.
5. Product identity, safety profile, build mode and physical Trit width remain
   four independent closed axes.
6. The first native slice remains Galerina scalar profile `1`. Trametes and all
   Gate-native work remain closed until their later gates pass.

Do not rename `packages-galerina/` immediately. First introduce the closed
product registry and product-neutral policy seam. Then bind explicit product
selection and product-bound artifact/cache identity in one atomic admission
gate while the current physical tree is stable. The physical move to
`packages-ts/` happens only after graph and rollback gates prove it reversible.

## 2. Why this resolves the naming question

The owner-selected roots are retained without leaving the generic native root
ambiguous:

```text
packages-ts/       TypeScript and MJS bootstrap implementation
packages/          Native source families only
  fungi/           .fungi source packages
  gate/            .gate laboratory packages
```

The inner grammar is closed:

```text
<root>/<family-or-layer>/<product-or-capability>

packages-ts/<shared|core|products|lab>/<kebab-case capability or product>
packages/<fungi|gate>/<shared|core|products|lab>/<kebab-case capability or product>
```

Product names may appear only under `products/`. `Galerina`, `Trametes` and a
future research product can therefore be added without another top-level
rename.

## 3. Target directory shape

```text
product-registry/
  product-profiles.v1.json
  product-profiles.v1.schema.json

packages-ts/
  shared/
    trit-semantics/
    gir-contracts/
  core/
    compiler/
    runtime/
    product-policy/
  products/
    galerina/
    trametes/
  lab/
    gate-toolchain/

packages/
  fungi/
    shared/
    core/
    products/
      galerina/
      trametes/
    lab/
  gate/
    shared/
    core/
    products/
    lab/

artifacts/
  gir/
  slide/
  receipts/
  gate-lab/
```

This is a logical target, not authorization to create all directories. Empty
future products are registry states and documentation, not placeholder code.

### 3.1 Package names

Filesystem movement must not silently rename published packages. Existing
`@galerina/*` identities stay unchanged during the TypeScript root migration.
Any later package-coordinate change is a separate compatibility chapter with a
dual-publish window, exact dependency graph and rollback receipt.

New generic package coordinates use a closed grammar:

```text
@fungi-ts/<capability>
@fungi-native/<capability>
@gate-lab/<capability>
@galerina/<capability>
@trametes/<capability>
```

`@gate-lab/*` is deliberately non-authorizing. No package name may imply that a
Gate artifact is a VOK lease, admitted GIR or production execution receipt.

## 4. Product registry

Use one versioned, closed registry. It is a build input, not a plugin
marketplace and not an authorization service.

Each product entry binds:

| Field | Closed rule |
|---|---|
| `schema` | Exact `product-profiles.v1` for the generated runtime registry. |
| `schemaVersion` | Exact supported registry schema; unknown version refuses. |
| `productId` | Stable lowercase identifier; no aliases or default fallback. |
| `productClass` | `production` or `research-nonprod`. |
| `governanceClass` | `zero-trust`, `admitted-closed-network` or `research-only`. |
| `compatibilityState` | `planned`, `admitted`, `lab` or `retired`. |
| `policyId` | Product-neutral policy implementation identity. |
| `policyDigest` | Mandatory generated SHA-256 binding: admitted policy bytes for `admitted`; a domain-separated unavailable-policy record for every non-admitted state. |
| `packageNamespaces` | Closed package roots visible to the product. |
| `artifactNamespace` | Mandatory independent cache/artifact namespace. |
| `admittedSafetyProfiles` | Closed set; empty means execution refuses. |
| `admittedBuildModes` | Closed set; no inferred mode. |
| `admittedPhysicalProfiles` | Closed physical Trit widths; currently only `1`. |
| `entrypointId` | Fixed product entrypoint identity. |
| `externalAuthorizerId` | Authority outside the selected product. |

Unknown fields, missing fields, duplicate keys, unknown values and unsupported
combinations refuse. A product cannot write its own `externalAuthorizerId`,
change its compatibility state or authorize its own selection.

The editable source registry and generated runtime registry are distinct closed
schemas:

- `product-profiles.source.v1` includes repository-relative `policyPath` and
  omits `policyDigest`;
- `product-profiles.v1` removes `policyPath` and requires `policyDigest` on
  every product row.

For `admitted`, the generator hashes exact policy bytes. For `planned`,
`lab` or `retired`, `policyPath` must be empty, all admitted arrays must be
empty, and the generator hashes this exact canonical record:

```text
{"domain":"product-policy-unavailable.v1","productId":"<id>","compatibilityState":"<state>","policyId":"<id>"}
```

The unavailable digest binds identity but never represents executable policy.
Resolution checks `compatibilityState` first and returns
`PRODUCT_NOT_ADMITTED` without loading or dispatching a policy.

### 4.1 Initial entries

- `galerina`: `production`, `zero-trust`, scalar `1`, current admitted behavior.
- `trametes`: `planned`, `admitted-closed-network`, no admitted execution until
  its isolation and benchmark chapter passes.
- future quantum research: not an implemented entry. It is retained as a
  hostile unknown/research-only fixture to prove the registry is not a
  hard-coded Galerina/Trametes pair.

## 5. Four independent selection axes

```text
product identity    galerina | trametes | registered future product
safety profile      strict | high_integrity | deterministic | registered value
build mode          current closed compiler build modes
physical profile    1 | later admitted widths
```

Rules:

- A product-specific command binds one immutable `productId`.
- A generic command must require an explicit registered product; it has no
  ambient, environment or last-used default.
- A product cannot be inferred from safety profile, build mode, file path or
  width.
- `--governance=off` is forbidden. Trametes is a different admitted product,
  not Galerina with a security flag disabled.
- Every artifact and receipt records all four axes.

The current `galerina` entrypoint may remain fixed to `galerina`. A later
`trametes` entrypoint must be separately identified. The generic `fungi`
entrypoint must require an explicit product once more than one admitted product
exists.

## 6. Product-neutral policy seam

Current exact source shows both `compileFile` and runtime `admitRuntime` calling
`verifyGovernance` directly. That is correct for the present single Galerina
product but is not a safe multi-product seam.

Introduce a closed interface conceptually equivalent to:

```text
resolveProductProfile(closed selection, exact registry) -> admitted profile | refusal
evaluateProductPolicy(admitted profile, checked semantic input) -> diagnostics + evidence
bindProductArtifact(admitted profile, semantic bytes) -> namespaced identity
```

The Galerina adapter delegates to the existing governance verifier. A later
Trametes adapter may reduce governance overhead only within its admitted
closed-network contract. Both retain parser, type, value-state, effect,
resource, process and receipt safety. Neither adapter mints `ALLOW`, a VOK
lease or a terminal authorizing receipt.

No Galerina and Trametes policy implementations may share mutable process
state, module caches or writable artifact namespaces in a production claim.

## 7. Artifact and cache identity

The external review's strongest future attack is locally sustained as a design
gap, not as a current cross-product vulnerability: only Galerina is presently
admitted, but current generic cache helpers do not bind a product identity.

Exact source examples include:

- `executionGraphCacheKey(flowName, sourceHash)`;
- `pureFlowCacheKey(flowName, args, sourceTag?)`;
- `computeGIRHash(gir)` over canonical GIR bytes.

Before a second product is admitted, every reusable artifact/cache identity
must bind:

```text
schema version
artifact namespace
product identity
governance class
policy digest
safety profile
build mode
physical profile
semantic content digest
target/provider evidence where applicable
```

Byte-identical GIR may remain semantically width-independent, but its admitted
package and receipt identity cannot be product-ambiguous. Cross-namespace cache
hits refuse; they are never silently copied or relabelled.

## 8. Physical Trit profiles

A Trit remains one width-independent value in `{−1, 0, +1}`. Width is physical
parallelism, not a language type.

Current implementation state:

- profile `1`: admitted scalar oracle;
- profile `64`: refusal/negative control only;
- profiles `32` and `256`: not implemented in the current execution path.

Implementation order remains `1`, then `64`, then `256`. Profile `32` is a
compatibility fallback, not the preferred design. When wider profiles exist,
admission-time replanning preference is `256 -> 64 -> 32 -> 1`; each replan has
a new identity and receipt. Runtime rescue and silent substitution remain
forbidden.

The registry must be able to represent these widths now, but until exact target
evidence and profile contracts are admitted its executable set remains `{1}`.

## 9. Fungi and Gate custody

The authoritative route remains:

```text
checked Galerina snapshot
  -> detached width-independent canonical GIR
  -> SLIDE physical derivation and independent re-admission
  -> VOK affine execution lease and terminal receipt
```

The Gate lane remains later, laboratory and non-authorizing:

- TypeScript Gate parser/synthesizer scaffolding lives under
  `packages-ts/lab/` until separately admitted.
- Native `.gate` source lives under `packages/gate/lab/` or as detached lab
  artifacts.
- Gate output uses a separate artifact namespace.
- Gate packages cannot import or call Galerina VOK issuance.
- Gate output cannot appear on the current authoritative compile path merely
  because it shares the `packages/` root.

The first native file remains a Galerina scalar `.fungi` oracle under
`packages/fungi/products/galerina/`, after the pre-Fungi plan locators are
amended and all gates below pass.

## 10. Migration sequence

| Phase | Physical state | Allowed work | Exit gate |
|---|---|---|---|
| P0 | `packages-galerina/` | This design, registry schema and exact migration inventory | Independent design PASS |
| P1 | `packages-galerina/` | Product registry, policy seam, explicit product selection and namespaced artifact identities in one atomic gate; Galerina behavior only | Missing/unknown product matrix, cache neighbours and exact graph PASS |
| P2 | `packages-galerina/` remains the sole physical and logical TypeScript root | Complete import inventory, package-name preservation and rollback rehearsal; no alias and no native source | Import, package, single-root and rollback gates PASS |
| P3 | Physical `git mv` to `packages-ts/` | Mechanical root migration; published package names unchanged | Zero authoritative old-root references and fixed-point indexes |
| P4 | `packages-ts/` plus locator-only typed native-root contract | Amend RD-0861 and allocate a new product-family RD on KB `main` only; create no native directories | Pre-Fungi plan, Git Custody and independent review PASS |
| P5 | `packages/fungi/products/galerina/` | First scalar Galerina `.fungi` slice only | Existing conversion gates and fresh exact-head receipts |
| Later | Trametes and `packages/gate/lab/` | Separately measured/admitted product and laboratory Gate work | Separate chapters; no authority inheritance |

Do not combine P1-P4 into a single mass rename. Each phase must be independently
reversible and must not widen the `.fungi` boundary.

## 11. Required controls

### Before the physical TypeScript move

- unknown, missing and duplicate product identities refuse;
- `trametes`, future research and unknown products cannot mint Galerina-labeled
  artifacts or receipts;
- product, safety profile, mode and width cannot alias one another;
- direct calls from compiler/runtime entrypoints route through the closed
  product-policy seam;
- cache/artifact keys differ when any bound axis differs;
- package-boundary graph denies Trametes or lab dependencies into Galerina
  governance, VOK or receipt issuance;
- scalar `1` remains admitted and `64`, `32`, `256` remain refused until their
  separate implementation gates pass;
- a no-product generic CLI request refuses;
- a governance-off flag is rejected by parser and policy;
- old-root restoration and package-name preservation are rehearsed without a
  dual-root compatibility alias.

### Before the first `.fungi` file

- explicit product selection and product-bound artifact/cache identities pass
  as one atomic gate on the active product tip;
- the command matrix refuses omitted product, Trametes, Gate family, wrong
  native root and every unadmitted width;
- workspace globs, generated indexes and project references cannot make an
  unadmitted directory or product executable;
- RD-0861 provisional paths are amended to the final native locator;
- a new product-family RD is allocated and integrated on KB `main` only;
- the current Galerina TODO and roadmap point to one governing plan;
- package/workspace, docs, code, contract and graph indexes reach one exact-head
  fixed point;
- Git Custody Audit proves the planning branch can integrate into the active
  product branch without unrelated paths;
- independent and model-diverse review agree on the same immutable revision;
- no Gate or Trametes file is introduced in the scalar Galerina slice.

## 12. Benchmark design

Do not claim Trametes is faster from the existing passive benchmark because it
runs governance outside the timed loop.

The later benchmark matrix varies:

```text
product x safety profile x physical profile x build mode x input class x cache state
```

Report separate cells for:

- registry/profile dispatch;
- policy/governance evaluation;
- GIR emission;
- SLIDE derivation and re-admission;
- VOK lease validation;
- steady-state execution;
- cold and warm namespaced caches.

Trametes is not justified as a separate production product if its measured
governance savings are within noise, if dispatch/isolation erases the saving,
or if compile/execution cost dominates. Benchmark receipts and HTML charts are
generated automatically and remain non-authorizing.

## 13. Git and integration plan

This design branch is based exactly on the active product branch at
`c3360c143db4659ae18560322dc6b7a3cf3e122a`.

```text
codex/product-family-package-readiness
  -> fast-forward only into codex/rd-0858-unit4-process-root
  -> later merge of the closed product branch into main under its own chapter
```

At design closure:

1. commit only the consultation, design, plan and generated documentation
   indexes owned by this chapter;
2. refresh the exact code/document graphs after the commit;
3. rerun Git Custody Audit against the live target branch;
4. require `TARGET_ANCESTOR_OF_SOURCE` and a proposed fast-forward plan;
5. independently review the immutable commit;
6. integrate only after PASS and live target recheck;
7. delete the planning worktree/branch only after ancestor and recoverability
   proof.

No direct merge to `main`, push, package move or `.fungi` creation belongs to
this documentation chapter.

## 14. External review adjudication

The first Grok Expert article ended with `REVISE_BEFORE_PLANNING`, but local
adjudication marks the article `SELF_REJECTED` because its stored response did
not carry the required inline primary-source links. The following hypotheses
are sustained only because they were independently rechecked against exact
local source and separately opened primary sources:

- bare `packages/` needs typed `fungi/` and `gate/` subfamilies;
- a pairwise Galerina/Trametes selector is not extensible;
- current direct governance calls are not a safe multi-product seam;
- generic cache keys need product-bound identity before Trametes admission;
- Gate source must remain visibly laboratory and non-authorizing;
- existing performance evidence cannot prove Trametes value.

The following recommendations are narrowed locally:

- current generic cache keys are a future multi-product gap, not proof of a
  present Galerina cache vulnerability;
- separate top-level `packages-fungi/` and `packages-gate/` are unnecessary if
  the owner-selected `packages/` root has closed typed subfamilies;
- a physical rename is not required before the registry/seam/identity gates;
- Trametes enablement is deferred so the first scalar Galerina slice remains
  the immediate native objective.

The exact committed candidate then received a second four-vector challenge.
Its `REVISE_BEFORE_INDEPENDENT_REVIEW` recommendation is sustained in two
places:

- explicit product selection and product-bound artifact/cache identity now
  form one atomic admission gate;
- typed native roots remain locator-only until the later source chapter, so an
  empty directory or broad workspace glob cannot masquerade as admission.

Its remote-freshness concern is also sustained as an integration gate. Local
ancestry supports planning, but no fast-forward may occur from an
unknown-fresh remote view.

Both reviews remain advisory and non-authorizing. Their complete prompts,
responses and receipts are preserved under the matching consultation
directory.

## 15. Stop conditions

Return HOLD if any of these occur:

- a product is inferred from an ambient default, safety profile, path or width;
- Trametes is implemented as Galerina plus a governance-off switch;
- a product can select or authorize its own policy, width or target;
- a cache, GIR package or receipt lacks bound product/governance identity;
- product-bound artifacts can be minted before explicit product selection is
  admitted in the same atomic gate;
- a native directory or alias is materialized merely as readiness before the
  product, boundary and workspace-glob controls pass;
- the physical root moves before rollback and graph gates pass;
- Gate source appears on the authoritative GIR/SLIDE/VOK route;
- width `64`, `32` or `256` executes before its exact profile admission;
- KB work requires a new topic branch rather than the owner-required main-only
  route;
- documentation indexes cannot reach a deterministic exact-head fixed point;
- any `.fungi` file is created before this design and its implementation plan
  are independently closed.

## 16. Completion claim

This design may become `SPECIFIED` only after independent review passes at one
immutable commit and the generated documentation/index evidence is exact.

It does not by itself authorize P1 implementation. Physical package migration,
first `.fungi` creation, Trametes admission, wider physical profiles and Gate
synthesis each retain their own later authority boundary.
