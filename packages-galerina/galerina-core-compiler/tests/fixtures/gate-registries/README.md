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
| `04-tenant-scoped-search` | ❌ none | see below |
| `05-token-verify` | ❌ none | see below |

**04 and 05 cannot be contracted at all under the current type system**, and the
reason is worth stating precisely because it is a language-design limit rather
than an oversight: both reuse one component id *several times within a single
circuit*, carrying different payload types at each use.

- **04** instantiates `galerina.tower.authorize` three times (`authz`, `tenant`,
  `egress`) and `galerina.privacy.cut` twice (`scope`, `safe`). Pinning
  `cut.value` to satisfy `scope` forces
  `pages.value:CallerId -> safe.value:TenantId` to mismatch, and pinning its
  output to satisfy `tenant.subject` forces
  `safe.value:CallerId -> OUT.value:RecordPage` to mismatch.
- **05** instantiates `authorize` twice (`state`, `reemit`), where
  `state.deny -> reemit.subject` demands that one contract's `subject` be both a
  verdict payload and an authority token.

Per-circuit registries solved the *cross-circuit* polymorphism; these are
*intra-circuit*, so no registry granularity can fix them. Closing this needs a
language decision — parameterised component types, or per-use component
variants — and that decision is not the test suite's to make. It is recorded as
a defect in the KAT register rather than papered over with a contract that
refuses the examples it is supposed to certify.
