# SLIDE v2: Galerina Status and Implementation Plan

- **Snapshot date:** 2026-08-01
- **Galerina branch:** `codex/galerina-beta-v1-completion`
- **SLIDE branch:** `codex/v2c-independent-frontend`
- **Status owner:** Galerina SLIDE integration lane
- **Canonical purpose:** answer what exists, what is specified only, what is
  blocked, and what must be built next.

This is the first document to read when checking SLIDE work from the Galerina
repository. Update it in the same commit whenever a SLIDE status, gate, owner,
dependency, or implementation phase changes.

**2026-08-01 live correction:** independent SLIDE now passes 276/276 tests and
has bounded prepared V2-D execution with explicit logical flow-region cleanup,
V2-E receipt verification, B0/BA/VPEG/neural research benchmarks, and an exact
non-authorizing reference-platform evaluator plus bounded host observer/report
CLI. These do not constitute a
general/native backend. RD-0643 through
RD-0650 propose a DFE architecture boundary that awaits owner adjudication;
existing G3.1 and platform work may continue without treating DFE as built.

## 1. Current truth in one paragraph

SLIDE v2 is a proposed independent execution platform with Galerina as its first
frontend. Its architecture, zero-trust rules, R1 executable-GIR subset,
Galerina frontend receipt, memory profile, deterministic AOT graph, Linux
driver boundary, and first vertical-slice recommendation are documented. G1
compiler probing has started: a checked-add/K3 `.fungi` fixture and standing
walker/Wasm differential now pass, and three current-tier fail-open
representations found during the probe and full-suite verification were
closed, including previously ignored named traps. A `.fungi` R1 preflight
kernel now rejects fifteen unsupported fixture-shape facts in a fixed order.
The self-hosted `.fungi` stages preserve the bounded fixture's `check` as an
explicit three-successor `check_k3` node and execute exact K3 plus checked
Int32 semantics. A compiler-owned adapter derives the facts, materializes the
closed typed-ID logical program, and now emits one 282-byte canonical CBOR
semantic body. A separately implemented `.fungi` reference-vector validator
rejects every byte mutation. A second independent `.fungi` importer parses
canonical CBOR heads and classifies registry, opcode, type, operand, failure,
K3-successor, and suffix drift without consulting the encoder or vector.
A closed-profile `.fungi` reference executor runs only admitted bytes in a
fresh process and proves distinct success, denial, unresolved, and arithmetic
failure results. A second layer now reconstructs the frozen typed program,
validates its closed registry, blocks, SSA identities/dominance, types,
failures, terminators, K3 successors/obligation, binds its domain-separated
semantic digest, and instruction-drives the admitted records in a fresh
process. Frozen R1 remains a permanent four-block conformance profile.
The new frontend-neutral v2 major now has a first bounded V2-A logical
implementation: two functions, typed call, block-parameter join, checked
arithmetic, exhaustive K3 and typed exits. Its `.fungi` admission gate rejects
profile, authority, opcode, SSA, recursion, CFG, block-argument, memory and K3
mutations. V2-A now has a semantically gated deterministic 540-byte canonical
producer body with every critical root table and a pinned registry-descriptor
digest. An independent `.fungi` importer now reconstructs and semantically
admits the candidate without producer/encoder access, then binds the exact
body to the v2 semantic domain. A bounded reference runtime now
instruction-drives the decoded call/branch/join/checked-add/K3 graph and typed
exits under an enforced caller-capped 64-step ceiling. It still replaces no
current production component. V2-B now validates three exact
database/HTTPS/audit request shapes and one request-bound lease plus a typed
cryptographic-verifier receipt. Both gates explicitly release no authority;
canonical signing bytes, real signature verification, replay state, K3
composition, broker isolation, and dispatch remain absent.
V2-C closes the immutable aggregate semantic gate with an independent
non-Galerina producer. V2-D closes one bounded safe-value semantic-memory gate:
the exact 791-byte graph is independently imported, domain-bound, and executed
with guard-before-observation behavior and exact accounting. The direct
negative matrix passes 69/69, the complete Galerina V2-D suite passes 111/111,
frozen predecessor evidence remains 246/246, and independent SLIDE passes
13/13. No native certificate or authority is released.
V2-E now closes the bounded frontend-evidence gate without changing V2-D:
Galerina emits and independently imports one 1,739-byte canonical receipt,
binds a 1,492-byte normalized source and all 40 executable nodes, re-derives
nine plan commitments, checks caller-owned external evidence, and verifies
non-authorizing Ed25519 + ML-DSA-65 producer evidence. Galerina passes 117/117
focused V2-E tests; independent SLIDE passes 17/17. The complete Galerina
SLIDE regression surface passes 477/477 and independent SLIDE passes 30/30.
SLIDE packaging, native execution, Tri-Fuse v2, the general Galerina frontend
handoff and driver CLI do not yet exist. Bounded reference and Shape Lab
benchmarks exist, but they are non-authorizing and cannot support a native or
external-runtime comparison.
Galerina's current implemented execution paths remain the interpreter,
bytecode/runtime tiers, and WebAssembly toolchain. SLIDE must not be presented
as shipped, benchmarked, memory-safe, deterministic, or production-ready.

## 2. Status vocabulary

| State | Meaning |
|---|---|
| `IMPLEMENTED-VERIFIED` | Code exists and the named verification evidence passed |
| `IMPLEMENTED-PARTIAL` | Useful code exists, but it does not meet the SLIDE boundary |
| `SPECIFIED` | A reviewable contract/plan exists; no implementation claim |
| `RECOMMENDED` | A default is documented but still awaits owner confirmation |
| `BLOCKED-OWNER` | Implementation would choose owner-controlled policy or authority |
| `BLOCKED-TOOLCHAIN` | The current `.fungi` toolchain cannot yet express or execute the required slice |
| `NOT-STARTED` | No qualifying implementation exists |
| `CURRENT-PRODUCTION` | Existing non-SLIDE Galerina behavior remains the shipped path |

Planning completion and implementation completion are deliberately separate.

## 3. Status ledger

| Area | State | What exists now | What remains |
|---|---|---|---|
| Product boundary | `SPECIFIED` | triLowLevel is the independent K3/core; SLIDE is the single engine, versioned payload-profile, and bundle identity; Galerina is the first adapter | Prove with a tiny audited second frontend |
| Public name and extension | `SPECIFIED` | SLIDE / `.slide` means **Substrate Layout Interconnect Deterministic Engine**; `.dml` rejected due active collisions | Legal/name review before public release; no v1 media-type registration |
| K3 semantics | `IMPLEMENTED-PARTIAL` | Kleene K3 authority contract documented; current checker, walker, WAT paths, and bounded self-hosted internal GIR path preserve three states; invalid fourth states refuse | Publish one independent registry and executable conformance vectors |
| `.fungi` control-flow standard | `IMPLEMENTED-PARTIAL` | Standard documented; 19 auth-service examples strict-check with 0 errors/0 governance warnings | Add a flow/block-aware compiler lint; bootstrap language decision is open |
| Existing Galerina GIR | `IMPLEMENTED-PARTIAL` | `GIRProgram`, `GIRFlow`, `GIRExpr`, hashes, effects, plans, and metadata exist | Replace summary/partial bodies with detached executable semantics |
| R1 executable GIR contract | `IMPLEMENTED-PARTIAL` | Exact typed-ID export, vector validator, independent reconstruction, closed-registry CFG/SSA/type/failure/K3 validation, semantic digest, and instruction-driven fresh-process execution | Generalize functions, CFG, memory, budgets, effects and capabilities without an AST/default fallback |
| V2 executable GIR | `IMPLEMENTED-PARTIAL` | V2-A detached graph/runtime; non-authorizing V2-B capability/lease/nonce reference; V2-C immutable-aggregate exit complete; V2-D canonical memory graph independently imported, domain-bound, and executed; bounded V2-E frontend evidence complete | Generalize the Galerina frontend without AST recovery; integrate real V2-B receipt/broker adapters separately |
| V2-B effect/capability | `IMPLEMENTED-PARTIAL` | Exact request/lease/canonical-signing gates; reference hybrid verifier; pure nonce transition; single-process reference CAS with independent state decode; typed receipt validation; exhaustive seven-input K3 shape composition; all success remains non-authorizing | Real producer/verifier adapters, independent crypto and crash-consistent nonce store, isolated broker, audit-before-success, then authority integration |
| AST independence | `IMPLEMENTED-PARTIAL` | Frozen R1 fixture decodes, validates, hashes and executes in a fresh process without source, AST, encoder, WAT or Wasm | Remove every post-GIR AST lookup for the general Galerina frontend |
| Galerina frontend receipt | `IMPLEMENTED-PARTIAL` | Bounded `.fungi` producer/schema/validator, 1,739-byte canonical CBOR, fatal UTF-8 source-byte boundary, 40-node map, nine plan commitments, caller-owned external-evidence binding, hybrid producer attribution, fresh-process import, and zero-dependency independent SLIDE verification; 117/117 Galerina and 17/17 independent V2-E evidence | Integrate the same receipt through the general checked-source frontend; production key custody/independent crypto and later artifact authority remain separate |
| G1 compiler probe | `IMPLEMENTED-PARTIAL` | Checked `.fungi` source plus walker/Wasm differential; exact AST inventory; preflight; `check_k3`; adapter; canonical export; independent import, validation, digest and execution all exist | Close the remaining historic nesting evidence gap and start memory negatives |
| First fixture | `IMPLEMENTED-VERIFIED` | Exact four-block body, pinned checksum/semantic digest, whole-vector mutation kill, reconstructed validation, semantic mutations, K3/Int32 parity, fourth-Verdict trap, and fresh-process instruction dispatch | Retain as a frozen conformance fixture while the registry generalizes |
| Memory profile | `IMPLEMENTED-PARTIAL` | V2-D semantic exit complete and bounded V2-E source/receipt binding complete; initialized immutable 12-byte object, checked extent arithmetic, guard dominance, canonical independent import/digest/runtime. Independent commit `497cb6c` adds a private reference flow region that closes in `finally`, reports 15 cleared logical bindings and 12 admitted semantic bytes, and refuses hostile nested accessors/proxies before opening; no native or physical-erasure claim | Add post-optimization audit, final-artifact binding, native/physical memory guarantees, and hostile FFI/handle corpus |
| Tri-Fuse v2 | `SPECIFIED` | Role corrected to backend-neutral K3 proof/residual-gate planning | Implement proof validation, dominance checks, mutation tests, and backend gates |
| Deterministic AOT graph/CAS | `SPECIFIED` | Complete-key, topological DAG, untrusted-cache, and challenge rules documented | Implement and prove clean/incremental/parallel byte equivalence |
| Deterministic fault simulation | `SPECIFIED` | RD-0536-0555 intake fixes a canonical-seed/replay/positive-control evidence contract | Implement after isolated runner/broker; inject scheduler, broker, nonce/idempotency, cache, process, disk, network and audit faults without reject-all vacuity |
| LLVM/native lowering | `NOT-STARTED` | Research and dependency direction only | Owner-select toolchain; implement restricted shim, verifier, object emission, and inspection |
| `.slide` container/tooling | `NOT-STARTED` | SLIDE container, versioned payload profiles, and trust-role specification only | Implement two decode/validation paths, pack/inspect/verify/explain tools |
| Bounded host-queue ABI | `SPECIFIED` | First profile is fixed-layout bounded SPSC with explicit region/lifetime/epoch/role/layout/ordering facts | Implement only after runner/capability seam; add target memory-model, corruption, wrap, stale-epoch, borrow-lifetime and overrun tests before any lock-free claim |
| Transaction outcome identity | `SPECIFIED` | Intake requires distinct not-committed, committed, outcome-unknown and rejected results; current retry guard is compile-time only | Define broker registry and durable reconciliation/idempotency receipts; prove crash-between-commit-and-ack and duplicate-delivery behavior |
| Tower Citizen adapter | `SPECIFIED` | Exact capability-receipt boundary documented | Implement adapter; no Boolean or origin-based authority |
| Tri-Pipe adapter | `SPECIFIED` | Candidate-route role documented | Implement route receipt; proposal cannot admit itself |
| WAT/Wasm path | `CURRENT-PRODUCTION` | Current compiler/WAT/Wasm pipeline and differential value remain | Retain as optional compatibility/differential evidence after SLIDE; never silently fall back from failed admission |
| Hardware/driver model | `SPECIFIED` | Observation manifest, Driver Knowledge Library, present-but-unusable state | Implement observation and resolution after core semantic slice |
| Reference platform contract | `IMPLEMENTED-PARTIAL` | Exact Windows x86-64, Ubuntu/Debian/Fedora/Mint x86-64/Arm64 and macOS x86-64/Arm64 evaluator plus bounded Node-bootstrap observer/report CLI; no environment/shell/network/package-manager fallback; malformed/accessor/proxy inputs refuse; current Windows 10 evidence 17/17 focused, 15/15 contract files and 276/276 complete | Native execution and actual Windows 11/Linux/macOS runs; local observation remains unauthenticated, non-authorizing and `UNVERIFIED` |
| Linux driver CLI | `NOT-STARTED` | Owner selected Debian/Ubuntu `apt`/`dpkg`, disposable-VM-first, no third-party repository or DKMS v1 path | Implement unprivileged `slide-driver` planner, then separately authorize helper work |
| SLIDE native runner | `NOT-STARTED` | Isolation, capability RPC, budgets, and receipt requirements documented | Select exact Debian/Ubuntu isolation profile and implement only after admission is sound |
| Non-Galerina frontend | `IMPLEMENTED-PARTIAL` | Independent SLIDE V2-C producer, zero-dependency V2-D validator/runtime with bounded logical cleanup, and zero-dependency V2-E canonical receipt verifier; complete independent suite 276/276 and frozen six-file corpus 41/41 | Widen beyond the conformance slices before claiming general frontend/platform independence |
| SLIDE benchmarks | `IMPLEMENTED-PARTIAL` | Bounded V2-D clean/prepared and Shape Lab B0/BA/B1/B2/N1/N2/N3/E11 evidence with exact verification and explicit non-authority labels | Equivalent native execution, authenticated evidence, cross-platform runs and only then the external-runtime comparison |

## 4. Evidence behind the status

### 4.1 Current GIR is useful but not detached executable GIR

The current compiler exposes:

- `GIRProgram`, `GIRFlow`, and a small `GIRExpr` union in
  `packages-galerina/galerina-core-compiler/src/gir-emitter.ts`;
- `emitGIR(...)` and `buildWATModuleFromGIR(...)`;
- effect, capability, proof, tensor, execution-plan, entry-point, and hash
  metadata.

`GIRProgram` does not contain the AST. The current WAT wrapper instead receives
the original AST separately and copies it into its internal `WATGIRInput.ast`,
which is then read for constants, layouts, flow signatures, bodies, secret
handling, and memory derivation. The no-AST path can still emit an identity
body from summary metadata. These are valid facts about the current
WebAssembly implementation, but they fail the SLIDE detached semantic boundary.
The exact inventory and R1 mapping are recorded in
`../reports/slide-v2-g1-capability-probe-2026-07-29.md`. SLIDE work begins by
replacing those dependencies with complete validated R1 nodes, not by writing
an LLVM emitter around them.

### 4.2 Frozen R1 execution and bounded V2-A admission are implemented

Galerina now contains the bounded `slide.semantic.galerina-gir.v1` fixture
adapter, canonical encoder, exact-vector validator, structural importer, and
closed-profile differential executor. It also contains an importer-owned typed
program reconstruction, closed-registry semantic validator, domain-separated
digest binder, and instruction-driven reference runtime. It does not contain
an implemented `.slide` container, generalized Galerina frontend handoff, general GIR
runtime, native loader, or production runner. The sibling `triLowLevel-v2`
directory is a separate uncommitted planning repository; it is not an
implemented runtime.

The V2-A logical producer and validator are a separate new-major checkpoint,
not an R1 widening. They prove that a general graph can represent multiple
functions, direct calls and cross-block typed value transfer, and that hostile
logical mutations refuse. They currently operate on an in-memory producer
record. The producer emits canonical V2 bytes; an independent importer decodes,
validates, and binds them; and the bounded reference runtime executes only
those records. This satisfies the authenticated-bytes-equal-executed-semantics
rule for V2-A, but lacks general budgets, memory, effects, capabilities,
native artifacts, isolation and a second frontend, so it cannot replace the
current GIR, WAT/Wasm, or interpreter paths. Evidence:
`../reports/slide-v2a-validated-runtime-2026-07-29.md`.

V2-C and V2-D continue that append-only major. V2-D now satisfies its bounded
semantic-memory exit gate; the direct adjudication is
`../reports/slide-v2d-exit-gate-2026-07-29.md`. This does not establish native
memory safety or authorize a component cut.

### 4.3 Control-flow hardening completed so far

The audit evidence is
`docs/reports/control-flow-standard-audit-2026-07-29.md`.

Completed:

- repeated alternative `if` dispatch converted to total `match`;
- `_ =>` default arms retained;
- validator rejection sentinels terminate before policy;
- malformed Boolean wire values no longer silently become `false`;
- invalid schema/profile/effect/type/qualifier values no longer inherit
  permissive defaults;
- 19 changed auth-service examples pass strict checking.

Not completed:

- compiler-enforced flow/block-aware lint for future code;
- target-lowering parity proof for every `check` use;
- canonical SLIDE executable-GIR and serialized conformance fixtures.

### 4.4 G1 capability probe

The G1 evidence is
`../reports/slide-v2-g1-capability-probe-2026-07-29.md`.

Verified:

- the checked `.fungi` fixture parses and strict-checks;
- ALLOW, DENY, and INDETERMINATE remain distinct through the tree-walker and
  current WAT/Wasm path;
- checked `Int32` addition and typed `Result` exits work in both tested tiers;
- malformed fourth Verdict values now trap in both tiers;
- hard checked traps can no longer be wrapped in `Ok`, `Err`, or `Some`;
- named traps now terminate and audit in the tree-walker, propagate through
  nested flows, and cannot be bypassed by a pure fast tier;
- the current GIR cannot reproduce the fixture body without the separately
  supplied AST;
- the `.fungi` preflight kernel accepts only the exact frozen fixture facts and
  returns a stable refusal identity for each of fifteen unsupported shapes,
  including missing critical body evidence.
- the self-hosted lexer/parser/GIR/runtime preserves the fixture's K3 decision
  as one `check_k3` with exactly three labelled successors;
- the self-hosted runtime terminally refuses malformed K3, forged Verdict,
  missing nested flow, arity mismatch, Int32 range/overflow, and division by
  zero instead of manufacturing plausible values;
- the self-hosted Wasm differential executes valid checked arithmetic
  boundaries and traps overflow.

This is implementation evidence for existing Galerina semantics, not evidence
that SLIDE R1 exists. The preflight's supplied facts are not attestations:
the future compiler adapter must derive them from authoritative checked output
and bind the decision to the exact materialized semantic bytes.

The self-hosted handoff evidence is
`../reports/slide-r1-selfhost-k3-2026-07-29.md`. Its executable `FlowEntry`
records remain an internal in-memory GIR. The subsequent bounded canonical-body
evidence is `../reports/slide-r1-canonical-body-2026-07-29.md`: it proves one
exact CBOR representation and independent closed-profile byte admission, but
not a general CFG/SSA importer or fresh-process reference artifact. Verification
at the first byte checkpoint was 94/94 packages and 8,018 tests, including
5,276 compiler tests. The follow-on typed-ID/importer checkpoint supersedes
the 662-byte string-valued prototype with a 282-byte registry-valued body.
Current verification is 94/94 packages and 8,025 tests, including 5,283
compiler tests.

## 5. Architecture that implementation must preserve

```text
.fungi source
  -> authoritative Galerina checks
  -> canonical detached executable GIR
  -> Galerina frontend receipt
  -> independent TLL GIR/common-plan validation
  -> Tri-Fuse proof/residual-gate plan
  -> deterministic AOT action graph and untrusted CAS
  -> verified target object
  -> signed .slide bundle carrying the SLIDE payload
  -> Tower capability receipt + Tri-Pipe route proposal
  -> independent K3 admission
  -> isolated runner with typed capability RPC and receipts
```

Required invariants:

1. only K3 `ALLOW` authorizes protected work;
2. `DENY`, `INDETERMINATE`, malformed, unsupported, and unclassified states
   leave the current trust path;
3. a compiler, signature, cache hit, route proposal, source-language label,
   driver presence, or first-party origin is evidence—not authority;
4. authenticated bytes are the bytes parsed and executed;
5. no backend consults the source AST after the executable-GIR boundary;
6. memory safety is a verified profile bound through the final artifact;
7. Wasm is a separately admitted target, never an implicit fallback;
8. project-owned executable logic is `.fungi`; `.gate` remains out of scope.

## 6. Ownership and repository placement

| Work | Owner/location |
|---|---|
| `.fungi` syntax, checking, source semantics | Galerina core compiler |
| Executable GIR exporter/importer and Galerina reference interpreter | Galerina |
| Galerina frontend receipt producer | Galerina adapter |
| K3/common registries and SLIDE contracts | Independent TLL project |
| Independent GIR/receipt/common-plan verification | Independent TLL project |
| Tri-Fuse v2 plan contract and implementation | Independent TLL, with Galerina conformance fixtures |
| LLVM/OS integration | Restricted TLL host shims |
| Tower Citizen/Tri-Pipe integration | Galerina-owned adapters to public TLL receipt contracts |
| SLIDE packager, admission, loader, runner, driver tools | Independent TLL project |

TLL must build and validate its own fixtures without importing Galerina.

## 7. Implementation plan

### Phase G0 — owner and bootstrap decisions

**Resolved 2026-07-29.** Debian/Ubuntu x86-64 is first; Windows 10/macOS may
host audited Node/native development shims; the fixture and memory profile are
confirmed; the first `.slide` profile embeds canonical GIR; Apache-2.0 and
separate signing roles are selected. The owner is arranging the independent
repository. Project semantics and policy remain `.fungi`, with explicit
retirement gates for policy-free shims.

The complete question set is
`../../../triLowLevel-v2/QUESTIONS-FOR-OWNER.md`.

### Phase G1 — compiler capability probes and RED fixtures

Before implementing new lowering:

1. add a negative fixture proving unsupported executable-GIR export refuses;
2. probe current `Verdict`, exhaustive `check`, typed failure, and checked-Int
   behavior across checker, interpreter, and current WAT/Wasm paths;
3. record every missing semantic or lowering capability;
4. create RED tests for AST independence, invalid fourth Verdict state,
   overflow, DENY, and INDETERMINATE;
5. implement no identity body, default constant, walker continuation, or
   Boolean rewrite as a substitute.

Exit gate: the test harness can distinguish unsupported, denied, unresolved,
overflow, and successful execution.

Progress on 2026-07-29:

- the positive `.fungi` fixture and walker/Wasm differential are implemented;
- malformed Verdict and overflow/Result parity regressions pass;
- every current post-GIR AST fact is inventoried and mapped to R1;
- the no-AST identity fallback is exposed as a non-SLIDE negative fact;
- a `.fungi` policy kernel now preflights the exact first-slice shape with
  ordered `SLIDE-R1-EXPORT-001..015` refusals and no Boolean/default fallback.
- the self-hosted `.fungi` lexer, parser, GIR emitter, and runtime now carry
  the bounded `check` as explicit three-way K3 control and checked Int32
  execution, while missing flows and arity mismatches terminate.

The dedicated compiler-owned `.fungi` adapter derives those facts and
materializes the exact four-block logical R1 fixture or refuses before legacy
paths. Its `.fungi` encoder emits a 282-byte typed-ID canonical CBOR body. A
pinned-vector validator rejects all byte drift and a separate structural
importer classifies canonicality, registry, opcode, type, failure, K3 edge,
truncation, and suffix mutations. The fresh-process reference executor runs
the admitted closed profile without source/AST/WAT. A second importer layer now
reconstructs an independently owned typed program from the canonical bytes
(local commit `bc5bd9d7`) without calling the encoder or fixed
structural-admission flow. The next checkpoint (`3cd1f3d2`) validates the
closed CFG/SSA/type/failure/K3 contract, computes the registered
domain-separated semantic digest, and instruction-drives only the admitted
records. Focused evidence is 25/25; after the semantic-memory checkpoint,
compiler evidence is 5,297/5,297.
The first generalization increment is now implemented as V2-A logical records,
semantic admission, canonical encoding, independent import, digest binding,
instruction-driven execution, and runner-side budget enforcement. Remaining:
general frontend/source binding, production effect/capability adapters, and
native artifact gates. V2-C immutable aggregates and the bounded V2-D
safe-value memory increment have independently imported and executed
conformance evidence; neither authorizes a production cut.

The follow-on safe-value gate walks the admitted R1 registry again, admits only
the bounded no-address subset, and labels the result
`SEMANTIC_MEMORY_VALIDATED`. It refuses altered profiles, unknown or
memory-capable opcodes, and malformed bodies. This is defence-in-depth evidence
for reference execution only; it is not a native memory-safety certificate.
See `../reports/slide-r1-safe-value-semantic-gate-2026-07-29.md`.

R1 remains permanently frozen. The general successor is specified as the new
frontend-neutral `slide.semantic.executable-gir.v2` major in
`../../../triLowLevel-v2/19-GENERAL-EXECUTABLE-GIR-SUCCESSOR.md`. It adds
functions, block parameters, SSA, K3, failures, effects/capabilities, memory
objects, limits, compatibility rules, and the bounded V2-A implementation
slice without changing any R1 byte or identity.
The current refusal names are stable within the preflight contract but are not
frozen numeric registry entries. G1 is therefore
`IMPLEMENTED-PARTIAL`, not complete.

### Phase G2 — canonical executable GIR R1

Implement the contract in
`../../../triLowLevel-v2/15-EXECUTABLE-GIR-V1.md`:

1. canonical stable IDs and deterministic-CBOR bytes;
2. R1 types, constants, functions, blocks, instructions, and terminators;
3. checked Int32 and exhaustive K3 semantics;
4. explicit failure records and safe-value memory-profile reference;
5. bounded importer and validator;
6. fresh-process reference interpreter;
7. mutation corpus.

Exit gate: the fixture round-trips and executes without source text, AST, parser
state, WAT, or ambient registries.

### Phase G3 — bounded frontend receipt — complete

Implemented under
`../../../triLowLevel-v2/26-V2-E-FRONTEND-RECEIPT-AND-SOURCE-MAP.md`:

1. materialize canonical GIR and plan bytes once;
2. bind source, compiler, check profile, registries, functions, memory,
   effects, capabilities, imports, K3, failures, resources, and corpus;
3. sign only with a development frontend-evidence role;
4. independently re-derive every common plan in TLL;
5. reject every digest, role, profile, or plan mismatch.

Exit gate: a valid producer signature with a lying plan is still rejected.
The gate is satisfied for the bounded V2-D fixture. It releases no execution
authority and removes no AST, WAT/Wasm, runtime, or host component.

### Phase G3.1 — checked-source derivation — active

The source trace found a necessary distinction: V2-E binds the pinned source
and pinned V2-D body, but the current V2-D materializer does not derive that
body from the compiler-owned flow table. G3.1 must close this link before the
frontend can be called general.

Implementation contract:
`../../../triLowLevel-v2/27-GENERAL-GALERINA-FRONTEND-HANDOFF.md`.

1. seal a bounded, versioned compiler-owned checked snapshot;
2. preserve declarations, checked bodies, K3/failure/memory facts and exact
   source spans without retaining an AST;
3. derive the frozen V2-D graph and lowering trace from that snapshot in
   `.fungi`;
4. prove the derived canonical body remains byte-identical to the 791-byte
   vector;
5. route only adapter-derived bytes and mappings into V2-E; and
6. terminally refuse unsupported or incomplete facts without selecting a
   legacy backend.

First implemented floor: the self-hosted parser now consumes typed record
constructors and unbraced terminal match arms without losing enclosing block
structure; self-hosted GIR preserves logical `and`/`or` instead of emitting
`unknown`. The frozen V2-E source now yields three complete compiler-owned
flow entries with zero self-hosted parse errors. The parser also preserves
ordered record/type fields and payload-free enum cases as checked declaration
facts, and refuses malformed fields, payload cases and truncation under
`FUNGI-PARSE-003`. The exact frozen V2-E declarations are pinned by tests.
Source spans, the exact V2-D adapter, and the public seam remain open.

Exit gate: checked source produces the detached semantic body and receipt
through one materialize-once seam, and independent SLIDE verifies and executes
them without source, AST, producer, encoder, WAT or Wasm.

### Phase G4 — memory profile and Tri-Fuse

1. retain the completed R1 no-address and V2-D bounded safe-value semantic
   verifiers as frozen input gates;
2. generate one Tri-Fuse entry for the fixture's K3 obligation;
3. prove ALLOW specialization, DENY terminal specialization, and unresolved
   residual/terminal behavior;
4. verify gate dominance;
5. mutation-kill removed/swapped gates and altered witnesses.

Exit gate: unfused and fused reference results agree for values, failures,
K3 outcomes, and receipts.

### Phase G5 — deterministic native object

Under the approved minimal-shim policy:

1. build the complete-key action DAG and local untrusted CAS;
2. lower the validated R1 plan through a pinned LLVM/LLD toolchain;
3. verify pre-optimization IR, post-optimization IR, object, and final ELF;
4. deny undeclared imports, raw pointers, guard loss, ABI drift, and unexpected
   sections/relocations;
5. prove clean, incremental, reordered, and parallel builds equivalent.

Exit gate: native results equal Galerina, imported GIR, and fused reference
results for every vector.

### Phase G6 — container, admission, and isolated execution

1. implement canonical `.slide` packing and two decode/validation paths;
2. bind semantic archive, plans, payload, target, memory, provenance, trust
   roles, and lifecycle;
3. implement inspect/verify/explain before run;
4. compose Tower, Tri-Pipe, artifact, target, driver, isolation, freshness, and
   nonce evidence with K3 AND;
5. run only the exact admitted payload under budgets and typed capabilities;
6. preserve typed transaction outcomes across the broker boundary, including
   outcome-unknown as a non-retriable reconciliation state.

Exit gate: every mutated authority field refuses before native execution.

### Phase G7 — independence, hardware, and measurement

1. implement a second non-Galerina minimal frontend;
2. implement Linux observation/driver resolution;
3. add the privileged driver helper only in the approved disposable
   environment;
4. add optional Wasm SLIDE payload/profile;
5. add seeded deterministic fault replay with a known-good control for the
   runner, broker, transaction state, cache, process, disk and audit seams;
6. add the first admitted fixed-layout bounded SPSC host-queue profile;
7. run equivalent-work benchmarks against cached Wasm AOT, current Galerina,
   native Rust, and CPython.

Exit gate: publish raw reproducible results and decide whether SLIDE justifies
its additional format/verifier/runtime.

## 8. Immediate next actions

Safe work that does not require an owner choice:

1. keep all SLIDE documentation synchronized with this ledger;
2. retain frozen R1 as a permanent conformance baseline;
3. generalize the implemented bounded G3.1/G4 checked-source derivation under
   `27-GENERAL-GALERINA-FRONTEND-HANDOFF.md`, preserving bounded V2-E as a
   frozen vector and refusing rather than falling back;
4. separately replace generic V2-B evidence shapes with real receipt adapters;
5. preserve the unresolved historic nesting-source question without
   overstating the current minimal regression;
6. keep the current Wasm path green as the factual implementation baseline.

V2-D no longer blocks design of later native gates. Do not claim or execute
native safety, container signing, driver installation, or production native
execution before the general frontend and named
post-optimization/final-artifact gates.

## 9. Recorded local commits

The current branch contains these SLIDE-related checkpoints:

| Commit | Scope |
|---|---|
| `29668017` | Define Galerina/SLIDE v2 integration architecture |
| `680695c4` | Standardize `.fungi` decision control flow |
| `7316e0dd` | Apply total branch standard to examples |
| `8b11b018` | Enforce verified total control flow across 19 services |
| `c7947a89` | Specify the executable-GIR/frontend-receipt handoff |
| `270ec5f1` | Add the canonical SLIDE implementation ledger |
| `bc5bd9d7` | Reconstruct importer-owned typed SLIDE R1 programs |
| `3cd1f3d2` | Validate, hash, and instruction-drive admitted R1 programs |
| `72c0c210` | Gate the frozen R1 safe-value semantic-memory subset |
| `b7998244` | Admit the frontend-neutral V2-A logical graph and hostile mutations |
| `4509ed4b` | Bind the V2-A registry descriptor and emit canonical producer bytes |
| `7f9e335e` | Independently decode, validate, and bind canonical V2-A bytes |
| `95fac461` | Instruction-drive the independently admitted V2-A graph |
| `6a10ae06` | Enforce caller-capped V2-A execution budgets |
| `83f73c0c` | Specify the V2-B lease-only effect/capability boundary |
| `97fcf116` | Validate exact V2-B capability request shapes without authority |
| `27f16d08` | Validate request-bound V2-B lease and verifier-receipt shapes without authority |
| `63cb5bfd` | Canonicalize and hybrid-verify V2-B lease signatures without admission authority |
| `ac2a7183` | Propose, atomically reference-commit, and K3-compose V2-B nonce evidence without authority |
| `0f2f7c6a` | Harden SLIDE G1 runtime boundaries and add the capability probe |
| `ab3de224` | Add the bounded SLIDE R1 preflight kernel |
| `66c39b31` | Carry exact K3 through the self-hosted GIR/runtime |
| `73338171` | Derive and materialize the compiler-owned logical R1 fixture |
| `446d0ae6` | Serialize and independently pin the first canonical R1 body |
| `bda13054` | Validate and fresh-process execute the typed-ID R1 profile |
| `cadbd66f` | Admit the first V2-D safe-value memory plan |
| `5b98ccaf` | Integrate the complete guarded V2-D graph |
| `917bef9b` | Emit the canonical 791-byte V2-D body |
| `8b137394` | Independently import canonical V2-D |
| `ed910667` | Bind admitted V2-D semantics |
| `59c8e582` | Execute guarded V2-D memory |
| `a9903387` | Close the direct V2-D negative matrix |

The corresponding Knowledge Base branch contains the canonical SLIDE planning
record and control-flow rules. None of these commits has been pushed by Codex.

## 10. Maintenance checklist

Every SLIDE implementation commit must update:

- this status ledger;
- `docs/TODO.md`;
- the relevant architecture/requirements document;
- positive, negative, mutation, and differential evidence;
- owner questions when a decision is exposed;
- current-vs-proposed wording;
- the project graph when tracked semantic structure changes.

A completed checkbox must name evidence. A specification checkbox must never be
used to imply code exists.
