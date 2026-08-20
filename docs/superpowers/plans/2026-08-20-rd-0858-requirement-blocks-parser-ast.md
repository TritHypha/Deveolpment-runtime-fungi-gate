# RD-0858 Requirement Blocks Parser and AST Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the RD-0858 surface vocabulary and add bounded, fail-closed
lexer, diagnostic, parser and AST support for `requirement {}` expressions and
`require ... { deny: ... ambig: ... }` statements.

**Architecture:** The KB remains the language and diagnostic source of truth.
Galerina then reserves the two keywords, owns one exported diagnostic family,
and preserves four first-class AST nodes. This unit parses structure only; it
does not type, execute, lower, admit, or authorize the new constructs.

**Tech Stack:** Markdown reference contracts; strict TypeScript; Node.js ESM;
Galerina's recursive-descent lexer/parser; `node:test`; generated diagnostic,
documentation and project-graph tooling; external codebase-memory graph.

**Spec:**
`docs/superpowers/specs/2026-08-20-rd-0858-requirement-blocks-design.md`

## Global Constraints

- This is RD-0858 delivery unit 1 only: diagnostic ownership, keyword
  reservation, parser and AST shape.
- `.fungi` conversion remains `HOLD`; no `.fungi` source is created, converted,
  edited, staged or committed by this plan.
- `requirement {}` returns a future `Verdict`, but this unit performs no type or
  runtime claim.
- `require` requires exactly one `deny` arm and one `ambig` arm. Only later
  semantic units prove terminality and exact-ALLOW continuation.
- A requirement expression accepts at most 64 retained constraints. Surplus
  constraints are parsed for recovery, diagnosed once, and never retained as
  authorizing AST children.
- Empty and nested requirement expressions are diagnosed. Local declarations
  are malformed constraints and are never retained as expressions.
- `deny` and `ambig` remain contextual arm labels; only `requirement` and
  `require` become active keywords.
- Every `FUNGI-REQUIREMENT-*` code has one exported metadata owner in
  `@galerina/core-compiler`. Emits use that owner, never inline code/name text.
- Codes `001`, `005`, `006` and `008` become live in this unit. The remaining
  family members are explicitly reserved for their named RD-0858 units and are
  not production blockers.
- KB and Galerina changes are separate explicit-path commits in their owning
  repositories. No push, PR, merge, reset, clean, restore or publication.
- Every child command has a finite outer deadline. Timeout, stale graph,
  truncated output or skipped checks remain refusal evidence.
- External code graphs are refreshed only after commits and must report an
  `indexed_head_sha` equal to the exact repository HEAD.

---

## File Map

### KB adoption commit

- Modify: `../ZTF-Knowledge-Bases/reference/language/v1-reserved-keywords.md`
  — add the two active surface words.
- Modify: `../ZTF-Knowledge-Bases/reference/language/compiler-diagnostics.md`
  — register the twelve-code requirement family and live/reserved state.
- Modify:
  `../ZTF-Knowledge-Bases/reference/galerina/galerina-governance-rules.md`
  — assign compiler ownership and enforcement state.
- Regenerate only KB indexes required by the KB close sequence.

### Galerina implementation commit series

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-diagnostics.ts`
  — sole owner of `FUNGI-REQUIREMENT-001..012`.
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
  — export the diagnostic family and parser ceiling.
- Modify: `packages-galerina/galerina-core-compiler/src/lexer.ts`
  — reserve `requirement` and `require`.
- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
  — add four AST kinds and the two bounded parsers.
- Modify: `packages-galerina/galerina-core/src/index.ts`
  — keep the shared AST vocabulary aligned.
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-construct-parser.test.mjs`
  — public lexer/parser behavior and refusal controls.
- Regenerate: `build/code-registry/REGISTRY.md` and
  `build/code-registry/registry.json` through `scripts/gen-code-registry.mjs`.
- Regenerate: `build/code-index/CODE_INDEX.md` and
  `build/code-index/code-index.json` through `scripts/code-index.mjs`.
- Regenerate required documentation indexes and
  `build/graph/Galerina_GRAPH_REPORT.md` through their owning commands.

---

### Task 1: Adopt the vocabulary and diagnostic family in the KB

**Files:**

- Modify: `reference/language/v1-reserved-keywords.md`
- Modify: `reference/language/compiler-diagnostics.md`
- Modify: `reference/galerina/galerina-governance-rules.md`
- Regenerate: only outputs changed by the canonical KB close sequence

**Interfaces:**

- Consumes: private RD-0858 and the approved Galerina design specification.
- Produces: the public source-of-truth rows consumed by the Galerina lexer,
  diagnostic registry and governance audit.

- [ ] **Step 1: Reconfirm KB custody**

Run from `../ZTF-Knowledge-Bases`:

```powershell
git status --short --branch
git rev-parse HEAD
```

Expected: the recorded branch and a clean staged/working set. Any unexpected
path is `HOLD` and is excluded from this task.

- [ ] **Step 2: Add the two active keyword rows**

Add these rows to the active-keyword table:

```markdown
| `requirement` | Authorization expression | Ordered bounded Bool/Verdict constraints producing Verdict |
| `require` | Authorization statement | Exact-ALLOW continuation with mandatory deny/ambig terminals |
```

Do not reserve `deny` or `ambig`; they remain contextual labels.

- [ ] **Step 3: Add the diagnostic catalog block**

Add the exact family below to `compiler-diagnostics.md`. Mark `001`, `005`,
`006` and `008` as `PLANNED LIVE IN PARSER UNIT`; mark all other rows
`RESERVED FOR NAMED RD-0858 UNIT` until their emitter lands.

```text
FUNGI-REQUIREMENT-001 EMPTY_REQUIREMENT
FUNGI-REQUIREMENT-002 CONSTRAINT_TYPE_MISMATCH
FUNGI-REQUIREMENT-003 CONSTRAINT_EFFECTFUL
FUNGI-REQUIREMENT-004 TAINT_AUTHORITY_MISSING
FUNGI-REQUIREMENT-005 CONSTRAINT_CEILING
FUNGI-REQUIREMENT-006 NON_EXHAUSTIVE_REQUIRE
FUNGI-REQUIREMENT-007 NON_TERMINAL_REQUIRE_HANDLER
FUNGI-REQUIREMENT-008 NESTED_REQUIREMENT
FUNGI-REQUIREMENT-009 REQUIRE_SUBJECT_TYPE_MISMATCH
FUNGI-REQUIREMENT-010 VALIDATOR_AUTHORITY_INVALID
FUNGI-REQUIREMENT-011 REQUIREMENT_LOWERING_UNSUPPORTED
FUNGI-REQUIREMENT-012 REQUIREMENT_RECEIPT_MISMATCH
```

All twelve have lowercase `error` severity. The catalog must say that codes
not yet emitted are reserved and cannot appear in a production-blocker list.

- [ ] **Step 4: Add governance ownership rows**

Add one row per code to `galerina-governance-rules.md`. Use category
`Authorization`, owner `galerina-core-compiler`, and the same live/reserved
state as Step 3. Do not claim enforcement for a reserved code.

- [ ] **Step 5: Run the KB close sequence**

Run with an outer 15-minute deadline:

```powershell
node ..\skills\session-upkeep\scripts\card.mjs --seq .upkeep-close.json
```

Expected: every configured generator/gate exits zero. A gate finding is
reported and preserved; it is never bypassed.

- [ ] **Step 6: Stage and commit the exact KB paths**

Stage only the three source documents plus generator outputs proven to have
changed because of them. Inspect `git diff --cached --name-status` and
`git diff --cached --check`, then commit:

```powershell
git commit -m "docs: adopt RD-0858 requirement vocabulary"
```

Record the exact commit and leave the KB clean and unpushed.

---

### Task 2: Add diagnostic owners, keyword tokens and AST vocabulary

**Files:**

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-diagnostics.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/lexer.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
- Modify: `packages-galerina/galerina-core/src/index.ts`
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-construct-parser.test.mjs`

**Interfaces:**

- Consumes: KB Task 1 adoption commit.
- Produces:
  `FUNGI_REQUIREMENT_DIAGNOSTICS`, `MAX_REQUIREMENT_CONSTRAINTS`, active
  keyword tokens, and the AST kinds `requirementExpr`,
  `requirementConstraint`, `requireStmt`, `requireArm`.

- [ ] **Step 1: Write the diagnostic/keyword RED tests**

Create the test with these public-behavior controls:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as L from "../dist/index.js";

describe("RD-0858 requirement surface registration", () => {
  it("lexes requirement and require as active keywords", () => {
    const out = L.lex("requirement require deny ambig", "surface.fungi");
    assert.deepEqual(
      out.tokens.filter((t) => t.kind !== "eof").map((t) => [t.kind, t.value]),
      [
        ["keyword", "requirement"],
        ["keyword", "require"],
        ["identifier", "deny"],
        ["identifier", "ambig"],
      ],
    );
  });

  it("exports one twelve-code requirement diagnostic family", () => {
    assert.equal(L.FUNGI_REQUIREMENT_DIAGNOSTICS.length, 12);
    assert.deepEqual(
      L.FUNGI_REQUIREMENT_DIAGNOSTICS.map((d) => d.code),
      Array.from({ length: 12 }, (_, i) =>
        `FUNGI-REQUIREMENT-${String(i + 1).padStart(3, "0")}`,
      ),
    );
    assert.ok(L.FUNGI_REQUIREMENT_DIAGNOSTICS.every((d) =>
      d.severity === "error" && /^[A-Z][A-Z0-9_]*$/.test(d.name)
    ));
  });
});
```

The first test catches lost keyword reservation or accidental reservation of
contextual labels. The second catches a missing, duplicated, misnumbered or
mis-cased owner family.

- [ ] **Step 2: Run RED against the current built package**

```powershell
node --test packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
```

Expected: failure because the two words are identifiers and the diagnostic
family is absent. A syntax/module error is not the intended RED.

- [ ] **Step 3: Commit the test-only RED checkpoint**

Stage only the new test, inspect the cached diff, and commit:

```powershell
git commit -m "test: define RD-0858 parser boundary"
```

- [ ] **Step 4: Implement the sole diagnostic owner**

Create `requirement-diagnostics.ts` with this shape for every code:

```ts
export interface RequirementDiagnosticDefinition {
  readonly code: `FUNGI-REQUIREMENT-${string}`;
  readonly name: string;
  readonly severity: "error";
  readonly message: string;
  readonly suggestedFix: string;
}

export const FUNGI_REQUIREMENT_001 = {
  code: "FUNGI-REQUIREMENT-001",
  name: "EMPTY_REQUIREMENT",
  severity: "error",
  message: "A requirement expression must contain at least one constraint.",
  suggestedFix: "Add one Bool or Verdict constraint.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_DIAGNOSTICS = [
  FUNGI_REQUIREMENT_001,
  FUNGI_REQUIREMENT_002,
  FUNGI_REQUIREMENT_003,
  FUNGI_REQUIREMENT_004,
  FUNGI_REQUIREMENT_005,
  FUNGI_REQUIREMENT_006,
  FUNGI_REQUIREMENT_007,
  FUNGI_REQUIREMENT_008,
  FUNGI_REQUIREMENT_009,
  FUNGI_REQUIREMENT_010,
  FUNGI_REQUIREMENT_011,
  FUNGI_REQUIREMENT_012,
] as const;
```

Give every constant the exact code/name/message from the specification. Add a
`RESERVED` comment to `002`, `003`, `004`, `007`, `009`, `010`, `011`, `012`
naming their owning delivery unit. Export all constants and the family from
`src/index.ts`.

- [ ] **Step 5: Reserve only the two active keywords**

Add this bounded group to `V1_ACTIVE_KEYWORDS` in `lexer.ts`:

```ts
// RD-0858 requirement blocks. deny/ambig remain contextual arm labels.
"requirement", "require",
```

- [ ] **Step 6: Add the four AST kinds and ceiling**

In the compiler parser vocabulary add:

```ts
| "requirementExpr"
| "requirementConstraint"
| "requireStmt"
| "requireArm"
```

Add the same four strings to the shared core `AstNodeKind`. In `parser.ts` add:

```ts
export const MAX_REQUIREMENT_CONSTRAINTS = 64;
```

Re-export the ceiling from the compiler package index.

- [ ] **Step 7: Build and verify GREEN**

```powershell
npm --prefix packages-galerina\galerina-core run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
```

Expected: 2/2 pass, zero warnings from the test process.

- [ ] **Step 8: Commit the registration slice**

Stage only the five source paths and one test path owned by this task. Inspect
the staged diff and commit:

```powershell
git commit -m "feat: register RD-0858 requirement syntax"
```

Refresh the external Galerina graph at the exact commit before Task 3.

---

### Task 3: Parse bounded requirement expressions

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
- Modify:
  `packages-galerina/galerina-core-compiler/tests/requirement-construct-parser.test.mjs`

**Interfaces:**

- Consumes: `MAX_REQUIREMENT_CONSTRAINTS` and
  `FUNGI_REQUIREMENT_001/005/008`.
- Produces: `private parseRequirementExpr(): AstNode` with ordered
  `requirementConstraint` children.

- [ ] **Step 1: Add expression RED controls**

Add tests using this helper:

```js
const source = (body) =>
  `@version 1\npure flow decide(age: Int, admitted: Verdict) -> Verdict\n` +
  `contract { effects {} }\n{\n  let result: Verdict = requirement {\n${body}\n  }\n` +
  `  return result\n}`;

function requirementNodes(ast) {
  const out = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.kind === "requirementExpr") out.push(node);
    for (const child of node.children ?? []) walk(child);
  })(ast);
  return out;
}
```

Assert these literal behaviors:

- two newline-separated constraints retain source order;
- semicolon separation produces the same two-child shape;
- each child is `requirementConstraint` with exactly one expression child;
- an empty block emits `FUNGI-REQUIREMENT-001`;
- 65 constraints emit exactly one `FUNGI-REQUIREMENT-005` and retain exactly
  64 constraint children;
- a nested requirement emits `FUNGI-REQUIREMENT-008` and the nested block is
  not retained as a second authorizing `requirementExpr`;
- `let`, `mut` and `readonly` in the block emit errors and are not retained as
  constraint expressions;
- every new node has a finite source line, column and byte span.

- [ ] **Step 2: Run the focused RED**

```powershell
node --test --test-name-pattern="requirement expression" packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
```

Expected: failure because no `requirementExpr` parser exists.

- [ ] **Step 3: Implement the minimum bounded parser**

Add this state and dispatch:

```ts
private requirementDepth = 0;

// In parsePrimary, before the generic keyword fallback:
if (tok.kind === "keyword" && tok.value === "requirement") {
  return this.parseRequirementExpr();
}
```

Implement:

```ts
private parseRequirementExpr(): AstNode
```

The method must:

1. capture the keyword location and consume `requirement {`;
2. increment `requirementDepth` under `try/finally`;
3. diagnose depth greater than one with `FUNGI_REQUIREMENT_008`;
4. parse each expression to the next newline, semicolon or closing brace;
5. wrap retained expressions in `requirementConstraint` nodes;
6. retain only the first 64 constraints and emit `005` once;
7. emit `001` when no valid constraint was retained;
8. consume the closing brace and restore depth;
9. return an invalid non-authorizing recovery node for a nested block, never a
   second `requirementExpr`.

Use the diagnostic metadata fields directly:

```ts
this.emit(
  FUNGI_REQUIREMENT_001.code,
  FUNGI_REQUIREMENT_001.name,
  FUNGI_REQUIREMENT_001.message,
  loc,
  FUNGI_REQUIREMENT_001.suggestedFix,
);
```

Reject declaration keywords before calling `parseExpression`; recover to the
next separator so a malformed declaration cannot become an identifier-shaped
constraint.

- [ ] **Step 4: Build and verify expression GREEN**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run build
node --test --test-name-pattern="requirement expression" packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
```

Expected: every expression-shape and refusal control passes.

- [ ] **Step 5: Commit the expression slice**

Stage only `parser.ts` and the focused test. Inspect and commit:

```powershell
git commit -m "feat: parse bounded requirement expressions"
```

Refresh the external graph at that exact commit before Task 4.

---

### Task 4: Parse exhaustive require statements

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/parser.ts`
- Modify:
  `packages-galerina/galerina-core-compiler/tests/requirement-construct-parser.test.mjs`

**Interfaces:**

- Consumes: parsed Bool/Verdict-shaped expressions and
  `FUNGI_REQUIREMENT_006`.
- Produces:
  `private parseRequireStmt(): AstNode` and
  `private parseRequireArm(seen: Set<string>): AstNode | undefined`.

- [ ] **Step 1: Add require-statement RED controls**

Add tests proving:

- `require verdict { deny: fault Denied ambig: fault Unknown }` produces one
  `requireStmt` with children `[subject, denyArm, ambigArm]`;
- an inline `require requirement { ... } { ... }` retains the requirement
  expression as the subject;
- arm source order does not change canonical child order: the AST always stores
  deny then ambig;
- a missing deny arm emits `FUNGI-REQUIREMENT-006` once;
- a missing ambig arm emits `FUNGI-REQUIREMENT-006` once;
- a duplicate deny or ambig arm emits `FUNGI-REQUIREMENT-006` and the duplicate
  body is not retained;
- an unknown `allow:`/`if:` label emits an error and is not retained;
- both block and single-terminal-statement bodies retain exact source spans.

- [ ] **Step 2: Run the require-statement RED**

```powershell
node --test --test-name-pattern="require statement" packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
```

Expected: failure because `require` has no statement dispatch.

- [ ] **Step 3: Implement statement and arm parsing**

In `parseStatement` add:

```ts
case "require": return this.parseRequireStmt();
```

Implement the exact signatures from the Interfaces block. Parse labels
contextually from identifier tokens. Parse a body with `parseBlock()` when it
starts with `{`; otherwise call `parseStatement()`. On a duplicate, consume its
body for recovery but do not retain it. After parsing, emit `006` once for each
missing arm and return:

```ts
{
  kind: "requireStmt",
  location: loc,
  children: [subject, denyArm, ambigArm],
}
```

When either arm is absent, omit that child from the partial AST; the emitted
error blocks compilation. Never synthesize a handler or continuation. An
unknown label consumes its colon and block/single-statement body for recovery,
so one hostile arm cannot create an unbounded diagnostic cascade.

- [ ] **Step 4: Build and verify statement GREEN**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs
node --test packages-galerina\galerina-core-compiler\tests\check-construct.test.mjs packages-galerina\galerina-core-compiler\tests\parser.test.mjs packages-galerina\galerina-core-compiler\tests\parser\parse-depth-guard.test.mjs
```

Expected: the full new focused suite and the three parser regressions pass.

- [ ] **Step 5: Commit the statement slice**

Stage only `parser.ts` and the focused test. Inspect and commit:

```powershell
git commit -m "feat: parse exhaustive require statements"
```

---

### Task 5: Regenerate registries and close the parser unit

**Files:**

- Regenerate: `build/code-registry/REGISTRY.md`
- Regenerate: `build/code-registry/registry.json`
- Regenerate: `build/code-index/CODE_INDEX.md`
- Regenerate: `build/code-index/code-index.json`
- Regenerate: documentation indexes changed by the plan/spec records
- Regenerate: `build/graph/Galerina_GRAPH_REPORT.md`

**Interfaces:**

- Consumes: the four Galerina commits from Tasks 2–4.
- Produces: a deterministic registry/index receipt and a parser-unit handoff;
  it produces no semantic admission.

- [ ] **Step 1: Regenerate diagnostic and code indexes to a fixed point**

```powershell
node scripts\gen-code-registry.mjs
node scripts\code-index.mjs
node scripts\docs-index.mjs
```

Run the three commands again and compare SHA-256 values of every changed
generated file. Any second-run change is `HOLD`.

- [ ] **Step 2: Regenerate and audit the project graph**

```powershell
node packages-galerina\galerina-core-cli\dist\index.js graph --out build\graph
node scripts\audit-graph-integrity.mjs
```

Expected: generation and integrity exit zero with nonzero node/edge counts.

- [ ] **Step 3: Run diagnostic and convention gates**

```powershell
node scripts\audit-diagnostic-codes.mjs
node scripts\audit-diagnostic-code-collisions.mjs
node scripts\audit-code-catalog-coverage.mjs
node scripts\lint-conventions.mjs
node scripts\audit-path-leak.mjs
```

Expected: every gate exits zero. The registry must show one owner per new code;
`001`, `005`, `006`, `008` must have emit and test sites; reserved codes must
not be represented as live blockers.

- [ ] **Step 4: Run the proportional compiler verification**

```powershell
npm --prefix packages-galerina\galerina-core run typecheck
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs packages-galerina\galerina-core-compiler\tests\check-construct.test.mjs packages-galerina\galerina-core-compiler\tests\parser.test.mjs packages-galerina\galerina-core-compiler\tests\parser\parse-depth-guard.test.mjs
```

Expected: zero failures and zero skipped requirement controls.

- [ ] **Step 5: Commit generated evidence explicitly**

Stage only freshly reproduced tracked outputs. Inspect cached names/diff and
commit:

```powershell
git commit -m "chore: index RD-0858 parser surface"
```

- [ ] **Step 6: Refresh the external graph at exact HEAD**

Run a moderate/full repository index through codebase-memory. Require:

```text
status = indexed
indexed_head_sha = git rev-parse HEAD
nodes = expected_nodes
edges = expected_edges
```

Probe `parseRequirementExpr`, `parseRequireStmt`,
`FUNGI_REQUIREMENT_DIAGNOSTICS` and `MAX_REQUIREMENT_CONSTRAINTS`. A missing
probe or stale build point keeps the unit at `HOLD`.

- [ ] **Step 7: Independent review gate**

Provide the exact commit range, specification, plan, test commands, generated
receipts and worktree status to a custody-permitted independent reviewer. The
review must inspect the exact diff, rerun the controlled-red and green tests,
and return `PASS`, `HOLD` or findings. Because this is an architecture and
authorization surface, also retain one model-diverse review receipt.

Until both reviews pass, report:

```text
implemented, independent audit pending
RD-0858 remains HOLD
.fungi conversion remains HOLD
```

---

## Unit-1 Acceptance Map

| Requirement | Evidence |
|---|---|
| Canonical vocabulary | KB keyword table plus lexer token test |
| One diagnostic owner | exported twelve-code family plus registry/collision gates |
| Four AST nodes | parser behavior plus shared/compiler typecheck |
| Empty refusal | controlled `FUNGI-REQUIREMENT-001` test |
| 64 ceiling | 65-input test, one `005`, exactly 64 retained |
| Nested refusal | nested test, one `008`, no nested authorizing node |
| Exhaustive handlers | missing/duplicate `006` controls |
| Contextual labels | lexer and parser label tests |
| Source fidelity | line/column/byte-span assertions |
| No admission overclaim | no type/effect/runtime/GIR/SLIDE/VOK implementation |
| Exact custody | explicit-path commits, clean worktrees, no push |
| Fresh discovery | exact-head project and external graph receipts |

The next plan begins only after this parser unit receives both required review
passes. Its scope is type, terminality and complete K3 evaluation semantics.
