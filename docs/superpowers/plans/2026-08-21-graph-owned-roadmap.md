# Graph-Owned Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dated, manually duplicated living roadmaps with one canonical graph-refreshed roadmap that is generated and checked by `graph-all`.

**Architecture:** Preserve the full active roadmap by renaming it to `docs/ROADMAP.md`; rename the generator and its artifacts; keep one generated live-status region; and make it the final fail-closed `graph-all` child. The generator continues to use the closed assurance DAG and ignores dirty paths only when tooling policy declares them as outputs of the upstream graph children.

**Tech Stack:** Node.js ESM, `node:test`, Git, Markdown, JSON, SVG, codebase-memory graph.

**Spec:** `docs/superpowers/specs/2026-08-21-graph-owned-roadmap-design.md`

## Global Constraints

- Zero-trust: deny and exit on missing, malformed, stale, ambiguous, or undeclared evidence.
- TDD: every production behaviour is first demonstrated by a focused failing test.
- Code discovery uses codebase-memory before exact file reads.
- `graph-all --check` is non-mutating.
- No `.fungi` source is created, converted, or edited.
- No push, PR, merge, reset, clean, restore, or publication action.
- Preserve unrelated files and stop on custody drift.
- Current graph children remain ordered; the roadmap runs only after all seven succeed.

---

### Task 1: Commit the approved design and bind the audit map

**Files:**
- Create: `docs/superpowers/specs/2026-08-21-graph-owned-roadmap-design.md`
- Create: `docs/superpowers/plans/2026-08-21-graph-owned-roadmap.md`
- Create (ignored evidence): `.superpowers/sdd/2026-08-21-graph-owned-roadmap/audit-map.json`

**Interfaces:**
- Consumes: approved design in the specification.
- Produces: immutable local design commit and digest-bound audit command list.

- [ ] **Step 1: Recheck custody**

Run exact root, branch, HEAD, staged, tracked, and untracked checks. Expected:
only these two new design documents are present.

- [ ] **Step 2: Write and validate the audit map**

Bind exact commands for focused RED, focused GREEN, related regression,
generator self-tests, graph generation/check, documentation fixed point, diff,
custody, and exact-HEAD indexing. Validate and draw it with the repository's
audit-map tooling before executing any multi-command audit.

- [ ] **Step 3: Commit only the design documents**

Stage the two exact design paths and commit locally with message:
`docs: design graph-owned roadmap`.

### Task 2: Establish orchestration and canonical-generator RED

**Files:**
- Modify: `scripts/tests/graph-all.test.mjs`
- Rename: `scripts/tests/roadmap-subway-generator.test.mjs` to `scripts/tests/roadmap-generator.test.mjs`
- Modify: `scripts/tests/roadmap-generator.test.mjs`
- Modify: `scripts/tests/assurance-roadmap-evidence.test.mjs`

**Interfaces:**
- Consumes: current public CLI modes of `graph-all` and the roadmap generator.
- Produces: failing behavioural controls for canonical names, eighth-child ordering, upstream refusal short-circuit, single-document writes, check non-mutation, and declared generated-output dirt.

- [ ] **Step 1: Add the `graph-all` failing controls**

Extend the fixture with `scripts/gen-roadmap.mjs`. Assert the literal call order:

```js
[
  "package-graph-generator.mjs",
  "project-graph-generator.mjs",
  "audit-graph-integrity.mjs",
  "kb-graph-generator.mjs",
  "dev-tool-index.mjs",
  "fungi-source-capability-inventory.mjs",
  "gen-assurance-semantic-graph.mjs",
  "gen-roadmap.mjs",
]
```

Assert `--check` reaches the roadmap in check mode, generate mode reaches it
with `--write`, and any upstream exit `7` leaves no `gen-roadmap.mjs` call.

- [ ] **Step 2: Add canonical generator failing controls**

Use a real temporary Git repository containing only `docs/ROADMAP.md` as the
living document. Assert exact outputs:

```text
docs/ROADMAP.md
build/roadmap/roadmap.svg
build/roadmap/provenance.json
```

Assert README remains byte-identical, `--check` writes nothing, exact declared
package graph output dirt is admitted, and `src/authority.ts` dirt refuses.

- [ ] **Step 3: Add canonical assurance failing controls**

Change the fixture root contract to:

```json
{
  "id": "roadmap",
  "evidencePath": "build/roadmap/roadmap.svg",
  "toolPath": "scripts/gen-roadmap.mjs",
  "expectedTool": "gen-roadmap"
}
```

Keep stale, deny, missing, proxy, and accessor controls intact.

- [ ] **Step 4: Run focused RED**

Run:

```powershell
node --test scripts/tests/graph-all.test.mjs scripts/tests/roadmap-generator.test.mjs scripts/tests/assurance-roadmap-evidence.test.mjs
```

Expected: non-zero for missing `gen-roadmap.mjs` and old descriptor/tool/output
contracts, with no path or syntax error.

- [ ] **Step 5: Commit the test-only RED**

Stage only the three exact test paths and the tracked test rename. Commit
locally with message: `test: expose graph-owned roadmap gaps`.

### Task 3: Implement the canonical generator and orchestration

**Files:**
- Rename: `scripts/gen-roadmap-subway.mjs` to `scripts/gen-roadmap.mjs`
- Modify: `scripts/gen-roadmap.mjs`
- Modify: `scripts/graph-all.mjs`
- Modify: `scripts/lib/assurance-fabric/roadmap-evidence.mjs`
- Modify: `governance/assurance-evidence-dependencies.json`
- Modify: `governance/tooling-policy.json`

**Interfaces:**
- Consumes: the seven upstream graph/index children and tooling-policy output declarations.
- Produces: `gen-roadmap` CLI, canonical `ROADMAP` marker pair, one roadmap document, one SVG, one provenance receipt, and eighth-child `graph-all` result.

- [ ] **Step 1: Rename the tool and close its current names**

Use these exact identities:

```js
const BEGIN = "<!-- ROADMAP:BEGIN (generated by scripts/gen-roadmap.mjs — do not edit; run `node scripts/gen-roadmap.mjs --write`) -->";
const END = "<!-- ROADMAP:END -->";
const TARGETS = ["docs/ROADMAP.md"];
const TOOL = "gen-roadmap";
const SVG_OUT = join(ROOT, "build", "roadmap", "roadmap.svg");
const PROVENANCE_OUT = join(ROOT, "build", "roadmap", "provenance.json");
```

Rename the authoritative-input domain and aggregate digest domain to version 2
canonical roadmap identities. Remove current `subway` CLI/error/output wording.

- [ ] **Step 2: Admit only declared upstream generated dirt**

Read `governance/tooling-policy.json` as a bounded authoritative input. Build a
closed set from the output arrays of the exact upstream generator keys used by
`graph-all`. When classifying dirty paths, ignore membership in that set and
the exact package graph pattern:

```text
packages-galerina/<one package>/.graph/BOUNDARY.md
packages-galerina/<one package>/.graph/package-graph.json
```

Do not ignore source, policy, documentation, unknown build paths, symlinks, or
malformed policy data.

- [ ] **Step 3: Make roadmap execution conditional in `graph-all`**

Run and aggregate the seven upstream children first. If any fails, report and
exit without roadmap execution. Otherwise run `gen-roadmap.mjs` as child eight
with `--check` or `--write`, include it in JSON/report counts, and propagate
its refusal.

- [ ] **Step 4: Update the assurance root**

Change only the aggregate root identity/path contract to `roadmap`,
`gen-roadmap`, `scripts/gen-roadmap.mjs`, and
`build/roadmap/roadmap.svg`. Preserve the exact eight predecessor set and
non-authorizing K3 evaluation.

- [ ] **Step 5: Run focused GREEN**

Run the Task 2 focused command. Expected: all tests pass, zero failures.

- [ ] **Step 6: Commit the production slice**

Stage the generator rename, orchestrator, assurance helper, descriptor, and
tooling policy. Commit locally with message:
`feat: generate roadmap from graph refresh`.

### Task 4: Migrate the canonical document and remove dated living roadmaps

**Files:**
- Rename: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md` to `docs/ROADMAP.md`
- Delete: `docs/roadmap-2026-07-15.md`
- Delete: `docs/roadmap-2026-07-23.md`
- Delete: `docs/roadmap-2026-07-24.md`
- Delete: `docs/roadmap-2026-07-25.md`
- Delete: `docs/roadmap-2026-07-25-cycle2.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/INDEX.md`
- Modify: `docs/README.md`
- Modify: `docs/TASKS.md`
- Modify: `scripts/gen-status-blocks.mjs`
- Modify: `scripts/tests/status-blocks-generator.test.mjs`
- Modify: `scripts/audit-canonical-test-counts.mjs`
- Modify: `scripts/tests/canonical-test-count-consistency.test.mjs`
- Modify: graph-discovered tracked text consumers of `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: `build/code-index/CODE_INDEX.md`
- Regenerate: `build/code-index/code-index.json`
- Regenerate: `build/code-index/provenance.json`

**Interfaces:**
- Consumes: the canonical generator from Task 3.
- Produces: one living roadmap path, no generated roadmap block in README, no status injection into deleted documents, and no live reference to the dated active path.

- [ ] **Step 1: Establish migration RED**

Update status and canonical-count tests first. Assert status generation owns
only `build/status/STATUS.md` and its provenance. Assert the count registry has
exactly five consumers: canonical roadmap summary, README full suite, README
table, documentation work ledger, and canonical roadmap Chapter 3.

Run:

```powershell
node --test scripts/tests/status-blocks-generator.test.mjs scripts/tests/canonical-test-count-consistency.test.mjs
```

Expected: non-zero because production still requires dated targets and old
marker/path identities.

- [ ] **Step 2: Implement the status/count migration**

Remove document targets from `gen-status-blocks.mjs`; retain exact artifact and
provenance drift checks. Rename the count capture from `subway` to `roadmap`,
use one ordered `ROADMAP` marker pair in `docs/ROADMAP.md`, and preserve all
remaining duplicate/drift refusal controls.

- [ ] **Step 3: Rename the active document intact**

Preserve every byte outside the generated region. Convert only the marker,
visual path, regeneration command, and current tool wording needed by the
canonical generator.

- [ ] **Step 4: Repair inbound references from graph results**

Use codebase-memory `search_code` in files mode for the exact dated active path.
Apply one exact literal substitution to `docs/ROADMAP.md` across those tracked
text consumers, excluding generated code-index outputs. Re-run the query and
require zero current matches outside this plan/spec and historical quoted
evidence deliberately preserved by the design.

- [ ] **Step 5: Remove the five superseded dated files**

Verify their resolved absolute paths are all inside the repository `docs`
directory, then remove those exact tracked paths. Update documentation indexes
and the README canonical link. Preserve specialized architecture/report/package
roadmaps.

- [ ] **Step 6: Run migration GREEN**

Run the two-file migration test command. Expected: all tests pass.

- [ ] **Step 7: Commit the migration slice**

Stage the exact rename, deletions, repaired consumers, tests, and generated
documentation index outputs. Commit locally with message:
`docs: consolidate living roadmap`.

### Task 5: Generate, verify, and refresh exact-head graphs

**Files:**
- Generate: `docs/ROADMAP.md` live region
- Generate: `build/roadmap/roadmap.svg`
- Generate: `build/roadmap/provenance.json`
- Generate: repository graph/index outputs declared by their owners
- Modify (ignored evidence): `.superpowers/sdd/2026-08-21-graph-owned-roadmap/*`

**Interfaces:**
- Consumes: committed Tasks 1 through 4.
- Produces: exact generated fixed point, local commits, clean custody, and an exact-HEAD external graph receipt.

- [ ] **Step 1: Run focused and related verification**

Run the five focused script test files, both generator self-tests, the canonical
count self-test, syntax checks, and generator-contract checks under the approved
audit map. Record exits, counts, and minutes.

- [ ] **Step 2: Generate the graph-owned roadmap**

Run `node scripts/graph-all.mjs` with the exact KB directory. Require all eight
children PASS and confirm the roadmap child is last.

- [ ] **Step 3: Reach a deterministic fixed point**

Run documentation, code, contract, unit, KB, and graph owners in their required
order until each `--check` reports no drift. Commit generated outputs locally
with explicit pathspecs, then rerun `graph-all --check` at the committed point.

- [ ] **Step 4: Verify migration absence and custody**

Require:

```text
docs/ROADMAP.md exists
five superseded dated roadmap paths absent
scripts/gen-roadmap-subway.mjs absent
current subway-named build artifacts absent
no staged, tracked, or untracked residue
git diff --check exits 0
```

- [ ] **Step 5: Refresh the external code graph at exact HEAD**

Run a full repository index. Require `status=indexed`, node count equals the
expected count, indexed HEAD equals Git HEAD, and `stale=false`. Probe
`gen-roadmap.mjs`, the canonical assurance root, and roadmap orchestration.

- [ ] **Step 6: Report truthfully**

Report `[x]` completed checks, `[X]` failures, `[!]` issues, elapsed minutes,
local commit SHAs, graph counts, and any independent-review limitation. Do not
push.
