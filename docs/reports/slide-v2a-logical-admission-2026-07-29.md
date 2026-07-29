# SLIDE V2-A logical admission checkpoint

**Date:** 2026-07-29
**Scope:** frontend-neutral executable-GIR v2 logical records and semantic
admission only
**Claim boundary:** no canonical V2 bytes, semantic digest, executor, native
artifact, container, or production replacement is claimed here.

## Implemented

- `slide-v2a-logical-model.fungi` materializes the frozen V2-A registry slice:
  two typed functions, one direct pure call, a Boolean split, explicit
  block-parameter join, checked `Int32` addition, exhaustive K3 exit, typed
  failures, and typed `Result`.
- `slide-v2a-validator.fungi` validates the frontend-neutral logical graph
  without source, AST, WAT, Wasm, or an ambient registry.
- The validator requires the exact v2 profile/registry/memory identities,
  ceilings, dense function/block/value identities, same-block SSA visibility,
  forward-only CFG, typed block arguments, registered instruction and
  terminator shapes, lower-ID direct calls, declared failures, zero
  effects/capabilities/memory objects, and the bound three-successor K3
  obligation.
- Every decision is terminal: only `Verdict.Allow` produces `VALIDATED`;
  malformed, unknown, unauthorized, or inconsistent input returns a stable
  refusal identity.

## Mutation evidence

The focused V2-A suite is 14/14. It refuses:

1. semantic-profile drift;
2. authority-ceiling drift;
3. an unknown opcode;
4. a non-dominating SSA operand;
5. a recursive call;
6. a backward edge;
7. block-argument count drift;
8. requested-capability injection;
9. memory-object injection; and
10. K3-obligation drift.

Frozen R1 remains byte- and behavior-invariant: its focused suite is 27/27.
The complete compiler suite is 5,311/5,311.

Repository evidence after regeneration:

- project graph: 7,197 nodes / 7,461 edges;
- graph integrity: zero violations;
- Knowledge Base graph: zero orphans / zero broken links;
- Hardened Border: 97/97;
- explicitly selected Galerina memory graph: clean;
- dev-tool index: 97 packages / 124 tools / 40 proofs.

## Galerina replacement meaning

This checkpoint proves the proposed detached semantic *shape*, not a switched
runtime. It is the first implementation that can eventually replace:

- summary-only GIR plus post-GIR AST recovery;
- WAT as Galerina's compulsory execution bridge; and
- backend-specific authority interpretation.

Nothing is removed yet. The current Galerina interpreter and Wasm paths remain
the implemented baseline and differential oracle. Removal from the mandatory
path requires, in order:

1. canonical V2 encoding and independent decoding;
2. domain-separated digest binding;
3. instruction-driven V2 execution;
4. memory, budget, effect, and capability admission;
5. a second non-Galerina producer;
6. target-neutral executor integration;
7. native final-artifact and isolation proof; and
8. explicit migration approval recorded in the integration ledger.

There is no fallback from a failed SLIDE admission to R1, WAT/Wasm, the tree
walker, cached output, or a locally present driver.
