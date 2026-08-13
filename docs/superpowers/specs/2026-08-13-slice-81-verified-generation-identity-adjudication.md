# Slice 81 Verified Generation Identity Adjudication

## Decision

`packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#isVerifiedRegistryGeneration`
is `BLOCKED_BY_AFFINE_WEAK_IDENTITY_RECEIPT_ABI`.

No `.fungi` candidate, bridge, consumer switch or retirement is authorized.

## Pinned scope

- Galerina build point: `fe2ebc637f5324c55545639a5398c7433e236e2a`.
- TypeScript SHA-256: `74f6a976e7eec9649aba2e850a08fb7b36e2311d2e14543bff8f6cf95b947a80`.
- Live production caller: `isRegistryGenerationForwardProbe`; downstream
  rotation control reaches `advanceRegistryRotationState`.
- Reconciled SLIDE head: `ed326eaa`; capability reference `99a75a6`.

## Exact source contract

The exported guard consumes JavaScript `unknown`. It returns true only for a
non-null object whose exact identity was previously inserted into the
module-private `verifiedReceipts: WeakSet<object>`. Equal fields, a deep copy,
a structurally valid forged object and an independently frozen record all
return false.

The live forward-probe guard requires that identity before comparing five
generation facts. The identity check is therefore authority provenance, not a
recomputable data classifier.

## Fail-closed boundary ruling

Current Fungi records, GIR and physical SLIDE/VOK values do not expose the same
module-private weak object-identity capability. Re-deriving a Boolean from
record fields would make copied receipts authorize. Passing the WeakSet result
as a host Boolean would leave the entire authority decision in TypeScript.
Serializing an identity token would change weak identity into bearer data.

All three substitutions are refused. A checked or physically executed scalar
flow would not replace this guard.

## Decision and effect ledger

| Source operation | Input domain | Result | Authority/effect | Required physical shape | Exit |
|---|---|---|---|---|---|
| object/null guard | JavaScript `unknown` | Bool | none | heterogeneous value identity | false for primitive/null |
| private identity lookup | exact object reference | Bool | module-private `WeakSet.has` | sealed affine receipt membership | false when not minted |
| admitted identity | exact minted reference | Bool | preserves provenance | same receipt instance | true |

The leaf is `SERIAL_HARD_PATH`: although it performs no I/O, its answer depends
on mutable module-private authority state and exact host object identity. It is
not an independent pure compute lane.

## R&D trigger

Revisit after VOK can mint, retain and consume a sealed affine generation
receipt whose identity and issuer provenance cross SLIDE without becoming
copyable data, with clone/serialization/replay/mutation refusal and typed
exhaustion proof.

This result grants no conversion, retirement, production, signing, release or
push authority. Aggregate closure remains deferred to Slice 87.
