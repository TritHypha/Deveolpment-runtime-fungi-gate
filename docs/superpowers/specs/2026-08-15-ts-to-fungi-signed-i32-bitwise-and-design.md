# TypeScript-to-Fungi signed-i32 binary AND design

## Status

Approved sandbox-only design. This does not release production authority, switch a consumer, or retire the TypeScript oracle.

## Goal

Extend the sandbox converter's existing signed-i32 subdomain with one exact operator: JavaScript binary `&`. The converter may lower that operator to Fungi `Int.bitAnd` only when every operand is already confined to the admitted signed-i32 subdomain.

## Closed source shape

- The function must already satisfy the signed-i32 subdomain contract: one or two required primitive parameters, at least one `number`, only `number | boolean` parameters, and a `number | boolean` result.
- A binary `&` expression is admitted only when both operands are recursively one of:
  - a `number` parameter;
  - a direct signed-i32 decimal, hexadecimal, octal, or binary literal accepted by the existing signed-i32 literal grammar; or
  - another admitted binary `&` expression.
- Parentheses may group an otherwise admitted expression.
- JavaScript `&` applies `ToInt32`; exactness is established here only because the input values and direct literals are already signed i32. The full JavaScript `number` domain remains outside the candidate.
- `|`, `^`, `~`, `<<`, `>>`, `>>>`, arithmetic, calls, property access, mutation, ternaries, loops, async functions, optional/default/rest parameters, destructuring, Float literals, `-0`, and out-of-range integers remain refused.

## Classification contract

An admitted function records:

- `numericDomain: "signed-i32-subdomain"`;
- `bitwiseProfile: "signed-i32-bitwise-and"` when `&` is present;
- `operators` containing `"&"`;
- `wholeSourceDomainProved: false`;
- `productionAuthorityReleased: false`;
- `consumerSwitched: false`;
- `typescriptRetired: false`.

The lowerer must reject a forged classification with a missing or altered numeric/bitwise marker.

## Lowering and differential oracle

- Lower `left & right` to `Int.bitAnd(left, right)`. Raw `&` must not appear in emitted executable Fungi.
- Emit the existing signed-i32 restriction comment plus:
  `/// Operator contract: JavaScript signed-i32 binary & lowered to Int.bitAnd; no other bitwise operators admitted.`
- Differential evaluation uses JavaScript's actual `left & right` operation.
- Each numeric parameter uses the fixed domain `[-2147483648, -1, 0, 1, 2147483647]`; two numeric parameters therefore produce 25 vectors, within the existing bound.
- Compiler and physical evidence must be green for the emitted candidate. Source digest, mutation/refusal evidence, and TypeScript provenance remain mandatory.

## Evidence boundary

The repository already contains checker-clean and physically exercised `Int.bitAnd` use. A probe for `Int.bitOr` was physically refused, so this design deliberately admits no neighbouring bitwise operator. Any later operator requires a separate approved block and fresh physical evidence.

## Publication and commit custody

- Keep the `.ts` source unchanged for comparison.
- Publish only real-package `.fungi` candidates that pass source/symbol identity, duplicate, semantic-shadow, compiler, physical, and mutation checks.
- Discovery remains limited to 10 examples per trial.
- Do not commit until the worktree contains at least 40 new unique `.fungi` files (expected 50), except for a separately approved final exception.
- A commit may contain at most one conversion report, and two consecutive report-bearing commits are a hard refusal.
