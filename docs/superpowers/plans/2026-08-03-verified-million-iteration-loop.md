# Verified Million-Iteration Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-authorizing compiler proposal and checker-valid worked example for one exact one-million-read loop, while preserving pointer-free application code and leaving final VOK/native admission closed.

**Architecture:** A narrow TypeScript bootstrap analyzer reads the real Galerina AST and derives exact loop-envelope facts. An authoritative `.fungi` model records that a structurally valid proposal remains `Verdict.Unknown` until an independent verifier and VOK object binding exist. No unchecked lowering is emitted in this chapter.

**Tech Stack:** Galerina `.fungi`, strict TypeScript, `node:test`, existing parser/type/effect checker, repository path and graph audits.

## Global Constraints

- Do not add `unsafe while`, raw pointers, manual allocation or developer-authored proof authority.
- Keep `unsafe let` limited to security-untrusted boundary data.
- The first profile is exact: `Array<Int>`, bound `1000000`, start `0`, step `+1`, comparison `<`, one `values.get(i)` and one terminal match.
- A structurally valid proposal is K3 `0`, never `+1`, until independent verifier and VOK binding are implemented.
- K3 `0` and `-1` cannot authorize native execution; an unavailable checked peer terminates with `_=>`.
- Preserve existing strict-profile diagnostics; do not reuse `isBoundedCondition` as optimization authority.
- Run all Node tests serially with `--test-concurrency=1` and compare Node process counts before and after.
- Use relative paths in committed documentation and never push.

---

### Task 1: Exact AST proposal analyzer

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/verified-loop-envelope.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Test: `packages-galerina/galerina-core-compiler/tests/verified-loop-envelope.test.mjs`

**Interfaces:**
- Consumes: `AstNode` from `./parser.js`.
- Produces: `analyzeMillionReadLoopEnvelope(ast: AstNode, flowName: string): VerifiedLoopEnvelopeProposal`.
- Produces: `VerifiedLoopEnvelopeProposal` with schema, candidate, K3 verdict, exact names/bound, immutable facts and stable refusal identifiers.

- [ ] **Step 1: Write the failing exact-candidate test**

Create a real source fixture inside the test containing a `secure flow` with:

```fungi
if values.count() != 1000000 { return Err("MILLION_LENGTH") }
mut i: Int = 0
mut last: Int = 0
while i < 1000000 {
  let selected: Option<Int> = values.get(i)
  match selected {
    Some(value) => { last = value }
    None => return Err("MILLION_BOUNDS")
    _ => return Err("MILLION_OPTION")
  }
  i = i + 1
}
```

Parse it with `parseProgram`, call `analyzeMillionReadLoopEnvelope`, and assert:

```js
assert.equal(result.schemaId, "galerina.verified-loop-envelope.proposal.v1");
assert.equal(result.candidate, true);
assert.equal(result.verdict, 0);
assert.equal(result.bound, 1000000);
assert.deepEqual(result.failureIds, ["INDEPENDENT_VERIFIER_UNAVAILABLE"]);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope.test.mjs
```

Expected: FAIL because `analyzeMillionReadLoopEnvelope` is not exported.

- [ ] **Step 3: Add hostile structural tests**

Generate one mutation per case from the valid source and assert
`candidate === false`, `verdict === -1`, and the named refusal:

```text
FLOW_NOT_FOUND
FLOW_SHAPE_NOT_EXACT
CARDINALITY_GATE_MISSING
INDUCTION_INITIALIZATION_NOT_EXACT
LOOP_CONDITION_NOT_EXACT
INDEX_ACCESS_NOT_EXACT
OPTION_MATCH_NOT_EXACT
INDUCTION_STEP_NOT_EXACT
LOOP_BODY_NOT_CLOSED
```

Mutations must cover bound `999999`, start `1`, `<=`, step `+2`, `get(i + 1)`,
two `get` calls, conditional increment, collection mutation, an extra call and
an extra loop.

- [ ] **Step 4: Implement the minimal analyzer**

Implement immutable helpers that match exact AST node shapes. The public result
must use:

```ts
export type LoopEnvelopeTrit = -1 | 0;

export interface VerifiedLoopEnvelopeFacts {
  readonly exactFlowShape: boolean;
  readonly exactCardinalityGate: boolean;
  readonly exactInductionInitialization: boolean;
  readonly exactLoopCondition: boolean;
  readonly exactIndexAccess: boolean;
  readonly exactOptionMatch: boolean;
  readonly exactInductionStep: boolean;
  readonly closedLoopBody: boolean;
}

export interface VerifiedLoopEnvelopeProposal {
  readonly schemaId: "galerina.verified-loop-envelope.proposal.v1";
  readonly candidate: boolean;
  readonly verdict: LoopEnvelopeTrit;
  readonly flowName: string;
  readonly collectionName: "values";
  readonly inductionName: "i";
  readonly bound: 1000000;
  readonly facts: VerifiedLoopEnvelopeFacts;
  readonly failureIds: readonly string[];
}
```

The analyzer returns `0` only for the exact candidate and includes
`INDEPENDENT_VERIFIER_UNAVAILABLE`; all structural failures return `-1`. It
must never emit bytes, create a lease or return `+1`.

- [ ] **Step 5: Export and verify GREEN**

Export the new function and types from `src/index.ts`, run the package build,
then run the focused test serially:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope.test.mjs
```

Expected: build succeeds and every focused test passes.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- packages-galerina/galerina-core-compiler/src/verified-loop-envelope.ts packages-galerina/galerina-core-compiler/src/index.ts packages-galerina/galerina-core-compiler/tests/verified-loop-envelope.test.mjs
git commit -m "feat: derive verified million-read loop proposals"
```

### Task 2: Authoritative `.fungi` non-authority model

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/verified-loop-envelope.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`
- Test: `packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-source.test.mjs`

**Interfaces:**
- Consumes: eight Boolean structural facts already derived by the compiler.
- Produces: `VerifiedLoopEnvelopeSourceProposal` with `candidate`,
  `Verdict.Unknown` for an exact structural candidate, or `Verdict.Deny` for a
  failed fact.

- [ ] **Step 1: Write the failing source-contract test**

The test must load the `.fungi` path, parse and check it, and assert the source
contains these exact public names:

```text
VerifiedLoopEnvelopeSourceFacts
VerifiedLoopEnvelopeSourceProposal
verifiedLoopEnvelopePropose
```

It must also assert the package `loadedAssets` list includes the file and that
the source contains no `Verdict.Allow`, `unsafe block`, raw pointer token or
unchecked-load name.

- [ ] **Step 2: Run the focused source test and confirm RED**

```powershell
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-source.test.mjs
```

Expected: FAIL because the `.fungi` file and asset entry do not exist.

- [ ] **Step 3: Implement the `.fungi` model**

Define an immutable record with eight Boolean facts. Use `if` only for those
Boolean facts. Return a deny proposal on the first false fact and return this
exact terminal candidate when all are true:

```fungi
return VerifiedLoopEnvelopeSourceProposal {
  schemaId: "galerina.verified-loop-envelope.proposal.v1"
  candidate: true
  verdict: Verdict.Unknown
  failureId: "INDEPENDENT_VERIFIER_UNAVAILABLE"
}
```

Do not add `Verdict.Allow`; this file cannot authorize VOK execution.

- [ ] **Step 4: Register the asset and verify GREEN**

Add the source path once to `packageGraph.loadedAssets`, then run:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-source.test.mjs
```

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- packages-galerina/galerina-core-compiler/src/self-hosted/verified-loop-envelope.fungi packages-galerina/galerina-core-compiler/package.json packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-source.test.mjs
git commit -m "feat: add fungi verified loop proposal model"
```

### Task 3: Checker-valid worked example and explanation

**Files:**
- Create: `docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi`
- Modify: `docs/examples/VERIFIED-NATIVE-OPERATION-BOUNDARY.md`
- Test: `packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-example.test.mjs`

**Interfaces:**
- Consumes: current public `.fungi` syntax only.
- Produces: a pointer-free checked peer that the compiler analyzer recognizes.

- [ ] **Step 1: Write the failing example test**

Load the new example, parse it, run the normal type/effect/value-state checks
used by nearby example tests, and call `analyzeMillionReadLoopEnvelope`. Assert
zero compiler errors, `candidate === true`, and `verdict === 0`.

- [ ] **Step 2: Run the example test and confirm RED**

```powershell
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-example.test.mjs
```

Expected: FAIL because the example file is absent.

- [ ] **Step 3: Add the worked `.fungi` example**

Use a `secure flow readMillionValues(values: Array<Int>) -> Result<Int,String>`
with an empty effects declaration, exact cardinality gate, `mut i`, `mut last`,
the checked `values.get(i)` plus exhaustive `match`, exact increment and
`Ok(last)`. Do not use `unsafe`, pointers or invented contract syntax.

- [ ] **Step 4: Update the explanatory document**

Add a section that explains:

- the video moves proof responsibility to a library developer;
- Galerina instead proves the complete loop envelope;
- one million reads do not require one million governance admissions;
- the checked source remains the semantic peer;
- the current implementation produces only a K3 `0` proposal;
- independent SLIDE verification, VOK binding and measurement remain open; and
- the runtime compute/time ceilings remain active.

Link the new `.fungi` example and RD-0681 using relative links.

- [ ] **Step 5: Verify GREEN and commit Task 3**

```powershell
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-example.test.mjs
node scripts/audit-path-leak.mjs
git add -- docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi docs/examples/VERIFIED-NATIVE-OPERATION-BOUNDARY.md packages-galerina/galerina-core-compiler/tests/verified-loop-envelope-example.test.mjs
git commit -m "docs: add verified million-read loop example"
```

### Task 4: Ledger, graph and regression closure

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `docs/reports/zero-trust-tooling-refactor-completion-2026-07-29.md` only if its current scope explicitly tracks this boundary.

**Interfaces:**
- Consumes: fresh test and audit evidence from Tasks 1-3.
- Produces: honest current-state documentation that distinguishes proposal
  implementation from native/VOK admission.

- [ ] **Step 1: Update the ledgers**

Record the AST analyzer, `.fungi` non-authority model, hostile corpus and worked
example as complete. Record independent verifier, final-object binding, native
lowering and paired benchmarks as open. Do not colour the production native
operation green.

- [ ] **Step 2: Run focused and package verification serially**

Capture Node counts before and after, then run:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Measure-Object
npm --prefix packages-galerina/galerina-core-compiler run build
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/verified-loop-envelope*.test.mjs
Get-Process node -ErrorAction SilentlyContinue | Measure-Object
```

Expected: tests pass and no child-process accumulation remains.

- [ ] **Step 3: Run repository safety and graph checks**

```powershell
node scripts/audit-path-leak.mjs
node scripts/graph-all.mjs --check --quiet
node scripts/flat-package-root-lock.mjs --check
git diff --check
```

Treat unrelated pre-existing failures as evidence to classify, not as permission
to weaken a gate.

- [ ] **Step 4: Run the complete serial compiler suite**

Run the package's complete documented surfaces with Node's test concurrency
kept at one:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run typecheck
npm --prefix packages-galerina/galerina-core-compiler run build
node --test --test-concurrency=1 packages-galerina/galerina-core-compiler/tests/*.test.mjs packages-galerina/galerina-core-compiler/tests/bootstrap-determinism/*.test.mjs packages-galerina/galerina-core-compiler/tests/governance-conformance/*.test.mjs packages-galerina/galerina-core-compiler/tests/parser/*.test.mjs packages-galerina/galerina-core-compiler/tests/package-resolver/*.test.mjs packages-galerina/galerina-core-compiler/tests/value-state/*.test.mjs packages-galerina/galerina-core-compiler/tests/type-registry/*.test.mjs packages-galerina/galerina-core-compiler/tests/effect-checker/*.test.mjs packages-galerina/galerina-core-compiler/tests/governance/*.test.mjs packages-galerina/galerina-core-compiler/tests/stdlib/*.test.mjs packages-galerina/galerina-core-compiler/tests/lexer/*.test.mjs
```

Inspect the final pass/fail totals and process count; do not infer success from
silence.

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- docs/TODO.md docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md
git commit -m "docs: record verified loop proposal status"
```

- [ ] **Step 6: Refresh the code graph after the final commit**

Run the moderate codebase-memory index. Verify `status: indexed`, node count is
close to expected, indexed HEAD equals the new commit and a search finds
`analyzeMillionReadLoopEnvelope`.
