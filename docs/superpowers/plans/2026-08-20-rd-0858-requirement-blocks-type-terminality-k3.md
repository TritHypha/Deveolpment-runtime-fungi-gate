# RD-0858 Requirement Type, Terminality and K3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete RD-0858 delivery unit 2 by giving requirement constraints
and require subjects exact Bool/Verdict typing, a closed Bool-to-Verdict/K3
algebra, and conservative proof that both require handlers terminate.

**Architecture:** A small requirement-semantics module owns the numeric
`DENY (-1) < UNKNOWN (0) < ALLOW (+1)` domain and a non-short-circuit fold. A
separate structural terminality module proves only control-flow shapes whose
reachable paths are all terminal. The existing type checker consumes both
contracts and emits the already-owned diagnostics `002`, `007` and `009`.
Interpreter, effect, taint, GIR, SLIDE, VOK and admission work remain later
delivery units.

**Tech Stack:** Strict TypeScript; existing parser AST; existing type checker;
Node.js ESM and `node:test`; generated diagnostic/code/document indexes;
canonical project graph; external codebase-memory graph.

**Spec:**
`docs/superpowers/specs/2026-08-20-rd-0858-requirement-blocks-design.md`

## Global Constraints

- This is RD-0858 delivery unit 2 only: type, terminality and closed K3
  semantics.
- `.fungi` conversion remains `HOLD`. No `.fungi` file is created, converted,
  edited, staged or committed. Source strings inside focused controlled tests
  are red-capable fixtures, not conversion output.
- Every requirement constraint and require subject must infer exactly `Bool`
  or `Verdict`. Unresolved inference is a compile error, not a silent deferral.
- Bool lifting is exact: `false -> -1`, `true -> +1`. Canonical Verdict values
  remain `-1`, `0`, `+1`; no integer or truthiness coercion is allowed.
- The K3 fold is minimum over the closed ordered domain. It consumes every
  normally yielded value in source order and does not stop after `DENY`.
- Empty or non-canonical semantic input returns an explicit refusal result.
  It never becomes semantic `UNKNOWN`.
- Terminality is conservative. `return` and `fault` are terminal. Sequential
  blocks, explicit two-arm branches and closed exhaustive matches are terminal
  only when every reachable path is terminal. Loops, missing arms, unresolved
  match exhaustiveness and unknown node shapes are non-terminal.
- Existing return checking remains the owner of handler return-type
  compatibility with the enclosing flow.
- Codes `002`, `007` and `009` become live in this unit. Codes `003`, `004`,
  `010`, `011` and `012` remain reserved for their named later units.
- Every implementation change follows focused RED, minimal GREEN, regression
  verification and an explicit-path local commit. No push, PR, merge, reset,
  clean, restore, release or admission claim.
- Every child command has a finite outer deadline. Timeout, stale graph,
  skipped evidence, truncated evidence or an unmapped diagnostic is `HOLD`.

---

## File Map

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-semantics.ts`
  - closed numeric domain, Bool lift and complete fold.
- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-terminality.ts`
  - bounded structural terminality proof over parser AST.
- Modify: `packages-galerina/galerina-core-compiler/src/type-checker.ts`
  - infer requirement expressions as Verdict and check constraints, subject and
    handlers.
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
  - export the semantic and terminality contracts for later delivery units.
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-semantics.test.mjs`
  - closed-domain and complete-fold controls.
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-type-terminality.test.mjs`
  - compiler-facing type and terminality controls.
- Regenerate only the generated registry, code-index, documentation-index and
  project-graph outputs changed by this unit.

---

### Task 1: Add the closed requirement semantic algebra

**Files:**

- Create: `packages-galerina/galerina-core-compiler/src/requirement-semantics.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-semantics.test.mjs`

**Interfaces:**

- Produces `RequirementVerdict`, `RequirementSemanticResult`,
  `liftRequirementValue` and `foldRequirementValues`.
- Does not evaluate AST, interpret a flow, create evidence receipts or select a
  require arm.

- [ ] **Step 1: Plant the semantic RED controls**

The focused test must prove:

- the five exact Bool/Verdict lift rows;
- rejection of `2`, `-2`, strings, objects, `null` and `undefined`;
- all nine binary K3-min vectors;
- mixed Bool/Verdict folding;
- empty input returns an explicit `EMPTY` refusal;
- a generator records every normal ordinal after an early `DENY`;
- a non-canonical later ordinal returns `NON_CANONICAL` with its exact ordinal;
- a thrown iterator/evaluator error propagates and is not converted to
  `UNKNOWN`.

Run only the new test against the current build. Required RED: the public
exports are absent. A syntax error, import-path error or unrelated failure is
not valid RED.

- [ ] **Step 2: Commit the test-only RED checkpoint**

Stage only the new test. Confirm the cached manifest and commit locally:

```powershell
git commit -m "test: define RD-0858 K3 requirement algebra"
```

- [ ] **Step 3: Implement the minimum semantic kernel**

Use a closed numeric type:

```ts
export type RequirementVerdict = -1 | 0 | 1;

export type RequirementSemanticResult =
  | Readonly<{ ok: true; verdict: RequirementVerdict }>
  | Readonly<{
      ok: false;
      reason: "EMPTY" | "NON_CANONICAL";
      ordinal: number;
    }>;
```

`liftRequirementValue(value: unknown)` must accept only the five exact rows.
`foldRequirementValues(values: Iterable<unknown>)` must consume source order,
use K3 minimum, never short-circuit after `-1`, stop and refuse on a
non-canonical value, and preserve thrown operational errors.

Freeze every returned record. Do not import interpreter values or Gate-v3
string verdicts; later adapters may map to this single numeric contract.

- [ ] **Step 4: Build and prove GREEN**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-semantics.test.mjs
```

Expected: all focused controls pass with zero skips.

- [ ] **Step 5: Commit the semantic kernel explicitly**

Stage only the new module and export change. Inspect the cached diff and commit:

```powershell
git commit -m "feat: add closed requirement K3 semantics"
```

---

### Task 2: Type requirement constraints and require subjects

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/type-checker.ts`
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-type-terminality.test.mjs`

**Interfaces:**

- `requirementExpr` infers `Verdict`.
- Every `requirementConstraint` child must infer `Bool` or `Verdict`.
- A `requireStmt` subject must infer `Bool` or `Verdict`.

- [ ] **Step 1: Plant focused type RED controls**

Create compiler-facing tests for:

- Bool-only, Verdict-only and mixed constraints pass;
- a requirement expression can initialize and return `Verdict`;
- `Int`, `String`, `Decimal`, record and collection constraints emit exactly
  `FUNGI-REQUIREMENT-002`;
- an unresolved identifier/call emits `002` rather than silently deferring;
- Bool and Verdict require subjects pass;
- wrong and unresolved subjects emit exactly `FUNGI-REQUIREMENT-009`;
- an inline requirement expression is a valid require subject;
- parser diagnostics `001`, `005`, `006`, `008` remain unchanged.

Run the new test against the current build. Required RED: the valid
requirement expression is not inferred as Verdict and the named type faults are
not emitted.

- [ ] **Step 2: Commit the type test-only RED checkpoint**

Stage only the new focused test and commit locally:

```powershell
git commit -m "test: expose RD-0858 requirement type gaps"
```

- [ ] **Step 3: Add minimum type-checker integration**

In `TypeChecker.inferType`, return `Verdict` for `requirementExpr`.

Add two narrow checker methods:

- `checkRequirementExpression(node)` checks each retained constraint child and
  emits the exported `FUNGI_REQUIREMENT_002` owner for any type other than
  `Bool` or `Verdict`, including unresolved inference.
- `checkRequireStatement(node)` checks the subject and emits the exported
  `FUNGI_REQUIREMENT_009` owner for any type other than `Bool` or `Verdict`,
  including unresolved inference.

Route both cases through `walkNode` and continue walking retained children so
existing return/type diagnostics still run. Do not inline code/name metadata.

- [ ] **Step 4: Build and prove type GREEN**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-type-terminality.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs packages-galerina\galerina-core-compiler\tests\type-checker.test.mjs
```

- [ ] **Step 5: Commit the type integration explicitly**

Stage only the type-checker source and focused test. Inspect the cached diff and
commit:

```powershell
git commit -m "feat: type RD-0858 requirement constructs"
```

---

### Task 3: Prove require-handler terminality

**Files:**

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-terminality.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/type-checker.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify:
  `packages-galerina/galerina-core-compiler/tests/requirement-type-terminality.test.mjs`

**Interfaces:**

- Produces `proveRequirementHandlerTerminality(node, options)` with a frozen
  result that distinguishes `TERMINAL`, `NON_TERMINAL` and `UNRESOLVED`.
- The type checker maps every non-`TERMINAL` handler to
  `FUNGI-REQUIREMENT-007`.

- [ ] **Step 1: Plant terminality RED controls**

Add direct and compiler-facing controls for:

- direct `return` and direct `fault` pass;
- a sequential block terminating through a later `return` or `fault` passes;
- an empty block and a normally returning statement refuse;
- `if/else` passes only when both arms terminate;
- `if` without `else`, or one returning arm, refuses;
- `unless/else` follows the same rule if its AST shape is distinct;
- a closed exhaustive match passes only when every arm terminates;
- a non-exhaustive or unresolved match refuses;
- loops and unknown AST kinds do not mint terminality;
- a depth beyond the parser's 256 ceiling returns `UNRESOLVED` without stack
  exhaustion;
- both deny and ambig arms are checked independently;
- return expressions inside handlers still use existing enclosing-flow return
  compatibility diagnostics.

Required RED: non-terminal handlers currently pass type checking and the
terminality export is absent.

- [ ] **Step 2: Commit the terminality test RED checkpoint**

Stage only the focused test modification and commit:

```powershell
git commit -m "test: expose RD-0858 handler fallthrough"
```

- [ ] **Step 3: Implement the bounded structural proof**

The proof must:

- count visited nodes and depth with ceilings no wider than the parser guard;
- treat `returnStmt` and `faultStmt` as terminal;
- process block statements in source order and ignore only structurally
  unreachable suffixes after a proven terminal statement;
- require both explicit branches of `ifStmt`/`unlessStmt` to be terminal;
- require match exhaustiveness plus every reachable arm to be terminal;
- return `UNRESOLVED` for malformed, over-deep or unsupported shapes;
- return frozen data with a stable reason and the first failing path.

Do not reuse WAT emitter reachability helpers: code-generation heuristics are
not type/admission authority.

In `checkRequireStatement`, check the canonical deny and ambig arms and emit
the exported `FUNGI_REQUIREMENT_007` owner once per failing handler, naming the
handler label in the message. Continue walking the handler body so existing
return-type checks remain active.

- [ ] **Step 4: Build and prove terminality GREEN**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-type-terminality.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-semantics.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs packages-galerina\galerina-core-compiler\tests\type-checker.test.mjs packages-galerina\galerina-core-compiler\tests\check-construct.test.mjs
```

- [ ] **Step 5: Commit the terminality implementation explicitly**

Stage only the terminality module, type-checker/export changes and focused
test. Inspect the cached diff and commit:

```powershell
git commit -m "feat: prove RD-0858 handler terminality"
```

---

### Task 4: Regenerate evidence and close delivery unit 2

**Files:**

- Regenerate only tracked code-index, diagnostic-registry, documentation-index
  and canonical project-graph outputs whose bytes change.
- Modify: `docs/TODO.md` only after exact-head review returns PASS.

- [ ] **Step 1: Run the proportional compiler matrix**

```powershell
npm --prefix packages-galerina\galerina-core run typecheck
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-semantics.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-type-terminality.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-construct-parser.test.mjs packages-galerina\galerina-core-compiler\tests\type-checker.test.mjs packages-galerina\galerina-core-compiler\tests\check-construct.test.mjs packages-galerina\galerina-core-compiler\tests\parser.test.mjs
```

Expected: zero failures and zero skipped RD-0858 controls.

- [ ] **Step 2: Regenerate dependent indexes to a fixed point**

```powershell
node scripts\code-index.mjs
node scripts\gen-code-registry.mjs
node scripts\docs-index.mjs
node scripts\project-graph-generator.mjs
node scripts\audit-graph-integrity.mjs
```

Run the generation sequence twice. Hash every changed tracked output after
each run. Second-run drift is `HOLD`.

- [ ] **Step 3: Run diagnostic and custody gates**

```powershell
node scripts\audit-diagnostic-codes.mjs
node scripts\audit-diagnostic-code-collisions.mjs
node scripts\audit-code-catalog-coverage.mjs
node scripts\audit-path-leak.mjs
node scripts\lint-conventions.mjs --soft
git diff --check
```

The registry must show `002`, `007` and `009` as live with one definition,
production emit sites and focused tests. Reserved later-unit codes remain
non-live. The convention report retains its declared pre-existing `.fungi`
findings and grants no conversion authority.

- [ ] **Step 4: Commit generated evidence explicitly**

Stage only the exact generated manifest, inspect it, and commit:

```powershell
git commit -m "chore: index RD-0858 type semantics"
```

Generated sidecars name the exact source/tool commit consumed immediately
before the evidence commit. Post-commit `--check` modes must reproduce all
stable fields and bytes without mutation.

- [ ] **Step 5: Refresh the external graph at exact evidence HEAD**

Run a full codebase-memory index and require:

```text
status = indexed
indexed_head_sha = git rev-parse HEAD
nodes = expected_nodes
edges = expected_edges
```

Probe the exact bodies of `liftRequirementValue`,
`foldRequirementValues`, `proveRequirementHandlerTerminality`,
`checkRequirementExpression` and `checkRequireStatement`.

- [ ] **Step 6: Obtain independent and model-diverse reviews**

Reviewers must verify:

- exact closed-domain lifting and no truthiness coercion;
- complete iteration after `DENY`;
- invalid/empty input remains a refusal, not `UNKNOWN`;
- unresolved types fail closed;
- every reachable handler path is terminal;
- existing enclosing-flow return checks remain active;
- only `002`, `007`, `009` changed from reserved to live;
- no effect, taint, runtime, GIR, SLIDE, VOK or conversion claim escaped scope.

Any Critical or Important finding is `HOLD` and receives its own RED/GREEN fix
round before closure.

- [ ] **Step 7: Record the reviewed Unit 2 milestone**

Only after exact-head PASS, update the first dated `docs/TODO.md` section with
the evidence commit, test counts, graph build point and explicit scope limit.
Commit the TODO record, regenerate any locator-only outputs it changes to a
fixed point, commit those outputs, refresh the external graph once more and
obtain an evidence-only review.

Unit 2 completion grants no effect, taint, interpreter, GIR, SLIDE, VOK,
admission, production or `.fungi` conversion authority.

---

## Audit Pre-Manifest

Before each long verification phase, publish the exact command manifest in the
session communication and mark every entry `[ ]`. After execution use `[x]`
for pass, `[!]` for issue and `[X]` for failure. A command with a wrong path or
wrong option fails before audit and is never counted as evidence; correct the
manifest, disclose the invalid attempt and rerun the intended command.

Minimum final manifest:

- [ ] core typecheck
- [ ] compiler typecheck
- [ ] compiler build
- [ ] focused RD-0858 semantic/type/terminality tests
- [ ] parser and existing type-checker regressions
- [ ] code-index check
- [ ] diagnostic-registry check
- [ ] documentation-index check
- [ ] canonical project-graph check
- [ ] graph integrity
- [ ] diagnostic ownership/collision/catalog gates
- [ ] path-leak gate
- [ ] convention report with truthful pre-existing finding count
- [ ] diff/custody check
- [ ] external exact-head graph and symbol/content probes
- [ ] independent review
- [ ] model-diverse review

