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
| 3 — exact record construction | complete | nominal identity, uniqueness, exact field set, and field types are checked before adoption |
| 4 — tracked corpus migration | complete with recorded source debt | 44 declarations in 35 `.fungi` files migrated; live legacy inventory is zero; eight independently pre-existing strict-check debts remain listed in `docs/TODO.md` |
| 5 — self-hosted alignment | partial | exact legacy-syntax refusal is implemented and tested; the current self-hosted parser/checker corpus is not yet strict-clean and must not be called parity-complete |
| 6 — governed execution/layout | complete for the current Stage-A/WAT boundary | Golden Pack 11/11; record field-order differential 4/4; positional pseudo-call runtime refusal executes no flow; general `.slide` record transport remains Task 9 |
| 7 — maintained guidance/indexes | in progress | canonical syntax and Golden Pack updated; repository-wide generated indexes and roadmap closure remain |
| 8 — bounded repository closure | pending | run after documentation reconciliation |
| 9 — independent SLIDE transport | pending | requires its own frozen plan and repository-scoped implementation |

---

## Task 1: Pin the parser contract

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/parser.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
- Verify: `packages-galerina/galerina-core-compiler/src/index.ts`

- [ ] Add a parser test proving `type Alias = Int` remains a `typeDecl` with one `typeRef` child.
- [x] Add a failing parser test proving `type Rec { value: Int }` emits one dedicated `FUNGI-PARSE-007` error with a `record Rec { ... }` repair hint and does not silently create a fieldless usable type.
- [ ] Add or retain the positive test proving `record Rec { value: Int }` preserves `recordDecl`, declaration name, field name, field type, and declaration order.
- [ ] Run only the parser test and capture the expected failure.
- [x] Change `parseTypeDecl` so a `{` body emits the dedicated `FUNGI-PARSE-007` diagnostic, consumes the balanced body exactly once for recovery, and returns a non-authorizing error node rather than a usable type declaration.
- [ ] Re-run the parser test and confirm the new tests pass without changing alias behavior.
- [ ] Commit the parser contract.

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

- [ ] Add a failing test proving undeclared `Rec(1)` emits `FUNGI-NAME-001` even though the target begins with a capital letter.
- [ ] Add positive tests for declared flow calls, imported callable names already entered into scope, built-in `Some`/`None`/`Ok`/`Err`, standard prelude names, and receiver calls.
- [ ] Run the symbol-resolver test and capture the expected uppercase-call failure.
- [ ] Delete the capital-letter exemption from `checkCallTarget`; retain only exact built-in, prelude, imported/declared-scope, internal-literal, and method-receiver authorities.
- [ ] Re-run the focused test and confirm unresolved positional pseudo-constructors now refuse.
- [ ] Commit the resolver change.

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

- [ ] Add failing tests for a named `Alpha { ... }` literal returned as `Beta`, duplicate literal fields, missing fields, surplus fields, and field-type mismatch.
- [ ] Add positive tests for exact named construction and exact anonymous contextual adoption.
- [ ] Assert each negative case emits one precise error, not a cascade and not a warning.
- [ ] Preserve the record literal's optional nominal `typeName` in the AST and compare it with the expected declaration during adoption.
- [ ] Replace the duplicate-collapsing `Map` intake with a bounded scan that records duplicate names before constructing the lookup map.
- [ ] Validate all six admission gates: declaration known, nominal identity compatible, unique fields, exact field set, compatible field types, executable record representation.
- [ ] Keep checking complexity linear in declared plus literal fields, `O(d + c)`, and refuse above the existing parser/AST bounded-input ceiling rather than inventing an ungoverned second limit.
- [ ] Re-run the focused record-adoption test and then the full compiler type tests.
- [ ] Commit the record admission change.

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

- [ ] Add parity fixtures covering canonical record declarations, legacy block-bodied `type` refusal, named literal identity, duplicate fields, and undeclared uppercase calls.
- [ ] Confirm the self-hosted parser already models record declarations and extend only the missing refusal/identity evidence; do not duplicate Stage-A internals that the current Stage-B subset cannot represent honestly.
- [ ] Extend the self-hosted checker only where its parsed model carries sufficient evidence; otherwise emit a fail-closed unsupported diagnostic rather than asserting parity.
- [ ] Build and execute the self-hosted parser and checker fixtures through the governed path.
- [ ] Require Stage-A and self-hosted verdict agreement for every admitted fixture.
- [ ] Commit the self-hosted parity increment.

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

- [ ] Add an executed test that constructs a named record, reads every field, and returns a scalar digest sensitive to field values and declaration order.
- [ ] Add a negative runtime test proving `Rec(x, y)` refuses before execution rather than becoming an unresolved runtime call.
- [ ] Add a canonical-layout test proving equivalent literals with reordered source fields emit the same declaration-ordered layout.
- [ ] Add a receipt assertion that binds record name, ordered field names, field types, and compiler profile; a coarse result string such as `"record"` is insufficient.
- [ ] Run the governed execution tests and compare checker, runtime, WAT/GIR, and receipt conclusions.
- [ ] Commit only if field-level parity is measured.

## Task 7: Update the maintained language guidance and generated indexes

**Files:**

- Modify: `docs/examples/TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md`
- Modify: `docs/examples/README.md`
- Modify: `docs/reference/` language/type documentation found by exact links
- Modify: generated capability/code/contract indexes through their owning scripts
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: restart/handover documents that describe the current compiler boundary

- [ ] Document `record` versus `type Alias = ...` with checker-passing and governed-execution commands.
- [ ] Document that `Rec(args)` is a flow call and never implicit record construction.
- [ ] Add explicit examples of named and contextual anonymous record literals plus duplicate/cross-nominal refusals.
- [ ] Regenerate code, capability, contract, example, and package indexes using their owning devtools; do not hand-edit generated files.
- [ ] Remove stale TODO/roadmap claims that block-bodied `type` is a supported product declaration or uppercase targets are accepted constructors.
- [ ] Record remaining SLIDE typed-record transport work as a separate, exact debt rather than marking end-to-end `.slide` parity complete.

## Task 8: Run bounded closure and commit the Galerina chapter

**Files:**

- Verify: entire Galerina repository

- [ ] Record the baseline Node process set.
- [ ] Run the compiler package test suite once.
- [ ] Run the relevant graph, test, and audit devtools sequentially; treat structural false positives as findings to adjudicate, not as automatic exemptions.
- [ ] Run phase-close with a supported monitor and retain its final parsed totals.
- [ ] Verify the post-run Node process set matches the baseline and terminate only confirmed orphan processes owned by this run.
- [ ] Run `git diff --check`, public-path hygiene, secret scan, and generated-artifact drift checks.
- [ ] Review every changed file and stage only this chapter's paths.
- [ ] Commit locally and verify the worktree is clean; do not push.
- [ ] Refresh codebase-memory at moderate depth and verify its persisted indexed HEAD equals the committed Galerina HEAD.

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
