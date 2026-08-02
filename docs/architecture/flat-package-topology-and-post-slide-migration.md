# Flat Galerina package topology and post-SLIDE migration

Date: 2026-07-29  
Status: binding architecture; pre-SLIDE migration ratchet implemented  
Authority: owner decision — one package/plugin, one top-level canonical instance

## Outcome

Galerina will not reproduce npm's recursive dependency forest. Every
independently resolvable package or plugin has exactly one canonical direct
child directory under `packages-galerina/`. A package may contain ordinary
source, tests, assets and build outputs, but it may not contain another
resolvable package identity.

```text
packages-galerina/
├── galerina-core/
├── galerina-core-security/
├── galerina-ext-tritsocket/
├── galerina-tri-pipe/
├── galerina-tower-citizen/
└── <every other admitted package or plugin exactly once>/
```

Dependencies are graph edges to those canonical peers. They are not copied
directories. A dependency of a dependency resolves to the same top-level
identity and content digest as a direct dependency.

## Measured pre-SLIDE state

The fresh topology audit reports:

- 99 canonical identities across the host and Galerina-native manifests;
- 95 package-local `node_modules` bootstrap trees;
- one nested Galerina-native package:
  `galerina-framework-example-app/packages/greeting/package.fungi.json`.

The nested greeting package is exact, ratcheted migration debt. It is not
evidence that nested packages are allowed. Any second nested native manifest,
duplicate identity, malformed manifest, or stale debt exception fails the
current audit. The `--post-slide` profile rejects the greeting debt and all 95
`node_modules` trees today, proving the final gate is not silently green.

## Canonical resolution contract

For each dependency edge, the resolver must verify all of:

1. the requested identity names one direct child of `packages-galerina/`;
2. exactly one manifest claims the canonical identity;
3. the admitted version, public ABI, source/content digest and signer match the
   root lock authority;
4. the caller declares the dependency and requested capabilities;
5. the dependency graph is deterministic and satisfies cycle policy;
6. the selected target, driver, memory model and SLIDE recipe are admitted;
7. the package and every transitive edge have provenance receipts;
8. no nested, shadowed, symlink-escaped, downloaded-at-runtime or alternate
package instance can participate.

## Terminal execution and host authority

Flat placement is necessary but not sufficient. The terminal migration gate is
`node scripts/ts-retirement-graph.mjs --post-slide`. It requires all of the
following in one independently re-derived decision:

1. zero tracked `packages-galerina/**/*.ts` paths;
2. zero nested native package identities;
3. zero package-local `node_modules` trees;
4. every production `.fungi` source under a package `src/` tree admitted by
   `docs/security/post-slide-execution-authority.json`;
5. every remaining non-TypeScript/non-Fungi production runtime source, plus
   each production `.fungi` source using `native.call`, owned as a host
   boundary by that same ledger. This classification does not depend on
   recognizing an import spelling, so an obfuscated or dynamic import cannot
   evade ownership.

Schema v2 separates `candidates` from the reserved production arrays. A
candidate has an exact package owner, tranche, profile identity, source and
graph SHA-256, tracked evidence path and evidence SHA-256. The gate re-reads
regular non-symlink files and checks path containment and file digests, but a
valid candidate remains unexecuted debt. Production `fungiSources` and
`hostBridges` currently refuse every entry until typed cryptographic execution
and ownership receipt verifiers exist. Missing, untracked, stale, substituted,
duplicated, mis-owned or schema-expanded candidate entries also refuse. The
older R4 compiler and governed-twin ledgers remain valid shadow-bake history,
but do not implicitly grant terminal post-SLIDE execution authority; terminal
admission is a fresh and narrower claim. The full contract is in
`docs/security/POST-SLIDE-EXECUTION-AUTHORITY-LEDGER.md`.

The verifier implementation is complete. Fresh current evidence passes 11/11
top-level adversarial tests; the earlier 16/16 focused run
remains a historical checkpoint. The current measured admission debt is 494
tracked package TypeScript paths, 109 production `.fungi` sources awaiting
terminal re-admission, 36 detected production host boundaries awaiting
ownership, 95 `node_modules` trees and the one ratcheted nested package. These
counts are debt, not exceptions. A green verifier and a red terminal admission
are deliberately separate states.

Unknown, missing, duplicate, conflicting or unverifiable state is a refusal.
The resolver must not choose a "nearest" package, silently download a version,
or search parent/child trees.

Version disagreement does not create two installed copies. The graph must
select one compatible admitted version or fail closed with the conflicting
edges named. A deliberate multi-version design would require a future
owner-approved identity/ABI isolation scheme; none is admitted for beta v1.

## Root manifest and lock direction

The native package manifest remains package-owned (`package.fungi.json` or its
eventual canonical successor). A single root lock authority records the exact
graph. Per-package lock files must not create independent dependency worlds.

The root graph receipt should bind at least:

- canonical package name and version;
- source/content digest and public ABI digest;
- signer/key identity and verification result;
- declared capabilities, effects and governance policy;
- direct dependency edges;
- compiler, SLIDE schema/recipe and target-profile versions;
- deterministic topological order;
- build and provenance receipt digests.

SLIDE shape memory may cache compiled graph fragments keyed by these facts, but
the cache is not another package registry. A cache hit is usable only after the
same manifest, graph, authority and provenance checks succeed.

## What this replaces

After executable SLIDE integration:

- package-local `node_modules` dependency trees;
- npm-style nearest-parent/transitive resolution;
- repeated transitive package copies and version shadowing;
- child package installation scripts with undeclared network access;
- implicit dependency discovery from filesystem layout;
- per-package lock graphs that disagree about shared dependencies;
- the example app's nested `packages/greeting` identity.

It does not remove package-internal `src`, `tests`, `docs`, assets or compiled
outputs. A compiled output can live under its owning package, but it cannot
claim a second resolvable package identity.

## Migration sequence

1. Keep TypeScript and package-local `node_modules` as an explicitly measured
   bootstrap layer until Galerina beta v1 is green and SLIDE is executable.
2. Maintain the pre-SLIDE topology ratchet. New nested native manifests and
   duplicate identities are release failures.
3. Define and test the root native manifest/lock schema, canonical resolver,
   graph receipt, capability checks and offline package admission.
4. Move the greeting compute to its own direct child package and update the
   example app to depend on that canonical identity.
5. Port package logic and devtools to `.fungi`/SLIDE in dependency order,
   starting with packages high in the graph.
6. Remove each npm dependency only after its replacement has semantic,
   security, graph and platform parity on Windows 10/11, Debian/Ubuntu,
   Fedora/Mint and macOS.
7. Enable `node scripts/audit-flat-package-topology.mjs --post-slide`; it must
   report zero nested native packages and zero `node_modules` trees.
8. Regenerate package graphs, indexes, SBOM, provenance, build evidence and
   roadmap measurements, then rerun every graph/test/audit tool.

No bulk deletion is authorized merely because a replacement is planned. Each
retirement edge requires fresh executable evidence.

## Executable evidence

```powershell
npm.cmd run audit:package-topology:selftest
npm.cmd run audit:package-topology
node scripts/audit-flat-package-topology.mjs --post-slide
node scripts/audit-selfhost-readiness.mjs --post-slide
node scripts/ts-retirement-graph.mjs --post-slide
```

Expected before SLIDE:

- self-test green;
- ratchet green with exactly one named deferred nested package;
- post-SLIDE profile red on that package and every remaining `node_modules`.

Expected after migration: all three commands green, with zero deferred debt.
