# Registry Live Artifact and Manifest Admission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the file-backed Galerina registry admit only a deterministic
flat-package artifact whose hybrid package-manifest signature verifies through
an active hybrid offline-root delegation.

**Architecture:** A small script library resolves one direct
`packages-galerina/` child by package identity and hashes an explicit bounded
file list. The app-kernel composes its existing delegation and package-manifest
deciders. The registry CLI supplies public keys, verifies content and the
complete public authority chain before constructing an unsigned index.

**Tech Stack:** Node.js ESM, strict TypeScript, `node:test`, Node `crypto`,
`@noble/post-quantum` ML-DSA-65, YAML scalar/list subset already used by the
registry CLI, Galerina graph/audit/generator tooling.

## Global Constraints

- Zero trust: missing, unknown, stale, malformed, ambiguous, conflicting,
  non-literal or unverifiable evidence refuses.
- Never read, copy, print, stage, commit or use a real private key.
- Use disposable generated keys for every executable signing test.
- Do not use rejected key `700265bb65c412b1`. Later owner authority selected
  operational key `f3172a48372bfb23`; its public material remains
  non-authorizing until the offline root signs the exact admitted delegation.
- Do not infer the exact root key ID from an abbreviated or mistyped value.
- Every package exists once as a direct child of `packages-galerina/`; no
  nested dependency forest or copied dependency instance is created.
- A technical review is not owner governance approval.
- One invalid registry entry poisons the complete build; no partial output.
- Preserve all unrelated and user-owned files. The independently re-derived
  public halves for `f3172a48372bfb23` are now reviewed and tracked verifier
  material; they are not private and do not authorize by presence.
- `.fungi` `if` is Boolean-only; use exhaustive `check` for K3 and exhaustive
  `match` for other decisions. No new `.fungi` syntax is introduced here.
- Private-document primary headings end exactly with ` - PRIVATE`; marking
  does not authorize committing private content to a public repository.
- Commit locally on `codex/galerina-beta-v1-completion`; never push.

---

### Task 1: Compose delegated package-manifest verification

**Files:**

- Modify:
  `packages-galerina/galerina-framework-app-kernel/src/registry-authority.ts`
- Modify:
  `packages-galerina/galerina-framework-app-kernel/tests/registry-authority.test.mjs`

**Interfaces:**

- Consumes:
  `verifyRegistryAuthorityDelegation`,
  `verifyRegistryPackageManifest`,
  `RegistryManifestVerifiers`, and the existing operational fingerprint
  structure.
- Produces:

```ts
export interface DelegatedRegistryPackageManifestVerification {
  readonly authority: Omit<RegistryAuthorityVerification, "requiredRoles">;
  readonly operationalPublicKeyFingerprints: {
    readonly ed25519: string;
    readonly mlDsa65: string;
  };
  readonly verifyManifest: RegistryManifestVerifiers;
}

export function verifyRegistryPackageManifestUnderDelegation(
  manifest: RegistryPackageManifest,
  delegation: RegistryAuthorityDelegation,
  options: DelegatedRegistryPackageManifestVerification,
): "verified";
```

- [ ] **Step 1: Write the failing valid-chain test**

Add a test that signs a disposable package manifest with the operational
fixture signer, supplies the existing valid hybrid root delegation and exact
operational public fingerprints, and expects `"verified"`.

- [ ] **Step 2: Write failing denial tests**

Add table-driven tests for missing `package-manifest.sign`, changed Ed25519
fingerprint, changed ML-DSA-65 fingerprint, wrong manifest signer ID, revoked
operational key, stale serial and inactive delegation window. Assert the exact
existing `RegistryAuthorityError` or `RegistryPackageManifestError` code.

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel run build
node --test packages-galerina/galerina-framework-app-kernel/tests/registry-authority.test.mjs
```

Expected: failure because
`verifyRegistryPackageManifestUnderDelegation` is not exported.

- [ ] **Step 4: Implement the smallest composition helper**

Import the manifest types and verifier. Call
`verifyRegistryAuthorityDelegation` with required role
`package-manifest.sign`, compare both fingerprints with literal equality,
require both `manifest.signerKeyId` and `manifest.keyId` to equal
`delegation.operational.keyId`, then call
`verifyRegistryPackageManifest`.

- [ ] **Step 5: Verify GREEN**

Run the Task 1 command again and require all tests to pass.

- [ ] **Step 6: Commit**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/src/registry-authority.ts packages-galerina/galerina-framework-app-kernel/tests/registry-authority.test.mjs
git diff --cached --check
git commit -m "security(registry): verify delegated package manifests"
```

### Task 2: Implement deterministic flat-package artifact identity

**Files:**

- Create: `scripts/lib/registry-package-artifact.mjs`
- Create: `scripts/tests/registry-package-artifact.test.mjs`

**Interfaces:**

- Produces:

```js
export const REGISTRY_ARTIFACT_PROFILE =
  "galerina-flat-package-tree/v1";

export function resolveFlatWorkspacePackage(
  workspacePackagesDir,
  packageName,
) {}

export function hashFlatPackageArtifact({
  workspacePackagesDir,
  packageName,
  artifactProfile,
  artifactFiles,
}) {}
```

- `hashFlatPackageArtifact` returns:

```js
{
  packageRoot,
  packageDirectory,
  fileCount,
  totalBytes,
  hash: "sha256:<64-lowercase-hex>"
}
```

- [ ] **Step 1: Write the failing deterministic digest test**

Create a temporary flat workspace containing one direct package with
`package.json`, `LICENSE` and `src/index.ts`. Assert the hand-derived digest
for the specified domain, big-endian lengths, paths and bytes.

- [ ] **Step 2: Write failing mutation tests**

Prove that changing one byte or one declared path changes the digest and that
filesystem enumeration order cannot change the result.

- [ ] **Step 3: Write failing refusal tests**

Cover empty/unsorted/duplicate file lists, forward/back traversal, absolute
and backslash paths, a missing file, a directory, a symlink when supported,
file/path/count/total limit overflow, unknown profile, a mismatched
`package.json` identity, duplicate direct-child identities and a package
found only below a nested child.

- [ ] **Step 4: Verify RED**

Run:

```powershell
node --test scripts/tests/registry-package-artifact.test.mjs
```

Expected: module-not-found for `registry-package-artifact.mjs`.

- [ ] **Step 5: Implement path-safe resolution and hashing**

Use `readdirSync(..., { withFileTypes: true })`, `lstatSync`, `readFileSync`,
`realpathSync`, `TextEncoder`, `createHash`, and explicit `Buffer.writeBigUInt64BE`.
Resolve only direct non-symlink directories. Validate every relative path
before joining it and re-check that the resolved real file remains below the
resolved package root.

- [ ] **Step 6: Verify GREEN**

Run the Task 2 test and require all cases to pass.

- [ ] **Step 7: Commit**

```powershell
git add -- scripts/lib/registry-package-artifact.mjs scripts/tests/registry-package-artifact.test.mjs
git diff --cached --check
git commit -m "feat(registry): hash flat package artifacts"
```

### Task 3: Make the file-backed builder verify content and authority

**Files:**

- Modify: `scripts/registry-index-cli.mjs`
- Modify:
  `packages-galerina/galerina-registry/tests/registry-empty.test.mjs`
- Modify:
  `packages-galerina/galerina-registry/tests/registry-authority-cli.test.mjs`

**Interfaces:**

- `buildFromDir` becomes asynchronous and receives one explicit options
  object:

```js
await buildFromDir(decider, registryDir, registryId, issuedAt, {
  workspacePackagesDir,
  delegation,
  authority,
  operationalPublicKeyFingerprints,
  verifyManifest,
});
```

- Public CLI build/sign inputs add:
  `--workspace-packages-dir`, `--delegation`, `--root-pubkey`,
  `--root-mldsa65-pubkey`, `--root-key-id`,
  `--operational-ed25519-pubkey`, `--operational-mldsa65-pubkey`,
  `--authority-at`, and `--min-delegation-serial`.

- [ ] **Step 1: Replace the structurally signed fixture with a real chain**

Generate disposable root and operational Ed25519 plus ML-DSA-65 keypairs in
the registry test fixture. Root-sign a delegation, operational-sign the
package manifest, and write both public halves and the delegation to the
temporary directory.

- [ ] **Step 2: Write the failing valid file-backed build test**

Create one flat package, declare its exact `artifactFiles`, compute the
independent expected hash, sign the complete manifest, run `build`, and assert
that an unsigned v2 index with exactly one entry is written.

- [ ] **Step 3: Write failing negative integration tests**

Exercise a content byte change, structurally non-empty fake signature,
missing signature half, wrong operational public file, changed delegation,
missing role, stale serial, expired window, revoked key and one bad manifest
beside one good manifest. Every case exits non-zero and writes no index.

- [ ] **Step 4: Verify RED**

Run:

```powershell
npm.cmd --prefix packages-galerina/galerina-registry test
```

Expected: the existing builder accepts the fake non-empty signature or rejects
the new authority arguments without performing the required chain.

- [ ] **Step 5: Implement strict manifest parsing and public verification**

Load the compiled app-kernel decider once. Load public files only, derive
operational SHA-256 fingerprints, construct literal Boolean Ed25519 and
ML-DSA-65 verifiers, recompute the artifact digest, compare it with
`manifest.hash`, and call
`verifyRegistryPackageManifestUnderDelegation` before creating any entry.

- [ ] **Step 6: Remove fake approved self-test manifests**

Update `registry-index-cli.mjs --self-test` so every positive manifest is
actually hybrid signed and every positive artifact exists. Keep the exact
tamper, downgrade, rollback, unknown-key and mixed-tree denials.

- [ ] **Step 7: Verify GREEN**

Run the Task 3 package test plus:

```powershell
node scripts/registry-index-cli.mjs --self-test
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel test
```

- [ ] **Step 8: Commit**

```powershell
git add -- scripts/registry-index-cli.mjs packages-galerina/galerina-registry/tests/registry-empty.test.mjs packages-galerina/galerina-registry/tests/registry-authority-cli.test.mjs
git diff --cached --check
git commit -m "security(registry): verify live manifest authority"
```

### Task 4: Adjudicate the live registry population

**Files:**

- Delete:
  `packages-galerina/galerina-registry/packages/@galerina/healthcare/package.galerina.yaml`
- Delete:
  `packages-galerina/galerina-registry/packages/@galerina/auth/package.galerina.yaml`
- Create:
  `packages-galerina/galerina-registry/candidates/@galerina/auth/package.galerina.yaml`
- Create:
  `docs/reports/registry-auth-package-technical-review-2026-07-30.md`
- Modify: `packages-galerina/galerina-registry/README.md`
- Modify:
  `packages-galerina/galerina-registry/tests/registry-empty.test.mjs`

**Interfaces:**

- The candidate names `@galerina/auth` version `1.0.0-beta.2`.
- It uses `galerina-package-manifest/v1` and
  `galerina-flat-package-tree/v1`.
- It declares every tracked package file needed for the reviewed source
  artifact and carries the re-derived content hash.
- It remains `governance.reviewed: false`, with null reviewer, review time,
  signer identity and signature until the owner acts.

- [ ] **Step 1: Run the auth package's declared verification**

```powershell
npm.cmd --prefix packages-galerina/galerina-auth test
```

Record the exact test count and result.

- [ ] **Step 2: Run focused existing audits**

Run flat topology, package boundary, Node dependency, secret/path/private leak,
license, effect and package-graph checks over the auth and registry surfaces.
Record commands, exit statuses and findings in the technical-review report.

- [ ] **Step 3: Add the candidate manifest and re-derived digest test**

The registry test imports `hashFlatPackageArtifact`, parses the candidate, and
asserts that its declared hash equals the fresh digest from the canonical
workspace package.

- [ ] **Step 4: Verify RED**

Run the registry package test. Expected: failure until the candidate manifest,
exact file list and correct digest exist.

- [ ] **Step 5: Create the candidate and remove both false live entries**

Delete the nonexistent healthcare stub rather than inventing a package. Move
the auth claim out of the live signable tree, populate its exact technical
facts and keep all owner-only authority facts absent.

- [ ] **Step 6: Verify GREEN and live refusal**

Run the registry package test. Then run a live build without authority inputs
and require terminal refusal with no output because the live certified tree is
empty.

- [ ] **Step 7: Commit**

```powershell
git add -- packages-galerina/galerina-registry docs/reports/registry-auth-package-technical-review-2026-07-30.md
git diff --cached --check
git commit -m "docs(registry): replace false package stubs"
```

### Task 5: Record the private heading rule and current authority blockers

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/TODO.md`
- Modify: `docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md`
- Modify: `docs/security/galerina-72-signed-registry-index-walkthrough.md`
- Modify:
  `docs/reports/zero-trust-tooling-refactor-completion-2026-07-29.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `../SLIDE/TODO.md`
- Modify: `../SLIDE/QUESTIONS-FOR-OWNER.md`
- Update the relevant public Knowledge Base architecture/status record without
  copying any private title, path or key value.

**Interfaces:**

- Private heading format is exactly `# <title> - PRIVATE`.
- The shortened owner message is not recorded as a different root key ID.
- Production signing remains owner-blocked pending the real root signature,
  package-manifest signature and registry-index signature. The selected
  operational public chain and owner-approved package facts are exact.
- SLIDE Shape Memory remains design/schema-only and paused behind the
  Galerina-first gate.

- [ ] **Step 1: Update the continuity ledgers**

Record completed commits, current work, focused evidence, unresolved root-ID
exactness, the rejected keys, the owner-only signing act and the next safe
boundary.

- [ ] **Step 2: Update the roadmap and completion matrix**

Use distinct states for implemented, verified, owner-blocked, post-beta and
future SLIDE. Do not convert technical review into certification.

- [ ] **Step 3: Record the private heading convention**

Add the exact H1 rule beside the existing `-PRIVATE.md` filename/custody
rules. State that the heading marker never makes private content safe to
commit.

- [ ] **Step 4: Verify documentation guards**

```powershell
node scripts/audit-private-doc-leak.mjs --self-test
node scripts/audit-private-doc-leak.mjs
node scripts/audit-path-leak.mjs --self-test
node scripts/audit-path-leak.mjs
node scripts/audit-doc-drift.mjs
```

- [ ] **Step 5: Make scoped local commits**

Commit Galerina, SLIDE and Knowledge Base changes separately on their existing
branches. Never push and never include unrelated changes.

### Task 6: Regenerate and close the repository-local evidence

**Files:**

- Regenerate only outputs declared by the fourteen generator contracts.
- Modify TODO/roadmap/completion records only when fresh evidence changes
  their state.

**Interfaces:**

- No real key or owner signature is required for repository-local tests.
- Rejected user-owned key artifacts remain untracked and untouched.
- Cross-runtime Wasm/Rust/Python/SLIDE benchmark remains deferred.

- [ ] **Step 1: Run focused suites**

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel test
npm.cmd --prefix packages-galerina/galerina-registry test
npm.cmd --prefix packages-galerina/galerina-auth test
node scripts/registry-index-cli.mjs --self-test
```

- [ ] **Step 2: Run graph, audit and generator fixed points**

```powershell
node scripts/graph-all.mjs
node scripts/graph-all.mjs --check
node scripts/audit-generator-contract.mjs
```

Run every direct generator check named by the live generator contract and
repeat until two consecutive checks report no drift.

- [ ] **Step 3: Run complete tests and strict closes**

```powershell
npm.cmd test
npm.cmd run phase-close
npm.cmd run phase-close:exhaustive
node scripts/rebuild-fusable-packages.mjs --strict
```

Investigate and fix every reproduced repository-local defect. A real
owner-only signing refusal remains named, not bypassed.

- [ ] **Step 4: Regenerate roadmap and percentage evidence**

```powershell
node scripts/component-health.mjs --audit-html
node scripts/gen-roadmap-subway.mjs --write
node scripts/gen-roadmap-subway.mjs --check
```

Manually adjudicate the roadmap so generated percentages do not imply a signed
production registry or executable Shape Memory.

- [ ] **Step 5: Verify final diff and secret boundaries**

```powershell
git diff --check
node scripts/audit-private-doc-leak.mjs
node scripts/audit-path-leak.mjs
git status --short
```

- [ ] **Step 6: Commit generated artifacts and final reports separately**

Use explicit pathspecs. Verify the rejected untracked public key is absent from
the staged set. Make local commits only and report every remaining
owner-blocked item.
