# Galerina — Examples Manifest

## Purpose

This manifest classifies every `.fungi` example as **v1** or **post-v1**. The
v1 subset must be parseable by the Phase 4 parser or intentionally marked as a
rejection fixture. Post-v1 examples are drafts kept for reference but are
excluded from Phase 4 parser tests.

Phase 2 corpus target: ≥ 20 v1 examples covering all five categories.

---

## V1 Examples

These examples demonstrate v1 language features and must parse (or be marked
`EXPECT: REJECT`) when the Phase 4 parser is implemented.

### Basic (5)

These cover the fundamentals: flow declaration, records, simple Result, and
simple Option.

| File | Demonstrates | Status |
|---|---|---|
| `hello.fungi` | Simple `flow`, `return`, `print`, `Result<Void, Error>` | ✅ v1 |
| `result.fungi` | `type` alias, `enum`, `flow`, `match Result` | ✅ v1 |
| `option.fungi` | `type`, `Option<T>`, `match Option`, `Some`/`None` | ✅ v1 |
| `strict-types.fungi` | Type aliases, record declaration, field access | ✅ v1 |
| `decision.fungi` | Multi-variant `enum`, exhaustive `match` on enum | ✅ v1 |

### Type-System (5)

These cover the extended type system: Tri, generics, effects declarations, and
explicit type contracts.

| File | Demonstrates | Status |
|---|---|---|
| `ternary-sim.fungi` | `Tri` enum, `pure flow`, guard clauses in `match` | ✅ v1 |
| `json-decode.fungi` | Generic type parameters, `json.decode<T>`, typed decode | ✅ v1 |
| `contracts.fungi` | Effect declarations (`effects [...]`), contract-style typing | ✅ v1 |
| `source-map-error.fungi` | Source-map diagnostics, compute target errors | ✅ v1 (tooling) |
| `api-orders.fungi` | API route shapes, typed responses, explicit error types | ✅ v1 |

### API / JSON (5)

These cover API surfaces: typed decode, validation, explicit errors, safe
response shapes, and webhook-style input.

| File | Demonstrates | Status |
|---|---|---|
| `payment-webhook.fungi` | `webhook` declaration, HMAC security, `json.decode`, policy | ✅ v1 |
| `json-decode.fungi` | Typed JSON decode, `Result<T, ApiError>` | ✅ v1 (shared with type-system) |
| `contracts.fungi` | Request/response contract types | ✅ v1 (shared with type-system) |
| `api-orders.fungi` | Route manifest with explicit input/output types | ✅ v1 (shared with type-system) |
| `rollback.fungi` | Checkpoint + rollback for transactional flows | ✅ v1 |

### Memory (3)

These cover Galerina's ordinary-value memory model. Ordinary values use **value semantics** (no
shared mutable aliasing, references or raw pointers); general `borrow`/`move` remain reserved and
unenforced. Two narrow consume-once families are compiler-enforced outside this prototype corpus:
Passport uses `FUNGI-AFFINE-001`, while `Authority<Tag>` uses `FUNGI-AFFINE-002..004` for transfer,
persistence and containment refusal. This does not turn ordinary values into move-only values.

| File | Demonstrates | Expected |
|---|---|---|
| `borrow-scope.fungi` | Scoped `borrow` syntax (reserved; unenforced) | ACCEPT |
| `move-cleanup.fungi` | `move` annotation; value owned by the binding (reserved; unenforced) | ACCEPT |
| `value-semantics-ownership.fungi` | Value semantics: re-use after `move` is ACCEPTED (no use-after-move class; cf. FUNGI-AFFINE-001) | ACCEPT |

### Concurrency (2)

These cover the Structured Await pattern. Included as v1 if Structured Await
remains in scope (see Phase 2 exit criteria).

| File | Demonstrates | Status |
|---|---|---|
| `parallel-api-calls.fungi` | `async flow`, `parallel`, `await`, `timeout` | ✅ v1 (Structured Await) |
| `workers.fungi` | `channel`, `worker`, event loop | ⚠️ v1 candidate — `for` loop and `channel` syntax need Phase 1 grammar confirmation |

---

## V1 Total Count

| Category | Required | Present | Status |
|---|---|---|---|
| Basic | 5 | 5 | ✅ |
| Type-system | 5 | 5 | ✅ |
| API/JSON | 5 | 5 | ✅ |
| Memory | 3 | 3 | ✅ |
| Concurrency | 2 | 2 | ⚠️ (see `workers.fungi` note) |
| **Total** | **≥ 20** | **20** | ✅ |

---

## Post-V1 Examples

These files use features that are deferred until after the Phase 0–3
foundation. They must not be included in Phase 4 parser tests.

| File | Reason deferred |
|---|---|
| `gpu-plan.fungi` | GPU target — deferred to post-v1 |
| `photonic-plan.fungi` | Photonic target — deferred to post-v1 |
| `compute-block.fungi` | Heterogeneous compute blocks — post-v1 target planning |
| `compute-mix-throughput-benchmark.fungi` | Benchmark — no repeatable method yet |
| `arithmetic-threshold-benchmark.fungi` | Benchmark — no repeatable method yet |
| `four-digit-guess-benchmark.fungi` | Benchmark — no repeatable method yet |
| `browser-form.fungi` | Browser target — post-v1 |
| `logic-review-scale.fungi` | Large-scale example — review for v1 content before classifying |
| `ai-context.fungi` | AI context generation — report/tooling feature, not core language |
| `boot.fungi` | Project manifest — tooling configuration, not a language example |

---

## Rejection Fixtures

These examples must produce specific diagnostics. They are valid v1 test
inputs but must not be parsed as correct programs:

| File | Expected diagnostic | Reason |
|---|---|---|
| _(none)_ | — | The general use-after-move fixture was retired in #65 because ordinary values retain value semantics. Narrow Passport and `Authority<Tag>` consume-once failures are exercised in production compiler value-state tests, not this prototype corpus. |

---

## Parser Test Classification

When the Phase 4 parser is implemented, test files are divided as follows:

```
Phase 4 accept corpus:
  hello.fungi
  result.fungi
  option.fungi
  strict-types.fungi
  decision.fungi
  ternary-sim.fungi
  json-decode.fungi
  contracts.fungi
  api-orders.fungi
  payment-webhook.fungi
  rollback.fungi
  borrow-scope.fungi
  move-cleanup.fungi
  value-semantics-ownership.fungi
  parallel-api-calls.fungi
  workers.fungi (pending grammar confirmation)
  source-map-error.fungi (pending grammar confirmation)

Phase 4 reject corpus (intentional failures):
  (none — the use-after-move reject fixture was retired in #65; Galerina is value-semantics)

Post-v1 (excluded from Phase 4 tests):
  gpu-plan.fungi
  photonic-plan.fungi
  compute-block.fungi
  compute-mix-throughput-benchmark.fungi
  arithmetic-threshold-benchmark.fungi
  four-digit-guess-benchmark.fungi
  browser-form.fungi
  logic-review-scale.fungi
  ai-context.fungi
  boot.fungi
```

---

## Authoring Rules for New Examples

1. Each example demonstrates exactly one language rule or pattern.
2. The first line comment must be one of:
   - `// EXPECT: ACCEPT` for correct programs
   - `// EXPECT: REJECT` with `// ERROR: FUNGI-CODE` for intentional failures
3. Examples must not depend on archived domain packages or post-v1 targets.
4. Examples must be added to this manifest before they are referenced in tests.
