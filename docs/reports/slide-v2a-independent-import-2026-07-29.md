# SLIDE V2-A independent import and semantic binding

**Date:** 2026-07-29

## Implemented

`slide-v2a-cbor-importer.fungi` independently parses the 540-byte canonical
body without loading or calling the V2-A producer or encoder. It:

- enforces the 16 KiB body ceiling;
- accepts only definite shortest-form RFC 8949 heads;
- rejects 64-bit, indefinite, tagged, float, reserved, surplus, and
  unknown-root shapes;
- checks all 18 ascending critical root keys;
- binds the exact registry identity and descriptor digest;
- reconstructs functions, blocks, block parameters, instructions, signed
  immediates, edges, terminators, failures, K3 obligations, limits, and every
  explicit empty table;
- exposes no partial program after any decoding or semantic refusal; and
- runs the existing V2-A CFG/SSA/type/failure/K3/authority validator over the
  reconstructed candidate.

`slide-v2a-semantic-digest.fungi` then binds only independently decoded and
semantically admitted bytes to:

```text
SHA-256("slide.gir.semantic.v2\0" || canonical_v2_bytes)
```

Pinned evidence:

- body SHA-256:
  `ee143f6de55eab66e7e2d6f23ab03816337165d771f8645040ba60ff06976a07`;
- semantic SHA-256:
  `910727d92460501cd592af8130dbef4acd6abd1432d7ea384ba52be66e9d3464`.

Both digest fields remain empty on refusal. A digest is identity/evidence, not
execution or admission authority.

## Mutation evidence

Independent import refuses and exposes an empty program for:

- truncation;
- trailing bytes;
- root-key reordering/duplication;
- non-shortest root length;
- unknown decoded opcode;
- decoded K3 successor drift; and
- registry-descriptor digest drift.

The separate logical mutation corpus continues to cover profile, ceilings,
dominance, recursion, backward edges, block arguments, capabilities, memory,
and K3 obligations. Focused evidence is V2-A 25/25 and frozen R1 27/27.

Full compiler evidence is 5,322/5,322. Regenerated project graph: 7,223 nodes /
7,484 edges, zero integrity violations; KB zero orphans/broken links; Hardened
Border 97/97; explicit memory graph clean; dev-tool index 97 packages /
124 tools / 40 proofs.

## Claim boundary

This satisfies canonical reconstruction and semantic identity for V2-A. It
does not yet execute V2-A, validate a native memory layout, authorize effects
or capabilities, emit an object, replace Wasm, or admit a `.slide` bundle.
