# Beta-v1 Release Evidence Signing Walkthrough

## What to do now

| State | Owner action now | Why |
|---|---|---|
| Cryptographic verifier and receipt derivation | None | Implemented and tested locally. |
| Existing offline root private material | Keep offline; do not reconnect or copy it to this computer | The ceremony is later and must not create another online private copy. |
| Dedicated beta release-evidence operational key | Do not generate it yet | Generate it offline only when the final unsigned evidence set and ceremony window are ready. |
| External platform and recovery evidence | Continue collecting through the platform runbooks | Controlled reboot and power-loss artefacts must exist before their durability statement can be derived and signed. |
| Beta-v1 release gate | Leave yellow / K3 `0` | The tracked policy deliberately names absent ceremony files and zero placeholder digests. Missing public evidence is indeterminate, not admitted. |

No signing command in the later section should be run now. This split is
intentional: implementation completion is not authority activation.

## Implemented trust path

The final verifier now requires:

1. the trusted offline root public bundle pinned by policy;
2. one root-signed, serial- and time-bounded delegation for exactly
   `durability-evidence.sign` and `repository-evidence.sign`;
3. a separate dedicated operational hybrid key;
4. both Ed25519 and ML-DSA-65 signatures on every receipt;
5. role-specific signature contexts;
6. closed in-toto-style durability and repository predicates;
7. independent re-hashing of the raw durability, implementation, checkpoint,
   controlled-reboot and controlled-power-loss artefacts;
8. the exact six-command repository fixed point with literal zero exit codes
   and stdout/stderr digests.

No `authenticated: true`, `PASS`, success counter or caller Boolean can create
authority. Missing ceremony output returns K3 `0`; malformed, forged, expired,
revoked, downgraded or contradictory evidence refuses.

## Later offline ceremony

Perform this only after the unsigned durability and repository statements are
final and all evidence paths have been independently reviewed.

### Required offline inputs

- the offline root environment for the trusted root key ID
  `21415420b447e219`;
- a newly generated, dedicated hybrid operational key environment;
- the exact unsigned delegation base;
- both operational public-key files;
- the exact unsigned durability and repository statements;
- a clean copy of this repository at the target commit;
- two verified custody destinations for the new operational private key.

The full root ID is shown because the command must select one exact authority;
it is public key metadata, not private material.

### 1. Inspect the dedicated operational environment

```powershell
$env:GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH = "<offline-operational-environment>"
try {
  node scripts/release-evidence-authority-cli.mjs inspect-environment `
    --operational-key-id <operational-key-id>
  if ($LASTEXITCODE -ne 0) { throw "STOP: operational structure check refused." }
}
finally {
  Remove-Item Env:GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}
```

Expected output contains `STRUCTURE OK` and never prints private values.

### 2. Root-sign the exact delegation

The unsigned delegation must use schema
`galerina.release-evidence.delegation.v1`, release `beta-v1`, a monotone
serial, a bounded validity window, the exact root and operational IDs, the
SHA-256 fingerprints of both operational public keys, and only the two roles
listed above.

```powershell
$env:GALERINA_RELEASE_EVIDENCE_ROOT_SIGNING_ENV_PATH = "<offline-root-environment>"
try {
  node scripts/release-evidence-authority-cli.mjs sign-delegation `
    --input <unsigned-delegation-json> `
    --output <new-signed-delegation-json> `
    --root-key-id 21415420b447e219 `
    --operational-ed25519-public <operational-ed25519-public-pem> `
    --operational-mldsa65-public <operational-mldsa65-public-b64>
  if ($LASTEXITCODE -ne 0) { throw "STOP: release-evidence delegation signing refused." }
}
finally {
  Remove-Item Env:GALERINA_RELEASE_EVIDENCE_ROOT_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}
```

The command recomputes both operational public-key fingerprints, verifies the
exact role set, signs under the release-evidence delegation context and
self-verifies both signature components.

### 3. Sign each closed statement with the operational key

```powershell
$env:GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH = "<offline-operational-environment>"
try {
  node scripts/release-evidence-authority-cli.mjs sign-statement `
    --role durability `
    --input <unsigned-durability-statement-json> `
    --output <new-durability-envelope-json> `
    --operational-key-id <operational-key-id>
  if ($LASTEXITCODE -ne 0) { throw "STOP: durability signing refused." }

  node scripts/release-evidence-authority-cli.mjs sign-statement `
    --role repository `
    --input <unsigned-repository-statement-json> `
    --output <new-repository-envelope-json> `
    --operational-key-id <operational-key-id>
  if ($LASTEXITCODE -ne 0) { throw "STOP: repository signing refused." }
}
finally {
  Remove-Item Env:GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}
```

Each output is created exclusively and both signature components are
self-verified before success is printed.

### 4. Return only public ceremony output

Return only:

- the two operational public-key files;
- the root-signed delegation;
- the hybrid-signed durability envelope(s);
- the hybrid-signed repository envelope;
- the raw public evidence files named by the durability policy.

Do not return either private environment. Verify two offline custody copies,
then remove any temporary ceremony working copy according to the custody
procedure.

### 5. Online admission after the ceremony

On the development computer, independently hash every returned public file,
replace only the matching zero placeholders in
`governance/beta-v1-platform-policy.json`, review the diff, commit the public
evidence, and run:

```powershell
node scripts/beta-v1-release-admission.mjs `
  --policy governance/beta-v1-platform-policy.json `
  --evidence-dir <public-evidence-directory>
```

`ADMITTED` is valid only from the clean, committed fixed point. Any missing
file stays K3 `0`; any signature, provenance, role, digest or predicate
disagreement refuses.
