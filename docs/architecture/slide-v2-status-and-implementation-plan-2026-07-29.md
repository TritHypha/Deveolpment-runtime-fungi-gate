# SLIDE v2: Galerina Status and Implementation Plan

- **Snapshot date:** 2026-07-29
- **Branch:** `codex/slide-v2-architecture`
- **Status owner:** Galerina SLIDE integration lane
- **Canonical purpose:** answer what exists, what is specified only, what is
  blocked, and what must be built next.

This is the first document to read when checking SLIDE work from the Galerina
repository. Update it in the same commit whenever a SLIDE status, gate, owner,
dependency, or implementation phase changes.

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
failure results. It executes the frozen registered profile rather than a
reconstructed general instruction graph. Imported-program reconstruction, SLIDE
packaging, native execution, Tri-Fuse v2, the frontend receipt, driver CLI,
and benchmarks do not yet exist.
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
| R1 executable GIR contract | `IMPLEMENTED-PARTIAL` | Exact typed-ID export, vector validator, structural importer, and fresh-process closed-profile reference execution | Reconstruct an independent program value and dispatch a general reference interpreter over checked CFG/SSA |
| AST independence | `NOT-STARTED` | None for the SLIDE boundary | Remove every post-GIR AST lookup and prove fresh-process execution |
| Galerina frontend receipt | `SPECIFIED` | Canonical materialize-once receipt and verification algorithm documented | Implement producer plus independent TLL re-derivation/verification |
| G1 compiler probe | `IMPLEMENTED-PARTIAL` | Checked `.fungi` source plus walker/Wasm differential passes; exact AST dependency inventory, fail-closed preflight, self-hosted `check_k3`, compiler-owned logical adapter, canonical body export, and exact-vector validation exist | Structurally import/validate, execute fresh-process, then add semantic serialized mutations |
| First fixture | `IMPLEMENTED-PARTIAL` | Exact four-block typed-ID body, body checksum, whole-vector mutation kill, semantic importer mutations, and fresh-process typed outcome execution exist | Add reconstructed imported artifact and instruction-driven execution |
| Memory profile | `SPECIFIED` | `slide.memory.safe-value.v1` invariants and R1 no-address subset documented | Implement verifier, guard plan, post-optimization audit, and negative corpus |
| Tri-Fuse v2 | `SPECIFIED` | Role corrected to backend-neutral K3 proof/residual-gate planning | Implement proof validation, dominance checks, mutation tests, and backend gates |
| Deterministic AOT graph/CAS | `SPECIFIED` | Complete-key, topological DAG, untrusted-cache, and challenge rules documented | Implement and prove clean/incremental/parallel byte equivalence |
| LLVM/native lowering | `NOT-STARTED` | Research and dependency direction only | Owner-select toolchain; implement restricted shim, verifier, object emission, and inspection |
| `.slide` container/tooling | `NOT-STARTED` | SLIDE container, versioned payload profiles, and trust-role specification only | Implement two decode/validation paths, pack/inspect/verify/explain tools |
| Tower Citizen adapter | `SPECIFIED` | Exact capability-receipt boundary documented | Implement adapter; no Boolean or origin-based authority |
| Tri-Pipe adapter | `SPECIFIED` | Candidate-route role documented | Implement route receipt; proposal cannot admit itself |
| WAT/Wasm path | `CURRENT-PRODUCTION` | Current compiler/WAT/Wasm pipeline and differential value remain | Retain as optional compatibility/differential evidence after SLIDE; never silently fall back from failed admission |
| Hardware/driver model | `SPECIFIED` | Observation manifest, Driver Knowledge Library, present-but-unusable state | Implement observation and resolution after core semantic slice |
| Linux driver CLI | `NOT-STARTED` | Owner selected Debian/Ubuntu `apt`/`dpkg`, disposable-VM-first, no third-party repository or DKMS v1 path | Implement unprivileged `slide-driver` planner, then separately authorize helper work |
| SLIDE native runner | `NOT-STARTED` | Isolation, capability RPC, budgets, and receipt requirements documented | Select exact Debian/Ubuntu isolation profile and implement only after admission is sound |
| Non-Galerina frontend | `NOT-STARTED` | Owner delegated a tiny audited reference frontend | Specify and implement the minimal producer |
| SLIDE benchmarks | `NOT-STARTED` | Security/TCB gates and weighted scorecard documented | Benchmark only after equivalent native execution exists |

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

### 4.2 Only the bounded SLIDE R1 prototype is implemented

Galerina now contains the bounded `slide.semantic.galerina-gir.v1` fixture
adapter, canonical encoder, exact-vector validator, structural importer, and
closed-profile reference executor. It does not contain an implemented
`.slide` container, general SLIDE frontend receipt, general instruction-driven
runtime, native loader, or production runner. The sibling `triLowLevel-v2`
directory is a planning set and is not currently its own Git repository.

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
the admitted closed profile without source/AST/WAT. Remaining: reconstruct an
independent graph value and drive general CFG/SSA validation/execution from it.
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

### Phase G3 — frontend receipt

Implement
`../../../triLowLevel-v2/16-GALERINA-FRONTEND-RECEIPT.md`:

1. materialize canonical GIR and plan bytes once;
2. bind source, compiler, check profile, registries, functions, memory,
   effects, capabilities, imports, K3, failures, resources, and corpus;
3. sign only with a development frontend-evidence role;
4. independently re-derive every common plan in TLL;
5. reject every digest, role, profile, or plan mismatch.

Exit gate: a valid producer signature with a lying plan is still rejected.

### Phase G4 — memory profile and Tri-Fuse

1. implement the R1 no-address `safe-value` verifier;
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
5. run only the exact admitted payload under budgets and typed capabilities.

Exit gate: every mutated authority field refuses before native execution.

### Phase G7 — independence, hardware, and measurement

1. implement a second non-Galerina minimal frontend;
2. implement Linux observation/driver resolution;
3. add the privileged driver helper only in the approved disposable
   environment;
4. add optional Wasm SLIDE payload/profile;
5. run equivalent-work benchmarks against cached Wasm AOT, current Galerina,
   native Rust, and CPython.

Exit gate: publish raw reproducible results and decide whether SLIDE justifies
its additional format/verifier/runtime.

## 8. Immediate next actions

Safe work that does not require an owner choice:

1. keep all SLIDE documentation synchronized with this ledger;
2. make the structural importer reconstruct its own typed program value and
   finish the closed CFG/SSA validation stages;
3. replace closed-profile semantic dispatch with instruction-driven reference
   execution over the reconstructed record;
4. add serialized semantic negative fixtures and expected outcomes, retaining
   the preflight refusal namespace separately from the future numeric failure
   registry;
5. keep the current Wasm path green as the factual implementation baseline.

Do not start LLVM, container signing, driver installation, or native execution
before their earlier semantic and owner gates.

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
| `0f2f7c6a` | Harden SLIDE G1 runtime boundaries and add the capability probe |
| `ab3de224` | Add the bounded SLIDE R1 preflight kernel |
| `66c39b31` | Carry exact K3 through the self-hosted GIR/runtime |
| `73338171` | Derive and materialize the compiler-owned logical R1 fixture |
| `446d0ae6` | Serialize and independently pin the first canonical R1 body |
| `bda13054` | Validate and fresh-process execute the typed-ID R1 profile |

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
