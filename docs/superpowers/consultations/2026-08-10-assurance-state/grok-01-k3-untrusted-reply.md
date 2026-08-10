# Grok reply: K3 state for unvalidated data

Status: completed independently; normalized from CLI stdout

## Ruling

Merely unvalidated `unsafe` data maps to K3 `0`, not K3 `-1`.

`unsafe` means memory-safe but not yet security-validated. That is epistemic
incompleteness: proof of allow has not been established, and neither has
negative evidence. Under the supplied K3 meanings, that is unknown or not
established (`0`).

K3 `-1` is for deny or established negative evidence. Mapping “we have not
validated yet” onto “we have established a deny” collapses two different states
and corrupts later proof, audit and policy.

Zero trust still fails closed on action: do not treat the value as authorized
until something independent establishes `+1`. Fail-closed is a control rule on
use, not a license to rewrite “unvalidated” as “proven bad.”

## Counterexample to the rejected mapping

Boundary bytes arrive as `unsafe` and are stored as K3 `-1`. An independent
validator later proves the same content admissible and would emit `+1`.

If the prior state was truly established negative evidence, that success must
either overturn a recorded deny, treating a non-finding as negative evidence
and then erasing it, or leave the value permanently denied despite positive
proof. Both are wrong. The correct pre-validation state is `0`: no allow proof
yet, no negative evidence yet. Validation may then move `0 -> +1` when proof is
established or `0 -> -1` when negative evidence is established.
