# Galerina Runtime TODO

V1 freeze rule: the runtime package should support CPU-compatible checked
execution, WASM handoff planning, explicit `Result`/`Option` handling,
Structured Await policy hooks and the memory-safety model before post-v1 target
runtime work.

```text
[x] Create /packages-galerina/galerina-core-runtime
[x] Add README.md
[x] Add TODO.md
[x] Add package metadata
[x] Add initial typed exports
[x] Define runtime execution context
[x] Define checked execution contract
[x] Define compiled execution contract
[x] Define runtime effect dispatch contract
[x] Define Structured Await scope and deterministic scheduler-reducer contract
[x] Define cancellation request/acknowledged-termination propagation contract
[x] Define timeout enforcement decision contract with deadline equality
[ ] Define stream backpressure runtime contract
[ ] Add isolated hard-termination adapter for untrusted/non-cooperative work
[ ] Authenticate task-event and termination receipts at the host boundary
[ ] Define runtime memory policy contract
[ ] Define Node-hosted runtime adapter contract
[ ] Define host-runtime overhead report contract
[ ] Define Securely Governed Runtime execution plan contract
[ ] Define verified fast path execution signature and invalidation contract
[ ] Define AI compute plan runtime hook contract
[x] Implement RD-0660 `.fungi` nine-gate VOK authority fold
[ ] Implement RD-0660 bounded unsafe-free native VOK handle table
[ ] Verify native VOK forged/stale/replay/context/capacity hostile corpus
[ ] Benchmark native VOK against null and simpler checked-map baselines
[ ] Add verified OS CSPRNG and opaque VM-resource adapters after table evidence
[ ] Add owned-byte W^X VEO execution only after the preceding gates pass
[x] Define runtime error format
[ ] Define target fallback runtime contract
[ ] Define runtime resource budget contract for CPU, wall time, memory, recursion, loops, tasks, network, tools and accelerator work
[ ] Define malicious-data intake pipeline contract for size, depth, schema, canonicalisation, ownership and taint checks
[x] Define runtime report format
[x] Add examples
[x] Add tests
```
