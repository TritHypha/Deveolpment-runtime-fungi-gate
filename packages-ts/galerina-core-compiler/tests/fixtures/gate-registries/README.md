# Component contracts for the shipped `.gate` examples

These registries let `tests/gate-v3-shipped-examples.test.mjs` check the five
circuits in `docs/examples/gate/` at the **resolution tier** — against a
component contract — and not merely at the parse-and-structure tier.

Until these existed, the shipped examples were verified for header, syntax and
topology only. Every rule the registry tier enforces — nominal type resolution,
exact wire typing, contract-declared decision arms, required-input coverage,
copyability, argument bounds — had never been run against the circuits an AI
author is told to imitate.

## Why one registry per circuit

`.gate` wire typing is **exact nominal equality**: no generics, no subtyping, no
implicit conversion (`src/gate-v3-resolve.ts`, `GATE-WIRE-101`). A component
contract therefore declares exactly one type per port.

The examples use shared components *polymorphically*. `galerina.privacy.cut`
redacts a customer record in 01, a ledger receipt in 02 and a patient record in
03; `galerina.tower.authorize` guards a `CustomerRef` in 01 and `Money` in 02.
One registry cannot give `cut.value` three output types, so a single shared
contract cannot serve all five circuits. A per-circuit contract is internally
consistent and keeps each example resolvable.

## Why these live under `tests/` and not beside the examples

`findGateRegistry` walks ancestor directories looking for `gate.registry.json`.
A registry placed in `docs/examples/gate/` would be picked up for **all five**
circuits, so four of them would be resolved against the wrong contract and
refused. Keeping the fixtures here means the test can pair each circuit with its
own contract explicitly.

## Coverage, and the two circuits without a contract

| circuit | contract | resolves |
|---|---|---|
| `01-authorized-read` | ✅ | clean |
| `02-write-transaction` | ✅ | clean |
| `03-phi-redaction` | ✅ | clean |
| `04-tenant-scoped-search` | ✅ (per-use variants) | clean |
| `05-token-verify` | ✅ (per-use variants) | clean |

**04 and 05 are contracted via GD-028 Option B (owner-ratified): per-use
registered variants.** Both circuits reuse one implementation at several
payload types within a single circuit, which exact nominal typing cannot
express through a single contract. Each use therefore registers its own
variant (`galerina.tower.authorize.records` / `.tenant` / `.egress`,
`galerina.privacy.cut.scope` / `.records` / `.token`, …) with concrete
types, all members of a family declaring `variantOf` and carrying the SAME
`implementationDigest` — a checked claim (`GATE-REGISTRY-016`), not
decoration. Variants are not a conversion side-channel: `GATE-WIRE-101`
refuses across them exactly as between unrelated types. The circuits name
their variants explicitly, which makes the three authorize roles visible in
the drawing — the teaching improved rather than survived.
