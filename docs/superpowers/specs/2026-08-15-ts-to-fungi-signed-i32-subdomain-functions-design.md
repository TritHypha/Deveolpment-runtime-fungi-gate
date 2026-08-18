# TypeScript-to-Fungi signed-i32 subdomain function design

Status: owner-approved sandbox design

Authority released: no

## Goal

Extend the bounded TypeScript-to-Fungi sandbox converter to create real-package,
non-authorizing Fungi kernels for a strict subset of TypeScript functions whose
`number` parameters are interpreted only over the signed-i32 subdomain. Keep
the original TypeScript unchanged and retain it as the whole-JavaScript-Number
oracle.

The generated kernel is not a complete replacement for the TypeScript
function. It represents only the behavior obtained after an external border
has independently admitted every numeric argument as an exact signed-i32
value.

## Admitted function family

A function is eligible only when all of these conditions hold:

- It is a synchronous function declaration or immutable top-level arrow
  function already admitted by the sandbox identity rules.
- It has one or two required parameters and at least one parameter is declared
  exactly as TypeScript `number`.
- Every parameter is declared exactly as `number` or `boolean`.
- A numeric parameter is represented as Fungi `Int` and carries the explicit
  classifier domain `signed-i32-subdomain`.
- The body uses only the converter's existing total return/branch structure,
  direct primitive literals, identifiers, parentheses, Boolean negation,
  strict equality/inequality, numeric ordering comparisons, and Boolean
  conjunction/disjunction.
- Every direct integer literal is inside the independently proved signed-i32
  physical profile and is not negative zero.
- The return type is exactly `number` or `boolean`, and every possible numeric
  result is a numeric parameter or a direct signed-i32 literal.

One or two total parameters keep the differential Cartesian product bounded at
no more than 25 vectors. Functions with three or more parameters are refused in
this block even when their source body would otherwise qualify.

## Explicit non-parity boundary

The TypeScript declaration accepts the full JavaScript binary64 `number`
domain. The Fungi kernel accepts only signed-i32 `Int`. The converter must not
describe this as whole-function conversion, source parity, replacement,
retirement, or consumer authority.

Each admitted classification records:

```text
numericDomain: signed-i32-subdomain
wholeSourceDomainProved: false
productionAuthorityReleased: false
consumerSwitched: false
typescriptRetired: false
```

Each generated Fungi source contains a fixed comment stating that an external,
independently proved signed-i32 border is required and that TypeScript remains
the whole-domain oracle. Receipts bind the same limitation and verification
must refuse its removal or alteration.

## Refusal boundary

The block refuses:

- optional, default, rest, destructured, `any`, `unknown`, union, branded,
  generic, String, object, array, callback, and three-or-more parameters;
- Float literals, exponent notation, negative zero, non-finite values, unsafe
  integers, or values outside signed-i32;
- arithmetic, modulo, bitwise operations, shifts, unsigned shifts, increment,
  decrement, assignment, coercive equality, ternaries, switch, loops, calls,
  constructors, property reads, indexing, templates, spreads, casts that change
  the runtime domain, exceptions, async, generators, mutation, host APIs, or
  captured mutable state;
- `Number.isInteger`, `Math.*`, ToInt32/ToUint32 assumptions, and any host
  precomputed `safe` Boolean;
- any function whose Fungi source, compiler evidence, physical artifact,
  differential vectors, or restriction marker cannot be reproduced exactly.

Unknown or newly encountered syntax remains a typed refusal and is logged by
the converter's existing cannot-convert path.

## Lowering and evidence

The existing lowerer maps admitted `number` parameters to Fungi `Int` only when
the classification carries the exact `signed-i32-subdomain` marker. A forged or
marker-free classification remains inadmissible through the existing private
classification custody check.

For each numeric input, the initial differential domain is exactly:

```text
[-2147483648, -1, 0, 1, 2147483647]
```

Boolean inputs use `[false, true]`. The converter evaluates the original
TypeScript AST over every Cartesian vector, runs the emitted Fungi through the
compiler, publishes and independently re-admits the physical SLIDE artifact,
executes the same vectors, mutation-tests source/artifact/receipt identity, and
requires VOK agreement. These vectors are discriminating regression evidence;
they are not claimed as an exhaustive proof of JavaScript binary64 behavior.

Before publication, every candidate must pass byte duplicate, normalized
duplicate, identifier-alpha shadow, and sibling-shadow checks against tracked
and untracked Fungi. The original `.ts` digest is checked before and after the
run.

## Tests

Positive unit fixtures cover:

- one numeric parameter returned directly;
- two numeric parameters compared with each strict comparison operator;
- numeric comparisons combined with Boolean input and total `if` returns;
- signed-i32 boundary literals and negative literals;
- exact classifier and generated-source domain markers;
- the full five-value numeric vector set and a 25-vector two-number product.

Negative fixtures cover every refused parameter and syntax class above,
including Float, NaN, infinity, negative zero, three parameters, arithmetic,
bitwise, shifts, calls, property access, mutation, async, optional/default/rest,
String, and forged/missing domain markers.

After focused and full converter tests pass, discovery is capped at ten
real-package candidates. TypeScript remains unchanged. A batch is not staged or
committed unless at least 40 new unique `.fungi` files exist; 50 remains the
expected size. At most one report may enter a commit, and two consecutive
report-bearing commits remain a hard refusal. No push is authorized.

## Non-claims

This design grants no whole-JavaScript-Number parity, Float profile, ToInt32 or
ToUint32 parity, general arithmetic, bitwise or shift support, caller border,
production authority, consumer switch, TypeScript retirement, or terminal
conversion claim.
