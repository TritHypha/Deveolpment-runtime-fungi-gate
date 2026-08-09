# Contract 86 VOK Authority SLIDE Candidate Plan

**Goal:** Produce and exhaustively verify a source-free physical `.slide`
candidate for `@galerina/core-runtime:vokAuthorityVerdict`.

**Architecture:** Extend only the bounded checked-Fungi package path required
by the existing three-flow pure-call closure. Build through the pinned SLIDE
tool manifest, publish receipt-last, execute through affine VOK handles and
independently verify every typed receipt.

## Constraints

- Verify, do not assume; every unsupported or ambiguous state refuses.
- Preserve the governed `.fungi` source as the single semantic authority.
- No Wasm, TypeScript or handwritten decision fallback.
- No production, signing, durability or retirement claim.
- Run resource-heavy evidence sequentially and never push.

## Task 1: RED source-manifest candidate

- [ ] Add a Contract 86 integration test that requires the exact source,
  source manifest and committed source-free publication.
- [ ] Require exact package/export/type identity and physical execution.
- [ ] Run RED and record the first missing capability rather than guessing.

## Task 2: Minimal checked-Fungi closure support

- [ ] If necessary, add the smallest parser/lowering/runtime support for the
  reachable internal pure-call closure.
- [ ] Refuse missing, ambiguous, recursive, effectful or out-of-closure calls.
- [ ] Add mutation and detector controls before accepting the extension.

## Task 3: Publication and exhaustive parity

- [ ] Write the exact source manifest through a reviewed canonical file.
- [ ] Build the receipt-bound publication with the pinned 89-file tool closure.
- [ ] Verify rebuild equality and one-byte physical-object mutation refusal.
- [ ] Execute all 19,683 K3 vectors; require one authorizing vector, exact
  numeric-min parity, verified typed receipts and no fallback.

## Task 4: Closure

- [ ] Run focused Galerina and SLIDE tests sequentially.
- [ ] Regenerate and check graphs, indexes, root lock and Golden Pack through
  owning tools.
- [ ] Update both TODOs, the current roadmap and a factual completion report.
- [ ] Commit locally, re-index both repositories and verify exact indexed HEAD.
