# Pre-Slice-31 Zero-Trust Hardening Design

## Goal

Close the reusable reliability and governance gaps exposed by conversion Slice
30 before selecting another TypeScript or MJS source.

## Decisions

### Retained package-failure evidence

Every failed package result carries a bounded, digest-bound evidence object.
It records schema version, exit status, signal, UTF-8 byte length, SHA-256 and
at most 32 diagnostic lines of at most 1,024 characters. Raw child output is
not published in the result. This preserves a reproducible identity without
turning logs into an unbounded or secret-bearing warehouse.

### Typed cross-boundary error envelope

Galerina and SLIDE do not share an ambient error service. They share the exact
data contract `zt.error-envelope.v1`:

| Field | Contract |
|---|---|
| `schema` | exactly `zt.error-envelope.v1` |
| `origin` | `GALERINA` or `SLIDE` |
| `phase` | `CHECK`, `ADMISSION`, or `EXECUTION` |
| `state` | `ERROR`, `REFUSED`, or `INDETERMINATE` |
| `code` | bounded stable diagnostic/refusal identity |
| `evidenceDigest` | lowercase SHA-256 of the originating diagnostic or receipt evidence |
| `authorityReleased` | exactly `false` |

The envelope contains no message, stack, path, secret, logger, callback,
capability, or mutable metadata. An independently permitted presentation or
audit adapter may resolve the stable code and evidence after validating the
envelope. `_ =>` returns a typed failure/refusal; it never invokes a global
logger.

### Slice-close receipt

Every new dated conversion report must contain a `Slice-close receipt` section
with one exact skill disposition:

- `SKILL_UPDATE <40-hex-commit>`; or
- `NO_SKILL_UPDATE: <non-empty evidence-based reason>`.

The receipt also records threadability, bounded closure gates and the source
classification. A repository audit enforces the shape and has hostile
self-tests.

### Threadability

Each candidate is classified before authoring:

- `PARALLEL_PURE`: immutable, deterministic leaf compute with no shared
  mutation or authority release;
- `ASYNC_HAPPY_PATH`: independently scheduled work with typed completion,
  cancellation and failure;
- `ISOLATED_SERVICE`: a separately running service with a closed message and
  authority boundary;
- `SERIAL_HARD_PATH`: shared-state mutation, active compute over mutable data,
  admission, signing, deterministic synthesis or ordered cleanup;
- `UNKNOWN`: insufficient evidence, which refuses parallelisation.

Threadability is not inferred from `async` syntax. Parallel execution requires
proof of ownership, determinism, bounds, cancellation and failure conservation.

### Conversion queue

The retirement graph remains the corpus authority. A derived queue classifies
every tracked executable-family source as `CANDIDATE`, `BLOCKED`,
`NO_RUNTIME_BEHAVIOR`, `SUPERSEDED_BY_EXISTING_FUNGI`, or `BOOTSTRAP_FLOOR`.
Unknown classification is a refusal and cannot disappear from the denominator.

### Resumable closure

Crash-linked aggregate commands remain excluded. A bounded closure receipt
names each independently run owner, its exact command class, exit state and
authoritative-input digest. Missing, stale, duplicate or failed entries make
the receipt incomplete. The receipt does not claim repository-wide green; it
states exactly which bounded gates completed.

## Authority boundary

This hardening creates evidence and gates only. It does not switch a consumer,
retire TypeScript/MJS, authorize production, release authority, logging
authority, or parallel execution.
