# Generic Runtime Authority Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Completed steps use checkbox (`- [x]`) syntax; pending steps use (`- [ ]`).

**Goal:** Add an opt-in `Authority<Tag>` type whose bindings move on transfer,
refuse duplicate use and cannot cross serialization or persistent-storage
boundaries, then use it in a non-authorizing native VOK `.fungi` contract.

**Architecture:** `Authority<Tag>` is a built-in generic family recognized by
the type checker. Named aliases are collected by the value-state checker,
which tracks each authority binding as available or consumed. This is a narrow
authority mechanism, not a general borrow checker; the final native runtime
mint table and executable-memory loader remain separate future work.

**Tech Stack:** Galerina `.fungi`, strict TypeScript bootstrap compiler,
`node:test`, generated diagnostic/code indexes.

## Global Constraints

- Zero trust: unknown, malformed, stale or already-consumed authority refuses at `_=>`.
- `if` is for Boolean conditions only; use exhaustive `check`/`match` for K3 or multi-state decisions.
- Preserve ordinary value semantics, existing Passport behavior and governed `resource` meaning.
- No new runtime dependency, nested package tree, Wasm authority path or Node-only production claim.
- No code path may claim `authorityReleased: true`.
- Every behavior change follows RED -> GREEN -> broad verification.

---

### Task 1: Recognize the closed `Authority<Tag>` type family

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/type-checker.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/type-checker-authority.test.mjs`

**Interfaces:**
- Consumes: existing `parseTypeString`, generic arity/kind maps and `checkTypes`.
- Produces: `Authority<Tag>` with arity 1 and tag-kind validation; named aliases remain exact user-defined types.

- [x] **Step 1: Write the failing type tests**

```javascript
it("accepts a named Authority tag alias", () => {
  assert.deepEqual(errorCodes(`type Lease = Authority<"slide.vok.lease.v1">`), []);
});

it("refuses a missing Authority tag", () => {
  assert.ok(errorCodes(`type Lease = Authority`).includes("FUNGI-TYPE-009"));
});

it("refuses Authority with two arguments", () => {
  assert.ok(errorCodes(`type Lease = Authority<String, "tag">`).includes("FUNGI-TYPE-009"));
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
npm.cmd run build
node --test tests/type-checker-authority.test.mjs
```

Expected: at least the valid alias fails with unknown type or the invalid forms
are accepted because `Authority` is not registered.

- [x] **Step 3: Add the minimal generic registration**

Add `Authority` to `BUILT_IN_TYPES`, `GENERIC_ARITY` with arity 1,
`GENERIC_ARG_KINDS` with `tag`, and the generic example map. Reuse the existing
generic-arity diagnostic rather than inventing a duplicate fault code.

- [x] **Step 4: Run focused tests and existing Brand/hallmark tests**

```powershell
npm.cmd run build
node --test tests/type-checker-authority.test.mjs tests/type-checker-brand-tag-ref.test.mjs tests/hallmark.test.mjs
```

Expected: all pass; Brand and hallmark behavior is unchanged.

- [x] **Step 5: Commit the type-family slice**

```powershell
git add packages-galerina/galerina-core-compiler/src/type-checker.ts packages-galerina/galerina-core-compiler/tests/type-checker-authority.test.mjs
git commit -m "feat(compiler): recognize runtime authority types"
```

---

### Task 2: Enforce move-on-transfer and duplicate-use refusal

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/value-state-checker.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/value-state/authority-use-state.test.mjs`

**Interfaces:**
- Consumes: AST `typeDecl`, `paramDecl`, `letDecl`, `callExpr` and `returnStmt` nodes.
- Produces: `FUNGI-AFFINE-002 / AUTHORITY_CONSUMED_TWICE` with the first transfer as a related location.

- [x] **Step 1: Write failing transfer tests**

```javascript
it("refuses a second call transfer", () => {
  assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow useTwice(lease: Lease) -> Bool {
  consume.primary(lease)
  consume.secondary(lease)
  return true
}`).includes("FUNGI-AFFINE-002"));
});

it("moves on rebinding and refuses the source", () => {
  assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow moveThenReuse(lease: Lease) -> Bool {
  let moved: Lease = lease
  consume.primary(moved)
  consume.secondary(lease)
  return true
}`).includes("FUNGI-AFFINE-002"));
});

it("does not mark an ordinary value affine", () => {
  assert.equal(codes(`secure flow ordinary(x: String) -> Bool {
    consume.primary(x)
    consume.secondary(x)
    return true
  }`).filter((c) => c === "FUNGI-AFFINE-002").length, 0);
});
```

- [x] **Step 2: Run the focused test and confirm RED**

```powershell
npm.cmd run build
node --test tests/value-state/authority-use-state.test.mjs
```

Expected: duplicate authority uses do not yet emit `FUNGI-AFFINE-002`.

- [x] **Step 3: Implement alias and binding use-state**

Add one pre-pass that maps a `typeDecl` whose RHS base is `Authority` to its
alias/tag. Extend `BindingInfo` with exact `authorityType`, `consumed` and
`consumedAt`. Register authority parameters and typed lets. A direct identifier
initializer transfers the type and marks the source consumed. A call recursively
visits every leaf argument; first authority occurrence consumes it and every
later occurrence emits `FUNGI-AFFINE-002`.

Use one helper for state transition so rebinding, call and return paths cannot
drift:

```typescript
private consumeAuthorityBinding(name: string, at: SourceLocation | undefined): void
```

- [x] **Step 4: Add return-transfer and nested-wrapper tests**

```javascript
it("refuses reuse after returning an authority", () => {
  assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow returnThenReuse(lease: Lease) -> Lease {
  return lease
  consume.secondary(lease)
}`).includes("FUNGI-AFFINE-002"));
});

it("refuses authority containment in a nested list argument", () => {
  assert.ok(codes(`
type Lease = Authority<"slide.vok.lease.v1">
secure flow nestedDuplicate(lease: Lease) -> Bool {
  consume.wrapper([lease, lease])
  return true
}`).includes("FUNGI-AFFINE-004"));
});
```

Run the focused suite after adding each test and observe RED before extending
the walker, then GREEN afterward.

- [x] **Step 5: Run focused and Passport regression suites**

```powershell
npm.cmd run build
node --test tests/value-state/authority-use-state.test.mjs tests/value-state/affine-passport-typestate-0111.test.mjs
```

Expected: both suites pass and Passport still emits only
`FUNGI-AFFINE-001` for its existing fault.

- [x] **Step 6: Commit the use-state slice**

```powershell
git add packages-galerina/galerina-core-compiler/src/value-state-checker.ts packages-galerina/galerina-core-compiler/src/index.ts packages-galerina/galerina-core-compiler/tests/value-state/authority-use-state.test.mjs
git commit -m "feat(compiler): enforce authority use state"
```

---

### Task 3: Refuse serialization and persistent storage

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/value-state-checker.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `packages-galerina/galerina-core-compiler/tests/value-state/authority-use-state.test.mjs`

**Interfaces:**
- Consumes: exact authority binding metadata and existing serialization/sink classifiers.
- Produces: `FUNGI-AFFINE-003 / AUTHORITY_PERSISTENCE_FORBIDDEN`.

- [x] **Step 1: Write failing boundary tests**

Add individual tests for `json.encode(lease)`, a nested
`json.encode({ lease })`, `database.write(lease)`, `vault.write(lease)` and
`AuditLog.write(lease)`. Each must expect `FUNGI-AFFINE-003`.

- [x] **Step 2: Run the focused test and confirm RED**

```powershell
npm.cmd run build
node --test tests/value-state/authority-use-state.test.mjs
```

Expected: none of those calls yet emit the dedicated persistence diagnostic.

- [x] **Step 3: Implement the exact forbidden-boundary classifier**

Reuse `isSerializationCall` and add a closed persistent-sink predicate for the
already-recognized database, vault, cache and audit APIs. Recursively inspect
arguments. Emit `FUNGI-AFFINE-003` before consuming the handle; do not allow a
forbidden call to become the first valid transfer.

- [x] **Step 4: Verify focused tests**

```powershell
npm.cmd run build
node --test tests/value-state/authority-use-state.test.mjs
```

Expected: all authority boundary tests pass; ordinary serialization tests stay
free of affine diagnostics.

- [x] **Step 5: Commit the boundary slice**

```powershell
git add packages-galerina/galerina-core-compiler/src/value-state-checker.ts packages-galerina/galerina-core-compiler/src/index.ts packages-galerina/galerina-core-compiler/tests/value-state/authority-use-state.test.mjs
git commit -m "security(compiler): deny authority persistence"
```

---

### Task 4: Add the first native VOK authority contract

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/slide-vok-authority-types.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`
- Create: `packages-galerina/galerina-core-compiler/tests/slide-vok-authority-contract.test.mjs`

**Interfaces:**
- Consumes: `Authority<Tag>` and the existing strict compiler pipeline.
- Produces: exact VOK admitted-object and lease aliases, plus serializable evidence/receipt records that carry identities but no handle.

- [x] **Step 1: Write the failing loaded-asset contract test**

The test reads the future `.fungi` file, compiles it through the same strict
pipeline used by self-hosted assets, asserts zero diagnostics, asserts the two
exact authority tags, and asserts the source never contains
`authorityReleased: true`.

- [x] **Step 2: Run the test and confirm RED**

```powershell
npm.cmd run build
node --test tests/slide-vok-authority-contract.test.mjs
```

Expected: file-not-found or missing loaded asset.

- [x] **Step 3: Add the minimal `.fungi` contract**

Declare:

```fungi
type SlideVOKAdmittedObject = Authority<"slide.vok.admitted-object.v1">
type SlideVOKLease = Authority<"slide.vok.lease.v1">
```

Add closed evidence and receipt records containing schema IDs, action/object
digests, policy/revocation epochs and `authorityReleased: Bool`. Do not add a
minting or execution implementation in this task.

- [x] **Step 4: Add the asset to `packageGraph.loadedAssets` and verify**

```powershell
npm.cmd run build
node --test tests/slide-vok-authority-contract.test.mjs
```

Expected: the focused contract passes.

- [x] **Step 5: Commit the VOK contract slice**

```powershell
git add packages-galerina/galerina-core-compiler/src/self-hosted/slide-vok-authority-types.fungi packages-galerina/galerina-core-compiler/package.json packages-galerina/galerina-core-compiler/tests/slide-vok-authority-contract.test.mjs
git commit -m "feat(vok): add native authority type contract"
```

---

### Task 5: Regenerate diagnostics, reconcile docs and verify broadly

**Files:**
- Modify: `build/code-registry/REGISTRY.md` (generated)
- Modify: `build/code-index/CODE_INDEX.md` (generated)
- Modify: `docs/language/fungi/SYNTAX-REFERENCE.md`
- Modify: `packages-galerina/galerina-core/docs/type-system.md`
- Modify: `packages-galerina/galerina-core/examples/examples-manifest.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: `../ZTF-Knowledge-Bases/reference/language/compiler-diagnostics.md`
- Modify: `../ZTF-Knowledge-Bases/research/rd/RD-0659-generic-affine-runtime-authority-type.md`

**Interfaces:**
- Consumes: implemented code and fresh test counts.
- Produces: one factual current-state story; no native-runtime authority claim.

- [x] **Step 1: Document only implemented behavior**

Add `Authority<Tag>`, move-on-transfer and the three affine diagnostics to the language
references. Explicitly label general `move`/`borrow`, native minting and W^X
execution as unbuilt. Mark the completed RD-0659 evidence checkboxes only when
their tests passed.

- [x] **Step 2: Regenerate canonical code artifacts**

```powershell
node scripts/code-index.mjs
node scripts/gen-code-registry.mjs
```

Expected: the registry/index list `FUNGI-TYPE-035` and
`FUNGI-AFFINE-002..004` with definition, emission, test and documentation sites.

- [x] **Step 3: Run narrow-to-broad verification**

```powershell
npm.cmd --prefix packages-galerina/galerina-core-compiler test
node scripts/lint-conventions.mjs
node scripts/audit-doc-drift.mjs
node scripts/audit-diagnostic-doc-drift.mjs
node scripts/audit-reference-doc-drift.mjs
```

Then run the repository's canonical aggregate test command from `package.json`.
Expected: zero failures. Environmental Ubuntu, reboot/power-loss and elevated
native-link evidence remain explicitly pending.

- [x] **Step 4: Review the complete diff**

```powershell
git diff --check
git status --short
```

Check for private paths, secrets, full operational key IDs, generated noise,
`authorityReleased: true`, accidental resource/Passport changes and stale
counts.

- [x] **Step 5: Commit Galerina and KB documentation separately**

```powershell
git add -- build/code-registry/REGISTRY.md build/code-index/CODE_INDEX.md docs/language/fungi/SYNTAX-REFERENCE.md packages-galerina/galerina-core/docs/type-system.md packages-galerina/galerina-core/examples/examples-manifest.md docs/TODO.md docs/ROADMAP.md
git commit -m "docs: record authority type evidence"
git -C ..\ZTF-Knowledge-Bases add compiler-diagnostics.md RD-0659-generic-affine-runtime-authority-type.md
git -C ..\ZTF-Knowledge-Bases commit -m "docs: record authority compiler evidence"
```

No push.
