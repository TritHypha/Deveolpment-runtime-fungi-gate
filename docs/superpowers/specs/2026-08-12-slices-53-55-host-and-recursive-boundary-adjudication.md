# Slices 53-55 Host and Recursive Boundary Adjudication

## Decision

Slices 53-55 are `BLOCKED`. No Fungi asset, conversion test, loaded-asset
entry, queue authority, consumer switch or retirement claim is created.

| Slice | Exact symbol | Decisive boundary |
|---:|---|---|
| 53 | `galerina-core-runtime-wasm/src/seam-adapters.ts#moduleDefinesExport` | The decision compiles and reflects over attacker-supplied Wasm bytes, walks a module-controlled export table, and collapses host exceptions. No Fungi/SLIDE module decoder or reflection API exists. This work is already sequenced inside the approved post-beta narrow Fungi Wasm compatibility-engine plan. |
| 54 | `galerina-ext-proof-snarkjs/src/circuit.ts#verifyPhase1Proof` | The source consumes two distinct records, recomputes SHA-256-based proof material, applies Node base64 and UTF-8 behavior, parses JSON, and preserves asymmetric throw/catch behavior. None has an exact current physical boundary. |
| 55 | `galerina-devtools-pci/src/pci-checker.ts#isPaymentFlow` | The source lowercases an unbounded String, searches String arrays, recursively flattens an arbitrary AST record tree, then scans full program text. Current Fungi/SLIDE lacks the exact case-fold, recursive record/array ABI, `Array<String>`, and bounded work surface. |

Before these replacement scopes were assigned, mandatory preflight rejected
three proposed scopes as `SUPERSEDED_BY_EXISTING_FUNGI`:
`qualifierEscalated`, Tower-Citizen `permitData`, and `is64BitWatType` already
have package-owned Fungi assets and focused proofs. They are not counted as
new conversions.

## Independent owner evidence

The live graph proves each exact symbol and caller. The retirement ledger
declares no bootstrap floor and no Fungi replacement for the three source
files. Bounded tracked-file and package-manifest checks find no exact or
sibling asset. Fresh owning-package lanes pass:

- core runtime Wasm: **27/27**;
- proof extension: **10/10**;
- PCI devtool: **29/29**.

Graph-backed compiler searches find no executable Fungi operation for
WebAssembly module inspection, base64 decoding, JSON parsing, or JavaScript
lowercase conversion. Frontend names or host-side implementations do not
prove interpreter, GIR, WAT, SLIDE or VOK execution.

## Existing owner sequence for Slice 53

Do not create an isolated `moduleDefinesExport` twin. The approved
`2026-07-30-narrow-fungi-wasm-compatibility-engine.md` plan owns the complete
replacement after beta-v1 acceptance: frozen profile, byte cursor, canonical
decoder, checked IR, validator, capability linker, interpreter, cleanup and
SLIDE lowering. Export identity and kind validation belong in that checked
module boundary. The existing runtime and independent oracle remain until its
full replacement gate passes.

## R&D and test triggers

For Slice 53, execute the existing compatibility-engine plan in order. Add
hostile/control vectors for function, memory, table and global exports sharing
or differing in name, malformed/truncated modules, duplicate exports,
module-controlled table limits, and every host compilation failure class.

For Slice 54, first add TypeScript-oracle coverage for wrong protocol/curve,
malformed base64, non-object and malformed JSON, optional `resultJson` states,
and the uncaught failure path outside the current `try`. Conversion then
requires:

1. an exact two-record physical ABI with optional-field preservation;
2. executable typed SHA-256, base64 and JSON boundaries through GIR/WAT and
   SLIDE/VOK;
3. an explicit ruling for Node's lenient base64 and replacement-character
   UTF-8 behavior versus fail-closed canonical decoding;
4. a typed failure algebra preserving which failures return `false` and which
   escape the current source.

For Slice 55, require an exact recursive AST/worklist boundary or a separately
approved source-contract refactor. It must preserve JavaScript case folding,
the complete keyword/type-name tables, AST traversal order, optional fields,
text construction, and bounded comparison work. Host-side AST flattening or
precomputed payment flags cannot serve as conversion evidence.

No profile limit may be widened merely to make a slice pass.

## Skill-close review

`NO_SKILL_UPDATE` for both public Fungi skills. They already forbid invented
host/codec/crypto APIs, require exact record and collection boundaries, reject
unproved callbacks and recursive iteration, and require live execution beyond
frontend acceptance. These slices add build-point evidence and project-owned
R&D routes rather than a new timeless rule.
