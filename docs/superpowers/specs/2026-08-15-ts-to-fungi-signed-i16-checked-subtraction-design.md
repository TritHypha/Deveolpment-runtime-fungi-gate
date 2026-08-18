# TypeScript-to-Fungi signed-i16 checked-subtraction design

## Status

Approved sandbox-only design under the user's small-block full-auto instruction. This does not release production authority, switch a consumer, or retire the TypeScript oracle.

## Goal

Admit one further physically supported source shape: a direct JavaScript binary subtraction whose numeric inputs and literals are confined to signed 16-bit integers. Lower it to the existing Fungi checked subtraction operation while preserving TypeScript as the whole-`number` oracle.

## Closed source shape

- The function has one or two required primitive parameters, at least one `number`, only `number | boolean` parameters, and a `number | boolean` result.
- Every `number` parameter is restricted to `[-32768, 32767]` for this candidate profile.
- A binary `-` expression is admitted only when it is the sole subtraction node and both operands are either:
  - a `number` parameter; or
  - a direct signed-i16 decimal, hexadecimal, octal, or binary literal.
- The direct result range is therefore `[-65535, 65535]`, inside signed i32. SLIDE checked subtraction cannot overflow on the admitted domain.
- Parentheses may group otherwise admitted operands or the direct subtraction.
- Nested subtraction, addition, multiplication, division, remainder, unary operators other than direct negative literals, calls, properties, mutation, ternaries, loops, async functions, optional/default/rest parameters, destructuring, Float literals, `-0`, out-of-i16 literals, and more than two parameters remain refused.
- Existing signed-i32 comparison/identity and binary-AND profiles remain unchanged. A function may not mix checked subtraction with binary AND in this block.

## Classification contract

An admitted subtraction function records:

- `numericDomain: "signed-i16-subdomain"`;
- `arithmeticProfile: "signed-i16-checked-subtraction"`;
- `operators` containing `"-"`;
- `wholeSourceDomainProved: false`;
- `productionAuthorityReleased: false`;
- `consumerSwitched: false`;
- `typescriptRetired: false`.

The lowerer must refuse a missing, altered, or inconsistent arithmetic marker.

## Lowering and differential oracle

- Lower `left - right` to source Fungi `left - right`; the independent SLIDE frontend must select its checked-subtraction registry.
- Emit an exact restriction comment explaining the signed-i16 input and signed-i32 result bounds.
- Differential evaluation uses JavaScript's actual `left - right` operation.
- Each signed-i16 numeric parameter uses `[-32768, -1, 0, 1, 32767]`; two numeric parameters produce 25 vectors.
- Compiler and physical evidence must be green, including the extrema `-65535` and `65535`.

## Evidence boundary

SLIDE exposes and selects a dedicated checked-subtraction physical profile. It exposes no logical unsigned-right-shift profile, so the three `fused-pass.ts` unpack helpers that require `>>>` remain blocked and must not be lowered with arithmetic shift.

## Publication and commit custody

- Keep each `.ts` source unchanged for comparison.
- Publish only real-package `.fungi` candidates that pass source/symbol identity, exact duplicate, alpha-shadow, compiler, physical, and mutation checks.
- Discovery remains limited to 10 examples per trial.
- Do not commit until the worktree contains at least 40 new unique `.fungi` files (expected 50), except for a separately approved final exception.
- A commit may contain at most one conversion report, and two consecutive report-bearing commits are a hard refusal.
