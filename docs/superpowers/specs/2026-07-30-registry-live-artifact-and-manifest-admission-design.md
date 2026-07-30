# Registry Live Artifact and Manifest Admission Design

**Date:** 2026-07-30

**Status:** approved for engineering implementation; the real owner signing
act remains blocked until the documented offline ceremony is valid.

## Outcome

The file-backed Galerina registry builder will stop treating a non-empty
`signature` scalar as evidence. Every live entry must bind:

1. one canonical direct child of `packages-galerina/`;
2. an explicit, bounded list of package files;
3. a deterministic digest of those exact file paths and bytes;
4. a reviewed manifest whose complete signed facts include the artifact
   profile, file list, content digest, capabilities, effects, certification
   and governance record;
5. a hybrid Ed25519 plus ML-DSA-65 package-manifest signature;
6. an active, non-revoked, rollback-safe root delegation authorizing the
   operational signer for `package-manifest.sign`; and
7. operational public-key bytes whose SHA-256 fingerprints match that
   delegation.

One missing, malformed, stale, ambiguous, conflicting, substituted or
unverifiable fact refuses the complete index build. The builder never skips a
bad entry and never publishes a partial index.

## Scope

This tranche implements:

- deterministic identity for a flat workspace package artifact;
- delegated package-manifest verification in the app-kernel decider;
- public-key and delegation inputs for the file-backed registry builder;
- fail-closed CLI and integration tests;
- removal of the nonexistent `@galerina/healthcare` live stub;
- a technically reviewed, content-addressed `@galerina/auth` candidate;
- signing-readiness, TODO, roadmap and completion-report updates.

It does not:

- read, copy, print or use a real private key;
- certify an artifact merely because its tests pass;
- manufacture an owner governance approval or timestamp;
- make rejected `700265bb65c412b1` a production authority, or grant selected
  operational identity `f31…` authority merely because its public
  files are present;
- produce a real root delegation or signed registry index;
- create a nested dependency store or copy package dependencies below another
  package;
- begin independent SLIDE implementation or cross-runtime benchmarking.

## Canonical flat-package artifact

### Package resolution

The builder receives a trusted `workspacePackagesDir` configuration input. It
enumerates direct child directories only, reads each direct child's
`package.json`, and requires exactly one child whose `name` equals the registry
manifest's `name`.

The manifest cannot provide a filesystem path. Absolute paths, `..`,
backslashes, drive letters, UNC paths, nested package roots, duplicate package
identities and symlinked/reparse package roots are terminal refusals.

This preserves the owner rule:

```text
packages-galerina/
  package-a/
  package-b/
  package-c/
```

Dependencies name canonical peers. They do not create child dependency
forests.

### Artifact profile

The first and only admitted beta profile is:

```text
galerina-flat-package-tree/v1
```

The manifest contains a non-empty `artifactFiles` list. Every value is a
UTF-8, forward-slash, package-root-relative path in canonical lexical order.
Values must be unique and must resolve to regular, non-symlink files beneath
the selected direct package root.

The beta limits are:

- at most 4,096 files;
- at most 16 MiB per file;
- at most 64 MiB for the complete artifact;
- at most 512 UTF-8 bytes per relative path.

Unknown artifact profiles, unsorted lists, duplicates, empty lists, missing
files, directories, symlinks, path traversal and limit overflow refuse.

### Digest

The package digest is SHA-256 over this byte stream:

```text
"galerina.package.artifact.tree.v1" UTF-8
NUL
for each artifactFiles entry in declared order:
  uint64be(path UTF-8 byte length)
  path UTF-8 bytes
  uint64be(file byte length)
  exact file bytes
```

The manifest `hash` is exactly:

```text
sha256:<64 lowercase hexadecimal digits>
```

The digest includes file boundaries and path identities. It does not depend on
filesystem order, timestamps, ownership, ACL representation or the absolute
checkout path. A content or path change creates a different digest.

The signed registry manifest is not included in its own artifact file list, so
there is no signature/hash cycle.

## Manifest and authority chain

The admitted package manifest schema remains:

```text
galerina-package-manifest/v1
```

The manifest adds these required fields:

```yaml
schema: "galerina-package-manifest/v1"
artifactProfile: "galerina-flat-package-tree/v1"
artifactFiles:
  - "LICENSE"
  - "package.json"
signerKeyId: "<operational-registry-key-id>"
signature: "<hybrid-envelope>"
```

`keyId` and `signerKeyId` must both equal the delegated operational key ID.
The package-manifest signature preimage already omits only `signature`, so the
schema, artifact profile, file list, hash, package identity, authority,
capabilities, effects and governance fields are signed facts.

The app-kernel gains one composition function:

```ts
verifyRegistryPackageManifestUnderDelegation(
  manifest,
  delegation,
  options,
): "verified"
```

It:

1. verifies the complete hybrid root delegation;
2. requires role `package-manifest.sign`;
3. compares both supplied operational public-key byte fingerprints with the
   delegation;
4. rejects root or operational revocation;
5. rejects inactive or stale delegation state;
6. pins the manifest signer identity to the operational identity; and
7. verifies both manifest signature components with literal Boolean success.

No prose record, filename, truthy object, exception-swallowing adapter or
structural signature shape can authorize the manifest.

## File-backed builder flow

The builder performs this sequence for every manifest:

```text
parse strict supported fields
  -> structural/governance review gate
  -> resolve one canonical flat package
  -> validate artifact profile and file list
  -> recompute exact package digest
  -> compare digest with signed manifest hash
  -> verify root delegation and operational public fingerprints
  -> verify both package-manifest signatures
  -> construct unsigned registry-index/v2 entry
```

All entries must pass before `buildRegistryIndex` is called. Index signing
remains a later owner act.

The CLI requires explicit public authority inputs for a real build:

- signed delegation file;
- pinned root Ed25519 and ML-DSA-65 public files;
- exact root key ID;
- operational Ed25519 and ML-DSA-65 public files;
- verification instant;
- previous accepted delegation serial floor; and
- workspace packages root.

Disposable self-tests generate ephemeral root and operational keypairs and
exercise the same file-backed path.

## Live registry population

`@galerina/healthcare` has no canonical workspace package. Its live registry
stub is removed. No replacement package or healthcare compliance claim is
created.

`@galerina/auth` has one canonical flat workspace package. Engineering will:

1. run its declared build and tests;
2. audit its dependency, capability, effect, package-boundary and source
   surfaces with existing Galerina tools;
3. record the exact artifact file list and deterministic digest;
4. produce a technical-review report;
5. keep governance approval and the hybrid signature visibly absent until the
   owner performs those acts.

Technical verification is evidence for the owner. It is not itself
`governance.reviewed: true`. Before owner approval, the candidate remains
outside the live signable directory or remains terminally refused; it cannot
enter an index.

## Private-document convention

Every document classified as private uses this primary heading form:

```markdown
# Document Title - PRIVATE
```

`- PRIVATE` is the final text of the first H1. This marking is classification,
not custody: private documents still remain outside public repositories,
indexes, generated artifacts and logs. The convention will be recorded in
repository instructions and audited separately from this registry boundary.

## Verification

Focused evidence must prove:

- exact artifact bytes produce a stable digest on Windows path semantics;
- content, path, order, missing-file and traversal mutations refuse;
- duplicate flat package identities and nested/symlink package roots refuse;
- a merely non-empty or structurally hybrid signature refuses;
- missing either operational public half refuses;
- mismatched public fingerprints refuse;
- missing role, stale serial, inactive window and revocation refuse;
- a valid disposable root-to-operational-to-manifest chain admits;
- one bad package poisons a multi-package build;
- no refusal writes an index;
- the real auth candidate's hash re-derives from its declared file list; and
- no healthcare entry remains in the live tree or generated index.

After focused tests, run the app-kernel and registry package suites, the
private/path leak gates, package topology and package-boundary audits, graph
generation/check mode, the complete repository aggregate, strict phase-close,
exhaustive phase-close and all declared generator fixed-point checks.

## Completion boundary

Engineering is complete when the implementation, disposable chain,
content-addressed auth candidate, healthcare removal, documentation and all
repository-local gates are green on scoped local commits.

The production registry remains:

```text
OWNER-BLOCKED - VALID OFFLINE OPERATIONAL KEY,
ROOT DELEGATION, GOVERNANCE APPROVAL AND SIGNING REQUIRED
```

until the owner supplies exact public artifacts produced by the offline
ceremony. No key act is inferred from an approximate ID or from a file being
present.
