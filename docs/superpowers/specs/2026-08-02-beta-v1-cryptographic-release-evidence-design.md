# Beta-v1 cryptographic release evidence design

**Status:** owner-approved for implementation on 2026-08-02

## Purpose

The beta-v1 release verifier currently accepts durability and repository
records whose schemas contain an `authenticated: true` field. A digest-pinned
JSON claim is tamper-evident after policy publication, but the Boolean does not
prove who produced the evidence, which role they held, or whether the receipt
belongs to the admitted repository and evidence chain.

Beta-v1 admission will instead require cryptographically authenticated,
provenance-bound receipts. The final verifier validates both signature
components and independently re-derives every admitted subject, role, digest,
time window and evidence relationship. It never treats an authentication,
success or production-authority Boolean as evidence.

## Selected architecture

Galerina will use a dedicated offline-root delegation and an in-toto-style
statement/envelope split:

```text
offline Galerina root
    |
    | hybrid-signed, role-limited, expiring delegation
    v
dedicated beta release-evidence signer
    |
    +-- durability-evidence.sign
    |       -> signed durability statement
    |
    +-- repository-evidence.sign
            -> signed repository fixed-point statement

tracked beta policy + root public bundle + operational public bundle
    -> verify delegation
    -> verify both receipt signatures
    -> re-derive statement and predicate semantics
    -> compose exact platform matrix
    -> K3 +1 only for the complete admitted set
```

This follows the in-toto Attestation Framework separation of subject,
predicate, statement and authenticated envelope, while retaining
Galerina-specific closed predicates and hybrid cryptography. It does not add a
network or transparency-log dependency. Primary references are:

- NIST FIPS 204, Module-Lattice-Based Digital Signature Standard:
  <https://csrc.nist.gov/pubs/fips/204/final>
- in-toto Attestation Framework:
  <https://github.com/in-toto/attestation/blob/main/spec/README.md>
- SLSA provenance model:
  <https://slsa.dev/spec/v1.0/provenance>

## Rejected alternatives

1. **Add signature strings to the existing receipts.** This authenticates the
   original Boolean-heavy records but preserves ambiguous subject and
   provenance semantics.
2. **Use only a network-backed keyless/transparency service.** This is useful
   supplementary evidence, but it cannot be the only authority for offline,
   closed-network and 20-year compatibility requirements.
3. **Reuse the registry operational key.** Its current root delegation
   authorizes package-manifest and registry-index signing only. Silently
   widening it would violate least authority and role separation.

## Cryptographic authority

The existing offline Galerina root may authorize one new operational public
bundle through a new delegation domain. The operational key must be a
dedicated `hybrid-ed25519-mldsa65` key; both Ed25519 and ML-DSA-65 signatures
must verify. Neither half is sufficient by itself.

The delegation binds:

- schema and release identity;
- monotone delegation serial;
- issued-at, not-before and not-after instants;
- root and operational key IDs;
- SHA-256 fingerprints of both operational public keys;
- the exact sorted role set;
- the root-signature context.

The admitted roles are exactly:

- `durability-evidence.sign`;
- `repository-evidence.sign`.

Role-specific contexts are:

- `galerina.release.evidence.delegation.sig.v1`;
- `galerina.release.evidence.durability.sig.v1`;
- `galerina.release.evidence.repository.sig.v1`.

The verifier requires a configured minimum delegation serial, current
authority window and revocation callback. Unknown key, missing key, expired
delegation, role widening, one valid signature half, public-key substitution
and rollback all refuse.

## Canonical envelope

Every receipt uses the exact envelope:

```text
galerina.release-evidence.envelope.v1
  statement   in-toto Statement/v1 subset
  signature   exact hybrid signature record
```

Canonical values admit only JSON null, Boolean, NFC strings, safe integers,
arrays and ordinary records with own data properties. Floating point, sparse
arrays, accessors, proxies, inherited fields, duplicate JSON keys,
non-canonical UTF-8 and surplus fields refuse. Object keys use deterministic
UTF-16 code-unit order. Signature preimages contain the role-specific domain,
a zero separator and the canonical statement bytes.

The statement has:

- `_type = https://in-toto.io/Statement/v1`;
- exactly one subject with an exact SHA-256 digest;
- one Galerina predicate type;
- one closed predicate.

## Durability predicate

`https://galerina.dev/attestation/registry-durability/v1` binds:

- exact operating-system and platform profile;
- exact repository commit;
- raw evidence-bundle SHA-256;
- native implementation SHA-256;
- accepted checkpoint SHA-256;
- controlled-reboot result SHA-256;
- controlled-power-loss result SHA-256;
- `PRODUCTION_ADMISSION` evidence class.

Its statement subject digest equals the raw evidence-bundle digest. There is
no positive authentication or production-authority Boolean. A receipt cannot
be created from the process-termination-only Ubuntu evidence; the two
controlled recovery digests are mandatory.

## Repository predicate

`https://galerina.dev/attestation/repository-fixed-point/v1` binds:

- exact repository commit;
- exact deterministic tracked-source tree SHA-256;
- an exact ordered check set;
- for each check: closed ID, exact command vector, exit code `0`, stdout
  SHA-256 and stderr SHA-256;
- zero skipped or missing checks by construction.

The required check IDs are `phase-close`, `phase-close-exhaustive`,
`graph-all`, `generator-contract`, `release-build` and
`security-scan`. The final verifier compares every command vector with its
compiled policy; a signature over a different command does not satisfy the
gate.

The statement subject digest equals the tracked-source tree digest. Success is
derived from the complete exact check set and six literal zero exit codes, not
from `phaseClose: "PASS"` or similar claims.

## Beta-v1 verifier behavior

The tracked beta policy gains a release-evidence authority block and pins:

- expected root key ID and public-key filenames;
- minimum delegation serial;
- delegation filename;
- operational public-key filenames;
- evidence receipt filenames and SHA-256 values.

The verifier reads policy, delegation, public keys and evidence by stable
direct handles under bounded sizes. It re-opens no path after validation and
does not invoke a shell, network service or callback.

Outcomes:

- missing external evidence, missing unsigned ceremony output or an authority
  not yet activated -> K3 `0`, `INCOMPLETE_EXTERNAL_EVIDENCE`;
- malformed, contradictory, forged, expired, revoked, substituted or
  downgraded evidence -> K3 `-1` refusal;
- complete seven-OS functional evidence plus the policy minimum of signed
  durability predicates and one signed repository predicate -> K3 `+1`
  `ADMITTED`.

The result remains a release decision, not a reusable signing capability.

## Ceremony and private material

Implementation and tests use disposable test keys only. No production private
key is generated, read or committed during this slice.

The later offline ceremony will:

1. generate a dedicated hybrid operational evidence key offline;
2. export both public halves;
3. root-sign the exact delegation;
4. sign the derived durability and repository statements under their distinct
   roles;
5. return only public keys, delegation and signed envelopes;
6. remove all private material from the online development computer.

The signing CLI reads a private environment as data, never sources it, never
prints private values and refuses duplicate/malformed fields. It cannot sign a
statement whose predicate role or release identity differs from the selected
command.

## Testing and completion boundary

Tests must first fail because the cryptographic verifier does not exist. The
focused corpus covers:

- both valid signature halves;
- each single-half mutation and deletion;
- wrong context, role, key, fingerprint, serial and time window;
- delegation and receipt replay;
- semantically forged statements with recomputed self-digests;
- subject/predicate digest disagreement;
- incomplete and reordered repository check sets;
- nonzero or missing checks;
- durability without reboot or power-loss evidence;
- accessor, proxy, duplicate-key, hard-link and path-substitution inputs.

Implementation completion means these checks and the existing beta admission
suite pass. It does not mean production release admission is green. That
requires the later offline ceremony and the named external platform receipts.

