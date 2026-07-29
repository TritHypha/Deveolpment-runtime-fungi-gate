# CTLL R1 Canonical Semantic Body

- **Date:** 2026-07-29
- **Branch:** `codex/ctll-v2-architecture`
- **Scope:** the single frozen `ctll_k3_checked_add_v1` R1 profile
- **Result:** canonical semantic bytes and independent exact-vector admission
  exist; structural import and detached execution do not

## Implemented boundary

`src/self-hosted/ctll-r1-cbor-encoder.fungi` accepts the compiler-owned
`CTLLR1LogicalProgram` only after revalidating every admitted field. It then
emits a deterministic RFC 8949 CBOR body:

- 14-entry root map;
- unsigned integer keys `0..13` in ascending order;
- definite-length maps, arrays, and text;
- shortest-form unsigned integers;
- UTF-8 text;
- fixed ordered block arrays
  `[block-id, name, operations, terminator]`;
- no partial bytes on refusal.

The body is 662 bytes. Its non-authoritative bootstrap-floor body checksum is:

```text
sha256:3086e47d7a14c711e60b8581fffb554ee1a755f8481df42ac3cac9b8da0a3f6a
```

SHA-256 is checked by Node's audited development/bootstrap crypto floor. It is
not misrepresented as self-hosted `.fungi` cryptography. This plain body
checksum is also not the R1 contract's domain-separated semantic digest
(`SHA-256("ctll.gir.semantic.v1\0" || canonical_gir_bytes)`), which remains
unimplemented. The semantic encoder itself owns no signing or authority
decision.

## Independent byte admission

`src/self-hosted/ctll-r1-cbor-validator.fungi` does not import or call the
encoder. It pins the accepted canonical vector independently and compares a
candidate under an exact 662-byte bound.

For this one-program closed profile, exact-vector admission is stricter than a
permissive generic decoder: any non-shortest representation, reordered or
duplicate key, hidden field, changed graph string, invalid text byte,
truncation, or suffix differs from the pinned bytes and terminates with a
stable refusal.

The validator is intentionally described as a **closed-profile
reference-vector validator**, not as the future structural CBOR/R1 importer.
That importer must reconstruct typed graph records, enforce registry IDs and
limits, and run without access to this encoder.

## Fail-closed evidence

`tests/ctll-r1-cbor.test.mjs` proves:

- two exports of the same materialized program are byte-identical;
- an existing independent TypeScript CBOR decoder consumes all 662 bytes and
  reconstructs the expected root fields, blocks, failures, and K3 obligation;
- unsigned boundary values use shortest CBOR heads;
- values above the deliberately bounded encoder range release no bytes;
- a changed memory profile refuses and releases zero bytes;
- the independent `.fungi` validator admits the canonical encoder output;
- flipping one bit at each of all 662 byte positions refuses at the exact
  mismatch offset;
- empty, truncated, and surplus inputs terminate with distinct refusal IDs.

Focused result:

```text
node --test tests/ctll-r1-cbor.test.mjs
  PASS: 6 tests
  mutation positions: 662/662 refused
```

Broader verification:

```text
CTLL/self-hosted focused set
  PASS: 124 tests

Galerina root suite
  PASS: 94/94 packages, 8,018 tests
  core compiler: 5,276 tests

graph-all
  project: 7,106 nodes / 7,370 edges
  integrity: 0 violations
  package border: 97 pass / 0 drift
  KB: 0 orphans / 0 broken links
  memory graph: refused because four candidates exist and none was selected

Myco
  indexed: 4,074 files
  over-size skipped: 0
```

## What remains

- replace operation and terminator strings with registered typed wire IDs;
- implement an independent structural bounded importer;
- validate types, CFG edges, dominance, failures, K3 totality, and memory
  profile from imported records;
- add semantic serialized mutations such as swapped K3 successors and missing
  failure records;
- execute imported R1 in a fresh process without source, AST, parser state,
  WAT, or ambient registries;
- bind the validated body into the future frontend receipt and CTLL payload;
- implement `.slide` packaging, signing, admission, native lowering, and
  benchmarks only after the semantic gates pass.

This checkpoint is real canonical serialization, but it is not yet detached
executable GIR or an authority-bearing CTLL artifact.
