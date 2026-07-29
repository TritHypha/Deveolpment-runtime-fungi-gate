# CTLL R1 Canonical Semantic Body

- **Date:** 2026-07-29
- **Branch:** `codex/ctll-v2-architecture`
- **Scope:** the single frozen `ctll_k3_checked_add_v1` R1 profile
- **Result:** canonical typed-ID semantic bytes, two independent validation
  paths, and fresh-process closed-profile reference execution exist

## Implemented boundary

`src/self-hosted/ctll-r1-cbor-encoder.fungi` accepts the compiler-owned
`CTLLR1LogicalProgram` only after revalidating every admitted field. Operations,
types, terminators, failures, and K3 obligations use the frozen numeric
registry in `../../../triLowLevel-v2/18-R1-REGISTRY-V1.md`; no operation meaning
is carried by a free-form string. The encoder then emits deterministic RFC
8949 CBOR:

- 14-entry root map;
- unsigned integer keys `0..13` in ascending order;
- definite-length maps, arrays, and text;
- shortest-form unsigned integers;
- UTF-8 text;
- fixed instruction arrays
  `[result-id, opcode-id, type-id, operands, immediate]`;
- fixed block, terminator, failure, and K3-obligation arrays;
- no partial bytes on refusal.

The body is 277 bytes. Its non-authoritative bootstrap-floor body checksum is:

```text
sha256:19843a946cf68b2365cf661c278d52e4ca2b54a4230ae59e024205c0e583664d
```

SHA-256 is checked by Node's audited development/bootstrap crypto floor. It is
not misrepresented as self-hosted `.fungi` cryptography. This plain body
checksum is also not the R1 contract's domain-separated semantic digest
(`SHA-256("ctll.gir.semantic.v1\0" || canonical_gir_bytes)`), which remains
unimplemented as a bound `.fungi`/receipt field. The bootstrap test computes
and pins that expected value as
`sha256:2f3ee739c5882fb106bc4ff5d104f0dcf5eea55cdc295110681f22dbf5e7533f`.
The semantic encoder itself owns no signing or authority decision.

## Independent byte admission

`src/self-hosted/ctll-r1-cbor-validator.fungi` does not import or call the
encoder. It pins the accepted canonical vector independently and compares a
candidate under an exact 277-byte bound.

For this one-program closed profile, exact-vector admission is stricter than a
permissive generic decoder: any non-shortest representation, reordered or
duplicate key, hidden field, changed graph string, invalid text byte,
truncation, or suffix differs from the pinned bytes and terminates with a
stable refusal.

The reference validator remains intentionally narrow. A second standalone
implementation, `ctll-r1-cbor-importer.fungi`, does not import the encoder or
pinned vector. It parses shortest-form definite CBOR heads under a 4 KiB hard
ceiling, validates all ordered keys and typed registry records, and classifies
encoding, profile, opcode, type, operand, failure, K3-successor, truncation,
and suffix drift. It currently returns a structural decision; reconstruction
of an independently owned program record is the next boundary.

## Detached closed-profile execution

`ctll-r1-reference-runtime.fungi` is combined only with the independent
importer. It accepts body bytes plus the declared Int32/Int32/Verdict inputs.
It executes nothing unless structural admission returns K3 ALLOW, then applies
the frozen registered fixture semantics with total `check` exits and explicit
Int32 overflow guards.

A regression launches a new Node bootstrap process, reads only the importer
and reference-runtime `.fungi` files, receives canonical body bytes, and
returns `42`. It receives no fixture source, source AST, lexer/parser state
from the producer, adapter record, WAT, Wasm, or ambient registry.

This is honestly narrower than a general imported-GIR interpreter: structural
validation fixes the complete registered profile, after which the executor
implements that profile. The next version must reconstruct independent
instruction records and dispatch over them.

## Fail-closed evidence

`tests/ctll-r1-cbor.test.mjs` proves:

- two exports of the same materialized program are byte-identical;
- an existing independent TypeScript CBOR decoder consumes all 277 bytes and
  reconstructs the expected root fields, blocks, failures, and K3 obligation;
- unsigned boundary values use shortest CBOR heads;
- values above the deliberately bounded encoder range release no bytes;
- a changed memory profile refuses and releases zero bytes;
- the independent `.fungi` validator admits the canonical encoder output;
- flipping one bit at each of all 277 byte positions refuses at the exact
  mismatch offset;
- empty, truncated, and surplus inputs terminate with distinct refusal IDs.
- the structural importer separately refuses non-shortest and indefinite
  CBOR, duplicate/reordered root keys, opcode changes, swapped K3 successors,
  missing failure records, and trailing bytes with classified IDs.
- the closed-profile executor returns success `42`, failure 2 for DENY,
  failure 3 for INDETERMINATE, and failure 1 for positive/negative Int32
  overflow;
- structurally refused bytes never enter execution;
- the same ALLOW vector passes in a fresh bootstrap process.

Focused result:

```text
node --test tests/ctll-r1-cbor.test.mjs
  PASS: 13 tests
  mutation positions: 277/277 refused
```

Broader verification:

```text
CTLL/self-hosted focused set
  PASS: 124 tests

Galerina root suite
  PASS: 94/94 packages, 8,025 tests
  core compiler: 5,283 tests

graph-all
  project: 7,130 nodes / 7,394 edges
  integrity: 0 violations
  package border: 97 pass / 0 drift
  KB: 0 orphans / 0 broken links
  memory graph: refused because four candidates exist and none was selected

Myco
  indexed: 4,076 files
  over-size skipped: 0
```

## What remains

- reconstruct independently owned typed program records during import;
- finish general CFG reachability, dominance, SSA use/definition, and
  post-dominating K3 terminal validation over those imported records;
- add semantic serialized mutations such as swapped K3 successors and missing
  failure records;
- replace closed-profile execution with instruction-driven execution over the
  independently reconstructed program;
- bind the validated body into the future frontend receipt and CTLL payload;
- implement `.slide` packaging, signing, admission, native lowering, and
  benchmarks only after the semantic gates pass.

This checkpoint is real canonical serialization, but it is not yet detached
executable GIR or an authority-bearing CTLL artifact.
