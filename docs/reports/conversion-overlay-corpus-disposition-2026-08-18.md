# Conversion overlay corpus disposition - 2026-08-18

## Decision

The 2,200 files under
`packages-galerina/galerina-test/src/self-hosted/conversion-overlays/` are a
test-fixture corpus. They receive **zero real-package conversion credit**.
They do not prove a consumer switch, TypeScript retirement, production
authority or a completed TypeScript-to-Fungi conversion.

The corpus remains tracked for now because `@galerina/test` declares all 2,200
files as loaded assets and 110 focused test files consume the retained
families. This review deletes nothing. A later cleanup requires a separate
owner-approved commit after the consumers have moved to a compact, green KAT
set.

## Pinned inventory

The body-free baseline
`docs/reports/real-fungi-conversion-baseline-2026-08-18.json` has SHA-256
`07030CF39831D559BA2D69DDDF2B8E69CAF974FFFBBEC0DE5ED7C45E03E36CC8` and
records source build point `c0799fe8b5e9b198feb1ad7845b60483b330f5a0`.
Its complete inventory is:

| Item | Count | Disposition |
|---|---:|---|
| All tracked `.fungi` | 2,971 | Inventory only |
| Real-package `.fungi` | 771 | Audited separately |
| Conversion overlays | 2,200 | `TEST_OVERLAY_NO_CONVERSION_CREDIT` |
| Overlay-introducing commits | 55 | Fixture history |
| Exact duplicate groups inside overlays | 0 | Clean at exact-byte level |
| Alpha-normalized shadow groups inside overlays | 6 groups / 14 files | Open fixture debt |
| Case-only overlay path groups | 0 | Clean at path level |

`packages-galerina/galerina-test/package.json` has SHA-256
`F41F6A325B0D6C60D6E7D8878AC7FF54A41B0615F9F5257788148655B63B098F`.
Its `packageGraph.loadedAssets` contains 2,203 entries, of which exactly 2,200
are the conversion overlays.

## Evidence families and consumers

| Family | Files | Direct package KAT | Physical SLIDE/VOK KAT | What the evidence establishes |
|---|---:|---|---|---|
| Primitive overlays | 40 | `packages-galerina/galerina-test/tests/conversion-overlay-primitives-fungi.test.mjs` executes all 40 | `scripts/tests/conversion-overlay-primitives-fungi-slide.integration.test.mjs` publishes and independently re-admits all 40 | Exact literal, parser/effect/GIR/interpreter and bounded physical-reference evidence for test fixtures |
| Decision-core overlays | 40 | `packages-galerina/galerina-test/tests/conversion-overlay-decision-cores-fungi.test.mjs` executes all 40 | `scripts/tests/conversion-overlay-decision-cores-fungi-slide.integration.test.mjs` publishes and independently re-admits all 40 | Construct-bearing decision KATs over pre-shaped inputs; no host-border or production-consumer authority |
| Source-decision waves 2-48 | 1,880 | The 47 files `conversion-overlay-source-decisions-wave-{2..48}-fungi.test.mjs` execute all 40 members of each wave | Waves 2-43 re-admit all 40; waves 44-48 re-admit the first 10 | Source-name binding plus generated decision/seal-chain evidence; not semantic parity with the owning TypeScript body |
| Source-decision waves 49-54 | 240 | The six files `conversion-overlay-source-decisions-wave-{49..54}-fungi.test.mjs` execute the first 10 members of each wave | The matching six integration files re-admit the first 10 | Sampled generated-chain evidence only; 180 members have no direct interpreter execution and 180 have no physical re-admission |

Across the package KATs, 2,020 of 2,200 overlays are parsed, effect-checked,
lowered to GIR and interpreted. Across the SLIDE/VOK integrations, 1,870 are
compiled, published, independently prepared, executed and receipt-verified.
The remaining 180 interpreter gaps and 330 physical-chain gaps are explicit;
loaded-asset membership and a matching TypeScript symbol substring do not fill
them.

The exact consumers are 55 package tests (primitive, decision-core and waves
2-54) and 55 matching `scripts/tests/*-fungi-slide.integration.test.mjs`
files. Integration tests are conditional on `GALERINA_SLIDE_REPO`; a skipped
test is not physical evidence.

## Duplicate and shadow debt

The shared `scripts/lib/fungi-shadow.mjs` fingerprint reports no exact-byte
twins and no case-only paths within the overlay folder. It does report six
alpha-normalized groups:

1. `myco-index-format.fungi`, `tower-encoding-hold.fungi`,
   `tower-policy-has-allowlist.fungi`;
2. `myco-max-index-path-length.fungi`, `myco-max-index-term-length.fungi`;
3. `myco-max-repetition.fungi`, `tower-max-container-fields.fungi`;
4. `tower-ai-inference-capability.fungi`,
   `tower-max-plugin-input-depth.fungi`;
5. `tower-demo-count.fungi`, `tower-policy-has-cost-ceiling.fungi`,
   `tower-trits-per-i32.fungi`;
6. `tower-encoding-commit.fungi`, `tower-policy-deny-host-native.fungi`.

These 14 files remain test fixtures, not 14 independent conversion credits.
Any later compact corpus should keep detector-red controls in a dedicated
negative-fixture lane rather than retain accidental loaded-asset shadows.

## Superseded aggregate claims

This disposition supersedes every historical aggregate that counted any of
the 2,200 overlays as real-package TypeScript conversion progress. Historical
reports and slice receipts may still locate a source symbol or describe a
candidate, but overlay creation, package loading, parser success, sampled
execution or physical-reference re-admission does not by itself establish:

- exact semantic parity over the full JavaScript/TypeScript input domain;
- a production consumer switch;
- TypeScript retirement;
- physical or cryptographic production authority; or
- independent credit for alpha-normalized twins.

The baseline's `conversionCredit: 0` is the binding aggregate for this corpus.

## Compact retained KAT proposal

Do not sample another generated wave. Build a coverage manifest and solve for
the smallest set that covers the required cells:

- canonical constructs: `if`, `match`, `check`, `contract`, `flow`, `global`,
  `vault` and `hallmark`;
- value boundaries: `Int`, `String`, `Bool`, `Verdict`, exact base-prefixed
  literals and the selected scalar profile;
- hostile vectors: malformed syntax, wrong type, incomplete match, failed
  check, effect escalation, missing contract evidence, capability leakage,
  hallmark misuse, source/candidate mutation and receipt mutation;
- outcomes: supported, blocked and manual-review/refusal;
- stages: parser/checkers, checked snapshot, GIR, physical SLIDE,
  independent re-admission and VOK receipt.

Each retained positive KAT must name its unique coverage cells. Each negative
KAT must prove a detector can turn red. A candidate with no unique cell is
removed from the proposed compact set. The set is complete only when every
required cell has a positive or deliberately refusing witness; count alone is
not a coverage argument.

## Reversible cleanup boundary

The complete overlay history is preserved by Git range
`294f937ba6b7cc97c26c9ca889563149fe75afe9..1f154cc9478d89943bd806858fa9ec2749491857`.
It contains exactly 55 commits touching the overlay root, from
`5a76292a2ab21eed99b2e6cc5a0425a0c2d7a049` through
`1f154cc9478d89943bd806858fa9ec2749491857`.

If cleanup is later approved, first land the compact KAT manifest and migrate
all 110 test consumers plus `packageGraph.loadedAssets`. Run the package and
physical suites, whole-corpus exact/alpha/case checks and the real conversion
baseline again. Only then may a separate reviewed commit remove redundant
fixtures. The historical range remains the recovery source; this plan grants
no deletion authority.
