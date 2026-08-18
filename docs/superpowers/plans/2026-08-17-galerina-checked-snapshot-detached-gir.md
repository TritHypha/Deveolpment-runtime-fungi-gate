# Galerina Checked-Snapshot and Detached-GIR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Use `superpowers:test-driven-development` for every production surface and the detached-authority audits from the companion detector plan before accepting the route.

**Goal:** Add a content-addressed, owner-local artifact boundary; seal checked compiler semantics into immutable `CheckedModuleSnapshotV1` bytes; lower the bounded scalar family to canonical GIR without AST access; and expose an explicit reference-only runtime/CLI route.

**Architecture:** Galerina remains the owner of source, checked snapshot and canonical GIR artifacts. Each stage writes owned bytes to an owner-local repository, transfers only a typed reference plus authenticated stage evidence, rereads and rehashes before use, and refuses on context rotation or retention loss. The detached emitter consumes only verified snapshot bytes. Existing `emitGIR(ast, ...)`, semantic graph, passive execution-plan and interpreter paths remain bootstrap/differential routes and are never fallback authority for the accepted detached mode.

**Tech Stack:** Strict TypeScript, Node.js crypto and filesystem APIs, canonical CBOR compatible with `slide.semantic.executable-gir.v2`, `node:test`, existing Galerina compiler checkers, existing SLIDE parent GIR registry.

## Global Constraints

- [ ] Execute only after the detector plan is green and registered.
- [ ] Start from an owner-approved clean baseline in an isolated worktree. Preserve the shared checkout's uncommitted converter and `.fungi` work.
- [ ] Do not modify `gir-emitter.ts` or reinterpret `emitGIR(ast, ...)` as detached authority.
- [ ] Keep Galerina, SLIDE, Lyth and VOK storage separate. References carry identifiers, digests, lengths and provenance—not repository paths or source bodies.
- [ ] The graph/index receives locators and relationships only. It must not receive artifact bodies, source text, secret bytes, live capabilities or private VOK state.
- [ ] No runtime fallback may cross from detached mode to WAT/Wasm, the AST interpreter, Tower, Tri-Pipe, Tri-Fuse, Hypha or cached TypeScript output.

---

## Task 1: Add the artifact reference and owner-local repository contract

**Files:**

- Create: `packages-galerina/galerina-core-compiler/src/artifact-reference.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/artifact-reference.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [ ] Write failing tests for malformed schemas, unknown owners/kinds, illegal owner/kind pairs, malformed SHA-256, unsafe lengths, surplus/inherited/accessor/proxy fields, backend throws, missing/short/oversized bodies, one-byte mutation, replica mismatch and wrong-owner reads.
- [ ] Define and export the exact interfaces from the adopted design:

  ```ts
  export interface ArtifactReferenceV1 {
    readonly schema: "galerina.artifact-reference.v1";
    readonly owner: "galerina" | "slide" | "lyth" | "vok" | "dfe" | "tower";
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
    read(reference: ArtifactReferenceV1 & { readonly owner: O }): Promise<Uint8Array>;
    write(kind: ArtifactReferenceV1["kind"], bytes: Uint8Array):
      Promise<ArtifactReferenceV1 & { readonly owner: O }>;
  }
  ```

- [ ] Implement exact-own-data decoders for references and transfers. Capture fields once; reject getters/proxies before using values.
- [ ] Enforce legal ownership: Galerina source/snapshot/GIR, SLIDE physical package, Lyth evidence and VOK receipt. Keep DFE/Tower as explicitly non-authorizing future/input references.
- [ ] Implement a bounded test filesystem repository under a supplied temporary root. Use digest-derived filenames internally but never expose them in the reference.
- [ ] Copy input bytes before hashing/writing and return new owned bytes on every read. Verify declared length and SHA-256 on every read.
- [ ] Add an opaque retention-pin test capability keyed to `(owner, kind, digest, runIdentity, acquirer, expiry)`. The serialized transfer contains no pin handle and `runIdentity` is not retention authority.
- [ ] Test idempotent release, expired/lost pin refusal, supersession that preserves pinned older content and failure of only the affected run.
- [ ] Export decoders, reference constructors and test-repository factory from `src/index.ts` in a dedicated `Detached artifact boundary` section.
- [ ] GREEN command:

  ```powershell
  npm --prefix packages-galerina/galerina-core-compiler run build
  node --test packages-galerina/galerina-core-compiler/tests/artifact-reference.test.mjs
  ```

## Task 2: Define the closed checked-snapshot schema

**Files:**

- Create: `packages-galerina/galerina-core-compiler/src/checked-module-snapshot.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/checked-module-snapshot-v1.test.mjs`
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/checked-module-snapshot-v1.fungi`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [ ] Begin with a failing exact-schema test covering missing and surplus root/fact fields, duplicate IDs, out-of-order facts, invalid spans, unsupported edition/profile, malformed diagnostics and hostile record shapes.
- [ ] Define a closed `CheckedModuleSnapshotV1` body with these ordered sections:
  `schema`, `edition`, `sourceIdentity`, `compilerIdentity`, `checkerIdentities`,
  `declarations`, `resolvedTypes`, `effects`, `valueStates`, `governanceFacts`,
  `constants`, `sourceSpans`, `diagnostics`, `entryFlowId`, `limits` and `traceFacts`.
- [ ] Use stable integer IDs for declarations, types, facts and spans. Every referenced ID must exist exactly once; every executable trace fact must point to one admitted source span and checker identity.
- [ ] Define `SnapshotRunIdentityV1` over source digest, snapshot schema, compiler commit, ordered checker/ruleset digests and snapshot-body digest.
- [ ] Permit only data needed by the first scalar family: primitive integer/Boolean/Trit/Verdict values, closed local declarations, direct calls within depth 2, straight-line blocks and bounded conditional branches. Refuse loops/back edges, effects, callbacks, dynamic dispatch, host capabilities and unsupported types at sealing time.
- [ ] Canonicalize once into owned bytes and deep-freeze the decoded view. The snapshot must contain no `AstNode`, parser token object, callback, class instance, `Map`, `Set`, source-object alias or host capability.
- [ ] Make `checked-module-snapshot-v1.fungi` express the schema/refusal invariants using valid v0.1 syntax. It is a contract sibling, not proof that the TypeScript implementation is retired.
- [ ] Add mutation tests: alter original source/tokens/facts after sealing and prove stored bytes remain unchanged; alter stored bytes and prove verification refuses.
- [ ] Add a source/snapshot split test: valid facts from source A combined with source digest B must refuse before repository write.
- [ ] GREEN commands:

  ```powershell
  npm --prefix packages-galerina/galerina-core-compiler run build
  node --test packages-galerina/galerina-core-compiler/tests/checked-module-snapshot-v1.test.mjs
  npm run audit:fungi-golden
  ```

## Task 3: Build the snapshot sealer at the last trusted AST point

**Files:**

- Create: `packages-galerina/galerina-core-compiler/src/seal-checked-module-snapshot.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/seal-checked-module-snapshot.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [ ] Expose one internal compiler boundary:

  ```ts
  export function sealCheckedModuleSnapshot(input: {
    readonly sourceBytes: Uint8Array;
    readonly sourceFile: string;
    readonly parseResult: ParseResult;
    readonly checkerEvidence: CheckedModuleEvidenceV1;
    readonly compilerIdentity: CompilerIdentityV1;
  }): CheckedModuleSnapshotSealResult;
  ```

- [ ] Capture the source bytes, parse/checker results and identities once. Do not reread the source path after capture.
- [ ] Require parser, symbol, type, effect, value-state and governance stages to have completed without blocking diagnostics. Never accept a caller-precomputed `ok: true` or success Boolean in place of stage evidence.
- [ ] Derive only the bounded snapshot facts needed by Task 2. Unsupported syntax returns `UNSUPPORTED_SNAPSHOT_SEMANTIC`; it does not omit the construct.
- [ ] Return owned snapshot bytes, a Galerina `checked-module-snapshot` reference after repository write and the ordered stage receipt preimages.
- [ ] Test phase-order changes, checker-result substitution, diagnostic omission, source mutation between parse and seal and caller-minted evidence records.
- [ ] Use the detached-authority audit to mark this function as the final legal AST consumer. The transitive closure beginning at Task 4 must not reach it.

## Task 4: Implement detached snapshot-to-GIR lowering

**Files:**

- Create: `packages-galerina/galerina-core-compiler/src/checked-snapshot-gir-emitter.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/checked-snapshot-gir-emitter.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [ ] First add a RED structural test over the emitter's transitive import closure. It must reject reachability to `parser.ts`, `gir-emitter.ts`, `SemanticGraphBuilder`, either `buildExecutionPlan`, the TypeScript API, callbacks or ambient registries.
- [ ] Expose:

  ```ts
  export function emitCanonicalGIRFromSnapshot(
    snapshotBytes: Uint8Array,
    expected: ArtifactReferenceV1,
  ): DetachedGIREmissionResult;
  ```

- [ ] Decode and verify the snapshot reference/bytes independently. Reject a caller's decoded snapshot object; the accepted entry takes bytes plus reference only.
- [ ] Emit canonical `slide.semantic.executable-gir.v2` CBOR for the existing parent registry `slide.registry.executable-gir.v2c`, digest `366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66`, memory profile `slide.memory.safe-value.v1` and its exact registered 21-key root/21-element limits.
- [ ] Bound the family to at most 3 functions, 8 blocks, 32 instructions, call depth 2, no back edges and conservative work 96.
- [ ] Support only the exact scalar opcodes/types/descriptors accepted by the SLIDE parent registry. Every other fact returns `UNSUPPORTED_SNAPSHOT_SEMANTIC`; no partial GIR is emitted.
- [ ] Emit a complete ordered source-to-GIR trace. Every executable instruction and terminator has exactly one snapshot fact/source-span origin; no executable node is unclaimed.
- [ ] Double-lower identical snapshot bytes and require byte-for-byte identity. Mutating any referenced fact, registry identity, limit or span must change output identity or refuse.
- [ ] Compare one test-only bounded program with the established SLIDE reference compiler oracle. The production emitter may not import or call that frontend.
- [ ] GREEN commands:

  ```powershell
  npm --prefix packages-galerina/galerina-core-compiler run build
  node --test packages-galerina/galerina-core-compiler/tests/checked-snapshot-gir-emitter.test.mjs
  npm run audit:detached-slide-authority-path
  npm run audit:trit-verdict-js-seam
  ```

## Task 5: Add an explicit detached runtime result without executing it

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/runtime.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/detached-scalar-handoff.test.mjs`

- [ ] Add a distinct runtime mode literal `detached-reference` to `RuntimeMode`. Do not change the behavior of `dev`, `check-only`, `production` or `deterministic` in this task.
- [ ] Define the successful detached result as references and transfer evidence only:

  ```ts
  export interface DetachedScalarHandoffResult {
    readonly ok: true;
    readonly mode: "detached-reference";
    readonly sourceReference: ArtifactReferenceV1;
    readonly snapshotReference: ArtifactReferenceV1;
    readonly girReference: ArtifactReferenceV1;
    readonly transfer: ComputeTransferV1;
    readonly runIdentity: `sha256:${string}`;
    readonly authorityReleased: false;
  }
  ```

- [ ] In `run()`, branch immediately after the normal admission/checker stages. Seal, write, reread and verify the snapshot; then call the detached emitter and write/reread the GIR. Return the handoff without entering current GIR proof-chain construction, contract execution, the AST interpreter, WAT/Wasm or attestation.
- [ ] The legacy `emitGIR(parseResult.ast, ...)`, `buildExecutionPlan(parseResult.ast, ...)` and `buildSemanticGraph(parseResult.ast, ...)` calls remain reachable only in explicitly non-detached modes.
- [ ] Replace broad catches with one closed detached refusal union carrying a stable `failureId`. Do not translate backend or downstream absence into `ok: true`.
- [ ] Test source/AST/registry mutation after snapshot sealing; detached GIR bytes must be unchanged or refuse. Test missing repository, stale reference, context rotation and pin expiry.
- [ ] Add a structural test proving the `detached-reference` branch cannot call `executeFlow`, `emitWAT`, Wasm assembly/runtime, Tower, Tri-Pipe, Tri-Fuse or Hypha.

## Task 6: Add a CLI command that emits references, not bodies

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
- Modify: `packages-galerina/galerina-core-compiler/tests/detached-scalar-handoff.test.mjs`

- [ ] Add `build-detached-scalar` as an explicit CLI mode. It invokes the detached runtime/compiler boundary and prints one versioned JSON handoff record.
- [ ] The JSON output contains artifact references, transfer/run identity, authority epoch/context digest and typed refusal only. It must not contain source, snapshot or GIR bodies, repository paths or live handles.
- [ ] Require an explicit repository root argument or captured repository capability. Do not infer a universal store or use the graph/index as storage.
- [ ] Make missing arguments, stale context and unavailable repositories hard refusals with non-zero exit status.
- [ ] Keep existing `build`, `build-production`, `build-deterministic`, WAT and Wasm commands unchanged and clearly marked as bootstrap/differential routes.
- [ ] Add CLI tests for valid handoff, malformed args, missing repository, no body leakage, no absolute path leakage and stable same-input reference identities.

## Task 7: Defer the sandbox converter seam deliberately

**Files:**

- Future modify only after ownership reconciliation: `scripts/lib/ts-to-fungi-sandbox/evidence.mjs`
- Future modify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [ ] Do not edit converter files in this implementation slice. The current shared checkout contains user-owned converter changes.
- [ ] Record a follow-up requirement: replace any direct `emitGIR(parsed.ast, ...)` converter evidence with `sealCheckedModuleSnapshot` plus `emitCanonicalGIRFromSnapshot` only after Tasks 1–6 are green.
- [ ] Until that follow-up lands, converter output cannot claim detached scalar admission and bulk conversion stays paused.

## Task 8: Verify and locally commit the Galerina compiler slice

- [ ] Run focused tests from Tasks 1–6.
- [ ] Run the core compiler typecheck and full package test suite.
- [ ] Run both detached audits with a planted-red control and a clean real closure.
- [ ] Run case-collision, exact-byte duplicate and normalized shadow checks on every changed/new file, including `checked-module-snapshot-v1.fungi`.
- [ ] Confirm no conversion report is in the diff. The 40-new-`.fungi` report-bearing commit gate is therefore not applicable; this implementation commit contains one contract `.fungi`, not a conversion wave.
- [ ] Stage explicit paths only, commit locally and do not push.
- [ ] Refresh codebase-memory in moderate mode and verify `status=indexed`, `nodes` close to `expected_nodes`, `indexed_head_sha` equals the new commit and `stale=false`. Probe `emitCanonicalGIRFromSnapshot` by exact qualified name.

## Exit Criteria

- A fresh process can reproduce canonical GIR from verified snapshot bytes without source or AST objects.
- Detached mode returns references and transfer evidence without executing the program.
- Any AST, TypeScript, WAT/Wasm, Tower, Tri-Pipe, Tri-Fuse or Hypha dependency after sealing is refused by a red-capable audit.
- Legacy compiler/runtime routes remain present but cannot be mistaken for accepted detached authority.
