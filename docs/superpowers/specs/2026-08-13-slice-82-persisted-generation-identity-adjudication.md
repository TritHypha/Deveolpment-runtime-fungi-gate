# Slice 82 Persisted Generation Identity Adjudication

## Decision

`packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts#isPersistedRegistryGeneration`
is `BLOCKED_BY_DUAL_AFFINE_WEAK_IDENTITY_RECEIPT_ABI`.

No `.fungi` candidate, bridge, consumer switch or retirement is authorized.

## Pinned scope

- Galerina build point: `a327a260`.
- TypeScript SHA-256: `74f6a976e7eec9649aba2e850a08fb7b36e2311d2e14543bff8f6cf95b947a80`.
- Live production caller: `isProductionAdmittedRegistryGeneration`; downstream
  rotation control reaches `advanceRegistryRotationState`.
- Reconciled SLIDE head: `ed326eaa`; capability reference `99a75a6`.

## Exact source contract

The guard consumes JavaScript `unknown` and returns true only when the exact
non-null object identity is present in both module-private WeakSets:
`verifiedReceipts` and `durableReceipts`. A verified-but-not-durable restored
generation remains false. Equal, copied or reconstructed records remain false.

This is stricter than Slice 81: it conserves two separately minted authority
facts on one exact object. The production-admission guard consumes this result.

## Fail-closed ruling

Current Fungi/SLIDE/VOK records cannot carry both private weak identity
memberships. Field recomputation authorizes copies; one Boolean collapses two
provenance facts into host authority; serialized tokens become replayable bearer
data. These substitutions are refused.

The leaf is `SERIAL_HARD_PATH` because it reads two mutable module-private
authority sets keyed by exact host object identity.

## R&D trigger

Revisit after VOK supports issuer-separated verified and durable affine seals
on one non-copyable generation receipt, with transition ordering, clone,
serialization, replay and mutation refusal through physical SLIDE.

This result grants no conversion, retirement, production, signing, release or
push authority. Aggregate closure remains deferred to Slice 87.
