# Galerina → SLIDE → VOK Detached Scalar Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one bounded, complete and independently admitted scalar
execution path from real `.fungi` bytes through an immutable checked snapshot,
detached canonical GIR, physical `.slide`, non-authorizing Lyth proof work,
independent SLIDE admission and a VOK lease/terminal receipt before the
TypeScript-to-Fungi converter resumes ten-source trials.

**Architecture:** Galerina owns source semantics and seals a digest-closed
`CheckedModuleSnapshotV1`. Only that inert snapshot may feed the detached GIR
emitter. That emitter writes SLIDE's existing
`slide.semantic.executable-gir.v2` canonical CBOR directly; Galerina's current
AST-coupled `GIRFlow` object is never a second wire format. SLIDE independently
decodes those canonical GIR bytes, chooses only the active
scalar representation profile, coordinates a closed one-node action through
`slide.serial-reference-coordinator.v1` with cache disabled, and materializes
physical `.slide` bytes. A production DFE is a later optional coordinator, not
a prerequisite. Lyth may
reuse or recompute bounded proof work but has no `ALLOW` result. SLIDE then
re-imports the exact physical bytes and independently derives admission. VOK
alone mints the affine execution lease and terminal receipt. Tower Citizen may
be the selected sink, entered and consumed by the VOK sink-capability holder;
Tower never receives, holds or consumes the lease. Tri-Pipe may propose routes,
and Tri-Fuse may propose proof-constrained optimization, but neither authorizes
execution. Hypha remains a passive capability-map/freshness detector. The
separate graph/index remains asynchronously reconstructible. Neither stores or
supplies semantic bodies or authority.

**Tech Stack:** strict TypeScript and Node.js ESM; Galerina lexer/parser/type,
effect, value-state and governance checkers; canonical GIR; independent SLIDE
physical compiler and VOK; Lyth TypeScript admission-work schema and adapter;
SHA-256 typed artifact references; `node:test`; repository graph/index tools.

## Global constraints

- Work from the current Galerina branch and sibling `../SLIDE` and
  `../lyth-weaver` repositories. Never push; the owner performs pushes.
- Treat the current Galerina converter edits and untracked `.fungi` files as
  user-owned. Do not overwrite, stage or commit them while executing this plan.
- Graph freshness is `UNKNOWN` until `index_repository` returns an independently
  verified `indexed_head_sha` equal to the repository commit. Exact source bytes
  govern while the graph service lacks that receipt.
- Keep the existing fixture-specific
  `slide-gfrontend-checked-snapshot.fungi`; do not relabel it general.
- `Trit` and `Verdict` remain distinct. Empty evidence never yields `ALLOW`.
- After `CheckedModuleSnapshotV1`, the accepted route cannot read the AST,
  source objects, TypeScript runtime, WAT/Wasm, Tower, Tri-Pipe, Hypha, ambient
  registries or mutable compiler state to recover semantics.
- Each architectural block owns its own internal memory and storage. No block
  may inspect another block's repository, cache, database, object layout or
  live capability state. Only the bounded compute input/result described by a
  typed transfer contract crosses the boundary.
- Cross-block work is an asynchronous receipt-driven DAG, not a global pause or
  shared-memory transaction. A missing prerequisite blocks only that job edge;
  every owner may continue unrelated admitted work on its own queue.
- The transferable object is a typed `ComputeTransferV1`, not the Signet and
  not a partial VOK Envelope. At the VOK boundary, the host constructs the
  closed exact-subject Envelope containing component digest, policy digest,
  target, ABI, dependency-closure digest, capability/effect digest, build
  point, epoch and evidence-set digest. The Signet remains private
  VOK/admission-host state and mints one-use admitted handles/leases only after
  independent checks. A serialized Wax Seal or other receipt is value-only and
  cannot recreate live authority.
- Every artifact body is outside the graph and is addressed as
  `(owner, kind, digest)`. Every read recomputes the digest before decoding. A
  path is transport, never identity. The graph stores references and freshness
  facts only; it is never a body repository or shared writable message bus.
- Hypha may report candidate facts and freshness only. The graph may provide
  reconstructible discovery/index facts only. Neither can be imported by the
  compiler, physicalizer, SLIDE admission or VOK authority path.
- The first active representation profile is `trit.scalar.v1`. The registry may
  name 64, 256 and compatibility 32 only as inactive entries that refuse use.
- A profile change is admission-time replanning with a new plan, artifact
  identity and receipt. There is no runtime fallback.
- Lyth results are `ELIGIBLE`, `INDETERMINATE` or `REFUSED`; no `ALLOW` variant
  may be introduced. SLIDE re-derives admission independently.
- Tower Citizen, Tri-Pipe and Tri-Fuse retain their roles; the bounded converter
  trial does not execute them merely to prove their architectural seats.
- The scalar reference profile is digest-only: filesystem paths are transport,
  not retained identity. The open SLIDE filesystem-identity S2 blocker is
  explicitly outside this profile, not silently closed.
- The converter stays a candidate generator, processes at most ten requests,
  retains each `.ts`, logs unsupported/blocker outcomes, and publishes no
  candidate without the new scalar receipt chain.
- A report-bearing Galerina conversion commit must add at least 40 unique real
  `.fungi` files (expected 50, advisory), change at most one conversion report,
  and pass duplicate/shadow checks. The final tail is the only exception via
  `--allow-final-report-only`. A commit with no conversion report carries no
  conversion census. Architecture plan commits contain no conversion report
  and confer no conversion credit.
- Implement in small verified blocks. In Galerina, hold implementation changes
  uncommitted unless the owner separately authorizes an architecture-only code
  checkpoint or the conversion commit gate is satisfied. SLIDE/Lyth code-only
  checkpoints may be local commits without reports; never push.

### State and storage ownership

| owner | internal memory it alone owns | typed egress | forbidden knowledge |
|---|---|---|---|
| Galerina | `.fungi` source bodies, checked facts/snapshots and canonical GIR publication state | immutable source/snapshot/GIR references and exact bytes | SLIDE package store, Lyth cache/schema internals, VOK live authority state |
| SLIDE | physical `.slide` packages, profile/registry material and independent admission state | physical-artifact/admission references and exact evidence | Galerina compiler objects, Lyth cache internals, VOK lease tables |
| Lyth | proof-work state and reusable evidence cache only | `ELIGIBLE`, `INDETERMINATE` or `REFUSED` evidence bound to the compute input | Galerina memory, SLIDE repository internals and all VOK capabilities |
| VOK | live attempts, decisions, affine leases and receipt handles; separately, durable non-capability receipt envelopes | terminal outcome/receipt evidence | another owner's store and any mechanism for rehydrating a durable receipt into authority |
| serial coordinator / future DFE | the current action and, for a future DFE, its own action/CAS cache | bounded work/toolchain evidence | semantic truth, profile authority and VOK state |
| Tower Citizen | selected workload state and authenticated audit log | terminal sink outcome and audit evidence | VOK lease internals or authority mutation |
| Hypha / graph | reconstructible capability, dependency, provenance and freshness indexes | candidate facts and `(owner, kind, digest)` references | artifact bodies, proof caches, leases and receipts as authority |

An owner may retain immutable digest-identical replicas, but only one owner is
authoritative for each artifact kind. A consumer receives either the exact
owned bytes or a read capability scoped to one reference; it never receives a
general repository handle. Missing, expired, deleted or digest-mismatched
bodies produce a typed refusal/unknown result, never a stale-cache success.
Once a producer publishes an immutable Envelope, independent consumers may
verify and process it concurrently. For example, Lyth proof work and SLIDE
byte/profile checks may proceed in parallel after physical-package publication;
the final SLIDE admission waits for its declared evidence, and VOK waits for
the exact admitted result before using its private Signet.

---

## Phase 1 — Detector and security floor

### Task 1: Add the detached-authority path audit

**Files:**
- Create: `scripts/audit-detached-slide-authority-path.mjs`
- Create: `scripts/tests/detached-slide-authority-path.test.mjs`
- Modify: `package.json`
- Modify: `scripts/dev-tool-registry.json` if this registry owns the tool

- [x] Write a failing self-test fixture whose post-snapshot module imports or
  calls `emitGIR(ast, ...)`, TypeScript compiler APIs, WAT/Wasm execution,
  Tower, Tri-Pipe or Hypha. Require the audit to reject each edge.
- [x] Write a green fixture whose only input is frozen
  `CheckedModuleSnapshotV1` bytes/reference and whose outputs are typed GIR
  bytes/reference or a typed refusal.
- [x] Implement bounded import and call-surface inspection. Unknown/truncated
  analysis is a refusal, not a clean result.
- [x] Emit a machine-readable result carrying tool version, ruleset digest,
  repository commit, files inspected and each forbidden edge.
- [x] Add `audit:detached-slide-authority-path`; register it through the normal
  dev-tool publisher rather than hand-editing generated indexes.
- [x] Run:
  `node --test scripts/tests/detached-slide-authority-path.test.mjs`
- [x] Run the planted-red control and prove the audit exits non-zero, then
  restore the valid fixture and prove it returns green.

Evidence (2026-08-15): the hermetic suite passes 12/12, including six planted
forbidden authority families, computed-import refusal, a literal-import
control, inert comment/string controls, repository-containment refusals and a
commit-binding control for modified/untracked entry bytes.
The generated dev-tool index reports 177 tools and zero ungated
audits; its generator check is green. The normal audit command remains
fail-closed until Task 4 creates `checked-snapshot-gir-emitter.ts`.

### Task 2: Wire erasure, hostile-number and canonical-byte detectors

**Files:**
- Create: `scripts/audit-trit-verdict-js-seam.mjs`
- Create: `scripts/tests/trit-verdict-js-seam.test.mjs`
- Modify: `scripts/audit-detached-slide-authority-path.mjs`
- Modify: `package.json`

- [x] Write failing vectors for raw integer laundering between `Trit` and
  `Verdict`, erased JavaScript objects, `-0`, `NaN`, infinities, missing fields,
  inherited/accessor/proxy fields, repeated getters and caller-mintable success
  booleans.
- [x] Require canonical authoritative byte code to reject ambient
  `localeCompare`, delimiter concatenation, unversioned JSON, duplicate keys and
  mutable live typed-array input without an admitted copy/live-view contract.
- [ ] Reuse the existing mutation, sentinel and conversion-acceptance tools;
  do not duplicate their implementation. Record their exact tool/ruleset
  digests in the later end-to-end receipt fixture.
- [x] Add a strict TypeScript brand check and the JavaScript twin-seam audit to
  the ordinary phase-close path only after both prove red capability.
- [x] Run the focused tests and the registered publisher/check for every edited
  tool index.

Evidence (2026-08-15): the combined detached-path and JavaScript-seam suites
pass 27/27. The seam vectors distinguish raw integer and non-finite authority,
fail-open range guards, negative zero, hostile or repeatedly read authority
records, caller-mintable Booleans, ambient collation, delimiter framing,
unversioned JSON, duplicate-key rebuilding and unadmitted typed-array views.
The meta-gate self-test recognizes both fixture proofs; phase-close/tooling
tests pass 28/28; the generated dev-tool index reports 177 tools, 40 proofs and
zero gaps; and the tooling contract reports zero violations. The phase-close
entry runs after `lint:cast-hygiene`. Both live package commands deliberately
refuse with `ENTRY_UNREADABLE` until Task 4 creates the approved emitter seam.
Exact private-KB mutation, sentinel and conversion-acceptance digests remain a
later end-to-end receipt obligation and are therefore not checked off here.

**Phase 1 stop condition:** both new audits must catch a planted violation. A
clean scan without a red-capability control does not permit Phase 2.

---

## Phase 2 — Digest-closed checked semantics and detached GIR

### Task 3: Define typed artifact references and verified I/O

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/artifact-reference.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/artifact-reference.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [x] Start with failing tests for malformed kind/digest, path substitution,
  missing body, one-byte mutation, short read, oversized body and backend throw.
- [x] Define the boundary:

  ```ts
  export interface ArtifactReferenceV1 {
    readonly schema: "galerina.artifact-reference.v1";
    readonly owner:
      | "galerina"
      | "slide"
      | "lyth"
      | "vok"
      | "dfe"
      | "tower";
    readonly kind:
      | "fungi-source"
      | "checked-module-snapshot"
      | "canonical-gir"
      | "physical-slide"
      | "lyth-evidence"
      | "vok-receipt";
    readonly digest: `sha256:${string}`;
    readonly byteLength: number;
  }

  export interface ComputeTransferV1 {
    readonly schema: "galerina.compute-transfer.v1";
    readonly fromOwner: ArtifactReferenceV1["owner"];
    readonly toOwner: ArtifactReferenceV1["owner"];
    readonly artifact: ArtifactReferenceV1;
    readonly prerequisiteDigests: readonly `sha256:${string}`[];
    readonly operationId: string;
    readonly runIdentity: `sha256:${string}`;
    readonly authorityEpoch: number;
    readonly authorityContextDigest: `sha256:${string}`;
  }

  export interface OwnedArtifactRepository<O extends ArtifactReferenceV1["owner"]> {
    readonly owner: O;
    read(reference: ArtifactReferenceV1 & { readonly owner: O }):
      Promise<Uint8Array>;
    write(kind: ArtifactReferenceV1["kind"], bytes: Uint8Array):
      Promise<ArtifactReferenceV1 & { readonly owner: O }>;
  }
  ```

- [x] Enforce legal owner/kind pairs: Galerina owns source/snapshot/GIR, SLIDE
  owns physical packages/admission evidence, Lyth owns proof evidence and VOK
  owns receipt envelopes. DFE and Tower references remain bounded future/input
  surfaces. Reject a wrong owner before reading any bytes.
- [x] Capture each owner-local repository capability once. Verify ordinary own-data request
  records, safe byte lengths and SHA-256 on every read. Return owned bytes, not
  an alias into a mutable caller buffer.
- [x] Provide only a bounded filesystem test repository in this phase. Keep the
  interface backend-plural; do not introduce a universal CAS or graph store.
- [x] Prove that serialized references contain no absolute path and that a
  different backend returning the same verified bytes is semantically equal.
- [x] Pass only a one-reference read capability or owned immutable bytes across
  a domain boundary. Add wrong-owner, cross-owner repository access, stale
  reference, deleted body, replica mismatch, replayed transfer and retention
  expiry refusal vectors. Neither Galerina nor any other caller may learn the
  layout or API of Lyth's internal memory.
- [x] Canonicalize and authenticate `ComputeTransferV1` independently of the
  private VOK Signet. Authentication admits the transfer to a receiver's queue;
  it does not prove semantic truth or authorize execution. At VOK ingress,
  construct and exact-key validate the complete existing Envelope field set;
  never treat `ComputeTransferV1` as that Envelope.
- [x] At run creation, pin the value-only current VOK authority epoch/context
  observation into `runIdentity`. Every stage receipt preimage includes the same
  run identity, epoch, stage/domain tag, exact input digest and exact
  output/evidence digest. Context rotation makes the in-flight run refuse at
  its next edge; old evidence cannot be relabelled under the new epoch.
- [x] A receipt digest is not authentication. Each owner mints its stage receipt
  through its admitted epoch-scoped receipt capability or authenticated signer,
  and the receiver independently verifies that provenance. Reject caller-made
  records that merely recompute the right digest.
- [x] Treat authority as immutable `(owner, kind, digest)` entries, not one
  mutable current digest per `(owner, kind)`. Transfer authentication acquires
  a non-authorizing owner-local retention pin scoped to the exact reference,
  `runIdentity` and bounded expiry; terminal receipt/refusal releases it. A pin
  grants neither read access nor admission. Supersession cannot delete a pinned
  older digest, while expiry of a blocked run fails only that run.
- [x] `runIdentity` is a public selector/audit field, never retention authority.
  Pin acquisition returns an opaque owner-local handle bound to the authenticated
  acquirer. Release is idempotent and requires that handle/acquirer binding.
  Check pin continuity before terminal receipt; a lapsed pin refuses that run.
- [ ] Treat the retained `.ts` comparator as a bare source digest in the
  converter run identity, not as an `ArtifactReferenceV1`; TypeScript never
  enters the admitted artifact chain.

Evidence (2026-08-15): package typecheck and emitted-build compilation are
green; `artifact-reference.test.mjs` passes 26/26. The focused evidence covers
exact/proxy-free records, legal owner/kind pairs, bounded verified repository
reads, path-free references, replica equivalence, one-use read capabilities,
authenticated non-authorizing transfers, replay and authority rotation,
owner-local retention, authenticated stage receipts, closed ordered evidence
sets, and the existing nine-field VOK Envelope without Signet or execution
authority. The existing private VOK-host suite remains green 7/7. The retained
TypeScript comparator obligation remains open for Task 13.

### Task 4: Seal `CheckedModuleSnapshotV1`

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/checked-module-snapshot.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/checked-module-snapshot-v1.test.mjs`
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/checked-module-snapshot-v1.fungi`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [x] Write failing tests for source/token/declaration/checker mismatch, missing
  effect/value-state/governance facts, duplicate identities, surplus fields,
  mutable aliases, source mutation after checking and incomplete trace inputs.
- [x] Define a closed versioned snapshot containing exact source identity,
  edition, resolved declaration/type facts, effects, value states, governance
  decisions, constants/domain tags, source spans, checker/profile versions and
  ordered diagnostic identity.
- [x] Bind a `SnapshotRunIdentityV1` over source digest, snapshot schema,
  compiler commit, checker/ruleset digests and snapshot body digest.
- [x] Copy/canonicalize all admitted facts once and deep-freeze the internal
  representation. Do not store an AST node, callback, class instance, Map/Set,
  host capability or source-object alias.
- [x] Make the `.fungi` contract express the invariant/refusal floor. Keep the
  existing `SLIDEG4CheckedSnapshot` fixture as bounded prior evidence; do not
  claim it was generalized or retired.
- [x] Mutation vectors must prove that changing source, tokens, facts or trace
  after sealing cannot change the stored bytes and that changing stored bytes
  fails digest verification.

**Fresh Task 4 evidence (2026-08-15):** the retained TypeScript boundary
typechecks and emits cleanly; `checked-module-snapshot-v1.test.mjs` passes 6/6,
including source mismatch, missing facts, duplicate/surplus input, incomplete
trace, caller mutation and stored-byte mutation refusals. The new
`checked-module-snapshot-v1.fungi` invariant/refusal floor passes strict type and
governance checking with 0 errors and 0 warnings. It is value-only and does not
generalize or retire the bounded `SLIDEG4CheckedSnapshot` fixture.

### Task 5: Implement detached snapshot-to-GIR lowering

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/checked-snapshot-gir-emitter.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/checked-snapshot-gir-emitter.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [x] Write a failing structural test over the **transitive import closure** of
  the new emitter, proving it reaches no parser AST types/visitors,
  `gir-emitter.ts`, `SemanticGraphBuilder`, `buildExecutionPlan`, TypeScript API,
  callback or ambient registry. A direct-import-only test is insufficient.
- [x] Expose:

  ```ts
  export function emitCanonicalGIRFromSnapshot(
    snapshotBytes: Uint8Array,
    expected: ArtifactReferenceV1,
  ): DetachedGIREmissionResult;
  ```

  where the success result contains owned
  `slide.semantic.executable-gir.v2` canonical CBOR bytes, a GIR artifact
  reference and a complete ordered source-to-GIR trace; failure is a closed
  typed refusal.
- [x] Emit the existing parent registry exactly:
  `slide.registry.executable-gir.v2c`, digest
  `366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66`,
  memory profile `slide.memory.safe-value.v1`, its exact 21-element limits and
  the exact 21-key canonical root in ascending integer-key order. Do not create
  a new registry or translator.
- [x] Bound the first family to the parent registry: at most 3 functions, 8
  blocks, 32 instructions, call depth 2, no back edges and conservative work
  96. Anything outside the supported opcode/type/descriptor envelope is
  `UNSUPPORTED_SNAPSHOT_SEMANTIC`.
- [x] Lower every admitted construct in the bounded family from snapshot facts
  only. Any unsupported construct is `UNSUPPORTED_SNAPSHOT_SEMANTIC`, not an AST
  fallback or partial GIR success.
- [x] Materialize canonical GIR bytes once with injective framing and stable
  ordering. Double-lower the same snapshot and require byte-identical output.
- [x] Retain `emitGIR(ast, ...)` as bootstrap/differential code only. Mark it
  ineligible for the accepted detached route; do not modify, delete or
  reinterpret `gir-emitter.ts` in this task.
- [x] As a test-only oracle, compare one equivalent bounded programme against
  `compileV2CReferenceSource` output. The accepted route never imports or calls
  that frontend.
- [x] Test trace completeness: every executable GIR instruction/terminator has
  one admitted source-fact origin and no unclaimed executable node exists.

**Fresh Task 5 evidence (2026-08-15):** the detached emitter typechecks and its
5/5 focused tests pass. Its transitive relative-import closure reaches neither
the parser/AST route nor `gir-emitter.ts`, semantic graph, execution planner or
TypeScript API. The bounded constant-return family emits byte-identical output
on repeated runs and matches `compileV2CReferenceSource` byte-for-byte for the
equivalent test-only programme. A fourth function and unsupported facts refuse
without partial GIR bytes; every emitted instruction and terminator has exactly
one snapshot-fact trace entry. The retained AST emitter was not modified.

### Task 6: Route compiler CLI/runtime through the sealed path

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/runtime.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
- Create: `packages-galerina/galerina-core-compiler/src/runtime-checked-snapshot.ts`
- Create: `packages-galerina/galerina-core-compiler/src/detached-scalar-handoff.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/detached-scalar-handoff.test.mjs`
- Modify: `scripts/lib/ts-to-fungi-sandbox/evidence.mjs` only after reconciling
  the current user-owned worktree changes

- [x] Add a failing test that plants a changed AST/source/registry after the
  snapshot is sealed and proves the detached GIR bytes remain unchanged.
- [x] Introduce an explicit reference-only execution mode that seals, stores,
  rereads and verifies the snapshot before calling the detached emitter.
- [x] Remove `buildExecutionPlan(parseResult.ast, ...)`,
  `buildSemanticGraph(parseResult.ast, ...)` and other post-snapshot AST reads
  from this accepted mode. Bootstrap modes may remain separately named.
- [x] If the snapshot, verified body, detached emitter or downstream repository
  is unavailable, return one typed refusal. Never rescue through WAT/Wasm,
  cached TypeScript, Tower or Tri-Pipe.
- [ ] Do not update converter evidence until Tasks 1–5 are green and the dirty
  converter files have a clearly owned baseline. Then replace its direct
  `emitGIR(parsed.ast, ...)` call with the same sealed snapshot/GIR boundary.
- [x] Run the authority-path audit and prove Hypha and the TypeScript compiler
  API are unreachable after the snapshot handoff.

**Fresh Task 6 evidence (2026-08-15):** `detached-reference` now seals the
already-admitted compiler result into canonical snapshot bytes, writes and
rereads those bytes from Galerina's owner-local repository, emits canonical GIR
from the verified body only, then writes and rereads that GIR from the same
owner repository. The CLI requires explicit compiler/checker provenance and
prints only non-authorizing snapshot/GIR references. The focused handoff suite
passes 5/5, the complete Tasks 1-6 artifact/snapshot/emitter/handoff set passes
42/42, retained runtime suites pass 36/36 and strict package typechecking is
green. The authority detector self-tests pass 13/13. After the Galerina
checkpoint commit, commit-bound live scans of both the handoff and detached
emitter report `CLEAN`: zero forbidden edges and zero refusals. The Trit/Verdict
seam audit is likewise `CLEAN` for both entries. This closes the Phase 2
commit-bound stop condition. Converter evidence remains untouched pending
owner-baseline reconciliation in Task 13.

**Phase 2 stop condition:** canonical GIR can be reproduced from verified
snapshot bytes in a fresh process that has no AST/source object. Any attempted
AST/TypeScript/Hypha dependency is rejected by the planted-red audit.

---

## Phase 3 — Scalar physical reference, Lyth evidence and VOK authority

### Task 7: Add the SLIDE representation-profile registry and planner

**Files in `../SLIDE`:**
- Create: `src/representation-profile-registry.mjs`
- Create: `tests/representation-profile-registry.test.mjs`
- Modify: `src/index.mjs` or the repository's existing public export owner

- [ ] Start with failing tests for unknown, duplicate, mutable and
  caller-invented profiles; unavailable targets; profile fallback; and a
  planner result used as if it were admission authority.
- [ ] Register exact closed records for `trit.scalar.v1`,
  `trit.bitplane64.v1`, `trit.bitplane256.v1` and compatibility
  `trit.bitplane32.v1`. Only scalar is `ACTIVE_REFERENCE`; all packed profiles
  are `INACTIVE` and refuse selection in this phase.
- [ ] Bind semantic profile, encoding, lane count, illegal codes, tail policy,
  alignment, endianness, integrity model, numeric model, target/provider set,
  toolchain and work bounds.
- [ ] Make `planRepresentationProfile(request)` return a frozen candidate plan
  or typed refusal. It cannot return a VOK decision, lease or `ALLOW`.
- [ ] Prove deterministic same-input identity, hostile record refusal and that
  unavailable scalar ends admission rather than falling through to another
  runtime.

### Task 8: Independently decode the Galerina artifact references

**Files in `../SLIDE`:**
- Create: `src/galerina-artifact-reference.mjs`
- Create: `tests/galerina-artifact-reference.test.mjs`

- [ ] Implement an independent closed decoder for
  `galerina.artifact-reference.v1`; do not import the Galerina validator.
- [ ] Require kind, SHA-256 digest and safe byte length; reject surplus,
  duplicate-key, accessor/proxy, malformed digest and wrong-kind records.
- [ ] The physicalizer intake accepts only `canonical-gir`; the package reader
  accepts only `physical-slide`. Refuse every other kind, including
  `fungi-source` and `checked-module-snapshot`.
- [ ] Read through a captured repository capability and recompute the digest
  before returning an owned `Uint8Array`.
- [ ] Differentially prove Galerina writer/SLIDE reader agreement and mutation,
  path-substitution, short-read and backend-fault refusal.

### Task 9: Compile detached GIR to one scalar physical `.slide`

**Files in `../SLIDE`:**
- Create: `src/checked-module-snapshot-scalar-compiler.mjs`
- Create: `tests/checked-module-snapshot-scalar-compiler.test.mjs`
- Reuse unchanged: `src/v2c-general-executor.mjs`
- Reuse unchanged: `src/reference-slide-bundle.mjs`
- Reference only; do not call from the detached path:
  `src/checked-fungi-pure-scalar-compiler.mjs`
- Reference only; do not call from the detached path:
  `src/checked-fungi-slide-compiler.mjs`

- [ ] Write a failing test showing that raw `.fungi` source, AST-shaped data or
  caller-precomputed GIR success cannot enter the new compiler.
- [ ] Accept only verified canonical-GIR artifact bytes plus the active scalar
  profile plan and complete run identity.
- [ ] Pass the emitted CBOR bytes unmodified to the existing
  `prepareV2CExecution` surface and require its parent-registry validation.
  Package the validated bytes with `encodeReferenceSlideBundle`; add no GIR
  decoder, registry entry or source frontend.
- [ ] Derive a closed one-node reference action DAG. Execute it through the
  named `slide.serial-reference-coordinator.v1` contract in-process with cache
  disabled. This is not DFE; its output is toolchain/work evidence, never an
  admission verdict.
- [ ] Materialize physical bytes once and bind GIR digest, scalar profile,
  target/provider, compiler/linker/toolchain, integrity/numeric profile, policy,
  resources and serial-reference action identity into the package manifest.
- [ ] Prove source/snapshot/GIR/profile/toolchain/target mutation changes or
  refuses physical identity. Missing or altered serial-reference contract
  refuses. Missing production DFE takes the same full non-reuse serial path and
  is not a refusal.
- [ ] Do not call either source-frontending checked-Fungi compiler from this
  route.
- [ ] Keep the existing checked-Fungi scalar compiler as bounded prior evidence;
  do not call it proof that the new detached-GIR ingress is complete.
- [ ] Add an end-to-end assertion inside SLIDE's own focused suite that the exact
  Galerina-emitted bytes enter `prepareV2CExecution` without translation.

### Task 10: Extend the Lyth adapter without giving it authority

**Files in `../lyth-weaver`:**
- Modify: `tools/adapter/adapter.ts`
- Modify: `tools/adapter/kat-adapter.ts`
- Modify: `tools/admission/schema.ts`
- Modify: `tools/admission/kat-schema.ts`

- [ ] Add a failing fixture for a real scalar package whose source, snapshot,
  GIR, physical package, profile, toolchain, policy or target digest is altered.
- [ ] Introduce `lyth.admission-work.v2` with one separately length-framed
  `checkedSnapshotIdentity` field. Do not pack snapshot and GIR digests into
  `proofInputIdentity`; v1 and v2 keys must remain domain-separated.
- [ ] Extend `tools/adapter/adapter.ts` with the exact detached-scalar lane. Read
  physical bytes by verified `(owner,kind,digest)` reference; never trust a path or
  producer success boolean. `tools/admission/schema.ts` owns only the closure
  key and must not parse packages.
- [ ] Inspect/extract the existing reference bundle, re-decode the canonical
  GIR structure, recompute its byte identity and static-all-paths work bound,
  and populate the v2 closure. Do not call `compileV2CReferenceSource` or claim
  that Lyth proved the source-to-GIR lowering.
- [ ] Refuse `sourcePath` or `entryFunction` in the same bundle record as the
  detached-scalar lane. Keep cost bases mutually exclusive, as
  `declaredCost` already is in `tools/adapter/adapter.ts`; add a KAT for the
  rejected combination.
- [ ] Give Lyth only a compute-scoped immutable package/GIR input capability.
  Galerina and SLIDE must not know or address Lyth's cache keys, storage paths,
  schema objects or retained proof-work state; only the typed evidence result
  crosses back out.
- [ ] Return only retained
  evidence or typed refusal/indeterminate. Preserve the structural absence of
  an `ALLOW` result.
- [ ] Prove cache hit means “proof bytes eligible for SLIDE re-derivation,” not
  admission. Stale key/revocation epoch, provenance mismatch or store fault must
  force full recomputation/refusal.
- [ ] Do not promote laboratory `ReuseStore` to a production store. If the DFE
  domain/host is absent, perform full non-reuse proof work. Missing production
  DFE is expected in this phase and is not a blocker; forged or inconsistent
  cache evidence is a refusal.

### Task 11: Re-admit independently in SLIDE and mint VOK v3 receipts

**Files in `../SLIDE`:**
- Create: `src/typed-package-execution-receipt-v3.mjs`
- Create: `tests/typed-package-execution-receipt-v3.test.mjs`
- Create: `tests/detached-scalar-vok-boundary.test.mjs`
- Reuse unchanged: `src/vok-component-boundary.mjs`
- Reuse unchanged: `src/verified-object-kernel.mjs`

- [ ] Do not reinterpret receipt v2. Define v3 with exact fields for source,
  snapshot, canonical GIR, representation profile, physical package, target,
  provider, toolchain, integrity, numeric model, execution policy, Lyth evidence,
  SLIDE admission, VOK attempt/lease, input and terminal result/refusal/trap/
  cleanup identities.
- [ ] Independently re-import physical `.slide` bytes and re-derive every gate.
  Lyth evidence is an input to verification, never a decision.
- [ ] Before admission, define one closed
  `slide.detached-scalar-identity.v3` VOK schema containing the source,
  snapshot, GIR, profile, physical, target/provider, toolchain, integrity,
  policy and Lyth-evidence identities as `sha256` fields. Use
  `createVokEvidence` and `createVokProposal` and pass that live proposal to the
  unchanged component boundary. Do not staple identities onto an already
  completed receipt.
- [ ] Build `evidenceSetDigest` from a domain-separated canonical encoding of
  the pinned `runIdentity`, authority epoch and closed stage-ordered receipt
  digests. Verify every receipt preimage contains that same run/epoch and the
  Envelope epoch equals it. Refuse cross-run splicing, pre-rotation evidence
  under a post-rotation Envelope, duplicate/missing stages and context drift.
- [ ] Retain the existing live VOK checks in addition to internal equality:
  Envelope epoch/context must match the host's current accepted context, the
  epoch/subject must not be revoked, and every stage receipt must authenticate
  under its declared owner/epoch. A self-consistent retired-epoch evidence set
  cannot be admitted.
- [ ] Compute `bindingDigest` as a domain-separated digest over the same
  canonical evidence bytes, but label it convenience/cross-check data rather
  than authentic authority; the kernel does not derive it from `binding`.
- [ ] Mint a VOK lease only from the admitted SLIDE result. Make it affine,
  bounded and exhaustively consumed exactly once.
- [ ] The v3 binder retains the live evidence and proposal handles, the opaque
  boundary lease handle, returned admission/lease digests and final live VOK
  receipt handle from the **same orchestration**. Authenticate evidence,
  proposal and receipt with `inspectVokObject`; the lease handle is used only by
  boundary `enter`/`consume`. Refuse digest-only/copy-shaped inputs and any
  attempt to wrap the same receipt with different evidence.
- [ ] Map detailed v3 terminal classes onto the unchanged kernel outcomes:
  success→`SUCCEEDED`, refusal→`REFUSED`, trap/cleanup-failure→`FAILED`. Do not
  add a ninth gate or a new kernel terminal outcome.
- [ ] Add mutation negatives for every receipt field, physical bytes, Lyth
  evidence, gate order, profile and result. Add replay, double-consume,
  cancellation, trap and cleanup-failure vectors.
- [ ] Prove a profile fallback request produces a new plan/package/admission/
  receipt chain and cannot reuse the prior lease.

### Task 12: Prove the complete scalar chain and retained component boundaries

**Files:**
- Create:
  `packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs`
- Create:
  `packages-galerina/galerina-core-compiler/tests/retained-tower-tri-boundaries.test.mjs`
- Reuse Tower package:
  `packages-galerina/galerina-tower-citizen/`
- Reuse Tri-Pipe package:
  `packages-galerina/galerina-tri-pipe/`
- Reuse Tri-Fuse compiler tests:
  `packages-galerina/galerina-core-compiler/tests/wat-tri-fuse-a-elision.test.mjs`
  and
  `packages-galerina/galerina-core-compiler/tests/wat-tri-fuse-b-deny-sentinel.test.mjs`

- [ ] In a fresh process, run one ordinary bounded `.fungi` family through:
  source bytes → checked snapshot → verified repository read → detached GIR →
  scalar profile plan → named serial-reference work → physical `.slide` → Lyth
  evidence → independent SLIDE admission → VOK lease → bounded execution →
  terminal v3 receipt.
- [ ] Execute a seeded mutation sweep at every arrow and require zero mutated
  artifact/evidence/receipt paths to authorize.
- [ ] Prove there is no import or runtime edge from Hypha into this chain and no
  artifact body is written to the graph/index.
- [ ] Prove VOK owns lease capability, sink entry, outcome consumption and the
  terminal receipt. Tower may be a selected sink, but it cannot mint, consume,
  revoke or reinterpret the lease; its authenticated evidence can only inform
  a new VOK attempt.
- [ ] Keep the WAT Tri-Fuse tests as historical evidence only; WAT is forbidden
  on the detached route. Prove structurally that a Tri-Pipe or Tri-Fuse proposal
  is non-authorizing. If a later Tri-Fuse implementation transforms
  already-admitted bytes, require a new physical artifact and full fresh
  admission.
- [ ] Do not require Tower, Tri-Pipe or Tri-Fuse execution inside the ten-source
  converter pilot; these tests establish boundaries, not artificial workload.

**Phase 3 stop condition:** one straight-line/branching scalar `.fungi` family
inside the exact parent-registry limits must complete the entire chain with an
independently verified v3 receipt, and every planted mutation/fallback/
authority-substitution control must refuse. Existing checked-Fungi or v2
receipts alone do not satisfy this exit.

---

## Phase 4 — Controlled ten-source converter trial

### Task 13: Rebase the sandbox converter onto the detached scalar chain

**Files:**
- Modify: `scripts/lib/ts-to-fungi-sandbox/contracts.mjs`
- Modify: `scripts/lib/ts-to-fungi-sandbox/controller.mjs`
- Modify: `scripts/lib/ts-to-fungi-sandbox/evidence.mjs`
- Modify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Modify: `scripts/fixtures/ts-to-fungi-sandbox-pilot.json` only after each
  source identity is byte-pinned and graph-first discovery or the bounded
  fallback is complete

- [ ] First reconcile and preserve the current user-owned converter changes.
  Record their baseline before editing overlapping files.
- [ ] Add terminal outcomes `CONVERTED`, `BLOCKED` and `MANUAL_REVIEW`; unsupported
  syntax/semantics is logged per sibling and never stops the other nine.
- [ ] Keep the source `.ts` byte-for-byte and rehash before analysis, before
  publication and after the batch.
- [ ] Replace the old direct AST→`emitGIR` evidence route with the exact Tasks
  3–12 chain. Absence of any snapshot/GIR/profile/Lyth/SLIDE/VOK evidence is
  `MANUAL_REVIEW`, never converted.
- [ ] Bind each run identity to TypeScript source digest, converter version,
  classifier/lowerer ruleset digest, emitted `.fungi` digest, checked snapshot,
  GIR, physical package, scalar profile and terminal v3 receipt. The `.ts`
  comparator is a bare `sha256:` run-identity field and never an admitted
  artifact reference.
- [ ] Enforce 1..10 unique requests per invocation. The test invocation uses
  exactly ten; never run the entire queue.

### Task 14: Enforce duplicate/shadow and commit-shape gates

**Files:**
- Create: `scripts/lib/fungi-shadow.mjs`
- Modify: `scripts/audit-conversion-report-commit.mjs`
- Modify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Modify: `scripts/tests/audit-conversion-report-commit.test.mjs`

- [ ] Factor the exact and identifier-alpha fingerprint/corpus comparison into
  `scripts/lib/fungi-shadow.mjs`, imported by both the commit audit and sandbox.
  Preserve literal values, types, operators and control-flow shape.
- [ ] Compare each outside-worktree pilot candidate against the tracked plus
  untracked real `.fungi` corpus and adjacent siblings before publication.
- [ ] Check every candidate against adjacent twins and the complete corpus;
  refuse before publication on either collision.
- [ ] During Phases 1–4 run worktree checks with `--uniqueness-only`. Enforce the
  report-bearing commit census only with `--commit <rev>`: at least 40 **added**
  unique real `.fungi`, expected 50 (advisory), at most one report delta; final
  tail only via `--allow-final-report-only`.
- [ ] Change `--worktree --uniqueness-only` so zero new `.fungi` files is a
  successful checked state that prints `uniqueness-only checked 0 new .fungi
  files`; add the positive test. Keep the non-empty requirement inside the
  sandbox candidate check in `fungi-shadow.mjs` and the commit census.
- [ ] Add a negative test where two report files change and prove the audit
  refuses even when the `.fungi` count is sufficient.
- [ ] Add a negative test for 39 `.fungi`, exact duplicate, alpha shadow,
  test-overlay-only paths and a report-only cycle.

### Task 15: Run only the bounded pilot and decide whether conversion remains paused

**Files:**
- Candidate outputs only beneath a fresh OS temporary/sibling scratch directory
  outside the Galerina worktree; do not register or commit them during the
  ten-source trial.
- Update this plan's checkboxes only after exact evidence exists.

- [ ] Use the graph first. If its build point is fresh, use it for discovery. If
  freshness is `UNKNOWN`/stale, record that state and use the documented bounded
  fallback: pinned tracked path + SHA-256 + byte range + symbol, Myco
  `--no-refresh`, `packageGraph.loadedAssets`, and tracked/untracked `.fungi`
  census. A conflict is `BLOCKED`; an incomplete fallback is `MANUAL_REVIEW` for
  that sibling only. Graph absence alone is not authority failure.
- [ ] Run exactly ten pinned source requests; do not continue into the queue.
- [ ] Confirm converted siblings have the full detached scalar v3 chain;
  blocked/manual siblings have exact stable reasons; all `.ts` hashes remain
  unchanged.
- [ ] Run the duplicate/shadow audit, detached-authority audit, brand/JS seam
  audit, focused compiler tests, SLIDE tests, Lyth KATs and conversion audit.
- [ ] Keep bulk conversion paused unless every Phase 1–3 stop condition remains
  green and the pilot contains no unexplained authority or identity gap.
- [ ] Do not commit the pilot as conversion progress. Run as many bounded
  ten-source trials as needed; blocked/manual outcomes mean four trials need not
  yield forty conversions. A candidate contributes to the census only when it
  is deliberately copied/staged into a later conversion commit.

---

## Required verification commands

Run from each owning repository after the corresponding task, adjusting only
package-native command wrappers—not the asserted test scope:

```powershell
# Galerina focused gates
node --test scripts/tests/detached-slide-authority-path.test.mjs
node --test scripts/tests/trit-verdict-js-seam.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/artifact-reference.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/checked-module-snapshot-v1.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/checked-snapshot-gir-emitter.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/detached-scalar-handoff.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/retained-tower-tri-boundaries.test.mjs
node --test scripts/tests/ts-to-fungi-sandbox.test.mjs
node scripts/audit-conversion-report-commit.mjs --worktree --uniqueness-only

# SLIDE focused gates
node --test tests/representation-profile-registry.test.mjs
node --test tests/galerina-artifact-reference.test.mjs
node --test tests/checked-module-snapshot-scalar-compiler.test.mjs
node --test tests/typed-package-execution-receipt-v3.test.mjs
node --test tests/detached-scalar-vok-boundary.test.mjs

# Lyth focused KATs
npx tsx tools/adapter/kat-adapter.ts
npx tsx tools/admission/kat-schema.ts
npx tsx tools/admission/kat-domain-capability.ts
```

After code/docs are committed in an owning repository, refresh its registered
indexes and graph. For codebase-memory, require all of:

- `status: "indexed"`;
- `nodes` close to `expected_nodes`;
- `indexed_head_sha` exactly equal to the new commit;
- `stale: false` from `index_status`;
- one newly introduced symbol returned by `search_graph`.

If any item is missing, graph freshness remains `UNKNOWN`; never present the
index as fresh. Converter discovery then uses the bounded exact-byte fallback
from Task 15. A conflicting or incomplete fallback blocks/holds only the
affected sibling.

## Self-review checklist

- [ ] The chain has exactly one semantic owner (Galerina), one independent
  physical admission owner (SLIDE) and one lease/receipt owner (VOK).
- [ ] The scalar route uses the named serial-reference coordinator; production
  DFE is a later optional non-authorizing scheduler/cache host.
- [ ] Lyth has no representable `ALLOW` result and cached work never becomes
  authority.
- [ ] Tower, Tri-Pipe and Tri-Fuse are retained without being pulled into the
  translation-only pilot.
- [ ] Hypha remains a passive candidate-fact/freshness detector; the separate
  graph remains a reconstructible index; no body or authority crosses either.
- [ ] Every body crosses a typed `(owner,kind,digest)` reference and is rehashed on
  read.
- [ ] Every block owns its own memory; cross-block callers know only the typed
  compute transfer, never the other block's repository, cache or live state.
- [ ] Run identity and VOK authority epoch are present in every stage receipt;
  evidence cannot be spliced across runs or relabelled after context rotation.
- [ ] Retention is owner-local and digest-versioned; supersession cannot delete
  another live run's pinned body or pause unrelated queues.
- [ ] Scalar is the only active profile; 64/256/32 cannot execute yet.
- [ ] No accepted post-snapshot route reads AST/source/TypeScript/WAT/Wasm or
  performs runtime fallback.
- [ ] Receipt v3 binds semantic, representation, physical, target, toolchain,
  integrity, policy, execution and terminal-result identities.
- [ ] The converter runs ten, keeps `.ts`, logs what it cannot convert and does
  not create a report-bearing commit below 40 added unique real `.fungi` files.
- [ ] A second report delta, duplicate or shadow is a hard stop.
- [ ] No plan checkbox is marked complete from historical green tests alone;
  each requires fresh task-local evidence.
