# `@galerina/auth` package technical review

**Evidence date:** 2026-07-30

**Package version:** `1.0.0-beta.2`
**Decision:** technically reviewed and owner-approved candidate; not signed,
certified or live.

## Outcome

The canonical direct package `packages-galerina/galerina-auth` is a valid
candidate for a future owner governance act. Its declared source artifact is:

```text
profile:     galerina-flat-package-tree/v1
file count:  18
byte count:  63,281
digest:      sha256:56f8f08d7d37efa8936b5871582dcab900e7223e69be32361f1ab4dfc4eaee86
```

The candidate manifest is outside the live signable tree at
`packages-galerina/galerina-registry/candidates/@galerina/auth/`.
Its owner governance record now names `galerina-owner-governance`, approval
instant `2026-07-30T15:45:00.000Z`, publisher
`galerina-owner-governance`, and expected operational key
`f31…`. Its signer identity and signature remain null. The live
registry is empty and therefore terminally refuses index construction.

The former healthcare manifest was removed. There is no canonical healthcare
package, so retaining that stub would have asserted an identity and compliance
surface that does not exist.

## Artifact boundary

The digest covers the tracked licence, README, package lock and descriptor,
seven TypeScript source files, six executable test files, and `tsconfig.json`.
Generated `.graph` material, `dist/`, `node_modules/`, timestamps, ACLs and
checkout paths are excluded.

This boundary keeps the audited source, declared dependency closure and tests
content-addressed while allowing derived graph/build output to be regenerated
and independently checked.

## Declared powers

The candidate declares only:

```yaml
capabilities:
  - "clock.read"
  - "crypto.verify"
effects:
  - "clock.read"
  - "crypto.verify"
```

The bearer factor verifies HMAC, RSA and EdDSA tokens through the host crypto
primitive and uses an injected clock, with `Date.now()` only as its explicit
default. The channel factor consumes already-produced certificate validation
facts; it does not perform network access or TLS itself.

The reviewed source does not fetch data, read a secret store, write an audit
sink or open an outbound connection. Keys and headers are caller-supplied
values. Therefore the removed placeholder declarations `secret.read`,
`audit.write` and `network.outbound` were not retained.

## Security behavior reviewed

- Authentication factors return K3 verdicts; they do not bypass the
  app-kernel's final fail-closed admission collapse.
- Missing evidence is indeterminate and therefore cannot authorize.
- A present invalid bearer token denies.
- JWT algorithms are caller-pinned; `alg:none`, algorithm confusion, key-type
  mismatch and unsupported algorithms deny.
- Expiry is required by default; expiry, not-before, issuer and audience facts
  are checked.
- HMAC comparison is length-guarded and constant-time.
- Parsing, crypto and configuration errors collapse to denial without leaking
  an exception into authorization.
- Scope checks are exact and case-sensitive.
- Revocation unknown is indeterminate, never allow.

This review does not claim that every future vulnerability is absent. Any
source, dependency, declared-power or package-metadata change changes the
artifact digest and requires a new review and signature.

## Fresh executable evidence

| Command | Result |
|---|---|
| `npm.cmd --prefix packages-galerina/galerina-auth test` | **59/59 pass**, typecheck and build green |
| `node scripts/audit-flat-package-topology.mjs` | green pre-SLIDE ratchet; 99 canonical identities |
| `node scripts/audit-package-border.mjs` | **98/98 packages pass** |
| `node scripts/audit-node-dependencies.mjs` | external floor clean; two non-fatal build-tool version drifts remain repository-wide |
| `node scripts/audit-license-compat.mjs` | **0 violations** across 99 first-party packages |
| `node scripts/audit-effect-canonicality.mjs` | **0 blocking findings** |
| `node scripts/audit-import-governance.mjs` | 511 `.fungi` files parsed; plugin grants complete |
| `node scripts/audit-private-doc-leak.mjs` | **0 violations** |
| `node scripts/audit-path-leak.mjs` | **0 violations** |
| `npm.cmd --prefix packages-galerina/galerina-registry test` | **35/35 pass**, including candidate hash re-derivation, owner-approved-but-unsigned isolation, disposable manifest signing, and future-review refusal |

The flat-topology tool still reports 95 pre-SLIDE package-local
`node_modules` trees and one explicitly deferred nested native package. Those
are declared post-executable-SLIDE migration debt; they are not hidden by this
candidate review.

## Authority still required

Moving this manifest live still requires all of the following acts:

1. hybrid-sign the prepared active root delegation for the already-custodied
   operational key;
2. independently verify both root signature components and public-key pins;
3. hybrid-sign the complete owner-approved manifest;
4. independently verify both manifest signature components; and
5. only then move the manifest into the live `packages/` tree.

No private key is needed for repository-local builds or tests, and none was
read to produce this report.
