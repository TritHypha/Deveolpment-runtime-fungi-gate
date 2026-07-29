# @galerina/registry — Certified Package Registry

The Galerina certified package registry is the canonical source of governance-reviewed,
cryptographically-signed packages for the Galerina platform.

> **⚠️ Empty certified registry.** The two package manifests are declarative,
> unreviewed stubs with no package bytes behind them. The registry-index builder,
> hybrid signer, verifier, revocation check, and denial tests are implemented,
> but deliberately refuse these stubs. Do not treat either entry as a package or
> a certification claim.

## Concept

Every package in this registry has been reviewed against the Galerina governance rules:

- All declared capabilities have been audited and approved.
- Each package manifest includes a `sha256:` content-addressable hash.
- Packages are signed by the Galerina governance authority.
- Install scripts are prohibited (FUNGI-PKG-004).
- Untrusted registries are rejected (FUNGI-PKG-002).

## Structure

```
packages/
  @galerina/
    auth/
      package.galerina.yaml     # certified auth package manifest
    healthcare/
      package.galerina.yaml     # certified healthcare package manifest
```

## Adding a Package

1. Create a `package.galerina.yaml` manifest under `packages/<scope>/<name>/`.
2. Declare capabilities, effects, and targets explicitly.
3. Run `galerina package hash` to generate the content hash.
4. Submit a pull request for governance review.
5. Once approved, the governance authority signs the manifest.

## Diagnostic Codes

| Code          | Meaning                                              |
|---------------|------------------------------------------------------|
| FUNGI-PKG-001   | Package declares new capabilities not in lockfile    |
| FUNGI-PKG-002   | Package from unregistered or unverified registry     |
| FUNGI-PKG-003   | Package has no content-addressable hash              |
| FUNGI-PKG-004   | Package declares an install script (denied)          |
| FUNGI-PKG-005   | Package has no cryptographic signature               |

## Status

The registry mechanism is implemented and fail-closed. Package population is
blocked on real immutable package bytes, content hashes, package signatures,
governance review, and the operational registry-authority delegation described
in
[`docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md`](../../docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md).
