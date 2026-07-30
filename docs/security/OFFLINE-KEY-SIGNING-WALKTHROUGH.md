# Galerina offline registry-index signing walkthrough

**Status on 2026-07-30: NOT READY FOR THE OWNER SIGNING ACT.**

The root-to-operational delegation implementation and disposable-key dry run
are green. The live registry is still not signable because its two entries are
unreviewed, content-less stubs. The real operational public bundle and
root-signed delegation record do not yet exist in the public repository. Do
not substitute the cold trust root for routine registry signing merely to
remove that blocker.

This procedure is for the owner/trust custodian. An automated agent may build
and test the tooling, but must never read, copy, source, print, or use private
key values.

## 0. Exact keys — no substitutions

These identifiers and filenames are the owner-recorded metadata. This document
does not contain either private value.

| Purpose | Exact key ID | Exact private filename | What it may sign |
|---|---|---|---|
| Offline registry trust root | `21415420b447e219` | `galerina-signing-key-21415420b447e219.env` | The operational registry delegation only |
| Operational hybrid registry signer | `942d6b2726b0a991` | `.env.galerina-signing-942d6b2726b0a991` | Reviewed package manifests and the registry index |

The tracked public verifier for the root is
`governance/signing-key-21415420b447e219.pub.pem`.

The following files are **not** selected:

- `galerina-signing-key-cd01346961d88e94.env` — superseded development key;
- `.env.galerina-signing-0091172baff1b6b0` — oldest stale/disposable key.

The ceremony tools compare the requested key ID with
`GALERINA_SIGNING_KEY_ID` inside the private file and refuse a mismatch. A
filename match alone is not authority.

The signing chain is:

```text
21415420b447e219 (offline root)
  └─ signs one time-bounded delegation for 942d6b2726b0a991
       ├─ signs reviewed package manifests
       └─ signs galerina-registry-index/v2
```

Never point `registry-index-cli.mjs` at the root file. Never use the
operational file to sign its own delegation.

## 1. What is being signed

New indexes use `galerina-registry-index/v2` and a Galerina dual-signature
application envelope:

| Property | Required value |
|---|---|
| Classical component | Ed25519 |
| Post-quantum component | ML-DSA-65 (FIPS 204) |
| Canonical form | JCS / RFC 8785 |
| Domain | `galerina.registry.index.sig.v2` |
| Signed preimage | domain, suite, authority key id, canon tag, and canonical unsigned index, separated by NUL bytes |
| Admission rule | both signatures must verify (logical AND) |

This is not an implementation of the still-draft IETF Composite ML-DSA
encoding. Both signatures are explicit fields in a Galerina application
envelope. The ML-DSA call also receives the domain as its FIPS 204 context.
The authority key id and pinned suite metadata are signed facts, not only
unsigned verifier-selection hints.

The historical `galerina-registry-index/v1` Ed25519 verifier remains for old
artifacts. It is verify-only: the normal builder emits v2, the legacy signer
refuses v2, and no missing-PQ or algorithm-downgrade path is accepted.

Primary references:

- NIST FIPS 204, final 2024-08-13, with a minor-errata note posted in 2026:
  <https://csrc.nist.gov/pubs/fips/204/final>
- RFC 8032, Ed25519:
  <https://www.rfc-editor.org/info/rfc8032/>
- RFC 9958, engineering guidance for post-quantum migration:
  <https://www.rfc-editor.org/rfc/rfc9958.html>
- RFC 9964, ML-DSA identifiers and formats for JOSE/COSE:
  <https://www.rfc-editor.org/info/rfc9964/>
- IETF Composite ML-DSA draft, not a final standard:
  <https://datatracker.ietf.org/doc/html/draft-ietf-lamps-pq-composite-sigs>
- NIST CSWP 39upd1, crypto-agility guidance:
  <https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final>

## 2. Current readiness ledger

| Gate | Current evidence | State |
|---|---|---|
| v2 hybrid app-kernel envelope and authority chain | 145/145 app-kernel tests; 18/18 new focused authority/manifest tests | ready |
| Hermetic signer/admission self-test | 20/20, real Ed25519 + ML-DSA-65 | ready |
| Root-to-operational delegation decider | time, role, fingerprint, revocation and rollback checks | ready |
| Authority ceremony CLI | 9/9 disposable-key checks | ready |
| File-backed sign then public-key verify | disposable ceremony fixture | ready |
| Missing/tampered/downgraded signature refusal | tested | ready |
| Signed revocation-registry check before key use | tested, including known-revoked refusal | ready |
| Live registry manifests | two `sha256:pending`, unsigned, `reviewed: false` stubs | **blocked** |
| Reviewable package bytes | absent for both stubs | **blocked** |
| Operational registry authority | exact key selected; public bundle not yet exported | **owner-blocked** |
| Root-signed operational delegation format and verifier | implemented; real delegation not yet signed | **owner-blocked** |
| Real owner signing act | deliberately not performed | **owner-blocked** |

The dry run proves the mechanism. It does not convert placeholder package
claims into facts.

## 3. Non-negotiable custody rules

1. Keep private material outside every repository, including gitignored
   locations. Gitignore is a backstop, not custody.
2. Use a full-disk-encrypted, offline signing machine. Disable networking
   before private material is mounted.
3. Use a dedicated operational hybrid key for registry indexes. The cold root
   should authorize that key and return to offline storage.
4. Maintain at least two encrypted offline custody copies in separate physical
   locations. Verify each copy is readable before destroying a working copy.
5. Commit only public halves, identifiers, delegation/revocation records, and
   signed public artifacts.
6. Never paste a private value into a shell command, terminal transcript,
   issue, commit message, chat, or build log.
7. A revoked key is terminally denied even if its cryptographic signature is
   valid.
8. Keep old public keys and old verifiers for historical validation. Rotation
   stops new signing; it does not erase history.

On Windows, restrict the private file ACL to the owner and use an encrypted
volume. `cipher /w:` cannot guarantee physical SSD erasure because of
wear-levelling. On Linux/macOS, use owner-only permissions and encrypted media;
filesystem deletion alone is not proof of SSD erasure.

## 4. Engineering gates before the owner is called

All of the following must be true at one reviewed commit:

- Every registry entry points to real, immutable package bytes.
- `hash` is `sha256:` plus the digest computed from those exact bytes.
- The package manifest signature is real and independently verified.
- `governance.reviewed` is exactly `true`; `reviewedBy` and `reviewedAt` are
  present and correspond to a recorded review.
- Capabilities, effects, publisher, package key id, certification level, and
  risk rating are reviewed facts.
- No install script is present.
- The live tree passes the unsigned build gate. One bad entry must poison the
  whole signing act; entries are never skipped.
- A dedicated operational registry key has both public halves in the public
  authority inventory.
- The cold root has authorized that operational key through a format the
  runtime actually verifies. A prose statement is not delegation.
- The operational key is absent from the trusted revocation ledger.
- The last accepted `issuedAt` floor is recorded and the new timestamp is
  strictly newer.

The current `@galerina/auth` and `@galerina/healthcare` files fail the first
five gates. They must be replaced by manifests for real packages or removed;
editing `sha256:pending` by hand is not a remedy.

## 5. Owner preflight on the offline machine

Use placeholders; do not put private values in commands.

```powershell
Set-Location <clean-galerina-checkout>
git status --short
git rev-parse HEAD
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel test
npm.cmd --prefix packages-galerina/galerina-registry test
node scripts/registry-index-cli.mjs --self-test
node scripts/registry-index-cli.mjs build `
  --registry-dir packages-galerina/galerina-registry/packages `
  --issued-at <strictly-newer-utc-iso> `
  --out <offline-staging>/unsigned-index.json
```

The final command must currently refuse. When it eventually succeeds, inspect
the unsigned index and reconcile every entry against the reviewed package
record before exposing any private key.

Confirm the private-key directory is not a repository:

```powershell
Set-Location <offline-key-directory>
git rev-parse --show-toplevel
```

That command must fail with “not a git repository”.

Confirm the public halves and authority records are the reviewed bytes. Record
their SHA-256 digests in the offline ceremony log. The log contains public
pins only.

### 5.1 Exact authority-delegation procedure

**Do not run this yet.** It is documented now so the owner knows exactly which
file will be requested when the live-package gates become green.

First use the operational file
`.env.galerina-signing-942d6b2726b0a991` to export public material only:

```powershell
$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = "<offline-key-directory>\.env.galerina-signing-942d6b2726b0a991"

node scripts/registry-authority-cli.mjs export-public `
  --operational-key-id 942d6b2726b0a991 `
  --ed25519-out <offline-staging>\signing-key-942d6b2726b0a991.pub.pem `
  --mldsa65-out <offline-staging>\signing-key-942d6b2726b0a991.mldsa.pub.b64

Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH
```

Inspect and record the SHA-256 hashes of both public files. Then create the
unsigned delegation draft. Serial `1` is correct only if no earlier accepted
delegation exists; otherwise use a value strictly greater than the recorded
serial floor.

```powershell
node scripts/registry-authority-cli.mjs draft `
  --root-key-id 21415420b447e219 `
  --operational-key-id 942d6b2726b0a991 `
  --ed25519-pubkey <offline-staging>\signing-key-942d6b2726b0a991.pub.pem `
  --mldsa65-pubkey <offline-staging>\signing-key-942d6b2726b0a991.mldsa.pub.b64 `
  --serial <strictly-newer-positive-integer> `
  --issued-at <canonical-utc-iso-with-milliseconds> `
  --not-before <canonical-utc-iso-with-milliseconds> `
  --not-after <canonical-utc-iso-with-milliseconds> `
  --out <offline-staging>\registry-delegation-v1.unsigned.json
```

Review the draft. It must name only the roles `package-manifest.sign` and
`registry-index.sign`. It must pin both public-key fingerprints.

Only now mount the offline root file
`galerina-signing-key-21415420b447e219.env`. The root signs the delegation and
nothing else:

```powershell
$env:GALERINA_ROOT_SIGNING_ENV_PATH = "<offline-key-directory>\galerina-signing-key-21415420b447e219.env"

node scripts/registry-authority-cli.mjs sign `
  --in <offline-staging>\registry-delegation-v1.unsigned.json `
  --out <offline-staging>\registry-delegation-v1.json `
  --root-key-id 21415420b447e219

Remove-Item Env:GALERINA_ROOT_SIGNING_ENV_PATH
```

Unmount the root material before restoring network access. Independently
verify the public delegation against the tracked root verifier:

```powershell
node scripts/registry-authority-cli.mjs verify `
  --in <offline-staging>\registry-delegation-v1.json `
  --root-pubkey governance\signing-key-21415420b447e219.pub.pem `
  --root-key-id 21415420b447e219 `
  --at <instant-inside-the-delegation-window> `
  --min-serial <previous-accepted-serial>
```

Any ID mismatch, public-key fingerprint mismatch, invalid window, stale serial,
revocation, tamper, missing role, or non-literal verifier success is a terminal
refusal.

## 6. Signing act

Do this only after every gate in section 4 is green and the project report says
`READY FOR OWNER SIGNING`.

The private input is the hybrid `.env.galerina-signing` produced by
`galerina keygen --hybrid`. The CLI accepts its path; it does not source it and
does not print its values.

```powershell
Set-Location <clean-galerina-checkout>
$env:GALERINA_SIGNING_KEY_ID = "942d6b2726b0a991"
$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = "<offline-key-directory>\.env.galerina-signing-942d6b2726b0a991"

node scripts/registry-index-cli.mjs sign `
  --registry-dir packages-galerina/galerina-registry/packages `
  --registry "https://registry.galerina.dev" `
  --issued-at <strictly-newer-utc-iso> `
  --out <offline-staging>/registry-index-v2.json

Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH
Remove-Item Env:GALERINA_SIGNING_KEY_ID
```

The tool:

1. rebuilds from reviewed manifests rather than signing an arbitrary file;
2. validates the signed revocation registry and checks the key id before
   loading private material;
3. requires both private halves and the pinned algorithm;
4. signs the domain-separated canonical preimage;
5. derives both public halves and verifies both signatures;
6. writes only after successful self-verification.

There is no `--force` or Ed25519-only production mode.

## 7. Independent public verification

Move only the signed index and public artifacts to a separate verification
environment. Do not move private material.

```powershell
node scripts/registry-index-cli.mjs verify `
  --in <public-staging>/registry-index-v2.json `
  --ed25519-pubkey <public-authority>/signing-key-<id>.pub.pem `
  --mldsa65-pubkey <public-authority>/signing-key-<id>.mldsa.pub.b64 `
  --key-id <reviewed-operational-registry-key-id> `
  --min-issued-at <previous-accepted-issued-at>

Get-FileHash <public-staging>/registry-index-v2.json -Algorithm SHA256
```

Record:

- source commit;
- schema, registry id, entry count, and `issuedAt`;
- operational key id;
- both public-key SHA-256 pins;
- signed-index SHA-256 pin;
- reviewer identities and review record references;
- independent verification result.

Before publication, deliberately test a copy with one entry changed, each
signature half changed or removed, the context changed, and the algorithm
downgraded. Every case must refuse. Never mutate the candidate that will be
published.

## 8. Public artifacts returned to the repository

Only these classes of data return:

- `registry-index-v2.json`;
- Ed25519 public half;
- ML-DSA-65 public half;
- root-authorized operational delegation record;
- append-only revocation/rotation records;
- ceremony evidence containing identifiers and public hashes, never secrets.

Before committing, run the private-material and path-leak gates. Review the
staged diff byte by byte. A public artifact must not contain a private field,
offline local path, environment dump, or terminal transcript.

## 9. Rotation, revocation, rollback, and incident response

**Routine rotation:** mint a new operational hybrid key offline; root-authorize
it; publish both public halves; overlap verification; sign a strictly newer
index; then mark the prior operational key verify-only/retired for new
production acts. Keep its public material.

**Suspected compromise:** stop publication; append a revocation; distribute the
revocation state through the pinned trust path; mint and authorize a new key;
re-review and re-sign the current index. A valid signature by a revoked key is
still denied.

**Lost private key:** do not fabricate continuity. Revoke/retire the lost key,
mint and authorize a replacement, and sign a new index. Historical artifacts
remain verifiable through the old public key.

**Bad index publication:** retain the last known-good index, but never lower
the accepted `issuedAt` floor or trust requirements. Publish a corrected,
strictly newer index. “Rollback” means restoring service from known-good facts,
not accepting an older or weaker trust state.

**Broken root/delegation path:** stop. Do not use an unanchored operational key
and do not touch the cold root until the authority format and recovery plan are
reviewed.

## 10. Exact notification threshold

Tell the owner **“READY FOR OWNER SIGNING”** only when:

- real package bytes and reviewed manifests exist;
- the unsigned live-index build succeeds without exceptions;
- operational key delegation is implemented and independently verified;
- all disposable-key positive, tamper, downgrade, rollback, and revocation
  tests pass;
- public artifact paths and the previous `issuedAt` floor are recorded;
- the source commit is clean and all terminal project gates are green.

Until then, report **“NOT READY”** with the failing gates. On 2026-07-29 the
correct report is **NOT READY**.
