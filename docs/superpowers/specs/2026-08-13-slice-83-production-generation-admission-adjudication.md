# Slice 83 Production Generation Admission Adjudication

## Decision

`registry-generation-store.ts#isProductionAdmittedRegistryGeneration` is
`BLOCKED_BY_COMPOSITE_AFFINE_PRODUCTION_ADMISSION_ABI`.

No `.fungi` candidate or retirement is authorized.

## Pinned scope

- Galerina build point: `ac084944`.
- Source SHA-256: `74f6a976e7eec9649aba2e850a08fb7b36e2311d2e14543bff8f6cf95b947a80`.
- Live caller: `advanceRegistryRotationState`.
- SLIDE head `ed326eaa`; capability reference `99a75a6`.

## Exact contract and ruling

The guard requires the exact object to be verified and durable, present in the
private production receipt set, and additionally either present in the private
linked-production set or carry a durability-adapter digest admitted by the
production allow-list. The production native adapter allow-list remains empty.

This composes three private object-identity facts with one governed digest
registry. Current Fungi/SLIDE/VOK cannot preserve that exact authority graph.
Field recomputation admits copies; a host Boolean retains authority; a bearer
token enables replay. All are refused. The guard is `SERIAL_HARD_PATH` because
its result depends on mutable private authority sets and the governed allow-list.

## R&D trigger

Require VOK-native issuer-separated verified, durable, production and linked
affine seals plus a receipt-bound governed adapter registry, with exact
conjunction, replay/mutation refusal and rotation-consumer proof.

This grants no conversion, production, signing, release or push authority.
Aggregate closure remains deferred to Slice 87.
