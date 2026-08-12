# Governance floor normalisation Fungi conversion design

## Objective

Give the compiler's exported `normaliseFloor` governance decision an exact
package-owned `.fungi` counterpart and prove it through physical SLIDE/VOK.
Keep TypeScript and every caller active.

## Security precondition

The former TypeScript helper indexed a prototype-bearing object directly.
Prototype names such as `constructor`, `toString` and `__proto__` therefore
escaped the declared String result. The real governance-verifier caller first
checks `KNOWN_FLOORS`, but the exported helper itself remained unsafe. A
test-first repair now admits only own entries and preserves all other Strings.
The Fungi translation binds to that repaired source.

## Closed semantics

Exactly five aliases are mapped:

- `execution` to `floor_1`
- `containment` to `floor_2`
- `proof` to `floor_3`
- `proof_zone` to `floor_3`
- `attestation` to `floor_4`

Every other String is returned byte-for-byte unchanged. There is no trimming,
case folding, Unicode normalization, wildcarding or prototype lookup.

## Source and proof shape

The pure Fungi flow accepts and returns `String`, uses exhaustive `match` with
a terminal `_ =>`, and contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop`. Differential evidence covers every
alias plus canonical, hostile, Unicode, embedded-NUL and prototype-property
names. Public-caller evidence verifies the exact `dag_check` obligation emitted
for every accepted short floor name. Physical evidence publishes a `.slide`,
independently re-admits it through VOK, verifies typed String receipts and
refuses malformed arguments, work exhaustion, source mutation and artifact
mutation.

## Authority boundary

This remains reference-only. It does not switch `verifyGovernedFlows`, the
compiler, CLI, security gates or any production consumer; it grants no release
or TypeScript-retirement authority.
