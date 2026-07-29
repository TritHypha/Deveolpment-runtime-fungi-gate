# `.fungi` Corpus Adjudication — 2026-07-29

## Outcome

The implicit `knownFailing` corpus baseline is empty. The governed corpus audit
now checks every positive `.fungi` source it owns and accepts intentional
negative fixtures only when an adjacent exact diagnostic contract agrees with
the compiler result.

This closes the old 29-file implicit exception list. It does **not** claim that
the separate source-quality and curriculum-diagnostic inventories are clean:

- `audit-example-diagnostics.mjs` is green at its explicit 89/233 known-drift
  worklist, with no new drift;
- `lint-fungi.mjs` still refuses 584 findings across 103 non-fixture files:
  489 missing human comments, 86 missing contracts, and 9 missing contract
  intents.

Those two inventories remain beta-v1 blocking burn-down work. They were not
silenced or copied into the corpus baseline.

## Trust-boundary changes

- Positive sources run through `galerina check` and any error is terminal.
- Exact negatives run through `galerina check --strict-types`.
- A negative fixture may use one exact adjacent
  `<source>.expected.diagnostics.txt` file or one exact source header, never
  both.
- Missing, orphaned, duplicated, malformed, stale, or mismatched diagnostic
  ownership is terminal.
- `--update-baseline` may shrink the implicit baseline but cannot add an
  entry.
- The root `check` command now includes error-severity governance diagnostics
  in its exit decision. Before this correction, diagnostics such as
  `FUNGI-SUBSTRATE-001` could be printed as errors while the process returned
  success.
- The legacy core analyzer no longer injects an enabled binary target or the
  synthetic `LOProject` identity. Portable `.fungi` source cannot mint host
  target, driver, runtime, memory, secret, or environment authority.

## Original 29-file adjudication

### Repaired positive sources (22)

| Source | Disposition |
|---|---|
| `packages-galerina/galerina-core-logic/examples/compute-mix-throughput-benchmark.fungi` | Replaced unsupported benchmark/runtime declarations with portable request validation; no cross-runtime claim. |
| `packages-galerina/galerina-core-tasks/examples/tasks.fungi` | Recast as portable task-dependency decisions; host manifest owns execution. |
| `packages-galerina/galerina-core/examples/ai-context.fungi` | Repaired to current v1 syntax and contracts. |
| `packages-galerina/galerina-core/examples/boot.fungi` | Rebuilt as portable boot and hardware-admission policy; present hardware without an admitted driver and contract remains unusable. |
| `packages-galerina/galerina-core/examples/borrow-scope.fungi` | Replaced unsupported Rust-style borrow syntax with Galerina value semantics. |
| `packages-galerina/galerina-core/examples/browser-form.fungi` | Removed source-minted browser target/capability authority. |
| `packages-galerina/galerina-core/examples/compute-block.fungi` | Kept deterministic portable reference logic; admitted manifest owns target selection. |
| `packages-galerina/galerina-core/examples/compute-mix-throughput-benchmark.fungi` | Reduced to portable request validation; comparison waits for executable SLIDE. |
| `packages-galerina/galerina-core/examples/four-digit-guess-benchmark.fungi` | Reduced to portable request validation. |
| `packages-galerina/galerina-core/examples/move-cleanup.fungi` | Replaced unsupported ownership notation with value/capability semantics. |
| `packages-galerina/galerina-core/examples/parallel-api-calls.fungi` | Kept portable sequential logic; host manifest owns scheduling. |
| `packages-galerina/galerina-core/examples/payment-webhook.fungi` | Host manifest now owns route, secret, replay, body, and idempotency authority. |
| `packages-galerina/galerina-core/examples/reject-use-after-move.fungi` | Corrected the false Rust ownership claim; legacy filename retained as historical context. |
| `packages-galerina/galerina-core/examples/rollback.fungi` | Host transaction owns rollback; source returns a terminal `Result`. |
| `packages-galerina/galerina-core/examples/ternary-sim.fungi` | Repaired to exhaustive current match syntax. |
| `packages-galerina/galerina-core/examples/value-semantics-ownership.fungi` | Recast as factual Galerina value semantics. |
| `packages-galerina/galerina-core/examples/workers.fungi` | Recast as a portable event decision; queues remain host-manifest authority. |
| `packages-galerina/galerina-framework-app-kernel/examples/job.fungi` | Recast as a portable retry decision. |
| `packages-galerina/galerina-framework-app-kernel/examples/security-policy.fungi` | Repaired as deny-default method, port, file, and shell policy. |
| `packages-galerina/galerina-framework-app-kernel/tests/json-return.fungi` | Repaired to current `json.decode` and contract syntax. |
| `packages-galerina/galerina-framework-app-kernel/tests/vector-function.fungi` | Removed source-minted placement; host manifest owns vector target admission. |
| `packages-galerina/galerina-tools-benchmark/examples/benchmark.config.fungi` | Recast as bounded request validation; performance comparison remains deferred. |

### Converted to exact intentional negatives (7)

| Fixture | Exact diagnostics |
|---|---|
| `tests/owasp/owasp-a01-broken-access-control.fungi` | `FUNGI-STDLIB-002`, `FUNGI-TYPE-001`, `FUNGI-VALUESTATE-008` |
| `tests/owasp/owasp-a02-cryptographic-failures.fungi` | `FUNGI-SECRET-005`, `FUNGI-TYPE-001`, `FUNGI-VALUESTATE-008` |
| `tests/owasp/owasp-a04-insecure-design.fungi` | `FUNGI-STDLIB-002`, `FUNGI-TYPE-001`, `FUNGI-VALUESTATE-008` |
| `tests/owasp/owasp-a05-security-misconfiguration.fungi` | `FUNGI-STDLIB-002`, `FUNGI-TYPE-001`, `FUNGI-TYPE-002`, `FUNGI-VALUESTATE-006` |
| `tests/owasp/owasp-a09-security-logging.fungi` | `FUNGI-STDLIB-002`, `FUNGI-TYPE-001`, `FUNGI-TYPE-004`, `FUNGI-VALUESTATE-008` |
| `tests/syntax/policy-mutation.fungi` | `FUNGI-SYNTAX-011` |
| `tests/syntax/trap-governed-view.fungi` | `FUNGI-EFFECT-003` |

## Additional findings exposed by the stricter gate

Seven positive sources that were not in the old baseline also needed repair:

- `packages-galerina/galerina-core/examples/arithmetic-threshold-benchmark.fungi`
- `packages-galerina/galerina-core/examples/hello.fungi`
- `packages-galerina/galerina-core/examples/json-decode.fungi`
- `packages-galerina/galerina-framework-app-kernel/tests/decimal-sum.fungi`
- `packages-galerina/galerina-framework-app-kernel/tests/hello-world.fungi`
- `packages-galerina/galerina-framework-app-kernel/tests/sum.fungi`
- `tests/owasp/owasp-all-pass.fungi`

Five existing negative sources received exact adjacent sidecars:

- `examples/foundations/hardened-border-plugin.fungi`
- `tests/syntax/execution-dag.fungi`
- `tests/syntax/phase5-complete.fungi`
- `tests/syntax/policy-hierarchy-bad.fungi`
- `tests/syntax/step-keyword.fungi`

Together with the pre-existing exact-header gaming fixture, the live exact
negative count is 13.

## Verification evidence

Fresh Windows 10 evidence:

```text
audit-fungi-corpus-check:
  268 governed of 511 tracked .fungi
  13 exact negative fixtures
  0 implicit failures vs 0 baseline

audit-fungi-corpus-check --self-test:
  full Myco/git corpus agreement
  planted broken source detected
  clean control silent
  implicit baseline growth refused
  orphan sidecar refused
  stale sidecar refused
  positive-source diagnostics refused

fungi-corpus-ownership.test.mjs: 1/1
galerina-core: 42/42 prototype tests + 11/11 utility/lexer tests
galerina-core-compiler: 5,718/5,718
galerina-core-logic: 53/53
galerina-core-tasks: 7/7
galerina-framework-app-kernel: 120/120
galerina-tools-benchmark: 9/9
```

The Wasm/Rust/Python comparison is deliberately absent. It remains
non-evidential until SLIDE has an executable backend.
