# Slices 898-947 Tower Verifier, Snapshot and Substrate Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
> Root is the sole writer, tester and committer; workers are read-only.

**Goal:** Account for the next 50 unique TypeScript conversion scopes in exact
source order after Slice 897 without duplicating earlier verifier or substrate
credits and without manufacturing physical or retirement authority.

**Architecture:** Finish the registry public-verifier factory, exhaust the
snapshot key provider, exhaust substrate erasure including its two named local
authority closures, then enter the substrate model through the `NoisyLane`
class boundary. Every scope receives a durable classification,
blocker-specific exit, hostile vectors and exact evidence before owner
publication and dual-index closure.

**Tech Stack:** TypeScript/Node.js source evidence, Galerina Fungi/GIR/SLIDE/VOK
admission rules, Myco, codebase-memory, node:test and registered owner tools.

## Global Constraints

- Source build point is `754882b91418790143c656e07b6354f7e54bfdfd`,
  independently indexed by full codebase-memory at **61,109 nodes / 147,763
  edges** and refreshed by Myco at **6,512 files / 84,167 terms**. This plan
  commit makes later graph freshness `UNKNOWN` until the Slice-947 refresh.
- Use codebase-memory first, bounded Myco second and exact reads last.
- Retain Slices 894-897 for the earlier public-verifier declarations/constants;
  do not renumber or re-credit them. Retain prior Slice-91 credit for
  `substrate-model.ts#effectiveVerdict` when the later frontier reaches it.
- Credit named, independently indexed local functions (`at`, `reject`) as
  distinct qualified scopes; anonymous returned closures remain within their
  containing function.
- Treat active JavaScript records, callbacks, arrays, WeakSet state,
  JSON/locale canonicalization, Node crypto, Buffer/TypedArray views, errors,
  binary64 numbers and K3 authority as observable.
- Loaded Fungi assets are adjacent evidence unless exact source ingress, GIR,
  physical `.slide`, independent re-admission and VOK are all bound.
- Private Fungi skills remain private and unpushed. Never push repository
  commits. Repository-wide conversion closure remains `UNKNOWN`.

---

## Pinned sources and focused evidence

- `registry-public-verifier.ts` SHA-256
  `EEF7F4B87AB0216AAC588F7880E616537BC29B1CAED9E6CD7C87F39EA11BC1AC`;
  `registry-public-verifier.test.mjs`
  `970B961C3B9631B578A7E2EE5D9152F67036E5452A2A55E105BE79FFC1F37BC7`.
- `snapshot-key-provider.ts`
  `BD69DA74E4E66260BEA0091F2C6D6AA8C08E341152A87994492538FF9BCC2B28`;
  `snapshot-key-provider.test.mjs`
  `1DE4174C839C8E60B3F2D64DF227D0B10FCFC0957FBF8DC2427680C81F51E465`.
- `substrate-erasure.ts`
  `D4187A6AED8F2A83F49387AB4439CB2A3F4B64C521DAACD0C67B81D4FC99AD91`;
  `substrate-erasure.test.mjs`
  `5168F198D8435067A1C74803084BD1D2C78C56A2D1F65DCE527E06909316A238`.
- `substrate-model.ts`
  `BF66D6AAA4CEB713155AAEE593430D41A105A83B13444EBCF70CC6CCC4D8C91A`;
  `substrate-model.test.mjs`
  `EABD1015628E07A9D7868ECE60BD36F13FC75626BA4C65C7AD6A1DB7C44804CA`.

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 898 | `registry-public-verifier.ts#RegistryPublicVerifiers` |
| 899 | `registry-public-verifier.ts#decodeSignature` |
| 900 | `registry-public-verifier.ts#requireEd25519PublicKey` |
| 901 | `registry-public-verifier.ts#createRegistryPublicVerifiers` |
| 902 | `registry-public-verifier.ts#createRegistryPublicVerifiers.ed25519` |
| 903 | `registry-public-verifier.ts#createRegistryPublicVerifiers.mlDsa65` |
| 904 | `snapshot-key-provider.ts#SNAPSHOT_KEY_CONTEXT` |
| 905 | `snapshot-key-provider.ts#SnapshotEpochKeyHandle` |
| 906 | `snapshot-key-provider.ts#TowerSnapshotKeyProvider` |
| 907 | `snapshot-key-provider.ts#SnapshotKeyProviderOptions` |
| 908 | `snapshot-key-provider.ts#strongKey` |
| 909 | `snapshot-key-provider.ts#snapshotKeyCommit` |
| 910 | `snapshot-key-provider.ts#resolveKey` |
| 911 | `snapshot-key-provider.ts#createSnapshotKeyProvider` |
| 912 | `snapshot-key-provider.ts#createSnapshotKeyProvider.active` |
| 913 | `snapshot-key-provider.ts#createSnapshotKeyProvider.resolve` |
| 914 | `substrate-erasure.ts#STORAGE_ADMIT_CAP` |
| 915 | `substrate-erasure.ts#EraseModel` |
| 916 | `substrate-erasure.ts#SubstrateDescriptor` |
| 917 | `substrate-erasure.ts#WritePayload` |
| 918 | `substrate-erasure.ts#SubstrateWriteAdmission` |
| 919 | `substrate-erasure.ts#effectiveEraseModel` |
| 920 | `substrate-erasure.ts#admitSubstrateWrite` |
| 921 | `substrate-erasure.ts#admitSubstrateWrite.at` |
| 922 | `substrate-erasure.ts#SubstrateAttestationManifest` |
| 923 | `substrate-erasure.ts#SubstrateAttestation` |
| 924 | `substrate-erasure.ts#SubstrateAdmissionPolicy` |
| 925 | `substrate-erasure.ts#StorageSubstrateAdmission` |
| 926 | `substrate-erasure.ts#canonicalSubstrate` |
| 927 | `substrate-erasure.ts#signSubstrateAttestation` |
| 928 | `substrate-erasure.ts#generateSubstrateKeypair` |
| 929 | `substrate-erasure.ts#admitStorageSubstrate` |
| 930 | `substrate-erasure.ts#admitStorageSubstrate.reject` |
| 931 | `substrate-model.ts#SubstrateParamError` |
| 932 | `substrate-model.ts#SubstrateParamError.constructor` |
| 933 | `substrate-model.ts#SubstrateParameters` |
| 934 | `substrate-model.ts#clamp` |
| 935 | `substrate-model.ts#assertProb` |
| 936 | `substrate-model.ts#validateParams` |
| 937 | `substrate-model.ts#assertOddPositive` |
| 938 | `substrate-model.ts#assertTritValue` |
| 939 | `substrate-model.ts#singleLaneErrorProbability` |
| 940 | `substrate-model.ts#fnv1a` |
| 941 | `substrate-model.ts#mulberry32` |
| 942 | `substrate-model.ts#makeStream` |
| 943 | `substrate-model.ts#majorityVote` |
| 944 | `substrate-model.ts#Reading` |
| 945 | `substrate-model.ts#Neighbors` |
| 946 | `substrate-model.ts#NO_NEIGHBORS` |
| 947 | `substrate-model.ts#NoisyLane` |

Exact arithmetic: **15 NO_RUNTIME_BEHAVIOR + 33 BLOCKED + 2 CANDIDATE**;
threadability **15 N/A + 30 SERIAL_HARD_PATH + 5 PARALLEL_PURE**; zero
superseded scopes or retirement credit.

## Task 1: Adjudicate Slices 898-913

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/registry-public-verifier.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/snapshot-key-provider.ts`
- Test evidence: the two focused test files pinned above

- [x] Reconcile exact ranges, callers, tests, assets and prior Slices 894-897.
- [x] Bind Base64/PEM/crypto, callback and TypedArray semantics to one exact
  captured verifier/provider snapshot.
- [x] Record split validation/use, unbounded decoding, mutable option retention
  and returned key-alias defects with blocker-specific exits and vectors.

## Task 2: Adjudicate Slices 914-930

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/substrate-erasure.ts`
- Test evidence: `substrate-erasure.test.mjs`

- [x] Bind caller-mintable attestation flags, diagnostic callbacks, signed
  canonical bytes, Ed25519 custody and revocation to exact source behavior.
- [x] Treat ambient `localeCompare` as non-authorizing for signed bytes unless
  the complete locale/ICU/runtime oracle is pinned or the wire is versioned.
- [x] Keep the named `at` and `reject` closures distinct from their parent
  orchestration receipts without double-crediting anonymous expressions.

## Task 3: Adjudicate Slices 931-947

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/substrate-model.ts`
- Test evidence: `substrate-model.test.mjs`

- [x] Bind JavaScript Error, binary64/NaN/-0/Infinity, typed Trit, UTF-16 hash,
  PRNG closure, live arrays and active class state to exact source semantics.
- [x] Credit `SubstrateParamError` and its constructor separately; stop at the
  `NoisyLane` class boundary so its constructor begins the next queue.
- [x] Record prior Slice-91 `effectiveVerdict` as a future duplicate exclusion.

## Task 4: Author and verify the 50 receipts

**Files:**
- Create: `docs/reports/slice-898-*-fungi-conversion-2026-08-14.md` through
  `docs/reports/slice-947-*-fungi-conversion-2026-08-14.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`

- [x] Author 50 receipt-local classifications, exact exits, vectors,
  threadability, source hashes, focused evidence pins and a common manifest.
- [x] Run Tower no-emit typecheck, the full Tower test suite and
  `node scripts/audit-conversion-slice-close.mjs`; require zero failures and
  exact receipt arithmetic.
- [x] Reconcile three independent read-only reviews and correct every Critical
  or Important finding before commit.
- [ ] Commit authored evidence separately from generated owner outputs.

## Task 5: Publish owners and close the checkpoint

**Files:**
- Modify only outputs named by `governance/tooling-policy.json` publishers.

- [x] Run every registered publisher and its exact check to a fixed point,
  followed by `node scripts/audit-generator-contract.mjs --tier phase-close`.
- [x] Run the historical bounded 19-check close matrix with no failure or
  SKIPPED member.
- [x] Commit owner and dependent graph layers separately.
- [x] Refresh Myco and require a bounded exact `NoisyLane` query.
- [x] Refresh codebase-memory with a forced full rebuild and require exact
  expected node/edge counts, exact `indexed_head_sha` and one untruncated
  Slice-947 symbol. Repeat at the final record commit.

## Self-review

- [ ] Confirm 50 case-sensitive unique scopes in exact source order.
- [ ] Confirm earlier verifier credits and future Slice-91 are excluded.
- [ ] Confirm arithmetic is 15 NRB + 33 BLOCKED + 2 CANDIDATE.
- [ ] Confirm every blocked receipt has an executable blocker-specific exit and
  every candidate has explicit consumer and physical-proof gates.
- [ ] Confirm no physical authority, switch, supersession or retirement claim.
