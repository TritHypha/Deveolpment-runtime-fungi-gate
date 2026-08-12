# Tower collapse Fungi conversion design

## Objective

Give Tower-Citizen's exported `collapse` K3 trust-boundary decision an exact
package-owned `.fungi` counterpart and prove it through physical SLIDE/VOK.
Keep the TypeScript function and every caller active.

## Closed semantics

The input is the closed `Verdict` domain `Deny | Unknown | Allow`. Exact
`Allow (+1)` returns `"allow"`; `Unknown (0)` and `Deny (-1)` both return
`"deny"`. There is no truthiness, numeric coercion, fallback, or default
authorization.

## Source shape

Extend the existing package-owned authorization boundary with one pure flow
that accepts `Verdict`, uses exhaustive `check`, and returns `String`. The
source contains no `null`, `NaN`, `else if`, `throw`, `try`/`catch`, `for`,
`while`, or `loop`.

## Proof shape

1. Add a failing package differential test for the complete K3 collapse table.
2. Add the typed flow without changing the TypeScript reference.
3. Compile and publish one physical `.slide` without widening SLIDE's opcode
   or registry surface.
4. Independently re-admit through VOK and verify typed String receipts.
5. Refuse non-Verdict values, wrong arity/type, source mutation, and physical
   artifact mutation.

## Authority boundary

This is reference-only evidence. It does not switch a consumer, retire
TypeScript, release production authority, or alter Tower-Citizen's K3
calculus. Unknown remains a hard deny at the binary trust boundary.
