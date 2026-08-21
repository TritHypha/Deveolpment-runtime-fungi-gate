# Production Boot Composition Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a sealed, non-authorizing boot-composition candidate that joins exact authenticated SLIDE `restoreVerdict` execution with a privately admitted production durability profile and the real cold-boot consumer.

**Architecture:** Two focused app-kernel modules own separate private capability registries. The first derives an immutable authenticated SLIDE execution profile by exercising and independently checking the complete four-vector `restoreVerdict` truth table. The second joins that profile to the existing privately registered durability profile under one closed policy and returns data-only evidence with no executable restore port. The existing cross-repository Contract 85 test proves the same identities reach the real consumer while retaining reference-only execution and false authority fields.

**Tech Stack:** TypeScript ES2022 with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; Node ESM and `node:test`; existing app-kernel durability admission; existing SLIDE checked-Fungi publication loader; repository graph, code-index and phase-close tools.

**Implementation correction (2026-08-09):** Tasks 1-3 are implemented through
local commit `06121a57`; hardened repository closure is `47267944`. Physical
provenance is transcript-specific, so the
manifest/profile/policy/candidate bind an ordered four-digest tuple rather than
one invented constant digest. Real integration consumes **11**, not seven,
fresh handle pairs: four preflight, four admission and three consumer. The
private adjudication is RD-0791 because RD-0789 was already allocated to the
acyclic checked-Fungi correction. Antigravity review accepted duplicate-digest
and Proxy-record hardening; its proposed durability timestamp gap was rejected
because the owning private admission already proves
`indexIssuedAt <= authority.at <= notAfter`. Normal **89/89** and exhaustive
**90/90** are green. The boundary carries no internal `null`/`NaN` state and
all malformed absence/non-number inputs reach an explicit total refusal exit.

## Global Constraints

- Preserve Core-first dependency direction: no Core package imports app-kernel, platform or release-policy code.
- Never accept caller-supplied `authenticated`, `authorityReleased`, `productionAuthorizing`, success or verdict fields as evidence.
- Preserve exact K3 semantics: this slice has no `+1` path; a structurally complete candidate is `0` and every malformed, forged, stale or mismatched input is `-1`.
- Never expose `restoreVerdict`, an execution handle, an activation function or an authority-release function from either admitted profile or the composition candidate.
- Keep `authorityReleased: false` and `productionAuthorizing: false` as literal readonly values.
- Use light, repository-consistent commentary: each new source file opens with
  a description, change-control marker and pointers to this design, its sibling
  module and RD-0791; every exported or security-critical function states its
  purpose, inputs/outputs, assumptions and exact refusal mode; non-obvious
  branches explain why while obvious lines remain bare.
- Keep the sibling-checkout SLIDE loader and disposable keys confined to cross-repository test evidence.
- Do not add ambient-path loading, TypeScript decision fallback, retry through a weaker verifier or a default allow implementation.
- Use full 40-hex repository commits and exact `sha256:<64 lowercase hex>` digests in production records.
- Use only closed records with own data properties; surplus keys, accessors, proxies, inherited properties and malformed canonical values refuse.
- Represent absence and invalid numeric input with explicit variants/refusals,
  never `null` or `NaN`; every decision surface retains a total `_ =>`-equivalent
  refusal exit.
- Do not perform signing, access private keys, activate a native adapter, publish, push or move retirement counters.
- Run tests and repository-owned generators sequentially.

---

## File structure

- Create `packages-galerina/galerina-framework-app-kernel/src/production-slide-restore-admission.ts`: closed SLIDE execution observation types, private profile registry, truth-table admission and profile predicate.
- Create `packages-galerina/galerina-framework-app-kernel/tests/production-slide-restore-admission.test.mjs`: focused profile and hostile-port evidence.
- Create `packages-galerina/galerina-framework-app-kernel/src/production-boot-composition-candidate.ts`: closed composition policy, identity joins, private candidate registry and stable refusal.
- Create `packages-galerina/galerina-framework-app-kernel/tests/production-boot-composition-candidate.test.mjs`: candidate, forgery and mismatch evidence.
- Modify `packages-galerina/galerina-framework-app-kernel/src/index.ts`: export the two new modules only.
- Modify `scripts/tests/restore-verdict-slide-candidate.integration.test.mjs`: bind the real Contract 85 receipt observations to the new profiles and candidate while driving the real consumer.
- Modify `docs/TODO.md` and `docs/ROADMAP.md`: record the candidate honestly and retain the open authority gate.
- Create `docs/reports/production-boot-composition-candidate-2026-08-09.md`: fresh evidence and owner-only input manifest.
- Create the sibling KB private RD-0791 adjudication record: source-linked adjudication, evidence tiers and R&D wish list.
- Append the sibling KB private catch-up ledger: dated evidence-state entry; never rewrite prior entries.
- Regenerate only outputs selected by repository-owned generators after the implementation files and documentation are final.

---

### Task 1: Authenticated SLIDE restore profile

**Files:**
- Create: `packages-galerina/galerina-framework-app-kernel/tests/production-slide-restore-admission.test.mjs`
- Create: `packages-galerina/galerina-framework-app-kernel/src/production-slide-restore-admission.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/index.ts`

**Interfaces:**
- Consumes: `ProductionSlideRestoreManifest`, `ProductionSlideRestoreAuthority`, and `ProductionSlideRestoreExecutionPort` defined in this task.
- Produces: `admitAuthenticatedSlideRestoreProfile(manifest, objectBytes, authority, executionPort): AuthenticatedSlideRestoreProfile` and `isAuthenticatedSlideRestoreProfile(value): value is AuthenticatedSlideRestoreProfile`.

- [ ] **Step 1: Write the failing happy-path and private-registry test**

Create a test fixture with these exact public identities:

```js
const DIGEST = (value) => `sha256:${value.repeat(64)}`;
const GALERINA_COMMIT = "a".repeat(40);
const SLIDE_COMMIT = "b".repeat(40);

function manifest(overrides = {}) {
  return {
    schema: "galerina.production-slide-restore.manifest.v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: SLIDE_COMMIT,
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    objectSha256: DIGEST("1"),
    packageSetDigest: DIGEST("2"),
    slideBundleDigest: DIGEST("1"),
    packageDescriptorDigest: DIGEST("3"),
    compilerProfileId: "slide.checked-fungi.scalar.v1",
    toolManifestDigest: DIGEST("4"),
    safeValueTypeId: "Int",
    safeValueStateId: "safe.scalar.int.v1",
    safeValueProvenanceDigests: [DIGEST("5"), DIGEST("6"), DIGEST("7"), DIGEST("8")],
    currentEpoch: 15,
    rootKeyId: "offline-root-v1",
    operationalKeyId: "slide-object-signer-v1",
    delegationSerial: 7,
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    ed25519Signature: "ed25519-public-test-signature",
    mlDsa65Signature: "mldsa65-public-test-signature",
    ...overrides,
  };
}
```

Define `authority()` with exact schema
`galerina.production-slide-restore.authority.v1`, `at` inside the window,
minimum delegation serial `6`, exact root/operational key IDs, a non-revoked
callback, an object digester returning `objectSha256`, and both signature
verifiers returning literal `true` only for their expected signature inputs.

Define `executionPort()` with exact schema
`galerina.production-slide-restore.execution-port.v1`. Its `executeAndVerify`
records each Boolean pair and returns this exact closed observation:

```js
{
  schema: "galerina.production-slide-restore.observation.v1",
  status: "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
  packageIdentity: manifest.packageIdentity,
  exportName: manifest.exportName,
  objectSha256: manifest.objectSha256,
  packageSetDigest: manifest.packageSetDigest,
  slideBundleDigest: manifest.slideBundleDigest,
  packageDescriptorDigest: manifest.packageDescriptorDigest,
  compilerProfileId: manifest.compilerProfileId,
  toolManifestDigest: manifest.toolManifestDigest,
  currentEpoch: manifest.currentEpoch,
  safeValueTypeId: manifest.safeValueTypeId,
  safeValueStateId: manifest.safeValueStateId,
  safeValueProvenanceDigest: manifest.safeValueProvenanceDigests[vectorIndex],
  fallbackInvoked: false,
  verificationVerdict: 1,
  value: snapshotPresent && integrityOk ? 1 : -1,
}
```

Assert that admission calls the port exactly with
`[[true,true],[true,false],[false,true],[false,false]]`, returns a frozen
profile recognized by `isAuthenticatedSlideRestoreProfile`, retains both
literal false authority fields, has no `restoreVerdict` property, and that a
spread copy is not recognized.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
npm.cmd run build --prefix packages-galerina/galerina-framework-app-kernel
node --test packages-galerina/galerina-framework-app-kernel/tests/production-slide-restore-admission.test.mjs
```

Expected: the test fails because `admitAuthenticatedSlideRestoreProfile` and
`isAuthenticatedSlideRestoreProfile` are not exported.

- [ ] **Step 3: Define the closed public types and stable error**

In `production-slide-restore-admission.ts`, define:

```ts
export interface ProductionSlideRestoreManifest {
  readonly schema: "galerina.production-slide-restore.manifest.v1";
  readonly galerinaCommit: string;
  readonly slideCommit: string;
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigests: readonly [string, string, string, string];
  readonly currentEpoch: number;
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly delegationSerial: number;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly ed25519Signature: string;
  readonly mlDsa65Signature: string;
}

export interface ProductionSlideRestoreAuthority {
  readonly schema: "galerina.production-slide-restore.authority.v1";
  readonly at: string;
  readonly minDelegationSerial: number;
  readonly expectedRootKeyId: string;
  readonly expectedOperationalKeyId: string;
  readonly isRevoked: (keyId: string) => boolean;
  readonly digestObject: (objectBytes: Uint8Array) => string;
  readonly verifyEd25519: (preimage: Uint8Array, signature: string, keyId: string) => boolean;
  readonly verifyMlDsa65: (preimage: Uint8Array, signature: string, keyId: string) => boolean;
}

export interface ProductionSlideRestoreExecutionPort {
  readonly schema: "galerina.production-slide-restore.execution-port.v1";
  executeAndVerify(snapshotPresent: boolean, integrityOk: boolean): unknown;
}

export class ProductionSlideRestoreAdmissionError extends TypeError {
  readonly code: string;
}
```

Define the observation interface with the exact closed keys shown in Step 1.
Define the data-only profile explicitly:

```ts
export interface AuthenticatedSlideRestoreProfile {
  readonly schema: "galerina.authenticated-slide-restore.profile.v1";
  readonly galerinaCommit: string;
  readonly slideCommit: string;
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigests: readonly [string, string, string, string];
  readonly currentEpoch: number;
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly delegationSerial: number;
  readonly notAfter: string;
  readonly authenticatedObjectExecution: true;
  readonly authorityReleased: false;
  readonly productionAuthorizing: false;
}
```

It contains no function property.

- [ ] **Step 4: Implement exact-shape, canonical-time, preimage and observation helpers**

Use the established app-kernel pattern: exact ordered key arrays,
`Object.getOwnPropertyDescriptors`, `Object.getPrototypeOf(value) ===
Object.prototype`, lowercase digest/commit regexes, `Number.isSafeInteger`, and
canonical ISO instants that round-trip through `new Date(value).toISOString()`.

Build one signature preimage from a domain-separated, length-prefixed sequence
of every manifest field except the two signatures:

```ts
const domain = "galerina.production-slide-restore.sig.v1";
const fields = MANIFEST_KEYS.filter((key) =>
  key !== "ed25519Signature" && key !== "mlDsa65Signature");
const text = [domain, ...fields.map((key) => `${key.length}:${key}=${String(manifest[key]).length}:${String(manifest[key])}`)].join("\n");
const preimage = new TextEncoder().encode(text);
```

Require exact `true` from both verifier callbacks and treat callback throws as
refusal. Call `isRevoked` for both key IDs; anything other than exact `false`
is revoked.

- [ ] **Step 5: Implement truth-table admission and private registration**

Create a module-private `WeakSet<object>`. Validate the manifest, a non-empty
retained `Uint8Array`, authority and port, digest the retained object bytes
through the authority, validate time,
delegation, key and revocation state, verify both signature components, and
execute the four vectors in this exact order:

```ts
const VECTORS = Object.freeze([
  Object.freeze([true, true, 1] as const),
  Object.freeze([true, false, -1] as const),
  Object.freeze([false, true, -1] as const),
  Object.freeze([false, false, -1] as const),
]);
```

For each observation, require the exact closed shape, all manifest identities,
`fallbackInvoked === false`, `verificationVerdict === 1`, and the expected
integer value. Freeze the data-only profile, add it to the private set and
return it. Catch unknown failures and throw
`PRODUCTION_SLIDE_RESTORE_MALFORMED_REFUSED`; preserve typed admission errors.

- [ ] **Step 6: Export and run GREEN**

Add:

```ts
export * from "./production-slide-restore-admission.js";
```

to `src/index.ts`, then run:

```powershell
npm.cmd test --prefix packages-galerina/galerina-framework-app-kernel
```

Expected: all app-kernel tests pass, including the four ordered truth-table
observations and private-registry assertions.

- [ ] **Step 7: Add hostile profile admission cases**

In the same test file, use table-driven cases to require refusal for: copied
manifest with surplus key; accessor; proxy; inherited record; malformed short
commit; malformed digest; wrong package/export/type; unsafe epoch; expired
window; delegation rollback; either key revoked; either verifier returning
`false`, a truthy non-Boolean or throwing; wrong digested object; wrong
observation status/identity/epoch/type/state/provenance; fallback `true`;
verification verdict `0`; wrong truth-table result; thrown port; and a fifth
unexpected execution call.

Run the complete app-kernel package test again and require zero failures.

- [ ] **Step 8: Commit Task 1**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/src/index.ts packages-galerina/galerina-framework-app-kernel/src/production-slide-restore-admission.ts packages-galerina/galerina-framework-app-kernel/tests/production-slide-restore-admission.test.mjs
git commit -m "feat: admit authenticated slide restore profiles"
```

---

### Task 2: Sealed production boot composition candidate

**Files:**
- Create: `packages-galerina/galerina-framework-app-kernel/tests/production-boot-composition-candidate.test.mjs`
- Create: `packages-galerina/galerina-framework-app-kernel/src/production-boot-composition-candidate.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/index.ts`

**Interfaces:**
- Consumes: `AuthenticatedSlideRestoreProfile` from Task 1 and `ProductionRegistryDurabilityProfile` from `registry-durability-production-admission.ts`.
- Produces: `admitProductionBootCompositionCandidate(policy, slideProfile, durabilityProfile): ProductionBootCompositionCandidate` and `isProductionBootCompositionCandidate(value): value is ProductionBootCompositionCandidate`.

- [ ] **Step 1: Write the failing candidate and forgery test**

Create a production durability profile through the real
`verifyRegistryDurabilityEvidence` and `admitRegistryDurabilityProfile`
functions, using the exact fixture pattern in
`registry-durability-production-admission.test.mjs`. Create the SLIDE profile
through Task 1's real admission function.

Define a closed policy containing all Task 1 identities plus:

```js
{
  schema: "galerina.production-boot-composition.policy.v1",
  releaseId: "galerina-beta-v1",
  platform: "windows",
  architecture: "x86_64",
  operatingSystem: "windows-10",
  filesystem: "ntfs",
  durabilityAdapterId: "galerina.registry.durability.windows.v1",
  durabilityAdapterDigest: DIGEST("6"),
  durabilityBinaryDigest: DIGEST("7"),
  buildRecipeDigest: DIGEST("8"),
  toolchainDigest: DIGEST("9"),
  evidenceId: DIGEST("a"),
  storageProfileDigest: DIGEST("b"),
  acceptedCheckpointDigest: DIGEST("c"),
  generationId: "d".repeat(64),
  minDelegationSerial: 6,
  notBefore: "2026-08-09T00:00:00.000Z",
  notAfter: "2026-08-10T00:00:00.000Z",
}
```

Assert the candidate is frozen, privately recognized, contains exact joined
identities, exact status `CANDIDATE_INDETERMINATE_NON_AUTHORIZING`, exact
`verdict: 0`, the two literal authenticated evidence fields, both literal
false authority fields, and this
exact frozen missing-input list:

```js
[
  "REAL_OFFLINE_PRODUCTION_BOOT_DELEGATION",
  "REAL_OPERATIONAL_PUBLIC_BUNDLE",
  "REAL_CONTENT_BOUND_NATIVE_SLIDE_HOST",
  "REAL_PLATFORM_DURABILITY_RECEIPTS",
  "OWNER_RELEASE_AUTHORIZATION",
]
```

Assert `"restoreVerdict" in candidate === false`, every candidate property is
data-only, and a spread copy is not privately recognized. Assert copied SLIDE
and durability profiles refuse. An empty input record and every other missing
owner input must produce the typed `verdict: -1` refusal; no test in this slice
may observe or synthesize a `+1` composition verdict.

- [ ] **Step 2: Run RED**

```powershell
npm.cmd run build --prefix packages-galerina/galerina-framework-app-kernel
node --test packages-galerina/galerina-framework-app-kernel/tests/production-boot-composition-candidate.test.mjs
```

Expected: import failure for the two candidate functions.

- [ ] **Step 3: Define policy, candidate and error interfaces**

In `production-boot-composition-candidate.ts`, define the closed policy:

```ts
export interface ProductionBootCompositionPolicy {
  readonly schema: "galerina.production-boot-composition.policy.v1";
  readonly releaseId: "galerina-beta-v1";
  readonly galerinaCommit: string;
  readonly slideCommit: string;
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigests: readonly [string, string, string, string];
  readonly currentEpoch: number;
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly platform: "windows" | "linux" | "macos";
  readonly architecture: "x86_64" | "aarch64";
  readonly operatingSystem: string;
  readonly filesystem: string;
  readonly durabilityAdapterId: string;
  readonly durabilityAdapterDigest: string;
  readonly durabilityBinaryDigest: string;
  readonly buildRecipeDigest: string;
  readonly toolchainDigest: string;
  readonly evidenceId: string;
  readonly storageProfileDigest: string;
  readonly acceptedCheckpointDigest: string;
  readonly generationId: string;
  readonly minDelegationSerial: number;
  readonly notBefore: string;
  readonly notAfter: string;
}
```

Define `ProductionBootCompositionCandidate` with the same joined public
identity fields, exact schema
`galerina.production-boot-composition.candidate.v1`, exact status
`CANDIDATE_INDETERMINATE_NON_AUTHORIZING`, exact `readonly verdict: 0`,
`authenticatedObjectExecution: true`,
`authenticatedPlatformDurability: true`, both literal false authority fields,
and `readonly missingExternalInputs: readonly ProductionBootMissingInput[]`.
Define `ProductionBootMissingInput` as the five-string union from Step 1.
The candidate contains only strings, numbers, Booleans and the frozen
missing-input array.

Define `ProductionBootCompositionError extends TypeError` with stable code
`PRODUCTION_BOOT_COMPOSITION_REFUSED` and exact `readonly verdict: -1` for
every public refusal.

- [ ] **Step 4: Implement fail-closed identity joins**

Validate the exact policy shape, canonical time window and safe serial. Require
private recognition through both `isAuthenticatedSlideRestoreProfile` and
`isProductionRegistryDurabilityProfile`. Recheck every policy-to-profile join:

```text
Galerina commit
package identity and export
SLIDE object, bundle, package-set and package-descriptor digests
compiler profile and tool-manifest digest
typed value type, state and provenance
epoch, root key, operational key and delegation serial
platform, architecture, operating system and filesystem
adapter, adapter source, binary, build recipe and toolchain
evidence, storage profile, accepted checkpoint and generation
active time window
```

The SLIDE commit remains bound solely by the SLIDE profile because the existing
durability profile is Galerina-repository scoped. Do not invent a SLIDE commit
field in the durability profile.

On exact agreement, freeze and privately register the data-only candidate. On
any disagreement or unexpected exception, throw only
`PRODUCTION_BOOT_COMPOSITION_REFUSED`. Do not return a partial object.

- [ ] **Step 5: Export and run GREEN**

Add:

```ts
export * from "./production-boot-composition-candidate.js";
```

to `src/index.ts`, then run the complete app-kernel package test. Expected:
all tests pass with no additional dependency and no exported activation
function.

- [ ] **Step 6: Add the complete mismatch matrix**

Add one table row for every identity listed in Step 4, plus: surplus policy
key; accessor; proxy; inherited policy; non-canonical time; unsafe serial;
expired candidate; copied profile; forged positive authority field; missing
profile; and `null`. Assert every case throws `ProductionBootCompositionError`
with exact code `PRODUCTION_BOOT_COMPOSITION_REFUSED`, exact `verdict: -1`,
and never returns an object.

Inspect `Object.keys(await import("../dist/index.js"))` and assert the module
does not export `activateProductionBoot`, `releaseProductionBootAuthority` or
`createProductionRestoreVerdictAuthority`.

Run the full app-kernel package test and require zero failures.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/src/index.ts packages-galerina/galerina-framework-app-kernel/src/production-boot-composition-candidate.ts packages-galerina/galerina-framework-app-kernel/tests/production-boot-composition-candidate.test.mjs
git commit -m "feat: seal production boot composition candidates"
```

---

### Task 3: Real Contract 85 consumer evidence

**Files:**
- Modify: `scripts/tests/restore-verdict-slide-candidate.integration.test.mjs`

**Interfaces:**
- Consumes: both Task 1 and Task 2 admission functions, the existing Contract 85 publication loader, disposable hybrid object authenticator, real app-kernel durability admission and real `ColdBootOrchestrator`.
- Produces: one cross-repository test proving the exact receipt identities used by the real consumer match a sealed non-authorizing composition candidate.

- [ ] **Step 1: Write the failing composition-bound integration assertions**

Extend the existing `drives the real cold-boot consumer with receipt-verified
decisions` case. Build and import app-kernel `dist/index.js` alongside
sentinel-state. Instrument `receiptBackedAuthority` so each successfully
verified receipt appends this data-only observation to a caller-owned array:

```js
{
  packageIdentity: receipt.packageIdentity,
  exportName: receipt.exportName,
  objectSha256: sha256(publishedObject.objectBytes),
  packageSetDigest: receipt.packageSetDigest,
  slideBundleDigest: receipt.slideBundleDigest,
  packageDescriptorDigest: publishedReceipt.artifacts[0].packageDescriptorDigest,
  compilerProfileId: receipt.compilerProfileId,
  toolManifestDigest: receipt.toolManifestDigest,
  currentEpoch: receipt.currentEpoch,
  safeValueTypeId: receipt.typedReceipt.safeValueTypeId,
  safeValueStateId: receipt.typedReceipt.safeValueStateId,
  safeValueProvenanceDigest: receipt.typedReceipt.safeValueProvenanceDigest,
  fallbackInvoked: receipt.fallbackInvoked,
  verificationVerdict: verified.verdict,
  value: verified.value,
}
```

Use four fresh handles to derive the physical tuple, four new handles to admit
the SLIDE profile, then three separate fresh handles for the real valid,
missing and tampered restore paths. Use the real
app-kernel evidence and durability admission factories to create a disposable
test production profile matching the same Galerina commit and policy. Admit
the composition candidate and assert all observed consumer identities equal
the candidate identities, `fallbackInvoked` is false, and both authority
fields remain false.

- [ ] **Step 2: Run the focused integration test to verify RED**

```powershell
npm.cmd run build --prefix packages-galerina/galerina-framework-app-kernel
npm.cmd run build --prefix packages-galerina/galerina-core-sentinel-state
$env:GALERINA_SLIDE_REPO = (Resolve-Path '..\SLIDE').Path
node --test scripts/tests/restore-verdict-slide-candidate.integration.test.mjs
Remove-Item Env:GALERINA_SLIDE_REPO
```

Expected: the new composition-bound assertions fail before the receipt
observation adapter and exact fixture are completed. The existing four
Contract 85 cases must remain green.

- [ ] **Step 3: Complete the reference-only execution-port adapter**

Factor one helper that prepares a fresh package-execution handle, opens one
fresh authenticated-object handle, executes the physical `.slide`, requires
status `SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY`, requires
`fallbackInvoked === false`, independently calls
`verifyAuthenticatedTypedCheckedFungiPackageReceipt` with
`authenticatedExpectation(receipt)`, and returns the closed Task 1
observation. It must consume exactly one affine pair per vector and expose no
handle to the candidate.

The Task 1 authority fixture uses the real object digest and exact public
receipt identities. Its signature-verifier callbacks are evidence adapters
over the already successful hybrid object authentication result; they remain
disposable test mechanics and cannot appear in production source or output.

- [ ] **Step 4: Prove real consumer and candidate agreement**

Drive:

```text
valid snapshot   -> restored payload and logical tick
missing snapshot -> LSS-NOSNAP-001
tampered snapshot -> LSS-INTEGRITY-001
```

Require eleven total fresh affine handle pairs: four for tuple preflight, four
for profile admission and three for consumer decisions. Assert zero remaining
handles, no fallback, the
exact candidate/private-profile predicates, no `restoreVerdict` property on
the candidate, and both false authority fields.

- [ ] **Step 5: Run focused cross-repository GREEN**

Run the commands from Step 2. Expected: Contract 85 reports all cases passed,
none skipped, all eleven handles consumed and no fallback.

- [ ] **Step 6: Run affected package evidence**

Run sequentially:

```powershell
npm.cmd test --prefix packages-galerina/galerina-framework-app-kernel
npm.cmd test --prefix packages-galerina/galerina-core-sentinel-state
npm.cmd test --prefix packages-galerina/galerina-tower-citizen
```

Expected: all three packages pass with zero failures.

- [ ] **Step 7: Commit Task 3**

```powershell
git add -- scripts/tests/restore-verdict-slide-candidate.integration.test.mjs
git commit -m "test: bind boot candidate to real restore consumer"
```

---

### Task 4: Linked KB R&D and adversarial review

**Files:**
- Read: sibling KB `RD-0768-authenticated-producer-and-platform-durability.md`
- Read: sibling KB `RD-0775-kleene-k3-control-completeness-over-general-cfg.md`
- Read: sibling KB `ai-reviews/reports/Claude-04-slide-independent-platform-review.md`
- Read: sibling KB `ai-reviews/reports/GPT-04-slide-independent-platform-review.md`
- Create: sibling KB private RD-0791 adjudication record.
- Create when an approved route is available: sibling KB private Antigravity review record.
- Append: sibling KB private catch-up ledger.

**Interfaces:**
- Consumes: Task 3 source, tests and fresh receipts plus the KB's existing K3, signing, platform and durability research.
- Produces: a source-linked private R&D adjudication, explicit evidence tiers and an owner R&D wish list without changing production authority.

- [ ] **Step 1: Re-query the KB through its owning index**

Run the Galerina `kb-index.mjs` query for production boot composition,
authenticated platform evidence, SLIDE restore authority, K3, revocation and
durability. Open only the ranked documents needed for the adjudication. Treat
private documents as direct custody inputs and never copy their private
contents into public generated indexes or logs.

- [x] **Step 2: Write RD-0791 as a private, source-linked adjudication**

Use the exact primary heading suffix ` - PRIVATE`. Record:

- the implemented claim and its exact K3 `0` boundary;
- each independently verified local fact, with file/symbol/test evidence;
- each evidence tier: unit/KAT, cross-repository integration, host-local,
  source-model, independent model review, owner ceremony or external platform;
- the live counterexample/control for every load-bearing claim;
- why disposable test keys and Windows syscall acceptance are not production
  custody or power-loss evidence;
- unresolved knowledge gaps as a concrete R&D wish list with owner, required
  artefact, acceptance condition and authority consequence; and
- explicit non-claims: no production key, no native content-bound host, no
  external crash/reboot/power-loss proof, no owner release and no K3 `+1`.

Link the R&D record to the design, implementation report and prior RD sources
without embedding absolute local paths.

- [ ] **Step 3: Obtain or record the independent-review boundary**

Submit the exact design, implementation diff, KAT matrix and non-claims to an
approved independent review route if one is available without private-key or
secret access. Preserve the raw response as a linked private source artefact
and adjudicate it sceptically; do not equate an AI review with a human security
sign-off. If no approved route is available, record third-party review as an
unresolved R&D wish-list item and keep every authority field false.

- [ ] **Step 4: Append the private catch-up ledger and commit only KB paths**

Append a dated entry to the KB private catch-up ledger that distinguishes
`SOURCE-CHECKED`, `BINDING` and `CONCURRENT` state. Recheck the KB worktree and
commit only the new RD file, any approved raw review artefact and the ledger
entry using explicit pathspecs. Do not push.

Use the KB-local custody instructions and explicit file pathspecs for the
private RD, review record and ledger entry. Do not copy private filenames into
this public repository, use a directory pathspec, or push.

---

### Task 5: Documentation, generated views and fresh closure

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/reports/production-boot-composition-candidate-2026-08-09.md`
- Regenerate: only files selected by their owning graph, code-index, registry, component-health and phase-close generators.

**Interfaces:**
- Consumes: fresh focused, cross-repository and aggregate outputs plus the linked RD-0791 gap adjudication.
- Produces: an honest non-authorizing checkpoint, exact owner-input manifest, clean local commit and fresh structural index.

- [ ] **Step 1: Record the focused evidence without promoting authority**

The report must state the exact fresh counts and commands observed in Task 3,
then record these invariant conclusions verbatim:

```text
Candidate status: CANDIDATE_INDETERMINATE_NON_AUTHORIZING
K3 verdict: 0
authorityReleased: false
productionAuthorizing: false
No production RestoreVerdictAuthority was created or exported.
No production private key was generated, read or used.
```

List the five missing external inputs from Task 2 and distinguish disposable
test mechanics from authentic owner-controlled evidence. State explicitly
that the slice exposes no K3 `+1` result and that public refusals carry `-1`.
Link the public report to RD-0791 only through its safe repository-relative
identifier and summarize the wish-list categories without disclosing private
review content.

- [ ] **Step 2: Update current TODO and roadmap sections**

Mark only the repository implementation of the sealed composition candidate
complete. Keep the production boot authority, authenticated native host,
offline signing ceremony, external durability, package conversion and
terminal retirement items open. Do not change the 516/501 TypeScript, 111
Fungi, 0/42 host-boundary, 95 `node_modules` or one nested-native debt counts.

- [ ] **Step 3: Run repository-owned generators and inspect every changed path**

Run sequentially:

```powershell
node packages-galerina\galerina-core-cli\dist\index.js graph --out build\graph
node scripts\code-index.mjs
node scripts\gen-code-registry.mjs
node scripts\component-health.mjs --self-test
node scripts\component-health.mjs --audit-html
node scripts\component-health.mjs --audit-check
git status --short
git diff --check
```

Do not stage a generated file until its owning tool selected it and its diff
matches the new source/document locations or counts.

- [ ] **Step 4: Run focused audit and integration closure**

Run sequentially:

```powershell
npm.cmd run audit:fungi-golden
node scripts\audit-path-leak.mjs
node scripts\lint-conventions.mjs
$env:GALERINA_SLIDE_REPO = (Resolve-Path '..\SLIDE').Path
node --test scripts/tests/restore-verdict-slide-candidate.integration.test.mjs
Remove-Item Env:GALERINA_SLIDE_REPO
```

Require zero failures and no skip in the cross-repository case.

- [ ] **Step 5: Run complete registered and phase-close evidence**

Run the repository's current owning commands sequentially:

```powershell
npm.cmd test
npm.cmd run phase-close
npm.cmd run phase-close:exhaustive
```

Record actual current counts and durations. A timeout, stale generated view,
owned-process leak, skipped required check or partial wrapper result is
non-authorizing and must be diagnosed and rerun rather than summarized as
success.

- [ ] **Step 6: Recheck custody and commit exact paths locally**

Before staging, recheck `git status --short --branch`, `git log -1 --oneline`
and active coordination. Stage only the implementation report, current TODO,
roadmap and generator-selected outputs with explicit pathspecs. Commit:

```powershell
git commit -m "docs: record production boot candidate evidence"
```

Do not push.

- [ ] **Step 7: Refresh and verify the structural index**

Run codebase-memory `index_repository` in `moderate` mode. If it reports a
stale `indexed_head_sha`, rerun in `full` mode. Require all of:

```text
status = indexed
nodes = expected_nodes or no unexplained shortfall
indexed_head_sha = git rev-parse HEAD
stale = false when index_status is available
```

Belt-and-braces search for
`admitProductionBootCompositionCandidate` and the new design/report titles.
Keep the branch local and clean.

---

## Completion audit

Before claiming this plan complete, map each design requirement to fresh
evidence:

| Requirement | Required proof |
|---|---|
| Sealed SLIDE profile | Four ordered vectors, exact receipts, private predicate, copied-object refusal |
| Signing and revocation | Both exact signature verifiers, key identities, window, serial and revoked-key refusals |
| Platform and durability | Real private durability-profile predicate and complete mismatch matrix |
| Sealed composition | Private candidate predicate, exact cross-profile joins, no partial result |
| K3 boundary | Candidate is exactly `0`; every public refusal is `-1`; no `+1` path exists |
| Real consumer | Valid/missing/tampered cold-boot paths through fresh authenticated typed handles |
| Non-authorizing | Literal false fields, no restore/activation/release export, five missing external inputs |
| R&D custody | RD-0791 source links, evidence tiers, live controls, explicit wish list and private ledger entry |
| Independent review | Raw approved review plus sceptical adjudication, or an explicit unresolved third-party-review gap |
| Core-first boundary | No Core import or package dependency toward app-kernel |
| Fresh closure | Focused packages, Contract 85/86, generators, aggregate, normal and exhaustive phase-close |
| Custody | Local commits only, no signing/private-key access, no push, clean status |

Do not mark the production authority gate complete. This plan proves only the
sealed candidate described by the approved design.
