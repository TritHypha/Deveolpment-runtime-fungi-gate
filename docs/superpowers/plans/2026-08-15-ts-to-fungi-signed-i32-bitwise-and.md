# Signed-i32 binary AND converter plan

> Execute in place under the user's full-auto instruction. Do not stage, commit, push, or retire TypeScript.

## Preconditions

- [x] Preserve TypeScript as the whole-domain oracle.
- [x] Limit discovery/test selection to 10 examples.
- [x] Require duplicate and semantic-shadow checks for every candidate.
- [x] Enforce the 40-new-unique-`.fungi` commit gate and one-report cadence.
- [x] Physical evidence exists for `Int.bitAnd`; neighbouring `Int.bitOr` remains refused.

## Task 1: specify and test the closed source shape

- [x] Write and self-review the approved design.
- [x] Add positive classifier tests for one- and two-parameter signed-i32 `&` functions.
- [x] Add lowerer, fixed-vector, compiler, and physical-evidence tests.
- [x] Add refusal tests for all neighbouring bitwise operators and all existing widening paths.
- [x] Add forged-classification refusal tests.
- [x] Run the focused tests and record the expected RED before implementation.

## Task 2: implement minimal classification

- [x] Admit `AmpersandToken` only inside the existing signed-i32 subdomain.
- [x] Recursively prove both operands are number parameters, direct signed-i32 literals, or admitted nested `&` expressions.
- [x] Infer `number` for the admitted `&` expression.
- [x] Record `bitwiseProfile: signed-i32-bitwise-and` without changing authority flags.
- [x] Keep every other bitwise operator blocked.

## Task 3: implement exact lowering and vectors

- [x] Lower binary `&` to `Int.bitAnd`.
- [x] Evaluate differential vectors with JavaScript `&`.
- [x] Emit the exact operator-restriction comment.
- [x] Propagate the bitwise marker into the immutable lowering result.
- [x] Refuse missing or forged bitwise markers.

## Task 4: verify the block

- [x] Run focused RED-to-GREEN tests: 2 expected RED failures, then 3/3 GREEN.
- [x] Run adjacent converter tests: 8/8 GREEN.
- [x] Run the complete converter suite: 46/46 GREEN.
- [x] Run a discovery trial capped at 10. The stale-index trial selected 0; after an independently verified moderate re-index at exact HEAD, the fresh trial selected one real scope.
- [x] Convert only `galerina-core-compiler/src/fused-pass.ts#unpackFlags`; compiler, physical, mutation, receipt, strict-check, and exact-byte promotion evidence are GREEN while TypeScript remains unchanged.
- [x] Run duplicate and semantic-shadow checks on every pending `.fungi`: 4/4 unique.
- [x] Verify the worktree commit gate: correctly refused the batch below the 40 minimum.
- [x] Verify the last two commits' `.fungi` and report counts: 48/0 and 50/0, both unique.
- [x] Leave all files unstaged and unpushed.
