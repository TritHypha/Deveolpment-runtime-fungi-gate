# Security Diff Tail Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four reproduced regex-work, secret-lifetime, rotation-identity, and audit-admission defects without serializing independent asynchronous work.

**Architecture:** Enforce each invariant at its current owner: the compiler standard-library adapter checks TriRegex evidence; the Vault manager owns transient plaintext and the affine rotation lease; the app-kernel audit sink owns capacity leases. Each task is an independent red-green security boundary and the final task runs the complete closure lane.

**Tech Stack:** strict TypeScript, Node.js `node:test`, TriRegex cost certificates, Galerina K3/fail-closed conventions, npm package scripts.

## Global Constraints

- `async flow` is the governed happy path; serialize only shared mutable state, non-commutative updates, active-compute ownership, and single-lease authority.
- Null and NaN are forbidden; every refusal has a typed terminal exit.
- Do not weaken authentication, authorization, admission, audit, or resource controls to retain compatibility.
- Do not use wall-clock duration as a security admission test when a deterministic certificate exists.
- Work on the current `codex/rd-0792-synthesize-only` branch, commit explicit paths only, and do not push.
- The source design is `docs/superpowers/specs/2026-08-11-security-diff-tail-remediation-design.md`.

---

### Task 1: Enforce the TriRegex work certificate

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/tests/security-closure.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/stdlib.ts:450-459`

**Interfaces:**
- Consumes: `compileTriRegex(...).certificate.perCharWorkBound` and `.boundaryWorkBound`.
- Produces: the existing `GalerinaValue` error path when certified total work exceeds policy.

- [ ] **Step 1: Add the failing hostile-work test**

Extend the existing dynamic-regex test with a real `callStdlib` assertion:

```javascript
const excessive = await callStdlib(
  "matchesPattern",
  str("a".repeat(4096)),
  [str("(a?){500}z")],
  ctx,
);
assert.equal(excessive.__tag, "err");
assert.match(excessive.error.value, /certificate|work|budget/i);
```

Keep the existing `^[a-z]+$` control assertion unchanged.

- [ ] **Step 2: Build and run the focused test to verify RED**

Run:

```powershell
npm run build --prefix packages-galerina/galerina-core-compiler
node --test packages-galerina/galerina-core-compiler/tests/security-closure.test.mjs
```

Expected: the new assertion fails because the current matcher returns a Boolean.

- [ ] **Step 3: Add deterministic certificate admission**

In `stdlib.ts`, add one named fixed policy ceiling and calculate with `bigint`:

```typescript
const MAX_REGEX_CERTIFIED_WORK_UNITS = 1_000_000n;

function unicodeCodePointCount(value: string): bigint {
  let count = 0n;
  for (const _codePoint of value) count += 1n;
  return count;
}
```

After a successful compile and before `matcher.test`, derive:

```typescript
const certificate = compiled.certificate;
const certifiedWork =
  unicodeCodePointCount(s) * BigInt(certificate.perCharWorkBound) +
  BigInt(certificate.boundaryWorkBound);
if (certifiedWork > MAX_REGEX_CERTIFIED_WORK_UNITS) {
  return err("RegexError: certified work exceeds the runtime policy budget");
}
```

- [ ] **Step 4: Verify GREEN and compiler compatibility**

Run the focused test, then:

```powershell
npm test --prefix packages-galerina/galerina-core-compiler
```

Expected: hostile work refuses, ordinary patterns retain their Boolean results, and the package suite passes.

- [ ] **Step 5: Commit the compiler boundary**

Stage only the two Task 1 files and commit `fix compiler regex work admission`.

---

### Task 2: Remove Vault plaintext return channels

**Files:**
- Modify: `packages-galerina/galerina-ext-secrets-vault/tests/vault.test.mjs`
- Modify: `packages-galerina/galerina-ext-secrets-vault/src/rotation-manager.ts:128-137`
- Modify: `packages-galerina/galerina-ext-secrets-vault/src/index.ts:80-109`
- Modify: `packages-galerina/galerina-ext-secrets-vault/src/cli.ts:62-70`

**Interfaces:**
- Produces: `SecretsRotationManager.useActive(id, callback): boolean`.
- Produces: `GalerinaSecretsVault.useSecret(id, callback): boolean`.
- Removes: direct facade `getSecret` and manager `getActive` plaintext-return surfaces.

- [ ] **Step 1: Rewrite the focused tests to express the safe API**

Add a regression that proves the callback return is discarded and the transient view is wiped:

```javascript
let view;
const present = vault.useSecret("scoped", (value) => {
  view = value;
  return Buffer.from(value);
});
assert.equal(present, true);
assert.ok(view.every((byte) => byte === 0));
assert.equal(vault.useSecret("absent", () => assert.fail("must not run")), false);
```

Retain the asynchronous-callback refusal. Replace direct secret assertions in
the manager tests with scoped callbacks that derive only non-secret test facts.

- [ ] **Step 2: Build and run the Vault test to verify RED**

Run:

```powershell
npm run build --prefix packages-galerina/galerina-ext-secrets-vault
node --test packages-galerina/galerina-ext-secrets-vault/tests/vault.test.mjs
```

Expected: the current API returns the callback value instead of `true` and still exposes direct getters.

- [ ] **Step 3: Implement callback-only manager ownership**

Replace `getActive` with:

```typescript
useActive(credentialId: string, callback: (value: Buffer) => void): boolean {
  const handle = this.handles.get(credentialId);
  if (handle === undefined || handle.faulted === true) return false;
  const value = Buffer.from(handle.activeValue);
  try {
    const result: unknown = callback(value);
    if (
      typeof result === "object" && result !== null &&
      "then" in result &&
      typeof (result as { readonly then?: unknown }).then === "function"
    ) {
      throw new Error("SecretsRotationManager.useActive callback must be synchronous");
    }
    return true;
  } finally {
    value.fill(0);
  }
}
```

The facade delegates to `useActive`, returns only the Boolean, and has no
`getSecret`. The CLI uses that Boolean and does not return a marker from its
callback.

- [ ] **Step 4: Verify GREEN and type compatibility**

Run:

```powershell
npm test --prefix packages-galerina/galerina-ext-secrets-vault
```

Expected: all Vault tests pass and no package-owned API directly returns plaintext.

- [ ] **Step 5: Commit the Vault lifetime boundary**

Stage only the four Task 2 files and commit `fix Vault secret lifetime boundary`.

---

### Task 3: Make credential rotation a rejecting affine lease

**Files:**
- Modify: `packages-galerina/galerina-ext-secrets-vault/tests/vault.test.mjs`
- Modify: `packages-galerina/galerina-ext-secrets-vault/src/rotation-manager.ts:70-90`

**Interfaces:**
- Preserves: `rotate(id, client, credential?): Promise<void>`.
- Changes: overlap on the same ID rejects before the second client is invoked.

- [ ] **Step 1: Add the two concurrency regressions**

Use a deferred first client to keep the lease live. Assert that a second client
for the same ID rejects with `/rotation.*already.*active|lease/i` and its call
count stays zero. Add a second test in which two different credential IDs both
invoke their clients before either deferred read resolves.

- [ ] **Step 2: Run the Vault test to verify RED**

Run the build and focused Vault test. Expected: same-ID overlap currently
coalesces and resolves instead of rejecting.

- [ ] **Step 3: Replace coalescing with fail-closed overlap refusal**

Change the existing branch to:

```typescript
if (this.rotations.has(credentialId)) {
  throw new Error(
    `SecretsRotationManager.rotate: rotation lease already active for "${credentialId}"`,
  );
}
```

Retain exact-promise cleanup in `finally`; do not add a global lock.

- [ ] **Step 4: Verify GREEN**

Run the focused Vault test and complete Vault package test. Expected: same-ID
overlap refuses, different IDs remain concurrent, and sequential retry works.

- [ ] **Step 5: Commit the rotation lease boundary**

Stage only the two Task 3 files and commit `fix Vault rotation lease identity`.

---

### Task 4: Reserve mandatory audit capacity before effects

**Files:**
- Modify: `packages-galerina/galerina-framework-app-kernel/tests/audit-async.test.mjs`
- Modify: `packages-galerina/galerina-framework-app-kernel/tests/posture-resolution.test.mjs`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/kernel.ts:138-235`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/kernel.ts:701-734`

**Interfaces:**
- Produces: opaque `AuditReservation`.
- Produces: `AuditSink.reserve`, `commit`, `cancel`, and best-effort `emit`.
- Produces: `InMemoryAuditSink.takeDrained()` for explicit evidence custody transfer.

- [ ] **Step 1: Add the capacity-before-effect RED test**

Create a capacity-one real `InMemoryAuditSink` and a handler that increments an
effect counter. The first mandatory-audit request returns 200. Without taking
the first event, the second request must return 503, leave the effect counter at
one, preserve the first event, and report zero dropped events. After
`takeDrained()`, a third request returns 200 and increments the counter.

- [ ] **Step 2: Add reservation-integrity RED tests**

Directly exercise the default sink: a reservation commits once; reuse, a
reservation from another sink, and cancellation followed by commit each throw.
Retain a control showing that a scheduled slow flush finishes after the response.

- [ ] **Step 3: Run the focused audit tests to verify RED**

Run:

```powershell
npm run build --prefix packages-galerina/galerina-framework-app-kernel
node --test packages-galerina/galerina-framework-app-kernel/tests/audit-async.test.mjs
```

Expected: the second handler currently runs and the first evidence is evicted.

- [ ] **Step 4: Implement the reservation state machine**

Add an exported opaque shape and sink contract:

```typescript
export interface AuditReservation { readonly id: symbol; }
export interface AuditSink {
  reserve(): AuditReservation | undefined;
  commit(reservation: AuditReservation, event: AuditEvent): void;
  cancel(reservation: AuditReservation): void;
  emit(event: AuditEvent): void;
}
```

The default sink keeps a private `Set<AuditReservation>`. Capacity is
`queue + drained + reservations`. `emit` throws at capacity and never evicts.
`commit` verifies exact set membership, consumes the lease once, enqueues, and
schedules the asynchronous flush. `cancel` consumes only an owned live lease.
`takeDrained` returns a frozen copy and clears the owned retained list.

- [ ] **Step 5: Reserve in the kernel before `runPipeline`**

Resolve the exact route policy from `byPath`. For mandatory runtime reporting,
call `reserve` before `runPipeline`; refusal returns `audit_unavailable` before
the handler. Commit the built event to the exact lease. On an unexpected path
before commit, cancel the still-live lease. Optional/no-policy audit uses
best-effort `emit` and never evicts accepted evidence.

Update test sinks to implement the four-method contract. Capturing sinks may
reserve `Object.freeze({ id: Symbol("capture") })`, commit by pushing the event,
and make `emit` push directly.

- [ ] **Step 6: Verify GREEN and package compatibility**

Run:

```powershell
node --test packages-galerina/galerina-framework-app-kernel/tests/audit-async.test.mjs packages-galerina/galerina-framework-app-kernel/tests/posture-resolution.test.mjs
npm test --prefix packages-galerina/galerina-framework-app-kernel
```

Expected: no pre-admission effect, no silent eviction, and asynchronous flushing remains off-path.

- [ ] **Step 7: Commit the audit lease boundary**

Stage only the three Task 4 files and commit `fix app-kernel audit admission order`.

---

### Task 5: Revalidate, refresh owners, and close the security tail

**Files:**
- Modify through owners only: registry candidate digest, generated indexes,
  graphs, component-health evidence, TODOs, roadmap Markdown, and subway SVG.

**Interfaces:**
- Consumes: the four focused security closures and current repository HEAD.
- Produces: one current, non-authorizing closure checkpoint.

- [ ] **Step 1: Rerun the four original real-boundary probes**

Confirm excessive certified regex work refuses; no Vault return channel yields
plaintext; same-ID rotation B rejects with zero B-client calls; and audit
capacity refuses request two before its handler effect.

- [ ] **Step 2: Run the three owning package suites**

Run compiler, Vault, and app-kernel package tests. Any failure blocks closure.

- [ ] **Step 3: Refresh the registry candidate through its owner**

Recompute the changed `@galerina/auth` package artifact digest using the
registry's existing candidate owner command. Keep the candidate unsigned and
non-authorizing. Run the registry package test.

- [ ] **Step 4: Run the complete package and tooling lanes**

Run `node scripts/run-all-tests.cjs`, the complete dev-tool audit/test lane,
all graph checks, percentage freshness, and the normal phase-close lane. Keep
exact exit receipts and do not relabel a retry as the original result.

- [ ] **Step 5: Regenerate evidence in dependency order**

Use the declared owners for code index, package/project/KB graphs, retirement
inventory, semantic graph, component health, status, pinned SLIDE evidence,
roadmap Markdown, and subway SVG. Do not delete the build directory.

- [ ] **Step 6: Update TODOs, roadmap, R&D routing, and memory index notes**

Record completed items and remaining `UNKNOWN` boundaries without claiming
conversion or production authority. Add the RD-0796 hard serial list and
`async flow` happy-path ruling to its KB evidence route when the owner-supplied
R&D update is available.

- [ ] **Step 7: Final verification and commit**

Run the exact owner freshness checks and one final normal phase close. Commit
explicit generated/document paths only. Do not push.
