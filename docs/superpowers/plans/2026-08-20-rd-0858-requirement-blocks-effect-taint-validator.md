# RD-0858 Requirement Effect, Taint and Validator Authority Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete RD-0858 delivery unit 3 by proving every requirement
constraint effect-free, blocking raw taint, and admitting a validator only
through exact, fresh, immutable authority.

**Architecture:** The existing effect checker remains the effect owner and
adds a bounded requirement-specific closure check over observed direct and
transitive effects. Both the existing value-state and taint passes gain an
explicit requirement context so name-based gates cannot launder inline taint.
A small validator-authority module treats registry rows as untrusted bytes and
matches them only against a separate digest-bound trust anchor and explicit
verification instant. No name, qualifier, environment value, ambient clock or
self-attested registry mints authority. Version 1 admits only exact bare calls
to a unique local flow; imported, receiver, aliased and dynamic calls refuse.

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
- Registry structure is not authority. Verification additionally requires an
  independently supplied exact registry digest. Unit 3 exposes this low-level
  match contract; the production CLI and security gate have no trust anchor
  and therefore refuse. Unit 6 remains the owner of checked-snapshot binding.
- Version 1 validator identity is
  `<canonical-source-unit-id>::<local-flow-name>`. The source-unit ID and build
  point are explicit trusted inputs. Only a bare call resolving uniquely to a
  local `FlowMeta` may match. Imported, method, receiver, aliased, shadowed or
  dynamic calls refuse; widening this is a later reviewed unit.
- Taint provenance uses a closed atomic domain:
  `web.request`, `process.input`, `environment.input`, `web.storage` and
  `declared.untrusted`. Propagation retains a sorted, duplicate-free tuple of
  atoms; the authority row must match the exact tuple and input type.
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
- Modify:
  `packages-galerina/galerina-core-compiler/src/value-state-checker.ts`
  - disable name-only gate declassification inside requirement constraints and
    consume the same exact validator match contract.
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

- exact row plus independently matching trust anchor returns a frozen
  `MATCHED` result; it does not claim checked-snapshot admission;
- missing row, duplicate identity and empty registry refuse;
- wrong local flow, qualified identity, source build, input type, taint class,
  output type, effect-free observation, profile, digest or version refuses;
- expired and not-yet-valid rows refuse at the explicit comparison instant;
- malformed timestamps, digests and versions refuse;
- registry construction clones and deep-freezes rows so caller mutation cannot
  alter later verification;
- deterministic ordering and registry digest are stable under input order;
- absent or wrong expected registry digest refuses even when every row is
  structurally valid;
- ceilings on rows and bytes refuse without partial admission.

Required RED is the exact missing export. Syntax or path faults do not count.

- [ ] **Step 2: Commit the test-only RED**

Stage only the new test and commit:

```powershell
git commit -m "test: define RD-0858 validator authority"
```

- [ ] **Step 3: Implement the minimum frozen registry**

Expose readonly row, registry, request, trust-anchor context and result types
plus:

- `createRequirementValidatorAuthorityRegistry(rows, limits)`;
- `verifyRequirementValidatorAuthority(registry, request, context)`.

The registry must canonicalize, copy, sort and freeze every accepted row, but
its successful construction means only `STRUCTURALLY_VALID`. The separate
trust anchor supplies the exact expected registry digest, canonical source-unit
ID, source build, checked profile, accepted authority version and comparison
time. Exactly one row must match. All results are frozen and carry a stable
state or refusal reason. Hashing is deterministic and domain-separated. No
file, clock, environment or network read is permitted. Direct tests may supply
a controlled anchor; production paths remain closed until Unit 6 owns it.

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
- recursive/cyclic local closure terminates through a bounded fixed point and
  refuses only when EffectFree cannot be proved;
- every constraint is checked in source order after an earlier fault;
- non-requirement effect diagnostics remain unchanged.

Required RED is a false PASS for at least the direct, transitive and unresolved
controls.

- [ ] **Step 2: Commit the effect test RED**

```powershell
git commit -m "test: expose RD-0858 constraint effects"
```

- [ ] **Step 3: Add bounded observed-effect closure**

Inside `checkEffects`, build exact local flow-node, direct-observed-effect and
strict-call inventories once. Pass this internal context to
`checkFlowEffects`, which invokes
`checkRequirementConstraintEffects(flowNode, context)` before returning its
result. The helper is the single production emit site for `003` and:

- scans each `requirementConstraint` expression;
- records direct observed effects;
- classifies every `callExpr`, rather than relying on effect inference to
  notice it;
- resolves only a bare call whose name maps to one unique local `FlowMeta`;
- refuses receiver, imported, aliased, shadowed and dynamic calls;
- walks strict local-call SCCs to a bounded observed-effect fixed point;
- refuses unknown calls, incomplete closure and exceeded ceilings;
- emits the exported `FUNGI_REQUIREMENT_003` definition without duplicating
  code/name strings.

Reuse `inferEffectsFromNode` for direct observed effects and the existing graph
algorithm package for SCC/fixed-point structure. Do not trust declared effects
or `pure` qualifiers. Do not create a second general effect graph. Preserve
the existing public `checkEffects` and `checkFlowEffects` call shapes.

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
- Modify:
  `packages-galerina/galerina-core-compiler/src/value-state-checker.ts`
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
- `validate*`, `sanitize*`, `check*`, `verify*`, `parse*`, `decode*` and a
  registered user gate cannot clear requirement-local taint by name in the
  value-state pass;
- local-flow validator identity is derived only as
  `<source-unit-id>::<flow-name>`; imported, receiver, aliased, shadowed and
  dynamic collisions refuse;
- mixed taint atoms propagate as a canonical exact tuple; a subset/superset
  authority row refuses;
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

Add exported frozen `RequirementTaintAtom` and bounded canonical taint-tuple
helpers. Extend the existing binding walk so requirement constraints see the
same source-ordered taint state as surrounding statements. Map sources to the
closed atoms and union them on propagation without widening to generic
`tainted`. For each constraint:

- refuse direct raw taint with `004`;
- recognize only exact user-flow validator calls;
- require exactly one successful authority verification;
- map missing/unregistered authority to `004`;
- map present but invalid authority to `010`;
- still require the validator flow's observed effect closure to be empty;
- continue scanning later constraints after a diagnostic.

Give the value-state walk an explicit `insideRequirementConstraint` context.
In that context, `isGateCallName` cannot declassify by prefix or registry name;
only the shared exact validator match may discharge the taint. The dedicated
taint pass applies the same match. A shared stable diagnostic-key helper merges
duplicate `004`/`010` reports from the two mandatory passes by exact
code/location/constraint identity; it never suppresses distinct constraints.

`checkTaint` and `checkValueStates` accept an optional validator input whose
default is an empty frozen registry and no trust anchor. CLI and security gate
pass that default explicitly. No checked-snapshot authority is invented.

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

The normative executable pre-manifest is
`docs/superpowers/audits/2026-08-20-rd-0858-unit3-final-audit-map.json`.
It contains one exact node per command, graph operation and review, including
the formerly grouped diagnostic, custody, external-graph and review rows below.
The table in this section is explanatory only and cannot authorize or execute
an audit. Before each multi-command run, rebind every manifest build locator
and the subject locator to the exact source/plan commit, then validate, draw
and digest that exact JSON. The manifest commit itself is evidence-only and is
not the audited source build point.

Use the installed `audit-map` skill before every run containing two or more
commands. Copy its example outside the skill into the task evidence directory,
bind `subject.locator` and every `build` field to the exact current Git commit,
then validate, draw and digest it with the maintained AGENTS tool. A changed
HEAD, argv, dependency, timeout, output ceiling, exit algebra or evidence
locator makes the prior digest stale. A wrong path or option is `[X]`, never
evidence, and must be disclosed and rerun through a newly validated manifest.

Every manifest uses:

- owner `Galerina`;
- cwd `repo://Galerina`;
- ordered argv arrays, never shell command strings;
- pass `[0]`, finding `[1]`, refused `[2]`; any other exit is refused;
- 1 MiB captured-output ceiling per node unless a smaller bound is listed;
- exact prerequisite IDs;
- receipt locators under the task evidence directory;
- an outer process supervisor that enforces timeout and output bounds;
- no approval claim. These are non-admission engineering audits. Any later
  authority-bearing use requires an exact digest-bound `APPROVED` record and
  `check --require-approved`.

Minimum final nodes, in dependency order:

| ID | argv | depends | timeout |
| --- | --- | --- | ---: |
| `core-typecheck` | `npm --prefix packages-galerina/galerina-core run typecheck` | none | 180000 ms |
| `compiler-typecheck` | `npm --prefix packages-galerina/galerina-core-compiler run typecheck` | none | 180000 ms |
| `compiler-build` | `npm --prefix packages-galerina/galerina-core-compiler run build` | compiler-typecheck | 300000 ms |
| `unit3-authority` | `node --test packages-galerina/galerina-core-compiler/tests/requirement-validator-authority.test.mjs` | compiler-build | 180000 ms |
| `unit3-effect-taint` | `node --test packages-galerina/galerina-core-compiler/tests/requirement-effect-taint.test.mjs` | compiler-build | 300000 ms |
| `requirement-regressions` | `node --test packages-galerina/galerina-core-compiler/tests/requirement-construct-parser.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-semantics.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-type-terminality.test.mjs` | compiler-build | 300000 ms |
| `effect-regressions` | `node --test packages-galerina/galerina-core-compiler/tests/effect-checker.test.mjs packages-galerina/galerina-core-compiler/tests/effect-inference.test.mjs` | compiler-build | 300000 ms |
| `taint-regressions` | `node --test packages-galerina/galerina-core-compiler/tests/value-state-checker.test.mjs packages-galerina/galerina-core-compiler/tests/phase28-profile-taint.test.mjs packages-galerina/galerina-core-compiler/tests/security-boundary.test.mjs packages-galerina/galerina-core-compiler/tests/security-denial-paths.test.mjs` | compiler-build | 300000 ms |
| `parser-type-regressions` | `node --test packages-galerina/galerina-core-compiler/tests/parser.test.mjs packages-galerina/galerina-core-compiler/tests/type-checker.test.mjs` | compiler-build | 300000 ms |
| `code-index` | `node scripts/code-index.mjs --check` | unit3-authority, unit3-effect-taint, requirement-regressions, effect-regressions, taint-regressions, parser-type-regressions | 180000 ms |
| `code-registry` | `node scripts/gen-code-registry.mjs --check` | code-index | 180000 ms |
| `docs-index` | `node scripts/docs-index.mjs --check` | code-registry | 180000 ms |
| `project-graph` | `node scripts/project-graph-generator.mjs --check` | docs-index | 300000 ms |
| `graph-integrity` | `node scripts/audit-graph-integrity.mjs` | project-graph | 300000 ms |
| `diagnostic-gates` | `node scripts/audit-diagnostic-codes.mjs` plus separate exact manifest nodes for collision and catalog commands | graph-integrity | 300000 ms each |
| `path-leak` | `node scripts/audit-path-leak.mjs` | diagnostic-gates | 180000 ms |
| `conventions` | `node scripts/lint-conventions.mjs --soft` | path-leak | 300000 ms |
| `custody` | `git diff --check` plus separate exact status/head nodes | conventions | 60000 ms each |
| `external-graph` | maintained full codebase-memory index plus exact status and symbol/body probes | custody | 900000 ms |
| `reviews` | independent and model-diverse exact-head reviews | external-graph | 900000 ms each |

Do not encode `plus separate` as one node: expand each named command into its
own argv array when materializing the JSON manifest.

Each receipt records schema, plan digest, node ID, exact build locator, argv,
start/end timestamps, elapsed milliseconds, actual exit, timeout flag,
truncation flag, captured-output digest, evidence locator and outcome. The plan
result is exactly `PASS`, `FINDING` or `REFUSED`; `PASS` requires every
mandatory node at one validated digest.
