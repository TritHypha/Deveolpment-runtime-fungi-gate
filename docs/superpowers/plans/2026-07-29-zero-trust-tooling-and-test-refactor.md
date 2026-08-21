# Zero-Trust Tooling and Test Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Galerina test, audit, generator, index, graph, and
compiler-owned SLIDE asset mechanically accounted for, fail-closed, and
truthfully represented by aggregate commands.

**Architecture:** Retain specialist tools and add a derived inventory plus a
small authoritative exception policy. Make root aggregators propagate child
failures, rebuild before testing, require non-vacuous results, and distinguish
blocking benchmark integrity from non-authorizing timed measurements.

**Tech Stack:** Node.js 20+, strict TypeScript, Node `node:test`, JSON policy,
PowerShell-compatible Node child processes, Galerina `.fungi`, existing
project/package graph tools.

## Global Constraints

- Zero trust: verify; never assume; unknown, missing, empty, stale, malformed,
  timed out, signalled, or unparseable state refuses.
- Preserve the owner's modified
  `packages-galerina/galerina-tri-regex/AUDIT.md` and untracked `.codex/`.
- Never push. Commit only verified, scoped local changes.
- Use RED-to-GREEN tests for every production behavior change.
- Do not edit vendored Myco source; its package metadata and Galerina-side
  orchestration may change.
- `.gate` remains header-only and on hold.
- Wasm remains the implemented production/differential path until SLIDE's
  documented replacement gates pass.
- Galerina-side SLIDE evidence is not independent SLIDE verification and
  releases no authority.
- Timed benchmarks never decide a security/governance verdict.
- Regenerate and review tracked artifacts; never hand-edit generated counts.

---

### Task 1: Add a fail-closed tooling inventory and exception policy

**Files:**

- Create: `governance/tooling-policy.json`
- Create: `scripts/lib/tooling-inventory.mjs`
- Create: `scripts/audit-tooling-contract.mjs`
- Create: `scripts/tests/tooling-contract.test.mjs`
- Modify: `galerina.workspace.json`
- Modify: `scripts/dev-tool-index.mjs`
- Modify: `scripts/run-phase-close.mjs`

**Interfaces:**

- Produces:
  `discoverTooling(root): ToolingInventory`,
  `loadToolingPolicy(root): ToolingPolicy`, and
  `validateToolingContract(inventory, policy): ToolingViolation[]`.
- `ToolingInventory` contains reconciled workspace/package-directory records,
  script tools,
  package-test scripts, direct phase-close commands, CI commands, external
  fixture-test evidence, generators, and generated outputs.
- `tooling-policy.json` records exceptions only. Unknown or unused exception
  keys are violations.

- [x] **Step 1: Write RED tests for discovery and fail-closed policy behavior**

Create fixture tests that assert:

```js
test("an undisposed audit is a blocking violation", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({ packages: [] }),
    "scripts/audit-new-control.mjs": "process.exit(0);\n",
    "governance/tooling-policy.json": JSON.stringify(validEmptyPolicy()),
  });
  const violations = validateToolingContract(
    discoverTooling(root),
    loadToolingPolicy(root),
  );
  assert.ok(violations.some((v) =>
    v.code === "TOOLING-AUDIT-UNCOVERED" &&
    v.subject === "audit-new-control.mjs"));
});

test("a stale or unknown exception is refused", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({ packages: [] }),
    "governance/tooling-policy.json": JSON.stringify({
      schemaVersion: 1,
      packageNoTest: {},
      toolExceptions: {
        "audit-deleted.mjs": {
          class: "external",
          reason: "covered elsewhere",
          owner: "Galerina",
          reviewWhen: "tool returns",
        },
      },
      generators: {},
    }),
  });
  assert.ok(validate(root).some((v) =>
    v.code === "TOOLING-POLICY-STALE"));
});

test("a package without a runnable test requires an exact exception", () => {
  const root = fixtureWorkspacePackage("galerina-empty", {
    name: "@galerina/empty",
    scripts: {},
  });
  assert.ok(validate(root).some((v) =>
    v.code === "TOOLING-PACKAGE-NO-TEST"));
});

test("an unregistered package directory is a blocking violation", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({ packages: [] }),
    "packages-galerina/hidden/package.json":
      JSON.stringify({ name: "@galerina/hidden", scripts: { test: "node --test" } }),
    "governance/tooling-policy.json": JSON.stringify(validEmptyPolicy()),
  });
  assert.ok(validate(root).some((v) =>
    v.code === "TOOLING-PACKAGE-UNREGISTERED"));
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test scripts/tests/tooling-contract.test.mjs
```

Expected: failure because `tooling-inventory.mjs`,
`audit-tooling-contract.mjs`, and the policy do not exist.

- [x] **Step 3: Implement the inventory data model and strict validator**

Use the following exported shapes:

```js
export function discoverTooling(root) {
  return {
    packages: discoverWorkspacePackages(root),
    tools: discoverScriptTools(root),
    directPhaseClose: discoverRunCalls(root),
    ciCommands: discoverWorkflowCommands(root),
    externalTests: discoverRegisteredFixtureEvidence(root),
  };
}

export function validateToolingContract(inventory, policy) {
  const violations = [];
  // Workspace declarations and actual package directories agree exactly.
  // Every reconciled package: executable test or exact packageNoTest exception.
  // Every audit/lint: direct cadence, CI, registered fixture evidence, or exact
  // tool exception.
  // Every generator: exact outputs plus check/idempotence evidence.
  // Every exception: must refer to one discovered subject and validate schema.
  return violations;
}
```

The initial policy must contain:

```json
{
  "schemaVersion": 1,
  "packageNoTest": {
    "galerina-registry": {
      "reason": "Empty signed-package registry until the owner signing ceremony; no executable package surface exists.",
      "owner": "Galerina registry",
      "reviewWhen": "The first registry entry or executable source is added."
    }
  },
  "toolExceptions": {},
  "generators": {}
}
```

Do not baseline undisposed audits. First derive real direct/CI/fixture
coverage; add an exception only for a genuinely external, destructive, or
timed operator path, with exact evidence and review condition.

Register both currently unlisted package directories,
`galerina-devtools-benchmarks` and `galerina-registry`, in
`galerina.workspace.json`. The registry remains the sole initial no-test
exception; the benchmark package is executable and must enter normal test
discovery.

- [x] **Step 4: Make the tool index consume the shared inventory**

Remove duplicate filename/source-string classification from
`dev-tool-index.mjs`. Its `--check` must fail for every
`validateToolingContract` violation and print exact codes/subjects.

- [ ] **Step 5: Verify GREEN and mutation direction**

Run:

```powershell
node --test scripts/tests/tooling-contract.test.mjs
node scripts/audit-tooling-contract.mjs --self-test
node scripts/audit-tooling-contract.mjs
node scripts/dev-tool-index.mjs --check
```

Then temporarily add a fixture-only unknown audit and prove both enforcing
commands return non-zero. Do not mutate the live tree for the negative.

- [ ] **Step 6: Commit**

```powershell
git add -- galerina.workspace.json governance/tooling-policy.json scripts/lib/tooling-inventory.mjs scripts/audit-tooling-contract.mjs scripts/tests/tooling-contract.test.mjs scripts/dev-tool-index.mjs scripts/run-phase-close.mjs
git commit -m "feat: govern complete tooling inventory"
```

---

### Task 2: Make the root package-test runner complete and build-current

**Files:**

- Modify: `scripts/run-all-tests.cjs`
- Create: `scripts/tests/run-all-tests.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Modify: `packages-galerina/galerina-tools-myco/package.json` only if metadata
  is required; do not edit vendored source

**Interfaces:**

- Add CLI flags:
  `--root <workspace>`, `--json`, `--list`, `--core`, `--bail`,
  `--emit-counts`.
- A full run selects every reconciled, registered package except exact
  `packageNoTest` policy entries.
- JSON result:

```ts
type PackageTestRun = {
  readonly package: string;
  readonly status: "pass" | "fail";
  readonly exitCode: number;
  readonly tests: number;
  readonly pass: number;
  readonly fail: number;
  readonly built: boolean;
  readonly durationMs: number;
};
```

- [x] **Step 1: Write RED fixture tests for omitted and stale-build classes**

```js
test("full discovery includes any registered package with a test script", () => {
  const root = workspaceFixture({
    "packages-galerina/custom/package.json": JSON.stringify({
      name: "@galerina/custom",
      scripts: { test: "node scripts/run-tests.mjs" },
    }),
    "packages-galerina/custom/scripts/run-tests.mjs":
      "console.log('tests 1\\npass 1\\nfail 0')",
  });
  const r = run(root, "--list");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /custom/);
});

test("existing dist never bypasses the package test/build chain", () => {
  const root = packageFixture({
    testScript:
      "node build.mjs && node --test tests/*.test.mjs",
    distMarker: "stale",
  });
  const r = run(root, "--json");
  assert.equal(r.status, 0);
  assert.equal(readMarker(root), "fresh");
});

test("a zero exit with no parseable count refuses", () => {
  const root = packageFixture({ testScript: "node silent-pass.mjs" });
  const r = run(root, "--json");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /TEST-SUMMARY-UNPARSEABLE/);
});
```

- [x] **Step 2: Run RED**

```powershell
node --test scripts/tests/run-all-tests.test.mjs
```

Expected: the custom script is excluded, stale `dist/` bypasses the build, and
an uncounted pass is accepted.

- [x] **Step 3: Replace regex suite discovery with reconciled-policy discovery**

Delete `isRealSuite` and the smart direct-`node --test` dispatch. Always run
the package's declared `npm test` command. On Windows invoke `npm.cmd`; on
POSIX invoke `npm`, with `shell: false`.

Require:

```js
const complete =
  child.status === 0 &&
  counts.tests !== null &&
  counts.pass !== null &&
  counts.fail === 0 &&
  counts.tests > 0 &&
  counts.pass === counts.tests;
```

A null status, signal, timeout, missing package, missing test script,
unparseable count, zero tests, or count mismatch is failure.

- [x] **Step 4: Standardize benchmark integrity tests**

Change:

```json
"test": "node --test test/*.test.mjs"
```

Keep timed scripts (`run`, `bench`, `variance`, `history`) separate. Confirm
the three files fail through process exit when any invariant throws.

- [x] **Step 5: Verify benchmarks and Myco enter the full list**

```powershell
node scripts/run-all-tests.cjs --list
```

Expected: 96 governed test-bearing packages from 97 registered packages; both
`galerina-devtools-benchmarks` and `galerina-tools-myco` appear.

- [x] **Step 6: Run focused and package tests**

```powershell
node --test scripts/tests/run-all-tests.test.mjs
npm.cmd test
```

Run the second command separately in:

- `packages-galerina/galerina-devtools-benchmarks`
- `packages-galerina/galerina-tools-myco`

- [x] **Step 7: Commit**

```powershell
git add -- scripts/run-all-tests.cjs scripts/tests/run-all-tests.test.mjs packages-galerina/galerina-devtools-benchmarks/package.json packages-galerina/galerina-tools-myco/package.json
git commit -m "fix: make package test aggregation complete"
```

---

### Task 3: Standardize devtools and test package build chains

**Files:**

- Modify: each `packages-galerina/galerina-devtools-*/package.json`
- Modify: `packages-galerina/galerina-test/package.json`
- Create: `scripts/tests/devtools-package-contract.test.mjs`

**Interfaces:**

- All TypeScript devtools packages expose:
  `typecheck`, `build`, and `test`.
- Their `test` command executes, in order:
  `npm run typecheck && npm run build && node --test ...`.
- The JavaScript-only benchmark package is exempt from TypeScript build, but
  not from standard Node test reporting.

- [x] **Step 1: Write RED contract tests**

```js
test("every TypeScript devtools test rebuilds its public dist", () => {
  for (const pkg of discoverDevtoolsPackages(ROOT)) {
    if (!hasTypeScriptSource(pkg)) continue;
    const scripts = readPackageJson(pkg).scripts;
    assert.match(scripts.test, /npm run typecheck/);
    assert.match(scripts.test, /npm run build/);
    assert.match(scripts.test, /node --test/);
    assert.ok(scripts.test.indexOf("typecheck") < scripts.test.indexOf("build"));
    assert.ok(scripts.test.indexOf("build") < scripts.test.indexOf("node --test"));
  }
});
```

- [x] **Step 2: Run RED**

```powershell
node --test scripts/tests/devtools-package-contract.test.mjs
```

Expected: failures for packages whose current `test` script imports stale
`dist/` without rebuilding.

- [x] **Step 3: Update package scripts mechanically**

Use:

```json
"test": "npm run typecheck && npm run build && node --test tests/*.test.mjs"
```

Preserve explicit test-file lists where a package intentionally has multiple
directories. Do not add dependencies or alter runtime APIs.

- [x] **Step 4: Verify every affected package**

Run `npm.cmd test` in all 14 `galerina-devtools-*` packages and
`galerina-test`. Record exact Node test counts and exits.

- [x] **Step 5: Commit**

```powershell
git add -- packages-galerina/galerina-devtools-*/package.json packages-galerina/galerina-test/package.json scripts/tests/devtools-package-contract.test.mjs
git commit -m "test: rebuild every devtools package before testing"
```

---

### Task 4: Make phase-close a real blocking gate

**Files:**

- Modify: `scripts/run-phase-close.mjs`
- Create: `scripts/tests/run-phase-close.test.mjs`
- Modify: `package.json`
- Modify: `docs/CONSISTENCY_GATES.md`

**Interfaces:**

- Add `--root`, `--json`, `--report-only`, and `--tier phase-close|exhaustive`.
- Default exit is `1` when any blocking child fails, otherwise `0`.
- `--report-only` always prints the failed set but returns `0`; output and JSON
  must label the result `report-only`, never `green`.

- [x] **Step 1: Write RED subprocess tests**

Use a fixture command manifest or injected fixture root:

```js
test("one failed child makes phase-close exit non-zero", () => {
  const root = phaseFixture([
    { name: "green", command: ["node", "green.mjs"] },
    { name: "red", command: ["node", "red.mjs"] },
  ]);
  const r = runPhaseClose(root, "--json");
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(r.stdout).failed, ["red"]);
});

test("--report-only cannot describe a failed run as green", () => {
  const root = phaseFixture([{ name: "red", command: ["node", "red.mjs"] }]);
  const r = runPhaseClose(root, "--report-only", "--json");
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).verdict, "REPORT_ONLY_FAILED");
});
```

- [x] **Step 2: Run RED**

```powershell
node --test scripts/tests/run-phase-close.test.mjs
```

Expected: default failure returns `0`, and no machine result exists.

- [x] **Step 3: Implement strict result propagation**

Replace the terminal success with:

```js
const failed = results.filter((result) => !result.ok);
const verdict = failed.length === 0
  ? "PASS"
  : reportOnly
    ? "REPORT_ONLY_FAILED"
    : "FAIL";
process.exit(failed.length > 0 && !reportOnly ? 1 : 0);
```

The governance-diff parse catch must produce an explicit failed/indeterminate
result, not silently assume "no `.fungi` changes".

- [x] **Step 4: Wire the tooling-contract audit and deterministic benchmark tests**

Add blocking children for:

- `node scripts/audit-tooling-contract.mjs`
- `npm test` in `galerina-devtools-benchmarks`

The exhaustive tier additionally runs the full root package suite and every
generator check defined by policy.

- [x] **Step 5: Verify GREEN and RED directions**

```powershell
node --test scripts/tests/run-phase-close.test.mjs
node scripts/run-phase-close.mjs --tier phase-close
node scripts/run-phase-close.mjs --tier phase-close --json
```

Also run the fixture with one planted failed child and prove exit `1`.

Evidence: the fixture suite is 5/5. The first live blocking run returned exit
1 with six exact failures instead of a false green; after resolving the five
independent drift findings, the only substantive red is the deliberately
undisposed 21-tool contract inventory. Task 8 owns those dispositions.

- [x] **Step 6: Commit**

```powershell
git add -- scripts/run-phase-close.mjs scripts/tests/run-phase-close.test.mjs package.json docs/CONSISTENCY_GATES.md
git commit -m "fix: make phase close fail closed"
```

---

### Task 5: Make package-graph orphan handling explicit and blocking

**Files:**

- Modify: `packages-galerina/galerina-devtools-package-graph/src/scanner.ts`
- Modify: `packages-galerina/galerina-devtools-package-graph/src/graph.ts`
- Modify: `packages-galerina/galerina-devtools-package-graph/src/reporter.ts`
- Modify: `packages-galerina/galerina-devtools-package-graph/src/cli.ts`
- Modify:
  `packages-galerina/galerina-devtools-package-graph/tests/package-graph.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**

- Extend package metadata:

```ts
type PackageGraphConfig = {
  readonly roots?: readonly string[];
  readonly extensions?: readonly string[];
  readonly entryPoints?: readonly string[];
  readonly loadedAssets?: readonly string[];
  readonly allowOrphans?: readonly {
    readonly path: string;
    readonly reason: string;
  }[];
};
```

- Declared paths are package-relative, normalized, existence-checked, inside
  the package root, unique, and part of the scanned node set.
- Under `--check`, every unexplained orphan is a violation.

- [x] **Step 1: Write RED tests for explicit assets and orphan refusal**

```js
test("an unexplained orphan fails --check", () => {
  const root = makeFixture({
    "package.json": JSON.stringify({ name: "@galerina/x" }),
    "src/index.ts": "",
    "src/unowned.fungi": "pure flow x() -> Int { return 1 }",
  });
  assert.deepEqual(checkPackage(root).violations, ["orphan:src/unowned.fungi"]);
});

test("a declared loaded asset is reachable evidence, not an orphan", () => {
  const root = makeFixture({
    "package.json": JSON.stringify({
      name: "@galerina/x",
      packageGraph: { loadedAssets: ["src/stage.fungi"] },
    }),
    "src/index.ts": "",
    "src/stage.fungi": "pure flow x() -> Int { return 1 }",
  });
  assert.deepEqual(build(root).orphans, []);
});

test("missing and escaping asset declarations fail closed", () => {
  assert.throws(() => build(fixtureWithAsset("../outside.fungi")));
  assert.throws(() => build(fixtureWithAsset("src/missing.fungi")));
});
```

- [x] **Step 2: Run RED**

```powershell
npm.cmd run build
node --test tests/package-graph.test.mjs
```

Expected: config fields are ignored and unexplained orphans do not fail.

- [x] **Step 3: Implement validated entry-point/asset ownership**

Do not infer ownership from filename. Merge explicitly declared paths with
the built-in `index.ts`/`cli.ts` entry-point set only after validation.

- [x] **Step 4: Declare compiler self-hosted assets**

In `galerina-core-compiler/package.json`, declare every
`src/self-hosted/*.fungi` stage that is independently loaded. Generate this
list from tracked source during the edit and write explicit stable paths; do
not use a wildcard whose future additions become silently admitted.

- [x] **Step 5: Regenerate and enforce the compiler boundary**

```powershell
npm.cmd test
node packages-galerina/galerina-devtools-package-graph/dist/cli.js packages-galerina/galerina-core-compiler --check
```

Expected: zero unexplained compiler orphans; missing any declared SLIDE stage
fails.

- [x] **Step 6: Commit**

```powershell
git add -- packages-galerina/galerina-devtools-package-graph packages-galerina/galerina-core-compiler/package.json packages-galerina/galerina-core-compiler/.graph
git commit -m "feat: govern compiler-loaded source assets"
```

---

### Task 6: Add a non-vacuous SLIDE lane to `galerina-test`

**Files:**

- Modify: `packages-galerina/galerina-test/src/types.ts`
- Modify: `packages-galerina/galerina-test/src/runners.ts`
- Modify: `packages-galerina/galerina-test/src/cli.ts`
- Modify: `packages-galerina/galerina-test/src/index.ts`
- Modify: `packages-galerina/galerina-test/tests/runners.test.mjs`
- Modify: `packages-galerina/galerina-test/README.md`
- Modify: `packages-galerina/galerina-core-compiler/package.json`
- Create:
  `packages-galerina/galerina-core-compiler/scripts/write-build-evidence.mjs`
- Create:
  `packages-galerina/galerina-test/tests/compiler-build-evidence.test.mjs`

**Interfaces:**

- Add `CheckScope` member `"slide"`.
- Add:

```ts
export interface SlideOptions extends HarnessOptions {
  readonly compilerPackage?: string;
  readonly independentRoot?: string;
}

export function runSlide(opts?: SlideOptions): Promise<CheckResult>;
```

- In-repo corpus:
  `packages-galerina/galerina-core-compiler/tests/slide-*.test.mjs`.
- Optional independent corpus is read from the supplied SLIDE root; it is a
  separate child result named `slide-independent`.

- [x] **Step 1: Write RED tests for corpus discovery and failure propagation**

```js
test("runSlide refuses an empty in-repo corpus", async () => {
  const root = fullWorkspace();
  rmSync(slideTestsDir(root), { recursive: true, force: true });
  const result = await runSlide({ rootDir: root });
  assert.equal(result.ok, false);
  assert.match(result.detail, /empty SLIDE corpus/);
});

test("runSlide propagates a failing SLIDE test", async () => {
  const root = fullWorkspace();
  w(root, slideTest("red"), failingNodeTest);
  const result = await runSlide({ rootDir: root });
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
});

test("runAll includes slide", async () => {
  const result = await runAll(fixtureOptions());
  assert.ok(result.children.some((child) => child.kind === "slide"));
});
```

- [x] **Step 2: Run RED**

```powershell
npm.cmd run typecheck
npm.cmd run build
node --test tests/runners.test.mjs
```

Expected: missing `runSlide` export and no slide child.

- [x] **Step 3: Implement exact corpus discovery**

Discover only files matching `^slide-.*\.test\.mjs$`, sort them
lexicographically, require at least one, and pass exact paths to
`node --test`. Do not accept a broad test directory as proof.

- [x] **Step 4: Make standalone fidelity refuse stale compiler output**

Before `runFidelity`, compare tracked compiler source/test inputs with the
compiler build evidence used by the package test chain. The implementation
uses a deterministic SHA-256 digest over the exact sorted Git-tracked input
set rather than timestamps. Missing, malformed, untracked, set-drifted, or
content-mismatched evidence refuses. If freshness cannot be proven, return a
failure instructing the caller to run the compiler build; do not accept
"dist exists".

- [x] **Step 5: Fix negative runner tests so child failure is directly proven**

Replace the existing comment that leaves conformance/fidelity failure
direction untested. Use a plain-node fixture subprocess or an injected runner
seam so both non-zero children are asserted as `ok:false`.

- [x] **Step 6: Verify**

```powershell
npm.cmd test
node packages-galerina/galerina-test/dist/cli.js slide --json
node packages-galerina/galerina-test/dist/cli.js all --core --json
```

Expected: slide is non-empty, countable, and part of `all`.

- [x] **Step 7: Commit**

```powershell
git add -- packages-galerina/galerina-test
git commit -m "feat: add SLIDE conformance to Galerina test"
```

---

### Task 7: Govern generators, indexes, reports, and provenance

**Files:**

- Modify: `governance/tooling-policy.json`
- Create: `scripts/lib/generator-contract.mjs`
- Create: `scripts/audit-generator-contract.mjs`
- Create: `scripts/tests/generator-contract.test.mjs`
- Modify: generator scripts that lack a deterministic `--check` mode
- Modify: `scripts/graph-all.mjs`

**Interfaces:**

- Generator policy entries use:

```ts
type GeneratorPolicy = {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly tracked: boolean;
  readonly generate: readonly string[];
  readonly check: readonly string[];
  readonly provenance: "required" | "embedded" | "not-applicable";
  readonly tier: "phase-close" | "exhaustive";
};
```

`generate` is explicit rather than inferred from `check`: several current
tools generate with no flag, some require `--write`, and some are
orchestrators. Inferring one command from the other would silently execute the
wrong mode.

- Cover at minimum:
  `code-index.mjs`, `dev-tool-index.mjs`, `gen-code-registry.mjs`,
  `gen-contract-registry.mjs`, `gen-roadmap.mjs`,
  `gen-status-blocks.mjs`, `gen-unit-registry.mjs`, `generate-sbom.mjs`,
  `graph-all.mjs`, `kb-index.mjs`, `memory-graph.mjs`,
  `ts-retirement-graph.mjs`, and project/package graph generation.

- [ ] **Step 1: Write RED tests**

```js
test("an undeclared generated write is refused", async () => {
  const root = generatorFixture({
    outputs: ["build/declared.json"],
    writes: ["build/declared.json", "build/hidden.json"],
  });
  const result = await verifyGenerator(root);
  assert.deepEqual(result.unexpectedWrites, ["build/hidden.json"]);
});

test("a second generation must be semantically idempotent", async () => {
  const root = generatorFixture({ injectTimestamp: true });
  const result = await verifyGenerator(root);
  assert.equal(result.ok, false);
  assert.equal(result.code, "GENERATOR-NONDETERMINISTIC");
});

test("tracked output without required provenance refuses", async () => {
  const root = generatorFixture({ omitProvenance: true });
  assert.equal((await verifyGenerator(root)).code,
    "GENERATOR-PROVENANCE-MISSING");
});
```

- [ ] **Step 2: Run RED**

```powershell
node --test scripts/tests/generator-contract.test.mjs
```

- [ ] **Step 3: Implement isolated generator verification**

Run each generator against a temporary output root when supported. Compare
the exact relative write set with declared outputs. Run twice and compare
semantic bytes after excluding only explicitly declared volatile provenance
fields such as `builtAt`.

- [ ] **Step 4: Add/check deterministic modes**

For each listed generator, add `--check` that derives expected output without
silently rewriting tracked files and exits `1` on semantic drift. Timestamp
differences alone must not cause tracked churn.

- [ ] **Step 5: Verify all generators**

```powershell
node scripts/audit-generator-contract.mjs --self-test
node scripts/audit-generator-contract.mjs
node scripts/graph-all.mjs
node scripts/audit-provenance.mjs
```

Run every generator policy `check` command and require zero failures.

- [ ] **Step 6: Commit**

```powershell
git add -- governance/tooling-policy.json scripts/lib/generator-contract.mjs scripts/audit-generator-contract.mjs scripts/tests/generator-contract.test.mjs scripts/graph-all.mjs scripts
git commit -m "feat: verify generated artifacts fail closed"
```

Before committing, inspect the staged set and remove unrelated scripts from
the broad final `git add` selection; stage only generator files actually
changed.

---

### Task 8: Burn the audit anti-neutering advisory baseline to zero

**Files:**

- Modify:
  `scripts/audit-allowlist-sensitive.mjs`,
  `scripts/audit-codes-full.mjs`,
  `scripts/audit-corpus-effect-names.mjs`,
  `scripts/audit-diagnostic-codes.mjs`,
  `scripts/audit-kernel-floor.mjs`,
  `scripts/audit-scratchdir-hygiene.mjs`,
  `scripts/audit-selfhost-readiness.mjs`,
  `scripts/audit-signed-fixture-drift.mjs`,
  `scripts/audit-stray-docs.mjs`,
  `scripts/audit-syntax-reference-links.mjs`,
  `scripts/audit-syntax.mjs`,
  `scripts/lint-conventions.mjs`,
  `scripts/lint-fungi.mjs`
- Modify/create their focused fixture tests under `scripts/tests/`
- Modify: `scripts/audit-gate-selftests.mjs`

**Interfaces:**

- Every listed audit/lint must have either:
  - a hermetic `--self-test` proving at least one true-positive and one
    control; or
  - an exact fixture-test registration whose file and test name are
    existence-checked and executed by phase-close.
- The advisory total becomes zero; new advisory entries are violations.

- [ ] **Step 1: Convert the advisory count into a RED gate**

Add a regression:

```js
test("every audit/lint has executable anti-neutering evidence", () => {
  const result = runGateSelftests("--json");
  assert.equal(result.status, 0);
  assert.equal(result.json.totals.advisories, 0);
  assert.equal(result.json.totals.violations, 0);
});
```

Run it and confirm the current 13 advisories fail.

- [ ] **Step 2: Add evidence one tool at a time**

For each listed tool:

1. craft a minimal defect fixture;
2. prove the detector returns non-zero or a finding;
3. craft a clean control;
4. prove the control is clean;
5. register the self-test/fixture evidence; and
6. rerun the umbrella before moving to the next tool.

Never make a detector green by weakening its production scan or broadening an
allowlist.

- [ ] **Step 3: Make advisory anti-neutering state fail**

Change `audit-gate-selftests.mjs` so `NO_SELFTEST` for audit/lint is a
violation unless an exact registered fixture test exists. Do not retain a
numeric burn-down baseline.

- [ ] **Step 4: Verify**

```powershell
node scripts/audit-gate-selftests.mjs --json
node --test scripts/tests/*.test.mjs
node scripts/audit-tooling-contract.mjs
```

Expected: zero advisories and zero violations.

- [ ] **Step 5: Commit in small groups**

Commit no more than three audited tools plus their tests per commit, using:

```text
test: prove <tool-family> gates cannot be neutered
```

---

### Task 9: Regenerate current architecture and remove stale component claims

**Files:**

- Modify generated files under:
  `build/code-index/`, `build/code-registry/`, `build/dev-tool-index/`,
  `build/graph/`, and relevant package `.graph/`
- Modify source templates/generators that emit stale wording
- Modify: `version.json` through `run-all-tests --emit-counts`
- Modify:
  `docs/reports/galerina-test-audit-coverage-review-2026-07-10.md` by adding a
  dated superseding-status note, not rewriting historical evidence
- Modify: `docs/TODO.md`
- Modify: `SLIDE/TODO.md`
- Modify: `triLowLevel-v2/TODO.md`

**Interfaces:**

- Living status describes:
  - Wasm as the current implemented production/differential path;
  - SLIDE as an independent, non-authorizing implementation lane until its
    release gates pass;
  - `.gate` as on hold/header-only;
  - exact package/test/tool counts from the verified run; and
  - zero unexplained compiler assets/orphans.

- [ ] **Step 1: Run source generators**

Run the policy-declared generator commands, then:

```powershell
node scripts/graph-all.mjs
node scripts/dev-tool-index.mjs --check
node scripts/code-index.mjs
node scripts/gen-code-registry.mjs
node scripts/audit-generator-contract.mjs
```

- [ ] **Step 2: Review every tracked generated diff**

Classify each diff as:

- semantic reflection of current source;
- stale generator bug;
- timestamp-only churn; or
- unrelated owner change.

Fix generator bugs at source and rerun. Never hand-edit generated output.

- [ ] **Step 3: Regenerate canonical test counts only after the full suite**

```powershell
node scripts/run-all-tests.cjs --emit-counts
```

Expected: complete governed package set, zero failures, accurate Myco and
benchmark counts, no ghost/missing workspace key.

- [ ] **Step 4: Synchronize all three TODO ledgers**

Record:

- retained tools and why;
- rebuilt runners/policies;
- removed bypasses and false-green paths;
- new SLIDE test integration;
- exact commands/counts/commits;
- remaining implementation work; and
- owner questions that are genuinely unresolved.

- [ ] **Step 5: Commit generated evidence separately**

```powershell
git add -- AGENTS.md version.json build packages-galerina/*/.graph docs/TODO.md docs/reports/galerina-test-audit-coverage-review-2026-07-10.md
git commit -m "docs: regenerate zero-trust tooling evidence"
```

Stage exact reviewed paths; exclude the owner's
`galerina-tri-regex/AUDIT.md`.

Commit the SLIDE ledger separately in the SLIDE repository. Keep
`triLowLevel-v2` uncommitted unless its repository is intentionally
bootstrapped in a separately approved operation.

---

### Task 10: Run the complete zero-trust exit gate and fix every in-scope defect

**Files:**

- Modify only files implicated by a reproduced failing check
- Add one focused regression test before each bug fix
- Update all three TODO ledgers after each stable checkpoint

**Interfaces:**

- Completion report maps every design requirement to a command and fresh
  result.

- [ ] **Step 1: Run all requested package suites**

Run `npm.cmd test` in every `galerina-devtools-*` package,
`galerina-test`, and `galerina-tools-myco`.

- [ ] **Step 2: Run aggregate and harness lanes**

```powershell
node scripts/run-all-tests.cjs
node packages-galerina/galerina-test/dist/cli.js unit --json
node packages-galerina/galerina-test/dist/cli.js e2e --build --json
node packages-galerina/galerina-test/dist/cli.js conformance --json
node packages-galerina/galerina-test/dist/cli.js fidelity --json
node packages-galerina/galerina-test/dist/cli.js slide --json
node packages-galerina/galerina-test/dist/cli.js all --json
```

- [ ] **Step 3: Run strict tooling tiers**

```powershell
node scripts/run-phase-close.mjs --tier phase-close
node scripts/run-phase-close.mjs --tier exhaustive
node scripts/audit-tooling-contract.mjs
node scripts/audit-generator-contract.mjs
node scripts/audit-gate-selftests.mjs --json
```

- [ ] **Step 4: Run graph, provenance, and artifact checks**

```powershell
node scripts/graph-all.mjs
node scripts/audit-graph-integrity.mjs
node scripts/audit-provenance.mjs
node scripts/audit-artifact-drift.mjs
```

- [ ] **Step 5: Run independent SLIDE verification**

In the sibling `../SLIDE` repository, run its complete test command and
the independent V2-C/V2-D/V2-E/frontend suite. Do not infer success from
Galerina-side tests.

- [ ] **Step 6: Fix each failure under RED-to-GREEN discipline**

For every failure:

1. classify product defect, test defect, environment prerequisite, stale
   generated artifact, or unrelated owner change;
2. reproduce with a focused RED test;
3. implement the smallest complete fix;
4. rerun focused and affected aggregate checks;
5. update the ledger; and
6. commit locally.

- [ ] **Step 7: Final completion audit**

Inspect current source and results against all 11 completion requirements in
the design. Treat missing or indirect evidence as incomplete. Verify:

- Git status contains only known owner changes/untracked planning state;
- no local commits were pushed;
- every generated file is current;
- no aggregate can return success for a planted failed child;
- no tool/package/source asset is undisposed; and
- no documented SLIDE/Galerina task required by this refactor remains open.

- [ ] **Step 8: Commit final ledger/evidence checkpoint**

Use exact path staging and a local commit:

```text
docs: close zero-trust tooling refactor
```

Then resume the checked-source-to-V2-D adapter work from
`triLowLevel-v2/27-GENERAL-GALERINA-FRONTEND-HANDOFF.md`.

---

### Task 11: Final whole-project acceptance, readiness map, and benchmark publication

**Trigger:** Run this task only after the documented Galerina/SLIDE
implementation work is complete and the owner has authorized the exact memory
tree required by `graph-all`. A partial run is diagnostic and releases no
completion authority.

**Files:**

- Modify only files implicated by a reproduced failure
- Modify: `scripts/rebuild-fusable-packages.mjs`
- Modify/create its focused fixture test before relying on strict build status
- Regenerate: all policy-declared outputs, package graphs, `version.json`,
  percentage-audit artifacts, roadmap artifacts, and benchmark artifacts
- Modify living roadmap/percentage source claims only after manual evidence
  adjudication
- Create/update a dated final-acceptance report and all synchronized TODO
  ledgers

**Acceptance rules:**

- Every child exit, signal, timeout, missing result, empty result, malformed
  result, stale artifact, unknown graph source, and unexplained skip refuses.
- A signed package locked to an offline ceremony is reported as
  `signed-locked`, not rebuilt and not misreported as failed or fresh.
- Audit mutation tools run only through their hermetic registered proof or
  their exact cadence command. Never point a raw destructive mutator at the
  live source tree merely to satisfy an "all tools" count.
- Timed benchmark results are performance evidence only. They cannot decide a
  security, governance, compatibility, or release verdict.
- Missing optional benchmark toolchains are recorded exactly. A runtime that
  did not execute receives no number and no inferred comparison.
- Percentages move only when their deciding evidence moved. An unmeasured
  assertion is converted to a word, a countable ladder, or retained explicitly
  as asserted; it is never rounded up for presentation.
- Generated artifacts are reviewed and committed separately from source fixes.
- Never push.

- [x] **Step 1: Make the package/fuse rebuild result authorizing**

Add a tested `--strict` mode to
`scripts/rebuild-fusable-packages.mjs`. The mode returns non-zero for any
failed, timed-out, signalled, or indeterminate child build while retaining
the existing non-authorizing informational default for editor hooks. Prove
failure and clean-control directions in a temporary fixture. Do not use
`--force` against ceremony-signed packages in the final acceptance run.

Completed 2026-07-29: a focused subprocess test first reproduced the false
zero exit, then proved strict refusal and repaired-source control. The full
signed-fixture guard is 11/11, including skipped-environment, unknown,
duplicate, and missing-root refusal. A live `--strict` sweep found two fresh,
two explained non-Fungi skips, one ceremony-signed lock, and zero failures.

- [ ] **Step 2: Run every governed graph surface**

With the owner-authorized exact memory path:

```powershell
node scripts/graph-all.mjs --memory-dir <authorized-memory-dir>
node scripts/graph-all.mjs --memory-dir <authorized-memory-dir> --check
node scripts/ts-retirement-graph.mjs
node scripts/ts-retirement-graph.mjs --check
node scripts/rd-0160-0161-tcsr-phasegraph-zerocopy-proof.mjs
node scripts/rd-0166-0167-cache-graph-fungi-index-proof.mjs
node scripts/rd-0168-graph-pci-compliance-scanner-proof.mjs
```

`graph-all` must pass all six children: project graph, graph integrity, KB
graph, package graph, memory graph, and dev-tool index. The governed package
test sweep below supplies the tests for all graph devtool packages. Record
exact node/edge/package counts and every skipped or refused surface.

- [ ] **Step 3: Run every governed test surface**

```powershell
node scripts/run-all-tests.cjs
node --test scripts/tests/*.test.mjs
node packages-galerina/galerina-test/dist/cli.js all --json
```

Also run the complete independent `../SLIDE` command and its explicit
V2-C/V2-D/V2-E/frontend command. The root package runner must account for all
registered packages and execute every non-exempt declared package test,
including all `galerina-devtools-*`, `galerina-test`, benchmarks, and Myco.
The one no-test registry exception must remain exact and reason-bearing.

- [ ] **Step 4: Run every governed audit surface safely**

```powershell
node scripts/audit-gate-selftests.mjs --json
node scripts/audit-tooling-contract.mjs
node scripts/audit-generator-contract.mjs --tier exhaustive
node scripts/run-phase-close.mjs --tier phase-close
node scripts/run-phase-close.mjs --tier exhaustive
npm.cmd run audit
```

Run the first five commands at the repository root. In
`packages-galerina/galerina-devtools-security`, run
`npm.cmd run conformance:selftest` followed by `npm.cmd run conformance` for
the package-wide construction audit. Its `npm.cmd run audit` script is
intentionally a single-file wrapper and must be invoked as
`npm.cmd run audit -- <file.fungi> [options]`; invoking it without a target is
a usage error and is not a repository-wide audit. Run the benchmark truth
audit in Step 8 after fresh measurements exist. The audit meta-gate must
execute or fixture-prove every discovered audit/lint program; the
strict/exhaustive cadence must run every declared live enforcement command.
Publish the machine-readable inventory mapping each audit to its live cadence,
non-vacuity self-test, or hermetic fixture proof. An undisposed program is a
failure, not an exception added during close.

- [ ] **Step 5: Fix every issue from graphs, tests, and audits**

For each red:

1. preserve the original failure evidence;
2. classify product defect, tool defect, stale output, environment
   prerequisite, or genuine external authority blocker;
3. add a focused RED regression for code/tool defects;
4. implement the smallest complete fail-closed fix;
5. rerun the focused check and the affected umbrella;
6. update all ledgers; and
7. make a verified local commit.

Do not baseline, allowlist, soften, skip, or relabel a failure merely to
finish the chapter.

- [ ] **Step 6: Regenerate a full build, including packages**

```powershell
node scripts/build-core-chain.mjs --gate-subjects
node scripts/run-all-tests.cjs --emit-counts
node scripts/rebuild-fusable-packages.mjs --strict
node scripts/audit-generator-contract.mjs --tier exhaustive
```

Then run every policy-declared generator in dependency order, review the
exact diff, and run every corresponding non-mutating check. The package
runner's 96 declared test chains are the build-current sweep for test-bearing
packages; the exact registry no-test/no-build policy remains visible.
Ceremony-signed package outputs are not overwritten.

- [ ] **Step 7: Perform the percentage audit and manually adjudicate the roadmap**

```powershell
node scripts/component-health.mjs --self-test
node scripts/component-health.mjs --json
node scripts/component-health.mjs --audit-html
node scripts/component-health.mjs --audit-check
```

Manually compare every asserted percentage and note with current source,
tests, audit results, component-removal decisions, and SLIDE integration
status. Change the deciding source in `component-health.mjs` only where fresh
evidence justifies it. Preserve measured/asserted classification. Then:

```powershell
node scripts/gen-roadmap.mjs --write
node scripts/gen-roadmap.mjs --check
```

Review the generated README block, roadmap document block, SVG, percentage
JSON, and HTML. The final report records ship readiness, zero-trust average,
build average, their evidence classes, and the work still preventing 100%.

- [ ] **Step 8: Run the full benchmark and produce the chart**

In `packages-galerina/galerina-devtools-benchmarks`:

```powershell
node ../../scripts/build-core-chain.mjs
npm.cmd test
npm.cmd run noise-gate
npm.cmd run run
npm.cmd run audit
npm.cmd run ui
npm.cmd run history
npm.cmd run bench:guard
npm.cmd run compare-ui
```

`run` is the publication-fidelity full suite, not `run:quick`. `ui` is the
fail-closed report/chart pipeline and produces the self-contained SVG-in-HTML
chart plus standalone artifact. Record available/missing runtime toolchains,
units, work-equivalence certification, checksums, noise floor, and benchmark
guard verdict. Never publish an uncertified cross-runtime ratio. The local
repository contains no tool or project named `Checkmark`; the verified chart
helper is this benchmark package's `build-chart.mjs`/`chart.mjs` pipeline.

- [ ] **Step 9: Re-run the complete final gate after regeneration**

Repeat Steps 2-4 in non-mutating/check mode, plus:

```powershell
node scripts/component-health.mjs --audit-check
node scripts/gen-roadmap.mjs --check
node scripts/audit-provenance.mjs
node scripts/audit-artifact-drift.mjs
```

Require a clean result across every in-scope authorizing command. A remaining
owner-only external authority requirement is documented as a blocker and
must not be described as completion.

- [ ] **Step 10: Publish evidence locally and close the ledgers**

Create a dated report containing exact commands, exits, counts, failures and
fixes, graph totals, package/build totals, the percentage audit, the updated
roadmap diagram, benchmark table/chart paths, toolchain omissions, current
commit anchors, known owner changes, and the no-push statement. Commit source
fixes, generated artifacts, benchmark/roadmap artifacts, and final ledgers in
reviewable local commits with exact path staging.
