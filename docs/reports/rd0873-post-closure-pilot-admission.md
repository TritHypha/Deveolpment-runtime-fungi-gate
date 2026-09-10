# RD-0873 post-closure pilot admission packet

Date: 2026-09-10
Status: **HOLD_NON_AUTHORIZING**
Authorizing: **false**

This packet bounds the first String-capable pilot around the existing
`isEnvironmentMode` Fungi twin. It records the semantic ledger, differential
vectors and exact receipt checklist needed for a later owner decision. It does
not create new `.fungi` source, switch a consumer, retire TypeScript or release
production authority.

## Subject and identities

| Field | Value |
| --- | --- |
| Product | `galerina` |
| TypeScript shadow | `packages-ts/galerina-core-config/src/index.ts#isEnvironmentMode` |
| Existing Fungi twin | `packages-ts/galerina-core-config/src/self-hosted/environment-mode.fungi` |
| Source digest | `sha256:52025e4c248afd31cb8659d2eed85e78ef03d1e8e49eb02f15bbb8c90e03a1ba` |
| Compiler route | `@galerina/core-compiler` `1.0.0-beta.2` |
| Compiler code tip | `75f502f0494778c3b1cb932671b907ec16052235` |
| Snapshot digest | `sha256:ecfb51c7aae2b2e1c393fc4620d3871aebfc14fdc057b3a18e6bee83d0763e78` |
| Canonical GIR digest | `sha256:4ad87835500c84d1069694744877ccc044fd6f7fbb91d832fbbe1e506c611592` |
| Semantic profile | `slide.semantic.executable-gir.string-match.v1` |
| Registry set | `slide.registry.executable-gir.string-match.v1` |
| Registry-set digest | `8a5d4b8f0f58c6c8ca1e9df6c0c0e2c1c8b7a77a1d9a41b0dd9b8b2b6a5c4d3e` |
| Galerina evidence head | `4af44925c` |
| SLIDE evidence head | `2e8e41b` |
| Lyth evidence head | `a68eeb5` |

The owner direction in the current session is to continue full auto toward the
approved bulk scope. That direction is recorded as intent, not as a fabricated
signature or an exact-subject queue receipt. The completed 2,720-file corpus
assurance remains closed and is not rerun here.

## Semantic and effect ledger

| Observable | Required behavior | Evidence or boundary |
| --- | --- | --- |
| Input domain | One well-formed UTF-8/NFC String value | Wrong primitive classes refuse before accessors or coercion |
| Positive cases | `development`, `test`, `staging`, `production` return `true` | Case-sensitive and whitespace-sensitive literal comparison |
| Negative cases | Any other String, including empty and near-miss values, returns `false` | Final wildcard is explicit and must be last |
| Effects | Pure deterministic classification; no mutation, I/O, time, randomness, scheduling or host lookup | Existing TypeScript shadow remains retained |
| Equality | Compare canonical value bytes; never interned handles or numeric coercion | String literal constants are bound in the checked snapshot and GIR |
| Ordering | Four sealed literal arms followed by one wildcard | Duplicate, reordered or unreachable arms refuse |
| Bounds | Dedicated root-23 String edition with conservative work bound 12 | SLIDE and Lyth re-derive the same bound independently |
| Failure | Malformed, over-limit, changed or mismatched inputs produce typed refusal | No implicit fallback or ambient string table |
| Authority | All snapshot, GIR, SLIDE, Lyth and VOK results carry `authorityReleased: false` | No consumer switch or production admission |

## Differential vectors

The pilot must retain the TypeScript shadow and compare both routes for:

1. Each of the four positive literals.
2. Final-wildcard values, empty String, near misses, case changes and leading,
   trailing or doubled whitespace.
3. Wrong-class numeric, Boolean, null-like and object inputs.
4. Malformed UTF-8, non-NFC text, embedded NUL and over-limit String values.
5. Duplicate, reordered, missing-wildcard and non-final-wildcard arm layouts.
6. Mutated source bytes, snapshot bytes, compiler identity, profile identity or
   registry-set digest.
7. Changed root size, work bound, String type identity or literal constant edge.

Every negative vector must refuse deterministically, and at least one controlled
mutation must turn the relevant detector red. A checker-clean candidate alone
is insufficient evidence.

## Fresh evidence recorded

- Galerina String snapshot/GIR tests: **4/4 PASS**.
- SLIDE String constellation and retained VOK boundary tests: **21/21 PASS**.
- SLIDE path-leak audit: **803 targets, 0 violations**.
- Lyth TypeScript typecheck: **PASS**.
- Same-session zero-trust review: **HOLD** because independent completion audit,
  owner-bound admission and exact-head continuity are still absent; receipt is
  `docs/independent-audits/2026-09-10-rd0873-string-route-self-review-hold.json`.

These checks are fresh implementation evidence. They do not upgrade the packet
to an independent review or an owner authorization.

## Admission gate

| Gate | State | Required evidence |
| --- | --- | --- |
| Exact source and checked snapshot | PRESENT | Current source, snapshot and GIR identities above |
| SLIDE re-derivation | PRESENT_LOCALLY | Fresh exact-subject constellation at SLIDE `2e8e41b` |
| Lyth proof-work | PRESENT_LOCALLY | Fresh adapter/typecheck at Lyth `a68eeb5`; non-authorizing |
| VOK exact-subject admission | PRESENT_LOCALLY | Dedicated lease and receipt path in the constellation; non-authorizing |
| Owner-bound queue decision | **MISSING** | Exact subject, source digest, compiler/toolchain, profile and exclusions |
| Independent completion audit | **MISSING** | Separate reviewer and matching build point |
| Exact-head continuity | **MISSING** | One mutually bound receipt spanning Galerina, SLIDE and Lyth |
| Consumer and retirement decision | **CLOSED** | Owner decision after all preceding gates |

## Decision and next safe action

Decision: **PRESERVE HOLD**. The packet is ready for an owner-bound queue
decision and a separate completion audit, but it does not authorize bulk
`.fungi` authoring. Keep `authoringAllowed`, `consumerSwitch`,
`typescriptRetirement` and `productionAuthority` false; do not push or create a
branch/worktree. Once the three missing gates are green, open only one
reversible pilot consumer path, re-run its differential vectors, and schedule
small independently receipted batches. If any receipt is stale or divergent,
return to this hold.

## Repair and current-head continuation - 2026-09-10

The two findings from the independent review were repaired in the String route:
the decoder now requires byte-for-byte equality with canonical re-encoding, and
parse-result root and nested data are captured through typed own-data checks so
throwing accessors become `StringMatchSnapshotRefusal` codes. The implementation
is at Galerina `main` commit `1e1022dc54f1e0e843f3012993e12753ae535448`, tree
`964ab32b1e910a2f2b51e9e8ac719c20b518233c`.

Fresh checks at that repaired route are compiler 11/11, four retained twin
differentials 8/8, physical SLIDE/VOK 10/10, and Lyth 14 suites / 633 checks
with typecheck. The independent receipt is
`docs/independent-audits/2026-09-10-rd0873-string-route-independent-completion-audit-v2.json`.
The current-head continuity and owner-direction receipts are
`docs/independent-audits/2026-09-10-rd0873-string-route-continuity-observation-v3.json`
and
`docs/independent-audits/2026-09-10-rd0873-string-route-owner-queue-decision-v2.json`.

The route remains non-authorizing. The conserved queue still reports 1,588
entries with `CANDIDATE: 0`, `BLOCKED: 921` and `BOOTSTRAP_FLOOR: 667`; its
protected files were not changed. No new `.fungi` file is therefore authored,
and consumer switching, TypeScript retirement, production authority, corpus
reruns and topology changes remain closed. See
`docs/independent-audits/2026-09-10-rd0873-bulk-translation-disposition.json`
for the machine-readable disposition.
