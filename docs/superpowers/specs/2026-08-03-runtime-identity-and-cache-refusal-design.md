# Runtime Identity and Cache Refusal Design

**Date:** 2026-08-03

**Status:** owner-approved through the full-auto continuation following the
collective-handover reconciliation

**Scope:** Tower Citizen runtime correlation identity and the core compiler
execution-graph cache. Package conversion, SLIDE atlas storage and public APIs
outside these two components are excluded.

## 1. Outcome

Tower Citizen must never create or admit two simultaneously active sandboxes
under one correlation identity. An omitted identity is generated from a
cryptographically strong source. A caller-supplied identity is accepted only
when it is a bounded canonical value and is not active; malformed or duplicate
input refuses before sandbox state changes.

The unauthenticated execution-graph disk cache must not authorize executable
state. Execution-graph reuse remains process-local until a durable candidate
can be independently bound to its source, compiler profile and admission
evidence. Historical disk-cache files become inert rather than being upgraded
from unvalidated JSON to structurally validated but still forgeable JSON.

## 2. Verified root causes

- `TowerRuntime.load()` currently derives a fallback identity from
  `Date.now()` plus six base-36 `Math.random()` characters.
- The same method writes directly to `sandboxes.set(correlationId, sandbox)`
  without refusing an already-active caller-supplied identity. A duplicate can
  replace the map entry while the earlier sandbox remains live.
- `ensureCacheDir()` and `writeDiskCache()` swallow every filesystem failure.
- `readDiskCache()` returns `null` for malformed JSON and filesystem errors,
  making corruption and denied access indistinguishable from absence.
- `getOrLoadGraph()` can return that unauthenticated disk object to
  `executeFlow()`, which may execute it when `egraphFastPath` is enabled. The
  filename is content-scoped, but no signature, MAC or independent graph
  derivation binds the stored bytes to that name.

The audit ledger also contains timestamps and sequence-derived event IDs, so
this work does not claim byte-identical audit replay. It closes identity
collision and unauthenticated persisted-execution authority only.

## 3. Selected design

### 3.1 Correlation identity admission

Use the platform cryptographic UUID source for an omitted correlation ID and
retain the existing `CORR-` namespace. Validate both generated and supplied
identities through one bounded canonical grammar. Before any audit trap,
sandbox construction or map write, refuse an identity already present in the
active sandbox map.

Caller-provided identities remain supported for cross-component trace binding.
They are not treated as authority: uniqueness is checked locally and their
bytes never bypass plugin evidence or governance admission.

### 3.2 Process-local cache only

`storeGraph()` writes only to the private in-process map. `getOrLoadGraph()`
reads only that map and returns `null` when this process has not built the
graph. Runtime code performs no execution-graph filesystem read, directory
creation or write.

The historical cache directory remains exported only as a regression-test
probe. Tests place a syntactically valid hostile graph at the old path and
prove that it cannot be observed or executed. A new process therefore rebuilds
from the admitted AST; repeat calls within that process still reuse the exact
built graph.

### 3.3 Durable reuse boundary

Durable graph reuse is deferred to the existing independent SLIDE programme.
Any later implementation must bind graph bytes to canonical source identity,
compiler/profile identity and independent admission evidence. A self-hash or
closed JSON shape alone is not authentication and cannot reopen this path.

## 4. Compatibility and safety rules

- Preserve the public optional correlation-ID parameter.
- Preserve an ordinary `null` result when the process-local cache has no entry.
- Do not make correlation IDs deterministic from request contents; that would
  expose equality and invite predictable collisions.
- Do not add a different filesystem cache or sidecar to restore the removed
  authority.
- Do not weaken plugin signature, artifact, capacity or governance gates.
- Do not change package-retirement counts or claim SLIDE execution authority.

## 5. Test-first verification

Completion requires fresh evidence that:

1. two active loads with the same supplied identity refuse the second without
   replacing or erasing the first;
2. malformed and overlong supplied identities refuse before state mutation;
3. omitted identities use the canonical namespace and remain unique across a
   deterministic stress sample;
4. a hostile graph at the historical disk path remains unobserved;
5. `storeGraph()` creates no disk file or directory;
6. a process-local graph still round-trips by exact object identity;
7. a new key with only a historical disk file returns `null`; and
8. the focused Tower Citizen and core-compiler suites, type checks and
   convention gates remain green.

## 6. Deferred work

SLIDE atlas cleanup-error observability, independently admitted durable graph
reuse, cross-process correlation reservations and complete audit-ledger
reproducibility are separate workstreams. None is implied complete here.
