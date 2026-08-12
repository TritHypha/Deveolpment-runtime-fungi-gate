# Tensor element-type compatibility Fungi conversion design

## Decision

Translate the exported `tensorElementTypesCompatible(expected, actual)` helper
as one package-owned pure Fungi flow. Preserve the exact TypeScript rule:
compatibility is true exactly when the two Strings are equal after the runtime's
canonical trim operation.

## Boundary

- Keep `type-registry.ts`, the helper, `type-checker.ts` and every consumer
  active.
- Do not normalize case, Unicode, aliases or tensor precision.
- Do not add a new SLIDE registry. Pin the existing immutable-text-trim registry
  and its exact digest.
- Treat malformed arguments, non-canonical UTF-16, insufficient work and any
  source or artifact mutation as refusal at the physical boundary.
- Grant no consumer-switch, signing, production or retirement authority.

## Proof shape

1. Drive the real TypeScript helper across canonical, whitespace, case,
   normalization, prototype-name and embedded-NUL vectors.
2. Require typed Fungi interpreter parity for every vector.
3. Keep the real type-checker diagnostic path in the focused neighborhood:
   mismatched tensor elements emit `FUNGI-TYPE-030`; identical elements do not.
4. Compile the exact Fungi bytes with independent SLIDE, publish one physical
   `.slide`, independently re-admit it through VOK, and verify typed Bool
   receipts plus negative mutation and budget cases.

## Fungi restrictions

The new source contains no null, NaN, `else if`, `else`, `throw`, `try`/`catch`,
`for`, `while`, or `loop`. It uses one Bool `if` decision followed by an explicit
false exit because checked-Fungi equality lowers through a branch, not as an
ambient Boolean-return shortcut.
