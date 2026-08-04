# Full `.fungi` to `.slide` retirement blockers

Status: current measured implementation gap, refreshed 2026-08-04
Authority: explanatory report only; it grants no execution or retirement authority

## Outcome

Galerina can create `.fungi` translation drafts now in external quarantine.
It cannot yet promote those drafts as production-authoritative replacements,
compile the complete package tree to admitted `.slide` artifacts, or delete
TypeScript and npm bootstrap dependencies. The limiting dependency is not the
amount of source translation. It is the production execution and artifact-
admission chain that proves translated source is the code checked, lowered,
admitted and executed.

There are **seven ordered gates** between the current state and the first
trustworthy production `.ts -> .fungi` authority switch:

1. complete canonical frontend/GIR coverage for that file's source constructs;
2. independent SLIDE execution for the exact admitted GIR slice;
3. deterministic VOK object lowering and independent final-object validation;
4. production `.slide` signing, packaging, loading and isolated execution;
5. authenticated execution and any required host-ownership receipts;
6. signed flat-root dependency authority for the file's direct peers; and
7. file-specific parity/refusal tests, production-ledger admission, consumer
   switch and only then TypeScript deletion.

These are gates, not seven individual files. A file whose constructs already
fit the bounded SLIDE profiles has less implementation work inside gates 1-3,
but none of gates 4-7 can be inferred from reference-only evidence.

The binding decision on which existing fragments are kept, adapted, retained
as oracles, completely redone or retired only after parity is in
[`slide-vok-reuse-inventory-2026-08-04.md`](slide-vok-reuse-inventory-2026-08-04.md).

Complete package retirement remains the **eleven-work-package** programme in
the dependency-order section below. Its current terminal verifier reports
**246 exact violations**; those violations are debt instances, not 246 separate
architecture designs.

Since the original report, independent SLIDE has added exact scalar, Boolean,
K3, immutable String/Bytes/Array/Option, bounded record, bounded fold,
4..128-function and 9..16-block control-flow profiles through the shared flat
package/VOK/typed-receipt route. The latest bounded successor is verified at
713/713 across 73 suites. These floors remove design and implementation
unknowns below; they do not change production counts because general bodies,
effects, production signing and production authority remain open.

The current live target is:

| Terminal debt | Current | Required |
|---|---:|---:|
| Tracked package TypeScript paths | **497** | **0** |
| Categorised implementation TypeScript paths under `src` | **482** | **0** |
| Production `.fungi` sources without execution authority | **111** | **0** |
| Non-authorizing `.fungi` candidates | **2** | candidates do not count as production |
| Production-executed `.fungi` sources | **0** | **111 now; then every added replacement** |
| Detected host boundaries without ownership receipts | **38** | **0** |
| Package-local `node_modules` trees | **95** | **0** |
| Nested native package identities | **1** | **0** |
| Post-SLIDE gate violations | **246** | **0** |

The often quoted **491**, **495** and **496** TypeScript counts are stale. The
fresh repository audit finds **497** tracked paths. Of these, 482 are
categorised implementation paths under `src`; the other 15 remain in the
retirement scope.

The exhaustive path-level inventory is generated at
[`build/ts-retirement/ts-retirement.json`](../../build/ts-retirement/ts-retirement.json).
The shorter generated summary is
[`build/ts-retirement/TS-RETIREMENT.md`](../../build/ts-retirement/TS-RETIREMENT.md).

## What the 246 refusals mean

The post-SLIDE verifier fails closed for five independent reasons:

| Refusal class | Count | Meaning |
|---|---:|---|
| Unexecuted `.fungi` | 111 | Strict frontend acceptance or an existing file is not proof of execution |
| Unowned host boundary | 38 | Native, OS and runtime seams have no typed cryptographic ownership receipt |
| Package-local dependency tree | 95 | Each package still carries an npm-shaped dependency world |
| Nested native identity | 1 | `galerina-framework-example-app/packages/greeting/package.fungi.json` violates the flat package rule |
| TypeScript-zero terminal assertion | 1 | The physical tracked count is 497, not zero |
| **Total** | **246** | Every row must reach zero; there are no exemptions |

The verifier implementation is already green against its adversarial fixtures.
Its red production verdict is correct: it is reporting real unfinished work.

## The missing compile chain

A complete compilation is not “the `.fungi` parser accepted the file.” The
required chain is:

```text
checked .fungi source
  -> complete detached executable GIR + authenticated frontend receipt
  -> independent SLIDE semantic/K3/memory/effect/capability validation
  -> deterministic build graph and target lowering
  -> independently verified final object
  -> canonical admitted .slide bundle
  -> isolated, budgeted VOK execution through affine capabilities
  -> typed terminal execution/audit receipt
  -> exact production authority-ledger entry
  -> only then remove the matching .ts/oracle and dependency edges
```

The following links in that chain are incomplete.

### 1. Complete Galerina frontend handoff and executable GIR

The real Galerina parser, type, value-state, effect, governance, escape and
naming checks exist. The checked-decision work proves that a small ordinary and
K3-sensitive subset can produce a receipt which SLIDE independently re-derives.
That profile is reference-only.

The general compiler still has incomplete/summary GIR surfaces and code paths
which recover lowering facts from the AST. A complete package build needs the
detached GIR to carry every function, CFG edge, value, type, failure, K3
obligation, memory region, effect, capability, source-map fact and resource
limit. Unsupported source must refuse at export; the backend may not recover
missing meaning from the AST, tree walker, WAT or a cache.

Missing exit evidence:

- the complete supported `.fungi` language lowers without post-GIR AST reads;
- two clean frontend runs produce byte-identical canonical GIR and receipts;
- every accepted package construct has positive, hostile and mutation vectors;
- unknown or incomplete semantics fail closed with a stable diagnostic;
- the compiler can rebuild itself from admitted `.fungi` without TypeScript.

### 2. General independent SLIDE executable backend

SLIDE has a bounded V2-C executor, V2-D safe-value work, VOK foundations,
direct Wasm compatibility evidence and real checked-decision profiles. These
are important prerequisites, but they do not execute an arbitrary Galerina
package.

The current V2-C executor supports a closed subset of scalar/aggregate
operations, calls and Boolean/K3 control flow. The independent pure-scalar
profile now lowers checked `Int` addition and fails closed on constant or
runtime overflow. Contract 33 closes a bounded flat package ABI with exact
direct-peer export signatures and typed path-free resources. Contract 34
compiles bounded checked source exports into per-export `.slide` objects and
executes them through that ABI and VOK. Strings, collections from Fungi source,
loops, mutation, general effectful/cross-module calls, complete safe-value
memory behavior and the full Galerina construct set are not yet an executable
production backend.

Missing exit evidence:

- frontend-neutral execution of the complete admitted GIR profile;
- exact effect and capability requests with no ambient host authority;
- checked allocation, lifetime, bounds, alias, cleanup and failure behavior;
- general cross-module call lowering and effect-bearing component resources;
- deterministic budgets for steps, recursion, memory, output and host calls;
- independent re-validation and no fallback after any refusal.

### 3. General VOK object lowering and final-artifact verification

The native VOK floor proves a narrow object profile, K3 gates, affine leases
and RW-to-RX behavior. It does not lower or admit general package GIR.

Still required:

- deterministic lowering for the admitted target profiles;
- independent object parsing and validation rather than trusting the producer;
- binding of source, GIR, optimization/build recipe, target, object bytes,
  imports, memory layout and policy identity;
- W^X, relocation, import, guard, control-flow and resource verification;
- Windows 10/11, Linux distributions and macOS evidence for each admitted
  target, with present-but-unusable hardware recorded honestly.

### 4. The production `.slide` format, packager and loader

Contracts 30, 34 and 35 now implement a canonical bounded `.slide` envelope,
checked multi-package packager and receipt-last physical publisher. The
publisher exclusively reserves an absent target, uses no-replace artifact
links and places the receipt last; Node honestly reports power-loss durability
K3 `0`. There is still no production-signed general container or general
isolated runner.

Still required:

- extend the bounded bundle/member identities from the checked subset to the
  complete admitted language and object profiles;
- hybrid-signature and key-epoch metadata through the crypto-agility
  interface, without embedding private material;
- independent two-path bundle admission and exact rollback/revocation state;
- a loader that accepts only admitted members and never searches for a nearest
  dependency, alternate runtime or cached fallback;
- isolated execution, least-authority capability RPC and typed termination,
  crash, timeout and audit receipts.

### 5. Typed production execution and host-ownership receipt admission

[`docs/security/post-slide-execution-authority.json`](../security/post-slide-execution-authority.json)
uses schema v3. The cryptographic verifier is implemented and green, while the
production arrays remain empty. The two current entries are checked-decision
candidates only and remain among the 111 unexecuted sources.

The implemented verifier independently binds:

- canonical package identity, exact source path/bytes/digest and graph;
- authenticated frontend producer and complete checked frontend receipt;
- compiler, GIR, VOK, target, policy, bundle and final-object identities;
- every K3 gate result, affine lease consumption and terminal receipt;
- platform/host evidence for a native boundary;
- repository commit, fixed-point provenance, freshness and revocation state.

A Boolean such as `passed: true`, a self-hash, strict-source acceptance or a
reference transcript cannot populate production authority. Both hybrid
signature components, the delegated repository role, time, serial, revocation,
current repository commit and every exact artifact digest must agree. What
remains is to generate the complete per-source/per-boundary evidence, perform
the offline authority ceremony and enter verified receipts—not to invent a
replacement verifier.

### 6. Flat native package resolver and one root lock

Galerina's intended package model is one canonical top-level package or plugin
instance under `packages-galerina`, never npm-style child dependency forests.
Galerina now has a non-authorizing 98-peer root lock and exact direct-peer
resolver. SLIDE Contract 33 independently closes deterministic descriptor,
topological, direct-import and typed-resource semantics. The physical/runtime
retirement and signed graph authority are not complete.

Still required:

- production-sign the deterministic root graph/provenance receipt;
- extend exact compatibility from the bounded flow/resource ABI to every
  admitted capability/effect and general call surface;
- refusal of missing, duplicate, nested, shadowed, cyclic, hash-mismatched,
  capability-expanding or multi-version-conflicting identities;
- move the nested greeting identity to one direct top-level package;
- prove that one admitted identity resolves to exactly one admitted instance.

Only after this exists can the 95 package-local `node_modules` trees be
replaced one dependency edge at a time. Deleting them first would make the
current build incomplete, not native.

### 7. Package-by-package `.ts` to `.fungi` parity and authority switch

The physical conversion programme has not begun in the production tree. The
live ledger records no TypeScript path with a terminal `.fungi` replacement and
no production execution authority.

The 482 implementation paths divide into:

| Retirement tranche | Paths | What closes it |
|---|---:|---|
| Exact `.ts`/`.fungi` twins | 29 | Reconcile behavior, execute the `.fungi`, switch authority, retain the old path only as an external frozen oracle until deletion |
| Compiler/bootstrap core | 97 | Complete self-host and two-build fixed point; retire last |
| Bounded bootstrap/host floor | 17 | Replace or narrowly admit the crypto/native/host behavior with equivalent evidence |
| Migration programme | 339 | Translate and admit in dependency order with package parity |
| **Categorised implementation total** | **482** | |

For each public surface the required sequence is: write parity/refusal tests,
translate using the current `.fungi` coding standard, pass the strict frontend,
compile through the general SLIDE chain, run differential and hostile tests,
issue an execution receipt, update the production ledger, switch consumers,
then delete the exact TypeScript path. A failed SLIDE path has no TypeScript,
Wasm or cached fallback in production.

The largest current TypeScript concentrations are:

| Package | `.ts` | `.fungi` already present | Immediate issue |
|---|---:|---:|---|
| `galerina-core-compiler` | 105 | 59 | self-host/GIR/backend dependency; retires last |
| `galerina-tower-citizen` | 33 | 4 | trust-root integration and receipt consumption |
| `galerina-core-logic` | 21 | 0 | translation plus executable parity |
| `galerina-devtools-project-graph` | 20 | 0 | devtool/host behavior and self-use |
| `galerina-framework-app-kernel` | 19 | 12 | reconcile existing twins; trust-root package |
| `galerina-tools-myco` | 15 | 0 | regex worker host boundary and tool parity |
| `galerina-devtools-graph-algorithms` | 15 | 0 | translation and graph parity |

Tower Citizen and Tri-Pipe are retained components. Their implementations move
to admitted `.fungi` and integrate with VOK/SLIDE receipts; this migration is
not permission to remove their architectural roles.

### 8. Host-boundary replacement or ownership

The auditor detects 38 production host boundaries: 31 `.mjs`, three `.rs`,
three `.fungi` sources using native calls, and one `.js`. None has a production
ownership receipt.

Each boundary must either be removed by a `.fungi`/SLIDE implementation or
reduced to a typed, bounded, capability-leased adapter. Residual native code
cannot decide policy, grant capabilities, select packages, collapse K3 or sign
its own authority. Injection, confused-deputy, TOCTOU, replay, downgrade,
malformed-frame, exhaustion, crash/restart and revocation tests are mandatory.

The Wasmtime oracle remains development-only until the narrowly admitted
`.fungi` compatibility engine and differential gate can replace it. It is not a
production fallback.

## External candidate staging: useful but not a release shortcut

The first quarantine workspace currently contains four flat strict-frontend
candidates: Substrate Math and the GPU, native and Wasm target descriptors.
The independent ABI/build route now exists, but these staged candidates have
not been compiled and executed through it and cannot be copied into production
as finished replacements. The second 2026-08-02 workspace contains
an updated corpus ledger but no candidate source yet.

External conversion can continue safely because it reduces later translation
work. Every candidate must remain flat, non-authorizing and source-pinned until
the coordinator rechecks it against current Galerina, adds parity/refusal
evidence and executes it through the completed SLIDE chain.

One known frontend issue remains recorded for the staged native target:
`FUNGI-EFFECT-003 native.call` is triggered by a combined surface which has not
been isolated or worked around safely. Renaming public types merely to evade a
probable checker defect is not an acceptable fix.

## Dependency order to zero

```text
1. Complete general Galerina frontend receipt + detached executable GIR
2. Extend the green flat/check-decision SLIDE floors to the complete admitted
   language, effects, memory, calls and general VOK object verification
3. Extend the green reference packager/publisher to hybrid-signed production
   admission, native durability and an isolated runner
4. Populate cryptographically verified execution/host-ownership receipts
5. Activate signed flat root-graph authority and retire physical nested trees
6. Convert/reconcile packages in T1 -> T2 -> T3 order; compiler self-host last
7. Replace or admit every host boundary
8. Move the nested greeting package and remove all 95 node_modules trees
9. Require 497 -> 0, unexecuted 111 -> 0, unowned 38 -> 0
10. Rebuild from a clean checkout; run all graphs/tests/audits/security checks
11. Generate provenance-bound Galerina/SLIDE benchmarks and release evidence
```

Steps 1-5 can be developed in overlapping branches, but production package
deletion must follow their authority order. Translating files early is safe in
quarantine; treating syntax-accepted translations as executed replacements is
not.

## Definition of green

“Package retirement” becomes green only when one fresh run proves all of the
following together:

- zero tracked `packages-galerina/**/*.ts` paths;
- every package source runs from admitted `.fungi` through a production
  `.slide` bundle;
- zero unexecuted `.fungi` and zero unowned host boundaries;
- zero nested package identities and zero package-local `node_modules`;
- clean deterministic bootstrap and byte-identical rebuild evidence;
- Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS platform receipts;
- all graphs, tests, audits, mutation/security checks, generators and build
  fixed points pass;
- benchmark evidence compares equivalent admitted Galerina/SLIDE and archived
  Galerina/Wasm workloads.

The controlling command remains:

```powershell
node scripts/ts-retirement-graph.mjs --post-slide
```

It must exit zero without exemptions, renamed debt or fallback.

## Evidence used for this report

- live `node scripts/ts-retirement-graph.mjs --post-slide --json` on Galerina
  commit `3b3ee19ab95a72736868df33962ac2a26b996c04`;
- [`docs/security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md`](../security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md);
- [`docs/architecture/flat-package-topology-and-post-slide-migration.md`](../architecture/flat-package-topology-and-post-slide-migration.md);
- [`docs/superpowers/plans/2026-07-30-galerina-slide-full-fungi-retirement.md`](../superpowers/plans/2026-07-30-galerina-slide-full-fungi-retirement.md);
- independent SLIDE Contracts 33-62 and completion reports through local
  commit `6cc3cbb`.
- SLIDE `contracts/v2/19-GENERAL-EXECUTABLE-GIR-SUCCESSOR.md` and
  `docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`;
- both external Galerina Fungi package staging workspaces and their current
  issue/corpus ledgers.
