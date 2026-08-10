# Grok reply: component certificate or exact-subject receipt

Status: completed independently; normalized from CLI stdout

## Ruling

Prefer an independent authority's narrow exact-subject assurance receipt. Do
not give an internal zero-trust component a reusable self-declared `safe`
certificate.

The component may present inputs only: digest identity, typed Hallmarks,
analyzer outputs and evidence artifacts. An independent admission authority
derives a narrow receipt for the exact component digest, policy, target,
evidence, affine lease and terminal result. The receipt is not a standing
property of the component. Hallmarks and analyzer results may justify
derivation, but must not be the admission decision.

A reusable self-declared certificate fails because self-declaration makes the
component an authority about itself, reusability permits transplant or replay,
and component carriage confuses a payload with authority.

## Primary anti-forgery rule

No assurance is admissible unless an independent authority binds it to the
exact admission subject. Any change of digest, policy, target, evidence, lease
or terminal receipt invalidates it, and no component-carried or self-declared
claim substitutes for that binding.
