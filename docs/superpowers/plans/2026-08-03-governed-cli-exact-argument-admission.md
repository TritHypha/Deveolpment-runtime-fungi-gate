# Governed CLI Exact Argument Admission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make governed CLI argument admission exact by declared type and arity so unsupported or mismatched inputs refuse before execution.

**Architecture:** Keep the existing CLI and interpreter boundary. Parse the already-produced `FlowMeta.params` into name/type descriptors at the governed CLI seam, admit only canonical `Int`, exact `Bool`, and exact `String` positional values, and fail closed for all other types or arity mismatches.

**Tech Stack:** Node.js ESM, `node:test`, real child-process CLI integration tests, Galerina parser/runtime.

## Global Constraints

- Do not change Galerina syntax, the raw WASM `--invoke` path, SLIDE or production authority.
- Do not add JSON, file-backed or general structured argument parsing.
- Refusals must occur before `m.run` and must not echo supplied values.
- Preserve unrelated work and commit locally only; never push.
- Run one test process at a time and confirm the Node process count returns to baseline.

---

### Task 1: Prove exact governed argument refusal and scalar admission

**Files:**
- Modify: `tests/cli-invoke-marshal/cli-invoke-marshal.test.mjs`
- Modify: `galerina.mjs`

**Interfaces:**
- Consumes: `FlowMeta.params: readonly string[]` from the current parser and governed positional CLI tokens.
- Produces: an exact `Map<string, GalerinaValue>` passed to `m.run`, or process exit 2 before execution.

- [ ] **Step 1: Write failing real-CLI tests**

Add a helper that invokes an arbitrary temporary flow through `--governed` and tests these literal outcomes:

```js
test("--governed refuses a scalar for an Array parameter before the empty path executes", () => {
  const result = runGoverned(
    "pure flow count(values: Array<Int>) -> Int { return values.count() }",
    "count",
    "7",
  );
  assert.equal(result.status, 2, result.out);
  assert.match(result.out, /cannot marshal.*Array<Int>/i);
  assert.doesNotMatch(result.out, /governed · flow=count/);
});

test("--governed refuses missing and surplus positional arguments", () => {
  const source = "pure flow add(a: Int, b: Int) -> Int { return a + b }";
  for (const args of [["1"], ["1", "2", "3"]]) {
    const result = runGoverned(source, "add", ...args);
    assert.equal(result.status, 2, result.out);
    assert.match(result.out, /expected 2.*received/i);
  }
});

test("--governed marshals scalar values from declared types", () => {
  assert.match(runGoverned("pure flow echo(v: String) -> String { return v }", "echo", "42").out, /"42"/);
  assert.match(runGoverned("pure flow choose(v: Bool) -> Int { if v { return 1 } return 0 }", "choose", "true").out, /\b1\b/);
  assert.match(runGoverned("pure flow echo(v: Int) -> Int { return v }", "echo", "-42").out, /-42/);
});

test("--governed refuses malformed declared scalar values", () => {
  assert.equal(runGoverned("pure flow echo(v: Bool) -> Bool { return v }", "echo", "yes").status, 2);
  for (const value of ["1.5", "1e3", "9007199254740992"]) {
    assert.equal(runGoverned("pure flow echo(v: Int) -> Int { return v }", "echo", value).status, 2);
  }
});
```

The helper writes a unique bounded fixture under `build/`, runs the real CLI synchronously, captures status/output and removes the fixture in `finally`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/cli-invoke-marshal/cli-invoke-marshal.test.mjs
```

Expected: the new Array, arity, numeric-looking String, malformed Bool and malformed Int assertions fail against the permissive marshaller; existing tests remain runnable.

- [ ] **Step 3: Implement the minimal exact marshaller**

In the governed branch of `galerina.mjs`:

```js
const gparams = (gmeta.params ?? []).map((parameter, index) => {
  const separator = String(parameter).indexOf(":");
  if (separator < 1) refuseParameterMetadata(index);
  const left = String(parameter).slice(0, separator).trim().split(/\s+/);
  const name = left[left.length - 1];
  const type = String(parameter).slice(separator + 1).trim().split(/\s+source_from\s+/u, 1)[0]?.trim();
  if (!name || !type) refuseParameterMetadata(index);
  return { name, type };
});
```

Require `gposArgs.length === gparams.length`. For each descriptor:

```js
if (type === "Bool" && (raw === "true" || raw === "false")) return { __tag: "bool", value: raw === "true" };
if (type === "Int" && /^-?(0|[1-9][0-9]*)$/u.test(raw) && Number.isSafeInteger(Number(raw))) return { __tag: "int", value: Number(raw) };
if (type === "String") return { __tag: "string", value: raw };
refuse without calling m.run;
```

Diagnostics identify argument position, parameter name and declared type, never the supplied value.

- [ ] **Step 4: Run focused and neighboring tests GREEN**

Run:

```powershell
node --test tests/cli-invoke-marshal/cli-invoke-marshal.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/cli-compatibility.test.mjs
```

Expected: both commands exit 0; the new regression assertions and existing governed/deploy cases pass.

- [ ] **Step 5: Inspect and commit the code slice**

Run `git diff --check`, inspect only the two intended files, then commit:

```powershell
git add -- galerina.mjs tests/cli-invoke-marshal/cli-invoke-marshal.test.mjs
git commit -m "fix: admit governed CLI arguments by type"
```

### Task 2: Record and broadly verify the closure

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/examples/TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md`
- Modify: `Galerina-Fungi-Package-Staging-Round-7-2026-08-03/TS-TO-FUNGI-MAPPING-ADJUDICATION-2026-08-03.md` outside the repository, preserving quarantine status.

**Interfaces:**
- Consumes: fresh focused test results and the exact committed CLI behavior.
- Produces: maintained translation guidance that no longer calls the harness defect open.

- [ ] **Step 1: Update evidence wording**

Record exact-arity/type closure, keep structured input unsupported, and require every parity dossier to name its execution surface. Do not promote any external candidate or package-retirement status.

- [ ] **Step 2: Run documentation and generated-graph guards**

Run:

```powershell
node scripts/audit-path-leak.mjs --files docs/TODO.md docs/examples/TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md
node scripts/audit-claim-hygiene.mjs
node packages-galerina/galerina-core-cli/dist/index.js graph --out build/graph
```

Expected: no new path/claim findings and graph generation exits 0. Inspect generated changes and retain only expected tracked graph outputs.

- [ ] **Step 3: Run proportionate aggregate verification**

Run:

```powershell
node --test tests/cli-invoke-marshal/cli-invoke-marshal.test.mjs
node --test packages-galerina/galerina-core-compiler/tests/cli-compatibility.test.mjs
node scripts/run-phase-close.mjs --tier phase-close
```

Record exact totals and Node before/after counts; never infer success from
silence. If phase-close reports an unrelated pre-existing failure, preserve
the output and distinguish it from the focused closure rather than weakening
either gate.

- [ ] **Step 4: Commit documentation/generated evidence**

Stage only intended tracked files and commit:

```powershell
git commit -m "docs: close governed CLI parity hole"
```

- [ ] **Step 5: Refresh the codebase graph after the final commit**

Run a moderate codebase-memory index refresh. Confirm `indexed_head_sha` equals the final commit, node count is close to expected, `stale` is false, and search finds the changed governed marshalling seam.
