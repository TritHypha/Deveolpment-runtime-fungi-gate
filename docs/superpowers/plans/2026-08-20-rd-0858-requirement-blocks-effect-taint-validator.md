# RD-0858 Requirement Effect, Taint and Validator Authority Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete RD-0858 delivery unit 3 by proving every requirement
constraint effect-free, blocking raw taint, and admitting a validator only
through exact, fresh, immutable authority.

**Architecture:** The existing effect checker remains the effect owner and
adds a bounded requirement-specific closure check over observed direct and
transitive effects. The existing value-state and taint passes remain live.
A small validator-authority module owns a frozen, caller-supplied registry and
an explicit verification instant; no name, qualifier, environment value or
ambient clock mints authority. The taint checker consumes that registry only
for validator calls inside requirement constraints.

**Tech Stack:** Strict TypeScript; existing parser AST, effect, value-state and
taint checkers; Node.js ESM and `node:test`; Myco/Hypha audit orchestration;
generated diagnostic/code/document indexes; canonical and external graphs.

**Spec:**
`docs/superpowers/specs/2026-08-20-rd-0858-requirement-blocks-design.md`

## Global Constraints

- Delivery unit 3 only: effect, value-state, taint and validator authority.
- `.fungi` conversion remains `HOLD`. No `.fungi` file is created, edited,
  staged or committed.
- No interpreter, runtime, GIR, SLIDE, VOK, checked-snapshot, receipt,
  admission or production authority is added.
- Every constraint is EffectFree. Direct effects, ambient state, mutation,
  unresolved calls and transitively effectful calls emit
  `FUNGI-REQUIREMENT-003`.
- A `pure` declaration is not evidence. Its observed transitive closure must
  be empty.
- Raw taint cannot participate in a requirement comparison, member access,
  Boolean operation or ordinary predicate call.
- A value cleaned outside the requirement by an existing value-state boundary
  remains usable only under that existing boundary contract.
- A tainted validator call is valid only when exactly one authority row binds
  its qualified identity, source build, input type, taint class, Verdict
  output, observed EffectFree state, checked profile and digest, version and
  unexpired freshness.
- Missing, duplicate, malformed, stale or mismatched authority refuses.
- Sanitizers, parsers, converters, Bool helpers and flow names never mint
  validator authority.
- Authority verification receives its comparison instant and expected build
  and profile explicitly. It must not read the clock, environment or network.
- Codes `003`, `004` and `010` become live in this unit. Codes `011` and `012`
  remain reserved.
- Every change follows focused RED, minimal GREEN, exact-path commit and fresh
  review. No push, PR, merge, reset, clean, restore, release or admission.
- Timeout, stale graph, skipped evidence, truncated evidence, wrong command
  path or unmapped diagnostic is `HOLD`.

---

## File Map

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-validator-authority.ts`
  - frozen authority rows, registry and exact verification result.
- Modify: `packages-galerina/galerina-core-compiler/src/effect-checker.ts`
  - bounded requirement constraint effect closure.
- Modify: `packages-galerina/galerina-core-compiler/src/taint-checker.ts`
  - requirement taint rules and validator registry consumption.
- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
  - pass explicit empty authority by default.
- Modify: `packages-galerina/galerina-core-compiler/src/security-gate.ts`
  - preserve fail-closed default authority.
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
  - export the Unit 3 public contracts.
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-validator-authority.test.mjs`
  - authority structure, freshness, ambiguity and immutability controls.
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-effect-taint.test.mjs`
  - compiler-facing effect, value-state, taint and validator controls.
- Regenerate only generated outputs whose bytes change.

---

### Task 1: Add the validator-authority kernel

**Files:**

- Create:
  `packages-galerina/galerina-core-compiler/src/requirement-validator-authority.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-validator-authority.test.mjs`

- [ ] **Step 1: Plant authority RED controls**

Prove the public contract is absent, then cover:

- exact admitted row returns a frozen `ADMITTED` result;
- missing row, duplicate identity and empty registry refuse;
- wrong local flow, qualified identity, source build, input type, taint class,
  output type, effect-free observation, profile, digest or version refuses;
- expired and not-yet-valid rows refuse at the explicit comparison instant;
- malformed timestamps, digests and versions refuse;
- registry construction clones and deep-freezes rows so caller mutation cannot
  alter later verification;
- deterministic ordering and registry digest are stable under input order;
- ceilings on rows and bytes refuse without partial admission.

Required RED is the exact missing export. Syntax or path faults do not count.

- [ ] **Step 2: Commit the test-only RED**

Stage only the new test and commit:

```powershell
git commit -m "test: define RD-0858 validator authority"
```

- [ ] **Step 3: Implement the minimum frozen registry**

Expose readonly row, registry, request, context and result types plus:

- `createRequirementValidatorAuthorityRegistry(rows, limits)`;
- `verifyRequirementValidatorAuthority(registry, request, context)`.

The registry must canonicalize, copy, sort and freeze every accepted row. The
verification context supplies exact expected source build, checked profile,
accepted authority version and comparison time. Exactly one row must match.
All failure results are frozen and carry a stable refusal reason. Hashing is
deterministic and domain-separated. No file, clock, environment or network
read is permitted.

- [ ] **Step 4: Prove authority GREEN and commit**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-validator-authority.test.mjs
```

Commit only the test, module and export:

```powershell
git commit -m "feat: add RD-0858 validator authority"
```

---

### Task 2: Prove constraint effect closure

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/effect-checker.ts`
- Create:
  `packages-galerina/galerina-core-compiler/tests/requirement-effect-taint.test.mjs`

- [ ] **Step 1: Plant effect RED controls**

Cover:

- literals, comparisons and Boolean/Verdict operators with no calls pass;
- an admitted pure flow with empty observed closure passes;
- direct database, network, audit, mutation and ambient-state effects emit
  exactly `FUNGI-REQUIREMENT-003`;
- a transitive effect emits `003` even when every caller is named or declared
  pure;
- an unresolved or dynamic call emits `003`;
- an effectful validator row cannot bypass `003`;
- recursive/cyclic call closure terminates and refuses when EffectFree cannot
  be proved;
- every constraint is checked in source order after an earlier fault;
- non-requirement effect diagnostics remain unchanged.

Required RED is a false PASS for at least the direct, transitive and unresolved
controls.

- [ ] **Step 2: Commit the effect test RED**

```powershell
git commit -m "test: expose RD-0858 constraint effects"
```

- [ ] **Step 3: Add bounded observed-effect closure**

Reuse the existing flow-node index, call graph, alias/shadow resolution and
direct effect inference. Add a requirement-specific result that:

- scans each `requirementConstraint` expression;
- records direct observed effects;
- resolves only exact known flow calls;
- walks their observed effect closure with explicit node/depth ceilings;
- refuses unknown calls, unresolved cycles and exceeded ceilings;
- emits the exported `FUNGI_REQUIREMENT_003` definition without duplicating
  code/name strings.

Do not trust declared effects or `pure` qualifiers without observed closure.
Do not create a second general effect graph.

- [ ] **Step 4: Prove effect GREEN and commit**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-effect-taint.test.mjs packages-galerina\galerina-core-compiler\tests\effect-checker.test.mjs packages-galerina\galerina-core-compiler\tests\effect-inference.test.mjs
```

```powershell
git commit -m "feat: prove RD-0858 constraint effects"
```

---

### Task 3: Enforce requirement taint and validator authority

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/src/taint-checker.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/security-gate.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify:
  `packages-galerina/galerina-core-compiler/tests/requirement-effect-taint.test.mjs`

- [ ] **Step 1: Plant taint RED controls**

Cover:

- direct tainted identifier, member, comparison and Boolean use emit exactly
  `FUNGI-REQUIREMENT-004`;
- aliases and nested expression shapes cannot hide taint;
- tainted input passed to an ordinary flow, sanitizer, parser, converter or
  Bool helper emits `004` and cannot mint ALLOW;
- a validator call with missing authority emits `004`;
- malformed, duplicate, stale, wrong-build, wrong-profile, wrong-digest,
  wrong-version, wrong-input, wrong-taint-class, non-Verdict or effectful
  authority emits exactly `FUNGI-REQUIREMENT-010`;
- exactly admitted validator authority consumes the exact taint class and
  produces a Verdict constraint;
- an existing checked value-state/untaint boundary applied before the
  requirement leaves a clean value that passes both value-state and taint;
- calling that same sanitizer inside the requirement is not validator
  authority;
- every constraint is checked after an earlier failure;
- CLI and production security gate use the empty registry and therefore refuse
  any authority-bearing validator until a later checked snapshot supplies it;
- existing injection-sink taint tests remain unchanged.

Required RED is false PASS for direct requirement taint and absence of the
validator-authority route.

- [ ] **Step 2: Commit the taint test RED**

```powershell
git commit -m "test: expose RD-0858 requirement taint"
```

- [ ] **Step 3: Add the narrow requirement taint pass**

Extend the existing binding walk so requirement constraints see the same
source-ordered taint state as surrounding statements. Preserve taint class on
propagation. For each constraint:

- refuse direct raw taint with `004`;
- recognize only exact user-flow validator calls;
- require exactly one successful authority verification;
- map missing/unregistered authority to `004`;
- map present but invalid authority to `010`;
- still require the validator flow's observed effect closure to be empty;
- continue scanning later constraints after a diagnostic.

`checkTaint` accepts an explicit optional authority input whose default is an
empty frozen registry and closed context. CLI and security gate pass that
default explicitly. No checked-snapshot authority is invented in this unit.

- [ ] **Step 4: Prove taint/value-state GREEN and commit**

```powershell
npm --prefix packages-galerina\galerina-core-compiler run typecheck
npm --prefix packages-galerina\galerina-core-compiler run build
node --test packages-galerina\galerina-core-compiler\tests\requirement-effect-taint.test.mjs packages-galerina\galerina-core-compiler\tests\requirement-validator-authority.test.mjs packages-galerina\galerina-core-compiler\tests\value-state-checker.test.mjs packages-galerina\galerina-core-compiler\tests\phase28-profile-taint.test.mjs packages-galerina\galerina-core-compiler\tests\security-boundary.test.mjs packages-galerina\galerina-core-compiler\tests\security-denial-paths.test.mjs
```

```powershell
git commit -m "feat: enforce RD-0858 validator taint authority"
```

---

### Task 4: Generate evidence and close delivery unit 3

- [ ] **Step 1: Run the proportional compiler matrix**

Include core/compiler typechecks, compiler build, both Unit 3 tests, all Unit 1
and Unit 2 requirement tests, effect regressions, value-state regressions,
taint regressions, security gate regressions, parser and type-checker tests.
Zero skips are permitted for RD-0858 controls.

- [ ] **Step 2: Regenerate dependent indexes to a fixed point**

Run code index, code registry, documentation index, project graph and graph
integrity in their required order twice. Hash every changed tracked output.
Second-run drift is `HOLD`.

- [ ] **Step 3: Run diagnostic and custody gates**

Require `003`, `004` and `010` live with one definition, production emit sites
and focused tests. `011` and `012` remain reserved. Run collision, catalog,
path-leak and soft convention checks. The convention report remains truthful
about pre-existing `.fungi` findings and grants no conversion authority.

- [ ] **Step 4: Commit generated evidence explicitly**

Generated sidecars bind the exact immediately preceding source commit.
Post-commit check modes must be non-mutating.

```powershell
git commit -m "chore: index RD-0858 authority checks"
```

- [ ] **Step 5: Refresh the external graph at exact evidence HEAD**

Require exact Git/index head, ready status and expected node/edge equality.
Probe `createRequirementValidatorAuthorityRegistry`,
`verifyRequirementValidatorAuthority`, the requirement effect closure and the
requirement taint checker bodies.

- [ ] **Step 6: Obtain independent and model-diverse reviews**

Reviewers verify effect closure, unresolved-call refusal, taint propagation,
authority exactness, immutability, freshness, deterministic hashing, live code
ownership and scope containment. Any Critical or Important finding is `HOLD`
and receives its own RED/GREEN round.

- [ ] **Step 7: Record the reviewed Unit 3 milestone**

Only after exact-head PASS, update the first dated `docs/TODO.md` section with
the evidence commit, counts, graph build point and scope limit. Commit the TODO,
regenerate locator-only outputs to a fixed point, refresh the exact final graph
and obtain an evidence-only review.

Unit 3 completion grants no interpreter, runtime, GIR, SLIDE, VOK, admission,
production or `.fungi` conversion authority.

---

## Audit Pre-Manifest

Publish this map before every long verification. A wrong path or option is
`[X]`, never evidence, and must be disclosed and rerun correctly.

- [ ] core typecheck
- [ ] compiler typecheck
- [ ] compiler build
- [ ] Unit 3 authority tests
- [ ] Unit 3 effect/taint tests
- [ ] Unit 1 and Unit 2 requirement regressions
- [ ] effect-checker regressions
- [ ] value-state and taint regressions
- [ ] CLI and production security-gate regressions
- [ ] parser and type-checker regressions
- [ ] code-index check
- [ ] diagnostic-registry check
- [ ] documentation-index check
- [ ] canonical project-graph check
- [ ] graph integrity
- [ ] diagnostic ownership/collision/catalog gates
- [ ] path-leak gate
- [ ] soft convention report with truthful pre-existing finding count
- [ ] diff/custody check
- [ ] external exact-head graph and symbol/content probes
- [ ] independent review
- [ ] model-diverse review
