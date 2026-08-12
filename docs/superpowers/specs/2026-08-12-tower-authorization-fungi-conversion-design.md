# Tower authorization Fungi conversion design

## Objective

Give Tower-Citizen's exported `authorize` K3 trust-boundary decision an exact
package-owned `.fungi` counterpart and prove it through physical SLIDE/VOK.
Keep the TypeScript function and its callers active.

## Closed semantics

The input is the closed `Verdict` domain `Deny | Unknown | Allow`. Only exact
`Allow (+1)` returns `true`. `Unknown (0)` and `Deny (-1)` return `false`.
There is no truthiness, numeric coercion, fallback, or default authorization.

## Source shape

The `.fungi` flow accepts one typed `Verdict`, uses exhaustive `check`, and
returns `Bool`. It contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop`.

## Proof shape

1. Bind the package manifest to the new source asset.
2. Compare the interpreter with exported TypeScript `authorize` over all three
   K3 values.
3. Compile and publish one physical `.slide` without adding a SLIDE opcode or
   widening a registry.
4. Independently re-admit through VOK and verify typed Bool receipts.
5. Refuse non-Verdict values, wrong arity/type, source mutation, and physical
   artifact mutation.

## Authority boundary

This is reference-only evidence. It does not switch a consumer, retire
TypeScript, release production authority, or alter Tower-Citizen's K3 calculus.
