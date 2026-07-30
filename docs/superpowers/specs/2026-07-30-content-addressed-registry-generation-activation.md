# Content-addressed registry generation activation

Date: 2026-07-30
Status: non-authorizing core implemented; admitted platform durability adapters and crash matrix pending
Policy: zero trust; verify rather than assume; fail closed

## Outcome

Operational-key rotation activates one complete registry generation, never a
sequence of independently replaced live files. A generation contains every
candidate-signed package manifest and the candidate-signed index. Its
canonical bytes determine its SHA-256 generation identity. The authenticated
rotation checkpoint names the exact accepted generation.

This construction does not assume that renaming several files is atomic. It
works by making the artifact set immutable and changing only authenticated
state after the complete generation is durable and verified.

## Invariants

1. A generation is non-empty, canonical, bounded and immutable.
2. Every manifest is hybrid-signed by the generation operational identity,
   has a canonical review time, contains only bounded package-relative
   artifact paths and cannot carry an install script.
3. Every index entry has one exact corresponding manifest and repeats its
   name, version, source hash, publisher, key identity, certification, risk,
   capabilities and effects.
4. The index is hybrid-signed by the same operational identity.
5. The root-signed delegation serial recorded by the generation is the exact
   admitted candidate delegation serial.
6. The generation ID is
   `sha256("galerina.registry.generation.v1\0" || canonical-generation-bytes)`.
7. A generation file is written and durably closed before any checkpoint may
   select it.
8. Production loading opens only the generation named by authenticated state,
   re-hashes it, re-verifies every signature and correspondence, and requires
   the active key epoch plus exact accepted delegation/index identity.
9. Canary failure keeps the old accepted generation and restores the old key
   epoch. Candidate files remain immutable evidence but grant no authority.
10. Old generations are not automatically deleted. Historical verification
    and rollback evidence remain available.

## Generation schema

```text
RegistryGenerationV1 {
  schema: "galerina-registry-generation/v1"
  delegationSerial: positive integer
  operationalKeyId: 16 lowercase hexadecimal characters
  manifests: non-empty sorted RegistryPackageManifest[]
  index: RegistryIndexV2
}
```

`generationId` is not stored inside the object it hashes. The filename is
`registry-generation-<generationId>.json`.

## Activation sequence

```text
root-admit candidate delegation
  -> re-sign and independently verify every package manifest
  -> build, sign and independently verify candidate index
  -> validate manifest/index one-to-one correspondence
  -> canonicalize and hash generation
  -> write immutable generation to a same-volume staging file
  -> flush file, close, re-open, re-hash
  -> publish content-addressed filename
  -> Triple-Lock and key switch
  -> canary reads the staged generation by exact ID
  -> clean canary updates authenticated accepted-generation state
  -> drain
  -> retire old private signing power
```

No target phase is caller-selectable. No incomplete or merely parsed
generation authorizes. An unavailable write, flush, verification, checkpoint,
canary, revocation source or custody operation yields INDETERMINATE/DENY and
exits without changing accepted authority.

## Crash recovery

| Crash point | Recovery |
|---|---|
| Before generation write completes | authenticated state still selects old generation; incomplete staging file is non-authorizing |
| After generation file is durable, before key switch | old generation remains accepted; complete candidate is inert |
| After key switch, before canary | checkpoint phase is `switched`; candidate may be probed but is not the accepted production generation |
| Canary failure | fallback restores old epoch; accepted generation never changed |
| After clean canary, before next phase | authenticated checkpoint selects candidate generation and exact candidate artifact identities |
| After drain, before private retirement | candidate stays active; old private key remains available and may be retired idempotently |
| During private retirement | retry the idempotent custody operation; verification keys and old generations are retained |

## Platform boundary

The pure generation builder/verifier is platform independent. Persistence is a
small host adapter. It must reject symlinks/reparse points, traversal,
non-regular files, unbounded content and changed-on-read bytes. Windows,
Linux and macOS adapters may use different flush primitives, but none may
weaken the write-before-checkpoint invariant.

The present generic callback can produce only a host-evidence receipt. No
platform-adapter digest is admitted for production, so this callback cannot
advance authenticated authority even when it returns `true`. The researched
platform requirements and admission evidence are recorded in
`docs/architecture/registry-generation-platform-durability-2026-07-30.md`.

The offline root is not part of this adapter. It authorizes a bounded
candidate delegation manually; automatic operational rotation cannot mint,
rotate or use the root private key.

## Test obligation

- real disposable Ed25519 + ML-DSA-65 signing and verification;
- mixed signer, missing manifest, duplicate package, field mismatch, stale
  index, substituted delegation, malformed canonical data and content-hash
  mutation all refuse;
- crash simulation at every sequence boundary;
- short write, disk full, access denied, existing-different generation,
  symlink/reparse point, file replacement, changed-on-read and flush failure
  all keep the prior accepted generation;
- Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS platform evidence before
  production claim;
- no owner key is used by automated tests.
