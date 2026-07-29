# CTLL R1 Preflight Evidence

- **Date:** 2026-07-29
- **Scope:** first-fixture export-shape policy only
- **Implementation:** `packages-galerina/galerina-core-compiler/src/self-hosted/ctll-r1-preflight.fungi`
- **Test:** `packages-galerina/galerina-core-compiler/tests/ctll-r1-preflight.test.mjs`
- **Result:** 20/20 focused tests pass

## What now exists

The `.fungi` flow `preflightCTLLR1` checks the exact proposed
`ctll_k3_checked_add_v1` fact set. It uses total `match` statements rather than
repeated `if` chains. Every mismatch returns `Verdict.Deny`, `REFUSED`, and one
ordered failure identity:

| Identity | Refusal |
|---|---|
| `CTLL-R1-EXPORT-001` | fixture identity outside the frozen slice |
| `CTLL-R1-EXPORT-002` | qualifier is not `pure` |
| `CTLL-R1-EXPORT-003` | parameter count is not three |
| `CTLL-R1-EXPORT-004` | left parameter is not `Int32` |
| `CTLL-R1-EXPORT-005` | right parameter is not `Int32` |
| `CTLL-R1-EXPORT-006` | admission parameter is not `Verdict` |
| `CTLL-R1-EXPORT-007` | result type is not the closed fixture result |
| `CTLL-R1-EXPORT-008` | K3 control is not exhaustive |
| `CTLL-R1-EXPORT-009` | checked `Int32` arithmetic is absent |
| `CTLL-R1-EXPORT-010` | terminal control flow is incomplete |
| `CTLL-R1-EXPORT-011` | executable body is incomplete or missing |
| `CTLL-R1-EXPORT-012` | execution still depends on the source AST |
| `CTLL-R1-EXPORT-013` | effects are present in the effect-free R1 slice |
| `CTLL-R1-EXPORT-014` | host handles enter the no-address value profile |
| `CTLL-R1-EXPORT-015` | declared failure set is not the required closed set |

The test parses and type-checks the `.fungi` source before execution, proves
the exact supported case, mutates every field independently, deletes critical
facts, injects a malformed non-Boolean K3 fact, and proves deterministic
first-failure ordering. Missing body evidence refuses as
`CTLL-R1-EXPORT-011`; it is never assumed.

## Authority boundary

This kernel is not CTLL admission authority. Today its request is constructed
by the test harness, so its Boolean and identity fields are assertions supplied
by a caller. `Verdict.Allow` means only “this supplied shape matches the
bounded export profile.”

Before an exporter can rely on the result, a compiler-owned adapter must:

1. derive every fact from authoritative checked compiler structures;
2. refuse malformed, missing, duplicated, contradictory, or unsupported
   structures;
3. materialize the complete executable body without an AST lookup;
4. bind the preflight result to the exact canonical semantic bytes;
5. keep the existing WAT identity/default/walker paths outside the CTLL path.

The `CTLL-R1-EXPORT-*` names are stable within this preflight contract. They
are not numeric executable failure-registry entries and do not freeze the
independent TLL registry.

## Verification

```text
node galerina.mjs check \
  packages-galerina/galerina-core-compiler/src/self-hosted/ctll-r1-preflight.fungi \
  --strict-types
  PASS: 0 errors, 0 governance warnings

node --test \
  packages-galerina/galerina-core-compiler/tests/ctll-r1-preflight.test.mjs
  PASS: 20 tests

npm.cmd test
  (from packages-galerina/galerina-core-compiler)
  PASS: typecheck, build, 5,225 tests

node scripts/graph-all.mjs
  PASS: project graph 7,046 nodes / 7,313 edges
  PASS: graph integrity 0 violations
  PASS: Knowledge Base graph 0 orphans / 0 broken links
  PASS: package border 97 / 0
  REFUSED: memory graph had four candidates and no explicit MEMORY_DIR
```

The memory-graph refusal is fail-closed and unrelated to this implementation;
no candidate directory was guessed.

## Not implemented

- canonical executable-GIR body export;
- deterministic CBOR encoding;
- bounded decoder/importer and validator;
- fresh-process reference interpreter;
- serialized malformed/non-canonical mutation artifacts;
- frontend receipt or independent re-derivation;
- CTLL object generation, packaging, admission, or execution.

No benchmark, memory-safety, determinism, or production-readiness claim follows
from this preflight.
