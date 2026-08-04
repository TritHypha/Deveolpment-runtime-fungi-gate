# Canonical Records and Call Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `record Name { ... }` the only block-bodied product-type declaration, reject silently erased `type Name { ... }` declarations, remove capitalization as call authority, and enforce nominal, duplicate-free, exact-field record construction before Galerina emits executable evidence for SLIDE.

**Architecture:** The Stage-A TypeScript bootstrap remains the parsing and checking authority during this increment, while the self-hosted `.fungi` compiler remains an independently checked semantic twin. Parser syntax, symbol resolution, type adoption, execution, documentation, and the corpus migration are changed as one closed unit. A record literal is admitted only when declaration identity, literal identity, field uniqueness, field set, field types, and execution representation all allow; any unknown state refuses.

**Tech Stack:** TypeScript compiler bootstrap, Node test runner, Galerina `.fungi`, governed runtime/WAT emitter, repository devtools, generated code/capability indexes.

## Global Constraints

- Fail closed: no capitalization, spelling convention, warning, or unchecked metadata grants call or constructor authority.
- Preserve the explicit alias form `type Name = TypeRef`; reject only block-bodied `type Name { ... }`.
- Use `record Name { ... }` for product types and named record literals `Name { field: value }` for explicit nominal construction.
- An anonymous record literal may adopt an expected record type only when every declared field occurs exactly once, no surplus field exists, and every field type is assignment-compatible.
- Keep field ordering canonical by declaration order in emitted layout and receipts.
- Do not add raw pointers or developer-managed memory.
- Do not put local absolute paths into repository documents or generated public evidence.
- Add failing tests before production changes. A checker-clean result without governed execution evidence is not execution parity.
- Run one aggregate at a time and verify Node process counts before and after long commands.
- Commit locally in narrow verified increments; never push.

## Execution checkpoint — 2026-08-04

| Task | State | Verified evidence |
|---|---|---|
| 1 — parser contract | complete | alias retained; canonical record fields preserved; legacy block-bodied `type` refuses with `FUNGI-PARSE-007` |
| 2 — call authority | complete | capitalization exemption removed; undeclared and record-name positional calls refuse with `FUNGI-NAME-001` |
| 3 — exact record construction | complete | nominal identity, uniqueness, exact field set, field types and the 64-field parser ceiling are checked before adoption |
| 4 — tracked corpus migration | complete with recorded source debt | 44 declarations in 35 `.fungi` files migrated; live legacy inventory is zero; eight independently pre-existing strict-check debts remain listed in `docs/TODO.md` |
| 5 — self-hosted alignment | bounded | exact legacy-syntax and 64-field declaration/literal refusals are independently executed; the current self-hosted parser/checker corpus is not yet strict-clean and must not be called general parity-complete |
| 6 — governed execution/layout | complete for the current Stage-A/WAT boundary | Golden Pack 11/11; record field-order differential 4/4; positional pseudo-call runtime refusal executes no flow; general `.slide` record transport remains Task 9 |
| 7 — maintained guidance/indexes | complete | canonical syntax, Golden Pack, generated indexes, TODO and roadmap are current |
| 8 — bounded repository closure | complete | compiler 5,866/5,866; aggregate 98/98 and 8,956 tests; exhaustive 87/87; Node 1 -> 1 |
| 9 — independent SLIDE transport | complete for the bounded ABI | one nominal one-to-eight-field schema crosses GIR, `.slide`, VOK, flat package execution and a field-level v4 Safe Value receipt; general records remain closed |

---

## Task 1: Pin the parser contract

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/parser.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
- Verify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [x] Add a parser test proving `type Alias = Int` remains a `typeDecl` with one `typeRef` child.
- [x] Add a failing parser test proving `type Rec { value: Int }` emits one dedicated `FUNGI-PARSE-007` error with a `record Rec { ... }` repair hint and does not silently create a fieldless usable type.
- [x] Add or retain the positive test proving `record Rec { value: Int }` preserves `recordDecl`, declaration name, field name, field type, and declaration order.
- [ ] Run only the parser test and capture the expected failure.
- [x] Change `parseTypeDecl` so a `{` body emits the dedicated `FUNGI-PARSE-007` diagnostic, consumes the balanced body exactly once for recovery, and returns a non-authorizing error node rather than a usable type declaration.
- [x] Re-run the parser test and confirm the new tests pass without changing alias behavior.
- [x] Commit the parser contract.

Commands:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/parser.test.mjs
git diff --check
git add packages-galerina/galerina-core-compiler/tests/parser.test.mjs packages-galerina/galerina-core-compiler/src/parser.ts
git commit -m "fix(compiler): reject block-bodied type declarations"
```

## Task 2: Remove capitalization as call authority

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/symbol-resolver.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/symbol-resolver.ts`

- [x] Add a failing test proving undeclared `Rec(1)` emits `FUNGI-NAME-001` even though the target begins with a capital letter.
- [x] Add positive tests for declared flow calls, imported callable names already entered into scope, built-in `Some`/`None`/`Ok`/`Err`, standard prelude names, and receiver calls.
- [ ] Run the symbol-resolver test and capture the expected uppercase-call failure.
- [x] Delete the capital-letter exemption from `checkCallTarget`; retain only exact built-in, prelude, imported/declared-scope, internal-literal, and method-receiver authorities.
- [x] Re-run the focused test and confirm unresolved positional pseudo-constructors now refuse.
- [x] Commit the resolver change.

Commands:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/symbol-resolver.test.mjs
git diff --check
git add packages-galerina/galerina-core-compiler/tests/symbol-resolver.test.mjs packages-galerina/galerina-core-compiler/src/symbol-resolver.ts
git commit -m "fix(compiler): require declared call authority"
```

## Task 3: Enforce nominal and duplicate-free record construction

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/type-checker-record-adoption.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/type-checker.ts`
- Inspect: `packages-galerina/galerina-core-compiler/src/parser.ts`

- [x] Add failing tests for a named `Alpha { ... }` literal returned as `Beta`, duplicate literal fields, missing fields, surplus fields, and field-type mismatch.
- [x] Add positive tests for exact named construction and exact anonymous contextual adoption.
- [x] Assert each negative case emits one precise error, not a cascade and not a warning.
- [x] Preserve the record literal's optional nominal `typeName` in the AST and compare it with the expected declaration during adoption.
- [x] Replace the duplicate-collapsing `Map` intake with a bounded scan that records duplicate names before constructing the lookup map.
- [x] Validate all six admission gates: declaration known, nominal identity compatible, unique fields, exact field set, compatible field types, executable record representation.
- [x] Keep checking complexity linear in declared plus literal fields, `O(d + c)`, and enforce the separately documented 64-field declaration/literal ceiling.
- [x] Re-run the focused record-adoption test and then the full compiler type tests.
- [x] Commit the record admission change.

Commands:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/type-checker-record-adoption.test.mjs
npm.cmd --workspace @galerina/core-compiler run typecheck
git diff --check
git add packages-galerina/galerina-core-compiler/tests/type-checker-record-adoption.test.mjs packages-galerina/galerina-core-compiler/src/type-checker.ts packages-galerina/galerina-core-compiler/src/parser.ts
git commit -m "fix(compiler): enforce exact record construction"
```

## Task 4: Migrate the tracked `.fungi` corpus to canonical records

**Files:**

- Modify: all tracked `.fungi` files found by the block-bodied declaration inventory
- Modify: affected compiler/domain tests that assert the legacy spelling
- Add: `build/fungi-capabilities/canonical-record-migration.json` through the repository's generator, if that generator owns this evidence class

- [ ] Generate a tracked-file inventory using the parser-shaped pattern, excluding Markdown examples and generated build output.
- [ ] Review every match to distinguish block-bodied product types from explicit aliases and textual comments.
- [ ] Replace each actual `type Name { ... }` product declaration with `record Name { ... }`; do not mechanically alter `type Name = TypeRef` aliases.
- [ ] Run strict check and governed build sequentially for each migrated source; record pass/refusal by file without parallel Node fanout.
- [ ] Fix real follow-on diagnostics at the source rather than weakening the parser, resolver, or type checker.
- [ ] Update tests that previously called fieldless `typeDecl` nodes “record types” so they assert preserved fields and nominal identity.
- [ ] Re-run the inventory and require zero live block-bodied `type` declarations outside deliberate negative fixtures and quoted documentation.
- [ ] Commit the source migration.

Commands:

```powershell
rg -n "^\s*type\s+[A-Za-z_][A-Za-z0-9_]*\s*\{" --glob "*.fungi" --glob "!build/**"
node galerina.mjs check <migrated-file> --strict-types --strict-governance
git diff --check
git add packages-galerina examples
git commit -m "refactor(fungi): migrate product types to records"
```

## Task 5: Align the self-hosted `.fungi` compiler and its parity evidence

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/self-hosted/parser.fungi`
- Modify: `packages-galerina/galerina-core-compiler/src/self-hosted/type-checker.fungi`
- Modify: relevant tests under `packages-galerina/galerina-core-compiler/tests/`

- [x] Add bounded parity fixtures for canonical declarations, legacy block-bodied `type` refusal and the 64-field declaration/literal ceiling; nominal identity, duplicate-field and general call-resolution parity remain outside the checked Stage-B subset.
- [x] Confirm the self-hosted parser already models record declarations and extend only the missing refusals; do not duplicate Stage-A internals that the current Stage-B subset cannot represent honestly.
- [x] Extend the self-hosted checker only where its parsed model carries sufficient evidence; otherwise retain a fail-closed unsupported boundary rather than asserting parity.
- [x] Build and execute the bounded self-hosted parser/checker fixtures through the governed interpreter and flipped WAT path.
- [x] Require Stage-A and self-hosted verdict agreement for every fixture admitted by that bounded subset.
- [x] Commit the earlier self-hosted canonical-record increment; the new finite-ceiling increment is committed by Task 8 after full closure.

Commands:

```powershell
node galerina.mjs check packages-galerina/galerina-core-compiler/src/self-hosted/parser.fungi --strict-types --strict-governance
node galerina.mjs check packages-galerina/galerina-core-compiler/src/self-hosted/type-checker.fungi --strict-types --strict-governance
npm.cmd --workspace @galerina/core-compiler test
git diff --check
git add packages-galerina/galerina-core-compiler/src/self-hosted packages-galerina/galerina-core-compiler/tests
git commit -m "feat(self-hosted): align canonical record admission"
```

## Task 6: Prove governed execution and canonical layout

**Files:**

- Modify: record execution/emitter tests under `packages-galerina/galerina-core-compiler/tests/`
- Modify if required: `packages-galerina/galerina-core-compiler/src/runtime/interpreter.ts`
- Modify if required: `packages-galerina/galerina-core-compiler/src/wat-emitter.ts`
- Modify if required: GIR and manifest/receipt emitters that serialize record layouts

- [x] Add executed tests that construct named records, read fields and preserve declaration-order-sensitive layout.
- [x] Add a negative runtime test proving `Rec(x, y)` refuses before execution rather than becoming an unresolved runtime call.
- [x] Add canonical-layout tests proving equivalent literals with reordered source fields emit the same declaration-ordered layout.
- [x] Bind record name, ordered field names, field types and compiler profile into the bounded SLIDE descriptor and field-level Safe Value receipt.
- [x] Run governed execution and compare checker, runtime, WAT/GIR and bounded receipt conclusions.
- [x] Commit only after field-level parity is measured; the bounded external lane is complete and its wider exclusions remain explicit.

## Task 7: Update the maintained language guidance and generated indexes

**Files:**

- Modify: `docs/examples/TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md`
- Modify: `docs/examples/README.md`
- Modify: `docs/reference/` language/type documentation found by exact links
- Modify: generated capability/code/contract indexes through their owning scripts
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: restart/handover documents that describe the current compiler boundary

- [x] Document `record` versus `type Alias = ...` with checker-passing and governed-execution commands.
- [x] Document that `Rec(args)` is a flow call and never implicit record construction.
- [x] Add explicit examples of named and contextual anonymous record literals plus duplicate/cross-nominal refusals.
- [x] Regenerate code, capability, contract, example and package indexes using their owning devtools; do not hand-edit generated files.
- [x] Remove stale TODO/roadmap claims that block-bodied `type` is a supported product declaration or uppercase targets are accepted constructors.
- [x] Record the bounded SLIDE typed-record lane and its exact wider exclusions rather than claiming general end-to-end record parity.

## Task 8: Run bounded closure and commit the Galerina chapter

**Files:**

- Verify: entire Galerina repository

- [x] Record the baseline Node process set.
- [x] Run the compiler package test suite once.
- [x] Run the relevant graph, test and audit devtools sequentially; the first exhaustive refusal was adjudicated and fixed through owning tools rather than exempted.
- [x] Run phase-close with a supported monitor and retain its final parsed totals: 87/87 in 895.6 seconds.
- [x] Verify the post-run Node process set matches the baseline; no orphan required termination.
- [x] Run `git diff --check`, public-path hygiene, working-diff secret-shape scan and generated-artifact drift checks on the final documentation snapshot.
- [x] Review every changed file and stage only this chapter's paths; generated files were accepted only through their owning check modes.
- [x] Commit locally and verify the worktree is clean; the source/generated chapter is `b11bc7e1`, followed only by this plan-state close, and neither commit is pushed.
- [x] Refresh codebase-memory at moderate depth and verify its persisted indexed HEAD equals the final committed Galerina HEAD.

## Task 9: Open the separate SLIDE typed-record transport chapter

**Files:**

- Add: a separate implementation plan in the SLIDE repository
- Modify later: SLIDE frontend schema, canonical encoder, VOK verifier/runtime, flat package/receipt types, tests, roadmap, and TODO

- [ ] Define a versioned record descriptor containing nominal type identity and declaration-ordered field descriptors.
- [ ] Carry the descriptor from checked Galerina source through GIR and `.slide` canonical encoding.
- [ ] Make VOK independently validate the descriptor, field values, bounds, and source/checker provenance.
- [ ] Add deterministic cross-platform vectors and refusal vectors before production code.
- [ ] Require field-level execution receipts and replay equivalence before marking the Galerina-to-SLIDE record lane green.
- [ ] Keep this work separate from the Galerina compiler commit so either repository can be reverted or audited independently.
