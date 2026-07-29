# SLIDE V2-A validated reference runtime

**Date:** 2026-07-29

`slide-v2a-runtime.fungi` now executes only the independently decoded and
semantically admitted V2-A graph. It has no source, AST, producer, encoder,
WAT, Wasm, host effect, capability, memory object, ambient registry, or
fallback input.

Implemented behavior:

- fixed 48-slot no-address value store with explicit initialization state;
- instruction dispatch for parameters, constants, comparison, checked Int32
  addition, and direct pure call;
- exact edge-to-block-parameter binding;
- Boolean branch, typed join, and exhaustive three-successor K3 dispatch;
- typed success, policy-denied, policy-unresolved, arithmetic-failure, and
  invocation-refused exits;
- checked addition preconditions that avoid triggering host overflow before
  the V2 failure can be returned;
- invalid fourth Verdict, out-of-range Int32, malformed bytes, unsupported
  runtime shape, and exhausted/mismatched control state terminate without a
  legacy executor.

Focused evidence:

- positive and negative Boolean branches;
- direct callee and join results;
- ALLOW, DENY, and INDETERMINATE exits;
- callee overflow and join overflow;
- invalid fourth Verdict; and
- malformed canonical bytes.

V2-A is 27/27 and frozen R1 remains 27/27.

Full compiler evidence is 5,324/5,324. Regenerated project graph: 7,231 nodes /
7,491 edges, zero integrity violations; KB zero orphans/broken links; Hardened
Border 97/97; explicit memory graph clean; dev-tool index 97 packages /
124 tools / 40 proofs.

This completes the first detached V2-A semantic execution slice. It is a
bounded reference runtime, not a native runner or production replacement.
Wasm and the current Galerina runtimes remain in place. The next executable-GIR
increments must add explicit budget semantics and then versioned memory,
effect, and capability records; each remains deny-by-default.
