# Security diff tail remediation design

Date: 2026-08-11
Status: owner-pre-approved binding remediation design

## Decision

Close four independently reproduced security defects without widening authority or
turning asynchronous work into a serial slow path:

1. `String.matchesPattern` must check the existing TriRegex cost certificate
   before running the matcher.
2. Vault plaintext must have no direct return channel. Scoped callbacks receive
   one transient owned copy, their return value is discarded, and the copy is
   wiped before the call returns.
3. A credential has one affine rotation lease. A concurrent rotation for the
   same credential is refused instead of sharing another operation's result.
4. A route that requires runtime audit evidence must obtain a bounded audit
   capacity lease before any request effect. The exact event commits that lease;
   asynchronous flushing remains off the request path.

These controls repair bootstrap TypeScript boundaries only. They grant no
conversion, SLIDE, VOK, release, signing, production, or retirement authority.

## RD-0796 concurrency ruling

`async flow` is the governed happy path. It is not a hard path and does not by
itself require serialization.

The hard serial list is limited to shared active compute, mutable shared state,
non-commutative updates, and single-lease authority such as one credential
rotation or one audit-capacity reservation/commit transition. Independently
owned services may continue concurrently when inputs and outputs are explicit,
resource bounds are admitted, cancellation is observable, and termination has
a receipt.

The audit reservation is therefore a constant-time synchronous admission step.
Handler execution and audit flushing remain asynchronous and may overlap.

## Invariants

### Certified regex work

For a subject with `n` Unicode code points and a successful TriRegex compile,
the pre-run work bound is:

```text
certifiedWork = n * certificate.perCharWorkBound
              + certificate.boundaryWorkBound
```

The multiplication and addition use `bigint`, so overflow, NaN, and implicit
floating-point coercion cannot admit work. A configured fixed policy ceiling is
checked before `matcher.test`. A compile veto, overlength subject, or excessive
certificate returns the existing typed `RegexError` path. Ordinary bounded
patterns retain their current Boolean result.

### Scoped secret use

Neither the facade nor the exported rotation manager returns plaintext. The
manager exposes a callback-only scoped operation that returns a Boolean
presence result. It supplies a fresh buffer copy, rejects a thenable callback,
discards all callback results, and wipes the copy in `finally`.

The facade delegates to this operation. The CLI communicates its non-secret
success through the Boolean presence result. An already-authorized callback can
still deliberately copy bytes into another allocation; JavaScript cannot
prevent that. This design closes the package-created durable return channels
without claiming to sandbox an authorized in-process principal.

### Affine rotation

The per-credential rotation map is a lease registry, not a single-flight result
cache. If a lease already exists, a second call throws a stable refusal before
its provider client is invoked. The first operation retains the lease until its
promise settles, then removes only its own exact promise identity. Different
credential IDs remain independent and may rotate concurrently.

### Audit reservation and commit

`AuditSink` has three authority operations:

```typescript
reserve(): AuditReservation | undefined;
commit(reservation: AuditReservation, event: AuditEvent): void;
cancel(reservation: AuditReservation): void;
```

The default sink owns opaque reservation objects in a private set. Capacity
counts queued events, retained drained events, and live reservations. It never
evicts an accepted event. An invalid, copied, reused, or foreign reservation is
refused.

Before `runPipeline`, the kernel resolves the exact route policy. When
`audit.runtimeReport` is true it must reserve capacity or return
`audit_unavailable` without invoking the handler. After the pipeline returns,
the kernel commits the exact event. An unexpected failure cancels the lease.
Routes without mandatory runtime reporting use best-effort `emit`; capacity
refusal cannot erase older accepted evidence.

The in-memory sink exposes an explicit transfer operation for drained evidence.
Capacity is released only when a consumer takes custody; inspection alone does
not acknowledge or delete evidence.

## Approaches considered

### A. Enforce at the four existing ownership boundaries - adopted

This uses the existing TriRegex certificate, Vault facade/manager, affine
rotation map, and app-kernel audit pipe. It is the narrowest design that closes
every reproduced path while preserving asynchronous handler and service work.

### B. Move all four controls into a new global scheduler

A scheduler could centralize budgets and leases, but it would couple unrelated
packages, enlarge the trusted computing base, and risk serializing independent
services. Rejected.

### C. Retain compatibility and document caller obligations

Documentation cannot stop the direct secret return, false shared rotation
success, unchecked certified work, or post-effect audit refusal. Rejected.

## Test design

Every production change begins with a failing real-boundary test:

1. a certified high-work pattern is refused before matcher evaluation, while a
   simple pattern still returns the same Boolean;
2. the Vault facade and manager return only a Boolean presence result, wipe the
   supplied view, discard a synchronous callback result, and reject thenables;
3. two overlapping rotations for one credential cause the second call to
   reject without invoking its client, while different credentials rotate
   concurrently;
4. capacity one admits one mandatory-audit request, refuses the next before its
   handler effect, preserves the first event, and admits work again only after
   evidence custody is transferred;
5. slow asynchronous audit flushing still completes after the response and
   does not become handler-path work;
6. forged, reused, and foreign audit reservations refuse.

Focused package tests run before the complete package lane. The original four
runtime probes are rerun after implementation. Generated registry candidates,
indexes, graphs, percentages, TODOs, and roadmaps are refreshed only through
their owning tools after source verification is green.

## Acceptance criteria

- No regex matcher runs when its deterministic certificate exceeds policy.
- No Vault API introduced by this package directly returns plaintext.
- A second live rotation for one credential is refused, not coalesced.
- A mandatory-audit handler cannot run without a live owned capacity lease.
- Accepted audit evidence is never silently evicted.
- `async flow`, handler execution, independent credentials, and independently
  owned services remain concurrent where their authority and state do not
  overlap.
- Focused tests, owning package tests, the original probes, and the complete
  repository verification lane pass before a fix is called complete.
