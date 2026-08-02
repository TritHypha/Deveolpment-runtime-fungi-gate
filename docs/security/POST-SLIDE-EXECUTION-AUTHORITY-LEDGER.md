# Post-SLIDE execution-authority ledger

Status: schema v3 verifier implemented; production receipts not yet issued

This ledger separates useful migration evidence from evidence which may
authorize production execution. The separation is binding and fail closed. A
tracked, strict-clean, hash-pinned or reference-executable source is not thereby
production-authorized.

## Schema-v3 lanes

`candidates` is non-authorizing research and migration evidence. Each entry
binds one tracked package `.fungi` source to its canonical source digest,
decision-graph digest, bounded profile and tracked evidence digest. A valid
candidate remains counted among `unexecutedFungi`.

`fungiSources` contains only hybrid-signed production execution receipts.
Every entry binds the exact source, frontend receipt, decision graph, compiler,
GIR, SLIDE contract, target, policy, verifier, object, admission decision,
affine VOK lease, terminal receipt, platform evidence, release, repository
commit, serial and validity interval.

`hostBridges` contains only hybrid-signed ownership receipts for native and OS
boundaries. Every entry binds the boundary kind, least-authority and capability
policies, retain/replace disposition, replacement identity, target, platform,
isolation, cleanup and ownership evidence.

`verificationTime` is `null` while both production arrays are empty. Once a
production entry exists it must be one canonical ISO instant. That one instant
is used for delegation and receipt validity checks, preventing inconsistent
per-entry clocks. `minimumReceiptSerial` is a monotonic rollback floor; serials
must also be unique across both production lanes.

## Authority and verification

The production verifier is implemented in
`scripts/lib/post-slide-authority-receipts.mjs` and
`scripts/lib/post-slide-authority-ledger.mjs`, and is composed into the live
retirement graph. It reuses the dedicated beta-v1 release-evidence authority:

- the cold hybrid root delegates the repository-evidence role to a bounded
  operational public key;
- Ed25519 and ML-DSA-65 signatures must both verify under the exact role and
  domain-separated context;
- the current pinned revocation snapshot, delegation serial and validity
  window are checked;
- the authority policy and each receipt must bind the exact current repository
  commit;
- source, evidence bundle and canonical envelope bytes are independently read
  from tracked regular contained paths and re-hashed;
- exact in-toto Statement v1 shells and closed Galerina predicates are derived
  again rather than trusting claimed result fields;
- duplicate serials, accessors, proxies, surplus fields, path ambiguity,
  private material, copied evidence, wrong role, stale commit or one bad
  signature component refuse the entire production ledger.

The ledger is limited to 1 MiB and exact canonical UTF-8 JSON. Each source,
evidence bundle and envelope is separately limited to 16 MiB. Candidate source
identity uses canonical `UTF8_LF_V1` bytes so an admitted CRLF checkout has the
same source identity; signed production artifacts remain exact byte identities.

Failure grants no partial set and has no Wasm, Node, cache, driver or
reference-interpreter fallback. The verifier returns no executable handle; it
only proves whether the terminal retirement graph may count a specifically
signed source or boundary as admitted.

## Cryptographic replacement contract

The current `hybrid-ed25519-mldsa65` suite is routed through a versioned
executable suite dispatcher and mirrored in the governed crypto-suite register.
It is not embedded in `.fungi`, `.slide`, VOK or package semantics.

A later replacement follows an overlap migration:

1. add a new suite ID and independent verifier in `planned` state;
2. give a changed key/signature shape a new delegation and envelope schema;
3. cross-verify a hostile golden corpus and activate new signing explicitly;
4. rotate operational keys and reissue current production receipts;
5. set the old suite to `verify-only-retired`, blocking new signatures while
   retaining historical verification; and
6. remove the old implementation only after every retained artifact has been
   migrated or its retention period has ended.

Unknown, planned or schema-mismatched suites refuse. Relabelling an old
signature with a future suite ID does not enter the new verifier. This permits
cryptographic replacement without changing production application logic while
avoiding a silent downgrade or a flag-day loss of historical auditability.

## Current measured state

The cryptographic verifier implementation is green. Focused evidence is 5/5
for the predicate and hybrid-envelope layer plus 12/12 for the terminal
retirement gate. The tests include source/evidence mutation, forged ML-DSA-65,
surplus fields, path traversal, invalid time and plain text falsely presented
as production authority.

Production activation remains blue. The tracked ledger contains two exact
checked-decision candidates, zero signed production sources and zero signed
host boundaries. The beta-v1 operational release-evidence delegation/public
bundle is also deliberately absent pending the later offline ceremony.
Consequently the live audit still reports 110 unexecuted `.fungi` sources and
36 unowned host boundaries. Those are real admission work, not a missing
verifier and not exemptions.

Verification:

```powershell
node --test scripts/tests/post-slide-authority-receipts.test.mjs
npm.cmd run audit:retirement:selftest
node scripts/ts-retirement-graph.mjs --post-slide --check --json
```

The first two commands must pass. The third must remain non-zero until every
independently derived terminal debt reaches zero.
