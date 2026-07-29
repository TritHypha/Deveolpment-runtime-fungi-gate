# SLIDE V2-A canonical producer checkpoint

**Date:** 2026-07-29

## Outcome

The admitted frontend-neutral V2-A graph now emits one deterministic
RFC 8949 CBOR body:

- byte length: 540;
- raw-body SHA-256:
  `ee143f6de55eab66e7e2d6f23ab03816337165d771f8645040ba60ff06976a07`;
- root: an 18-entry map with ascending unsigned keys;
- frozen R1: unchanged.

The encoder releases no bytes unless the complete V2-A logical validator
returns `Verdict.Allow`.

## Pre-freeze schema correction

Before releasing the first V2 bytes, review found that the logical record did
not yet carry every critical root table or the registry-set digest required by
the v2 contract. The correction adds:

- an exact LF-terminated registry descriptor and its pinned SHA-256;
- explicit module and type tables;
- explicit empty constant, effect, capability, memory-object, and extension
  tables;
- a module ceiling in the declared limits; and
- a registry binding containing both identity and digest.

The descriptor is
`../../../triLowLevel-v2/20-V2-A-REGISTRY-DESCRIPTOR.txt`, 1,190 bytes, SHA-256
`991257bbf4d6d352d3108e27cd423c22e9bf11394571cecb509bc5e8a74df327`.
Changing its bytes requires a new registry identity; an editorial Markdown
change cannot silently redefine the registry.

## Claim boundary

This is producer determinism, not independent admission. The next gate must
decode the 540 candidate bytes without importing the encoder or producer
object, reconstruct every typed record, run semantic admission over that
decoded graph, and reject non-canonical/trailing/unknown-critical input.

No existing Galerina execution component is removed or bypassed at this
checkpoint.

Verification: V2-A 16/16, frozen R1 27/27, full compiler 5,313/5,313;
project graph 7,204 nodes / 7,466 edges with zero integrity violations; KB
zero orphans/broken links; Hardened Border 97/97; explicit memory graph clean;
dev-tool index 97 packages / 124 tools / 40 proofs.
