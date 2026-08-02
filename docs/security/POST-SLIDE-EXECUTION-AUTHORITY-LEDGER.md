# Post-SLIDE execution-authority ledger

Status: schema v2 implemented; production receipt verifier not yet implemented

This ledger separates evidence that is useful for migration from evidence that
may authorize production execution. The separation is binding and fail closed.
A source being tracked, strict-clean, hash-pinned or executable in a reference
profile does not make it production-authorized.

## Schema-v2 lanes

`candidates` is a non-authorizing research and migration lane. Each entry binds
one tracked package `.fungi` source to its exact source digest, decision-graph
digest, bounded profile identity and tracked evidence digest. The retirement
gate re-reads regular non-symlink files, re-derives both file digests and checks
path containment, ownership, schema closure and duplicate identity. A valid
candidate remains counted among `unexecutedFungi`.

The ledger is limited to 1 MiB and must be exact canonical UTF-8 JSON. Duplicate
keys, alternative whitespace/key order, invalid UTF-8, symlinks and oversized
input refuse before semantic validation. Each candidate source and evidence
file is separately limited to 16 MiB before it is read.

`fungiSources` is reserved for production execution authority. It is closed in
the current implementation: any entry refuses because the typed cryptographic
execution-receipt verifier does not yet exist. Plain text, a self-hash, a
claimed Boolean, a passing source-only check or a reference VOK transcript
cannot populate this lane.

`hostBridges` is reserved for production ownership of native and OS boundaries.
It is also closed until a typed cryptographic ownership-receipt verifier exists.
The source-readiness check and the execution-authority gate are deliberately
different authorities; neither result may be relabelled as the other.

## Required production verifier

Before either production array can admit an entry, the verifier must bind and
independently re-derive at least:

- the canonical package identity, source path, source bytes and source digest;
- the complete checked frontend receipt and executable decision-graph digest;
- compiler, GIR, SLIDE/VOK contract, target and policy identities;
- exact instruction or object identity admitted for execution;
- affine lease consumption and the typed terminal execution receipt;
- host/platform evidence when the source crosses a native boundary;
- producer signature, delegation, role, validity interval and revocation state;
- repository commit/fixed-point provenance and receipt freshness.

Every field is closed and domain separated. Missing, surplus, stale, copied,
replayed, substituted, ambiguously encoded or independently unverifiable state
returns K3 `0` or `-1` and grants no handle. There is no Wasm, Node, cache,
driver or reference-interpreter fallback after refusal.

## Current measured state

The tracked ledger contains zero candidates, zero production sources and zero
production host bridges. The live post-SLIDE audit therefore remains red with
494 tracked package TypeScript paths, 109 unexecuted `.fungi` sources, 36
unowned host boundaries, 95 package-local `node_modules` trees and one nested
package identity. Those are debts, not exemptions.

Verification:

```powershell
npm.cmd run audit:retirement:selftest
node scripts/ts-retirement-graph.mjs --post-slide --check --json
```

The first command must pass its hostile fixtures. The second must remain
non-zero until every independently derived debt reaches zero.
