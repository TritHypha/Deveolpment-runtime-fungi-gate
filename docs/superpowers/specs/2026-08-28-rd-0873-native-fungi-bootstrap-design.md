# RD-0873 Native Fungi Bootstrap and Conversion Admission Design

**Status:** OWNER-APPROVED DESIGN; DOCUMENTATION CHAPTER IN PROGRESS

**Date:** 2026-08-28

**Governing predecessors:** RD-0753, RD-0792, RD-0855, RD-0858, RD-0861 and
RD-0863, plus the completed RD-0858 Unit 4 scalar-oracle chapter.

## 1. Decision

The next `.fungi` chapter is not a bulk TypeScript conversion and is not a
physical-profile expansion. It first repairs the repository-wide corpus and
conversion evidence exits, then admits one bounded Galerina-native conversion
slice under scalar physical profile `1`.

The existing hand-authored scalar oracle remains the universal semantic control:

```text
packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/
```

It is complete bounded evidence for its exact flow. It is not an unopened
locator, a general package template, TypeScript retirement authority or
production admission.

## 2. Architecture retained

Products remain registered identities below typed source roots:

```text
packages-ts/                         TypeScript/MJS bootstrap and tools
packages/fungi/shared/               proven product-neutral native contracts
packages/fungi/core/                 proven product-neutral native runtime/compiler capabilities
packages/fungi/products/galerina/    Galerina-native product code
packages/fungi/products/trametes/    closed until a later product chapter
packages/gate/                       non-authorizing laboratory source
```

The authoritative execution route remains:

```text
checked Galerina source
  -> immutable checked snapshot
  -> width-independent canonical GIR
  -> detached artifact
  -> SLIDE physical profile binding and independent re-admission
  -> VOK affine lease
  -> execution
  -> terminal receipt or refusal
```

Lyth supplies reusable proof work but cannot mint `ALLOW`. `.gate` synthesis
remains a later non-authorizing laboratory lane.

## 3. Product, language and profile separation

The following axes remain independent and must be bound atomically into every
artifact, cache and receipt identity:

- product identity;
- safety profile;
- build mode;
- physical Trit profile;
- semantic source and GIR digest.

One Trit remains one widthless semantic value in `{−1, 0, +1}`. Native source
must not encode packed width into the Trit type or semantic GIR.

The implementation order remains:

1. scalar `1`;
2. ordinary packed `64`;
3. admitted high-throughput `256`;
4. compatibility fallback `32` only through admission-time replanning.

Every replan creates a new identity and receipt. Runtime rescue, silent profile
substitution, profiles `128` or `512`, and adaptive-width ABI commitments remain
forbidden.

## 4. Current blockers

The latest complete repository close is non-green at `93/96`. Three roots must
remain visible until closed by new evidence:

1. the generated conversion queue is stale at the current build point;
2. inherited conversion-slice receipts omit exact source and candidate scope;
3. the monolithic Fungi corpus audit emits no terminal receipt inside its
   600-second wrapper deadline.

The historical roadmap and TODO still cite `94/96` and describe the scalar
locator as unopened. Those statements are stale current-state claims and must
be superseded in the living sections without rewriting dated receipts.

## 5. Corpus Audit v2

The current corpus sweep uses size, modification time and strict/plain mode as
its file cache key, invalidates the whole cache when the compiler fingerprint
changes, executes checks serially and produces its useful aggregate only after
the last file. A timeout therefore loses terminal aggregate evidence.

Corpus Audit v2 has two admitted profiles:

| profile | scope | purpose |
|---|---|---|
| `WORKSET` | exact changed/native candidate files plus declared neighbours | fast authoring feedback |
| `PROJECT` | every tracked admitted `.fungi` file | repository closure |

Each file identity binds repository HEAD, canonical repository-relative path,
content SHA-256, diagnostic expectation digest, compiler/toolchain digest and
check mode. Size and time may be optimization hints only; they cannot establish
cache identity.

The project corpus is partitioned by the lexically ordered digest-bound file
list into deterministic bounded shards. Each shard:

- owns a disjoint ordered file range;
- has a positive file, byte, time and captured-output ceiling;
- writes no repository source or shared cache;
- returns one closed `PASS`, `FINDING` or `REFUSED` receipt;
- records completed and unprocessed file identities;
- returns a terminal receipt on timeout, cancellation, crash or overflow.

A deterministic aggregator validates every shard receipt, exact coverage,
non-overlap, toolchain identity and result digest. Missing, duplicate, stale,
foreign or unfinished shards produce `HOLD`; they never become absence or PASS.
Resume accepts only receipts bound to the same exact file-set, compiler and
repository identity.

## 6. Bounded parallel audit fabric

Galerina will use the canonical AGENTS `audit-map.mjs` and
`bounded-tool-batch.mjs`; it will not fork or copy those tools. The AGENTS root
is supplied at runtime and remains a separate owner.

An approved audit manifest declares each task's owner, exact HEAD, ordered argv,
dependency edges, timeout, output limit, exit algebra and evidence locator.
The scheduler remains diagnostic and `authorizing:false`.

Safe parallel lanes are restricted to independent read-only work:

- disjoint corpus shards;
- snippet/workset lint and static checks;
- read-only documentation and locator checks;
- independent review vectors that do not share mutable outputs.

The following remain exclusive barriers:

- Git writes, staging, commit, merge and publication;
- graph, index, registry, roadmap and generated-document writers;
- Myco refresh and every `.myco/index.json` mutation;
- builds sharing `dist`, cache, registry or temporary roots;
- complete test estates and final phase-close aggregation;
- signing, admission, SLIDE and VOK effects.

Default concurrency is two; four is a hard ceiling for measured lightweight
read-only tasks. Parallelism is never inferred from CPU count. A finding or
refusal stops new launches while already-running bounded siblings reach a
terminal result.

## 7. Conversion evidence v2

Every candidate or converted slice receives a closed receipt binding:

- exact product, package, file and symbol scope;
- source HEAD, tree and content digest;
- target locator and candidate digest;
- governing RD and plan digests;
- required gates in exact order with evidence digests;
- declared exclusions and their authority;
- scalar profile `1`;
- non-authorizing status.

Historical receipts are retained unchanged. They cannot satisfy the new schema
without an exact re-observation of the original source and candidate scope.

The conversion queue is regenerated from the current retirement ledger and
exact-scope decisions. It must conserve every executable path and refuse an
unknown, duplicate, reordered or unscoped decision.

## 8. First bounded native slice

The first post-oracle slice is selected from current graph and queue evidence.
It must be Galerina-specific, scalar, deterministic and small enough for one
reviewer to hold in context. It must have:

- closed inputs and outputs;
- explicit effects and an exit on every path;
- no ambient filesystem, process, network, time, randomness or host authority;
- a mechanically comparable TypeScript or checked-GIR reference;
- no unresolved platform or bootstrap-floor dependency;
- an exact product-policy and artifact-identity binding.

The slice belongs under `packages/fungi/products/galerina/`. Promotion into
`shared` or `core` requires measured reuse by more than one admitted product and
a separate owner decision. No mass move, compatibility alias or TypeScript
retirement occurs in this chapter.

## 9. Assurance and failure algebra

Implementation proceeds RED first. Required controls include:

- every branch and error path reaches one explicit exit;
- deny, ambiguous and allow remain distinct;
- malformed, missing, stale or unknown evidence refuses;
- WORKSET and PROJECT receipts bind identical semantics for overlapping files;
- sequential and parallel corpus runs produce identical ordered result digests;
- timeout, crash, cancellation, overflow and missing shard evidence return
  bounded non-PASS receipts;
- source, product, profile, artifact, compiler and receipt one-field neighbours
  turn the relevant control red;
- `.fungi` and the reference path produce equivalent checked semantics and GIR;
- LF and physical-CRLF test estates agree without rewriting repository source.

Myco, Hypha and Code Logic Workbench remain discovery and review aids. They do
not mint semantic equivalence, execution admission or conversion authority.

## 10. Git and custody

Planning occurs on `codex/rd-0873-native-fungi-bootstrap-plan` in an isolated
worktree based on the exact RD-0858 process-root branch. The KB record is written
directly on KB `main`; no new KB topic branch is created.

Implementation begins only after this planning chapter, RD metadata and audit
map are reviewed. It uses a separate isolated implementation branch. Merge into
the RD-0858 process-root branch requires exact ancestry, clean custody, fresh
graphs and independent Critical 0 / Important 0 review. Merge to `main`, release,
publication and production remain closed until the complete phase-close is
green and separately authorized.

## 11. Completion states

This documentation chapter may claim `RD0873_PLAN_READY` when the spec, plan,
TODO, roadmap, KB RD and derived indexes agree at exact clean commits.

The audit-foundation phase may claim `RD0873_AUDIT_FOUNDATION_CONFIRMED` only
when the queue, receipt v2 and resumable corpus PROJECT profile close all three
current phase-close roots.

The native slice may claim `RD0873_FIRST_SLICE_CONFIRMED` only after exact
differential semantics, GIR, complete exits, sequential/parallel parity,
independent review and graph evidence pass at one build point.

None of these states admits profile `64`, TypeScript retirement, Trametes,
`.gate`, VOK authority, production execution or release.
