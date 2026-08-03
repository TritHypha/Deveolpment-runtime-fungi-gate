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

The execution-graph disk cache must distinguish `absent` from `rejected`.
Missing files may produce an ordinary cache miss. Inspection, read, parse,
shape or write failures must remain explicit failures and must not silently
fall through as if no cache entry existed.

## 2. Verified root causes

- `TowerRuntime.load()` currently derives a fallback identity from
  `Date.now()` plus six base-36 `Math.random()` characters.
- The same method writes directly to `sandboxes.set(correlationId, sandbox)`
  without refusing an already-active caller-supplied identity. A duplicate can
  replace the map entry while the earlier sandbox remains live.
- `ensureCacheDir()` and `writeDiskCache()` swallow every filesystem failure.
- `readDiskCache()` returns `null` for malformed JSON and filesystem errors,
  making corruption and denied access indistinguishable from absence.

The audit ledger also contains timestamps and sequence-derived event IDs, so
this work does not claim byte-identical audit replay. It closes identity
collision and failure-classification defects only.

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

### 3.2 Cache outcome contract

Represent disk-cache reads as a closed result:

- `ok` carries one structurally validated execution graph;
- `absent` is produced only by a verified missing-file condition; and
- `rejected` carries a stable diagnostic reason for every other failure.

`getOrLoadGraph()` may return `null` only for `absent`. A `rejected` result
throws a dedicated cache error so the caller cannot recompute silently under
a false cache-miss story.

Cache directory creation and writes return normally only after success. Any
failure throws the same dedicated error family. This preserves cache
optionality when no entry exists while making an unusable configured cache
visible and fail-closed.

### 3.3 Structural validation

JSON parsing alone is not admission. A loaded record must have the expected
closed top-level fields, bounded arrays, valid slot tuples, unique slot names
and indices, and safe numeric values before it is converted to a `Map`.
Unknown or malformed shapes are rejected rather than trusted through a type
assertion.

## 4. Compatibility and safety rules

- Preserve the public optional correlation-ID parameter.
- Preserve an ordinary `null` result for a genuinely absent disk-cache entry.
- Do not make correlation IDs deterministic from request contents; that would
  expose equality and invite predictable collisions.
- Do not catch the new cache error at a higher layer merely to restore the old
  silent fallback.
- Do not weaken plugin signature, artifact, capacity or governance gates.
- Do not change package-retirement counts or claim SLIDE execution authority.

## 5. Test-first verification

Completion requires fresh evidence that:

1. two active loads with the same supplied identity refuse the second without
   replacing or erasing the first;
2. malformed and overlong supplied identities refuse before state mutation;
3. omitted identities use the canonical namespace and remain unique across a
   deterministic stress sample;
4. a missing cache file remains an ordinary miss;
5. malformed JSON, malformed graph shape and non-missing filesystem failures
   are rejected distinctly;
6. a cache-directory or cache-write failure is visible to the caller;
7. valid disk entries still load and populate the memory cache; and
8. the focused Tower Citizen and core-compiler suites, type checks and
   convention gates remain green.

## 6. Deferred work

SLIDE atlas cleanup-error observability, durable cache authentication,
cross-process correlation reservations and complete audit-ledger
reproducibility are separate workstreams. None is implied complete here.
