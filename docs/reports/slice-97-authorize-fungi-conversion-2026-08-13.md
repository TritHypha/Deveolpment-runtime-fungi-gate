# Slice 97 authorize Fungi supersession

## Outcome

Slice 97 classifies
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#authorize`
as `SUPERSEDED_BY_EXISTING_FUNGI`. No duplicate Fungi implementation is
created. The existing package-owned `authorizeVerdict` flow preserves the
complete fail-closed decision: authorization is true if and only if the input
is exactly Allow; Unknown and Deny both return false.

The existing direct proof binds the exact exported TypeScript source and
compares every K3 input with checked Fungi. The existing physical proof
publishes the source as a real `.slide`, independently re-admits it through
VOK, verifies typed Boolean receipts, refuses malformed argument shapes,
insufficient work and source/artifact mutation, and releases no authority.

The TypeScript source, export and callers remain active. This result grants no
consumer switch, retirement, production, release, signing, push or authority
permission.

## Pinned evidence

- Existing asset/direct/physical proof commit:
  `79ca32bc6844698ffffcb72597b90afe0eebded9`.
- Existing shared asset first introduced at:
  `0e1eaa17ab7eee9cf58f631d2b56b241a256af57`.
- SLIDE commit: `ed326eaa14f1a899841cbac8da353d400970367e`.
- TypeScript source SHA-256:
  `801f3aa1366bee32aa2015b76a5f457677193d621fe0d425780c90dd6b5c37a1`.
- Existing Fungi source SHA-256:
  `4c8b643c8966202b628aebdbfeeae25d2d2b57036172129588d2443c825334ac`.
- Direct proof SHA-256:
  `d81d5caa3cc10735b95b3819a5bee112b4bc8b727990ac38b1e32f858e3e667a`.
- Physical proof SHA-256:
  `eb29e93e01cf39e231586da00236e12e17e4efbc64827ee808ba96fe7d3e5702`.

## Verification

- Direct authorization proof: **2/2**, zero skips.
- Complete Tower-Citizen package: **515/515**, zero skips.
- Physical SLIDE/VOK authorization proof: **1/1**, zero skips.
- The three-row result is typed Bool end to end and only exact Allow returns
  true.

## Skill review

The private `writing-fungi` repository is clean at
`dc2ef82facdcfe77570ec8238fa1e5c9f21ef7c1`; the private
`translating-typescript-to-fungi` repository is clean at
`30eb4dd3619499b754189ff784d4831e9508d49d`. Their existing duplicate-search,
typed-K3, exhaustive-vector and physical-profile rules fully cover Slice 97,
so no skill update is required. Both repositories remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing duplicate-search and typed K3 physical-proof rules require exact reuse
Threadability: PARALLEL_PURE
Source classification: SUPERSEDED_BY_EXISTING_FUNGI
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
