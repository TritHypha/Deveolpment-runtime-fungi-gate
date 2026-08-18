# Galerina Detached-Authority Detectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Use `codex-zero-trust-engineering` for the detector boundary and `codex-zero-trust-project-operations` for shared-worktree custody.

**Goal:** Add red-capable, fail-closed audits that prove the accepted detached compiler route cannot regain AST, TypeScript, WAT/Wasm, Tower, Tri-Pipe, Tri-Fuse or Hypha authority after a checked snapshot is sealed.

**Architecture:** The audits inspect a bounded, transitive ESM/TypeScript module closure rooted at explicitly named detached-route entry points. They produce a versioned JSON receipt containing the repository build point, ruleset digest, inspected files and forbidden edges. Static uncertainty, unresolved imports and truncation are refusals. The second audit covers erased Trit/Verdict seams, hostile JavaScript number/record behavior and authoritative canonical-byte hazards.

**Tech Stack:** Node.js ESM, `node:test`, repository-local tool registration, SHA-256 receipts, TypeScript compiler/parser facilities already present in the workspace.

## Global Constraints

- [ ] Start execution in an isolated worktree from an owner-approved clean baseline. The current shared checkout contains user-owned edits in `governance/phase-close-commands.json`, `scripts/audit-gate-selftests.mjs`, `scripts/lib/tooling-inventory.mjs`, `scripts/tests/gate-selftests.test.mjs` and `scripts/tests/tooling-contract.test.mjs`; do not overwrite, stage or commit them.
- [ ] Run codebase-memory discovery before source searches. Record `indexed_head_sha`, repository `HEAD` and freshness in the detector receipt. A stale or unavailable graph does not become a clean result.
- [ ] Do not add either audit to phase-close until its planted-red test proves the gate can fail.
- [ ] Use repository-relative paths in committed output. Do not persist source bodies, private content or absolute checkout paths in receipts or indexes.
- [ ] This plan changes detector tooling only. It does not modify compiler behavior, convert TypeScript, add conversion reports or claim any `.fungi` retirement.

---

## Task 1: Specify the detached-authority ruleset and planted controls

**Files:**

- Create: `scripts/tests/detached-slide-authority-path.test.mjs`
- Create: `scripts/tests/fixtures/detached-authority/green/entry.ts`
- Create: `scripts/tests/fixtures/detached-authority/red-ast/entry.ts`
- Create: `scripts/tests/fixtures/detached-authority/red-typescript/entry.ts`
- Create: `scripts/tests/fixtures/detached-authority/red-wasm/entry.ts`
- Create: `scripts/tests/fixtures/detached-authority/red-component/entry.ts`
- Create: `scripts/tests/fixtures/detached-authority/red-unresolved/entry.ts`

- [ ] Add a test named `green closure accepts snapshot bytes and typed GIR/refusal only`. Its fixture may import inert hashing/canonical-byte helpers, but its public entry receives only `Uint8Array` snapshot bytes plus an artifact reference and returns typed GIR bytes/reference or a typed refusal.
- [ ] Add table-driven RED tests for these exact forbidden edge classes:
  - `AST_REENTRY`: parser `AstNode`, AST visitors, `emitGIR(ast, ...)`, `buildSemanticGraph(ast, ...)`, `buildExecutionPlan(ast, ...)`.
  - `TYPESCRIPT_REENTRY`: `typescript`, `tsserver`, compiler API or the sandbox TypeScript classifier/lowerer after the snapshot boundary.
  - `LEGACY_EXECUTION_REENTRY`: WAT emitter, Wasm assembler/runtime, `runWasmStandaloneBuild` or cached legacy runtime execution.
  - `COMPONENT_AUTHORITY_BLEED`: Tower, Tri-Pipe, Tri-Fuse or Hypha imports/calls from the accepted detached route.
  - `UNRESOLVED_CLOSURE`: missing, dynamic, non-literal or outside-root imports that cannot be closed exactly.
- [ ] Assert each RED fixture exits non-zero and emits its exact failure identifier. A test that merely checks `violations.length > 0` is insufficient.
- [ ] Assert the JSON receipt contains only repository-relative file locators, edge identifiers, digests and freshness metadata; it must not contain fixture source bodies.
- [ ] Run the test before implementation and record the expected RED result: module-not-found for `scripts/audit-detached-slide-authority-path.mjs`.

## Task 2: Implement the bounded transitive closure audit

**Files:**

- Create: `scripts/audit-detached-slide-authority-path.mjs`
- Modify: `scripts/tests/detached-slide-authority-path.test.mjs`

- [ ] Implement the exported test surface:

  ```js
  export async function auditDetachedAuthorityPath({
    repoRoot,
    entryFiles,
    expectedHead,
    maximumFiles = 256,
    maximumEdges = 2048,
  }) {
    // returns a frozen DetachedAuthorityAuditV1 result
  }
  ```

- [ ] Define `DetachedAuthorityAuditV1` as an exact record with:
  `schema`, `toolVersion`, `rulesetDigest`, `repositoryHead`,
  `graphBuildPoint`, `graphFreshness`, `entryFiles`, `inspectedFiles`,
  `inspectedEdges`, `violations`, `status` and `failureId`.
- [ ] Parse static `import`, re-export and literal dynamic-import edges. Resolve only repository-local files under the explicit root. Reject package imports unless they are in the exact inert allow-list required by the detached route.
- [ ] Walk the closure once with canonical relative paths, case-sensitive duplicate detection and explicit file/edge ceilings. A ceiling hit is `DETACHED_AUTHORITY_ANALYSIS_TRUNCATED`, never PASS.
- [ ] Inspect imports and call/property surfaces so aliases cannot hide forbidden symbols. At minimum catch renamed imports and namespace calls such as `legacy.emitGIR(...)` and `ts.createProgram(...)`.
- [ ] Compute `rulesetDigest` from a stable, sorted encoding of the forbidden module/symbol rules rather than from display text.
- [ ] CLI behavior:
  - `0`: exact closure inspected and no forbidden edges.
  - `1`: one or more material forbidden edges.
  - `2`: malformed request, stale expected head, unresolved closure, truncation or internal error.
- [ ] Re-run `node --test scripts/tests/detached-slide-authority-path.test.mjs`; require all planted controls to fail for the intended reason and the green fixture to pass.

## Task 3: Specify hostile Trit/Verdict and canonical-byte controls

**Files:**

- Create: `scripts/tests/trit-verdict-js-seam.test.mjs`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/raw-trit.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/raw-verdict.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/hostile-record.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/caller-boolean.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/ambient-collation.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/non-injective-framing.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/unversioned-json.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/duplicate-key.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/live-typed-array.ts`
- Create: `scripts/tests/fixtures/trit-verdict-js-seam/green.ts`

- [ ] Add RED fixtures for raw `-1 | 0 | 1` integers crossing a Trit/Verdict boundary without a branded decoder, including `-0`, `NaN`, `Infinity`, `-Infinity`, fractions, boxed numbers and caller-mintable `success`, `verified`, `authorized` or `attested` booleans.
- [ ] Add RED fixtures for inherited, accessor, proxy, repeated-getter and validation/use-split record reads at an authority boundary.
- [ ] Add RED fixtures for authoritative bytes derived with ambient `localeCompare`, delimiter concatenation, unversioned `JSON.stringify`, duplicate keys or a caller-live `Uint8Array` without an explicit admitted copy/live-view contract.
- [ ] Add GREEN fixtures that use exact-own-data capture once, a closed branded Trit/Verdict decoder, versioned length-framed canonical bytes and an owned immutable byte snapshot.
- [ ] Require exact failure identifiers per vector: `TRIT_BRAND_ERASURE`, `VERDICT_BRAND_ERASURE`, `HOSTILE_RECORD_SPLIT_READ`, `CALLER_BOOLEAN_AUTHORITY`, `AMBIENT_COLLATION`, `NON_INJECTIVE_FRAMING`, `UNVERSIONED_JSON_AUTHORITY`, `DUPLICATE_CANONICAL_KEY` and `LIVE_TYPED_ARRAY_AUTHORITY`.
- [ ] Run the test before implementation and record the expected RED module-not-found result.

## Task 4: Implement and compose the JavaScript seam audit

**Files:**

- Create: `scripts/audit-trit-verdict-js-seam.mjs`
- Modify: `scripts/audit-detached-slide-authority-path.mjs`
- Modify: `scripts/tests/trit-verdict-js-seam.test.mjs`

- [ ] Export `auditTritVerdictJsSeam({ repoRoot, entryFiles, expectedHead })` with the same receipt/freshness discipline as Task 2.
- [ ] Use syntax-aware inspection; do not claim a source is clean from regex-only matches. When a construct cannot be classified exactly, emit `TRIT_VERDICT_SEAM_UNKNOWN` and exit 2.
- [ ] Treat the current TypeScript brand audit, mutation lab, sentinel countersign gate and conversion acceptance pack as independent evidence inputs. Record tool/ruleset digests; do not copy their logic into this audit.
- [ ] Make `audit-detached-slide-authority-path.mjs` invoke the seam audit for every accepted post-snapshot closure and propagate refusal without translating it into a Boolean PASS.
- [ ] Add a negative composition test: a structurally detached module with a caller-mintable `verified: true` must still be refused by the composed audit.
- [ ] Run:

  ```powershell
  node --test scripts/tests/detached-slide-authority-path.test.mjs
  node --test scripts/tests/trit-verdict-js-seam.test.mjs
  ```

## Task 5: Register only after red capability is proven

**Files:**

- Modify: `package.json`
- Modify: `governance/phase-close-commands.json`
- Modify: `scripts/audit-gate-selftests.mjs`
- Modify: `scripts/lib/tooling-inventory.mjs`
- Modify: `scripts/tests/gate-selftests.test.mjs`
- Modify: `scripts/tests/tooling-contract.test.mjs`
- Regenerate through registered publishers: `build/dev-tool-index/INDEX.md` and any owned generated assurance manifests.

- [ ] Stop before this task if the owner-owned baseline changes listed in Global Constraints have not been committed or explicitly reconciled.
- [ ] Add root scripts:

  ```json
  "audit:detached-slide-authority-path": "node scripts/audit-detached-slide-authority-path.mjs",
  "audit:trit-verdict-js-seam": "node scripts/audit-trit-verdict-js-seam.mjs"
  ```

- [ ] Register both tools using the repository's tooling inventory contract. Do not hand-edit generated index contents.
- [ ] Add self-test commands that run both GREEN and planted RED controls. The meta-gate must fail if a detector cannot demonstrate red capability.
- [ ] Add the two audits to ordinary phase-close only after the focused and meta-gate tests are green.
- [ ] Verify:

  ```powershell
  node --test scripts/tests/detached-slide-authority-path.test.mjs
  node --test scripts/tests/trit-verdict-js-seam.test.mjs
  node --test scripts/tests/gate-selftests.test.mjs
  node --test scripts/tests/tooling-contract.test.mjs
  node scripts/audit-gate-selftests.mjs
  npm run audit:detached-slide-authority-path
  npm run audit:trit-verdict-js-seam
  ```

## Task 6: Review and commit the detector slice

- [ ] Run a separate read-only review for false negatives, false positives, closure truncation and receipt/source-body leakage.
- [ ] Run case-collision, exact-byte duplicate and normalized shadow checks for every new or changed file.
- [ ] Confirm the diff contains no conversion report. Therefore the report-bearing 40-new-`.fungi` census is not applicable to this tooling commit.
- [ ] Stage only the explicit detector/test/registration/generated paths after reconciling the shared files. Do not stage converter work or untracked `.fungi` files.
- [ ] Commit locally; do not push.

## Exit Criteria

- Both audits have proven RED and GREEN controls.
- Unresolved or truncated closure analysis refuses.
- The composed audit catches authority bleed even when the import graph is otherwise clean.
- Phase-close registration is red-capable and generated indexes are publisher-owned.
- No compiler/runtime semantics have changed.
