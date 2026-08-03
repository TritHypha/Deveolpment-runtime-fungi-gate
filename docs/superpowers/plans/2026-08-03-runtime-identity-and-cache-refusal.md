# Runtime Identity and Cache Refusal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refuse colliding Tower correlation identities and remove unauthenticated persisted execution graphs from Galerina's runtime authority.

**Architecture:** Tower Citizen reserves each admitted correlation identity synchronously before any asynchronous manifest verification, then promotes it to the active sandbox map or releases it on failure. The compiler retains exact process-local execution-graph reuse but never reads or writes the historical disk cache; a regression fixture proves an old-path forged graph is inert.

**Tech Stack:** strict TypeScript, Node.js `node:test`, Node cryptography and filesystem fixtures, Galerina package build/typecheck scripts.

## Global Constraints

- Commit locally and never push.
- Preserve the optional caller-supplied correlation-ID parameter and existing short identifiers.
- Accept only 1..128 ASCII characters from `[A-Za-z0-9._:-]`, beginning with an alphanumeric character.
- Generated IDs use `CORR-` plus `crypto.randomUUID()`.
- A duplicate active or in-flight identity refuses before plugin verification or sandbox construction.
- Persisted execution graphs are non-authorizing; do not replace the removed path with another cache or sidecar.
- Package conversion and SLIDE authority are out of scope.

---

### Task 1: Tower correlation identity reservation

**Files:**
- Modify: `packages-galerina/galerina-tower-citizen/tests/tower-citizen.test.mjs`
- Modify: `packages-galerina/galerina-tower-citizen/src/tower-runtime.ts`

**Interfaces:**
- Consumes: existing `TowerRuntime.load(metadata, correlationId?, evidence?)`.
- Produces: the same public signature, `ERR_CORRELATION_ID_INVALID`, `ERR_CORRELATION_ID_ACTIVE`, and internal in-flight reservations.

- [ ] **Step 1: Add failing public-behaviour tests**

Add tests that load `TEST_METADATA` with `allowUnsignedLoad: true` and prove:

```js
const first = await tower.load(TEST_METADATA, "RUN-SAME");
await assert.rejects(
  () => tower.load(TEST_METADATA, "RUN-SAME"),
  /ERR_CORRELATION_ID_ACTIVE/,
);
assert.equal(tower.getActiveSandboxCount(), 1);
const result = await tower.execute(first.sandbox, { prompt: "still-owned" }, "RUN-SAME");
assert.equal(result.success, true);
```

Also loop over `""`, `" leading"`, `"line\nbreak"`, and `"x".repeat(129)` and require `ERR_CORRELATION_ID_INVALID` with zero active sandboxes. Generate 128 omitted IDs under `maxPlugins: 128`, require `^CORR-[0-9a-f-]{36}$`, require set size 128, then erase every returned sandbox.

- [ ] **Step 2: Run the focused test and prove RED**

Run:

```powershell
npm run build
node --test tests/tower-citizen.test.mjs
```

Expected: the duplicate load does not reject, at least one malformed identity is accepted, or the generated-ID UUID assertion fails against the old time/random format.

- [ ] **Step 3: Implement the minimal reservation boundary**

In `tower-runtime.ts`, import `randomUUID` from `node:crypto`, add:

```ts
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function admittedCorrelationId(value: string | undefined): string {
  const id = value ?? `CORR-${randomUUID()}`;
  if (!CORRELATION_ID.test(id)) {
    throw new Error("ERR_CORRELATION_ID_INVALID: correlationId must be 1..128 canonical ASCII characters");
  }
  return id;
}
```

Add `private readonly loadingCorrelationIds = new Set<string>();`. At the start of `load()`, resolve the ID, refuse when either set contains it, enforce capacity against active plus loading identities, add the reservation, and wrap the remaining load path in `try/finally` so every failure removes the reservation. On success, place the sandbox in `sandboxes` before the `finally` releases only the loading reservation.

- [ ] **Step 4: Run focused GREEN evidence**

Run the same build and focused test. Expected: all tests pass and malformed/duplicate cases create no extra active sandbox.

- [ ] **Step 5: Run Tower package verification and commit**

Run:

```powershell
npm test
npm run typecheck
```

Confirm Node process count returns to its pre-command value, inspect the diff, then commit only the two Tower files with:

```text
fix: reserve Tower correlation identities
```

---

### Task 2: Retire persisted execution-graph authority

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/tests/bootstrap-determinism/canonical-hash.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/execution-graph.ts`

**Interfaces:**
- Consumes: `storeGraph(key, graph)`, `getOrLoadGraph(key)`, and `__diskCacheDirForTest`.
- Produces: unchanged public function signatures with process-local-only behaviour.

- [ ] **Step 1: Add failing forged-disk and no-write tests**

Import the required filesystem/path functions and `__diskCacheDirForTest`. For a unique key that is not in memory, write this syntactically valid forged record to the historical filename:

```js
const forged = {
  flowName: "forged",
  qualifier: "pure",
  nodes: [{ op: 8, dest: -1, src1: 0, src2: -1, imm: 0, opName: "", callName: "" }],
  constants: [],
  slotCount: 1,
  slotNames: [["result", 0]],
  isPure: true,
  effectMask: 0,
};
```

Require `getOrLoadGraph(key) === null`. For a second unique key, call `storeGraph(key, graph)`, require exact object identity from `getOrLoadGraph(key)`, and require that the historical disk path does not exist. Clean only the exact test files in `finally` blocks.

- [ ] **Step 2: Run the focused test and prove RED**

Run:

```powershell
npm run build
node --test tests/bootstrap-determinism/canonical-hash.test.mjs
```

Expected: the forged record is returned and `storeGraph()` creates the second disk file.

- [ ] **Step 3: Remove filesystem authority from production**

Delete `ensureCacheDir`, `readDiskCache`, `writeDiskCache`, and their filesystem imports. Retain the anchored historical directory constant only for the regression probe. Reduce the public functions to:

```ts
export function getOrLoadGraph(key: string): ExecutionGraph | null {
  return MEMORY_CACHE.get(key) ?? null;
}

export function storeGraph(key: string, graph: ExecutionGraph): void {
  MEMORY_CACHE.set(key, graph);
}
```

Update the module comment so it claims process-local reuse, not persisted fallback.

- [ ] **Step 4: Run focused GREEN evidence**

Run the same build and focused test. Expected: the hostile old-path file is inert, no new disk file is written, and process-local identity round-trips.

- [ ] **Step 5: Run core-compiler verification and commit**

Run the focused bootstrap-determinism group, `npm run typecheck`, and the complete core-compiler package test. Confirm the Node process count returns to baseline. Commit only the execution-graph source and test with:

```text
security: retire persisted execution graph authority
```

---

### Task 3: Documentation, project gates and index refresh

**Files:**
- Modify: `docs/TODO.md`
- Modify only if generated by the documented command: `build/graph/*`

**Interfaces:**
- Consumes: Tasks 1 and 2 commits and fresh test evidence.
- Produces: a current checkpoint, regenerated graph surfaces, and a fresh codebase-memory index.

- [ ] **Step 1: Record the completed boundaries**

Add a newest-first TODO section with exact focused/full test counts, the two commit IDs, the unauthenticated disk-cache retirement, and explicit deferred items: cross-process correlation reservation, authenticated durable graph reuse through SLIDE, and atlas cleanup observability.

- [ ] **Step 2: Run repository gates without overlapping aggregates**

Run convention/path/security checks individually. Then run one bounded graph regeneration command from `AGENTS.md`. Do not start phase-close while another aggregate owns the suite lease.

- [ ] **Step 3: Commit documentation/generated evidence**

Inspect all generated changes and exclude unrelated churn. Commit the exact TODO and accepted generated graph files with:

```text
docs: close runtime identity and cache authority defects
```

- [ ] **Step 4: Refresh and verify the code graph**

Index the Galerina repository in moderate mode. Require `status=indexed`, node count close to expected, `indexed_head_sha` equal to current HEAD, `stale=false`, and search for `admittedCorrelationId` as a belt-and-braces check.

- [ ] **Step 5: Recheck custody**

Require clean Galerina, SLIDE, KB and Myco worktrees except for separately owned external Round 6 staging. Do not push.
