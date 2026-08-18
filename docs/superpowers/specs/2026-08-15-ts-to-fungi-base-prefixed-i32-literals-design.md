# TypeScript-to-Fungi base-prefixed i32 literal design

Status: owner-directed sandbox design

Authority released: no

## Goal

Extend the bounded TypeScript-to-Fungi sandbox converter to recognize direct
binary, octal, and hexadecimal integer literals whose exact JavaScript value is
inside the already-proved signed-i32 physical profile. Keep every TypeScript
source unchanged and create only non-authorizing real-package `.fungi`
candidates that pass compiler, physical SLIDE/VOK, and duplication/shadow
checks.

## Selected approach

Admit only an immutable top-level `const` or explicit `const enum` member whose
initializer is one direct base-prefixed integer literal, optionally preceded by
one minus token. Accepted source spellings are:

```text
-?0[xX][0-9a-fA-F]+
-?0[oO][0-7]+
-?0[bB][01]+
```

The classifier captures the initializer lexeme from the parsed source once,
converts it with the pinned ECMAScript numeric-literal rule, and requires a
safe integer in `[-2147483648, 2147483647]` that is not negative zero. The
lowerer emits the exact value as one canonical decimal `Int` return. The source
radix is provenance only; it is not reproduced as invented Fungi syntax.

## Refusal boundary

The converter refuses numeric separators, leading plus, legacy octal, decimal
Float or exponent notation, BigInt suffixes, unary operators other than one
minus, aliases, property reads, calls, arithmetic, shifts, bitwise expressions,
conditional expressions, mutable bindings, non-const runtime enums, unsafe
integers, unsigned values above signed-i32, and every malformed token.

No general constant evaluator is added. JavaScript ToInt32, coercion, overflow,
evaluation order, getters, proxies, and host effects remain outside this block.

## Data flow and evidence

1. The existing graph/source identity layer captures the exact tracked
   TypeScript bytes and symbol.
2. The classifier returns the existing admitted primitive-number record only
   for the exact direct-literal subset.
3. The existing lowerer emits a zero-parameter pure `Int` flow with the decimal
   value and retains the TypeScript oracle comment.
4. Existing compiler evidence checks syntax, types, effects, governance, and
   deterministic GIR.
5. Existing physical evidence publishes, independently re-admits, executes,
   mutation-tests, and VOK-verifies the signed-i32 result without releasing
   authority.
6. Every candidate is rejected on byte duplicate, normalized duplicate,
   identifier-alpha shadow, or sibling shadow before publication.

## Tests

Positive fixtures cover lower- and upper-case binary, octal, and hexadecimal
spellings, zero, signed values, and exact i32 boundaries. Negative fixtures
cover separators, plus, legacy octal, BigInt, Float/exponent, aliases,
expressions, negative zero, `2^31`, values below `-2^31`, unsafe integers, and
runtime enums.

After unit and full converter tests pass, the converter runs a bounded discovery
of at most ten real-package candidates. A batch remains uncommitted unless the
worktree contains at least 40 new unique `.fungi` files; 50 remains the expected
commit size. TypeScript is retained, at most one report may enter a commit, and
two consecutive report-bearing commits remain a hard refusal.

## Non-claims

This design grants no general JavaScript Number, unsigned-i32, BigInt,
arithmetic, bitwise, enum-object, production-authority, consumer-switch,
TypeScript-retirement, or terminal conversion claim.
