# Residency tighten Fungi conversion design

## Outcome

Extend the package-owned residency lattice module with
`stricterResidencyFungi(a: String, b: String) -> String`, an executable Fungi
twin for the exported TypeScript `stricterResidency` combinator. Keep the
TypeScript implementation and all consumers active.

## Semantic contract

The five canonical tiers retain their exact ranks: `register_only=0`,
`no_dram_spill=1`, `no_swap=2`, `no_disk=3`, and `unrestricted=4`. For two
canonical tiers the flow returns `a` when `rank(a) <= rank(b)` and otherwise
returns `b`, including the left-biased equal case.

TypeScript's declared input domain is the closed `ResidencyTier` union. At a
runtime String boundary, an unknown value must not be reflected into a typed
residency result or interpreted as a looser ceiling. If either input maps to
the existing sentinel rank `5`, the Fungi boundary returns the strictest
canonical value, `register_only`. This is a deliberate fail-closed extension
outside the TypeScript type domain.

## Shape and authority

Reuse the already governed `residencyRank` helper in
`residency-strictness.fungi`. The public flow has one combined sentinel guard,
one admitted rank comparison, and terminal returns. It adds no null, NaN,
`else if`, `else`, exception or loop construct.

Differential evidence covers the complete canonical matrix and left-bias.
Hostile Strings prove the stricter fail-closed boundary independently. A
physical SLIDE/VOK test must compile the exact source, pin the derived registry
identity and digest, publish and re-admit a package, verify typed String
receipts, and exercise mutation and resource refusals. No consumer switch,
retirement, production, release or runtime-residency authority follows.
