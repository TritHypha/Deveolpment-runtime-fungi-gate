# RD-0873 pre-translation progress — 2026-09-13

The bounded gate-closure work is active at Galerina `e716fc677d3ca609b016cf76d7f994b67fd36466`, tree `80aa41e53fd9cacd608bf0ba392b1d8f2c005e0a`. Translation remains paused. TypeScript shadows remain the consumer and rollback path. The completed 2,720-file corpus assurance was not rerun.

## Evidence completed in this pass

- Exact head and tree were re-read with the approved local Git 2.55.0.windows.2 executable (digest `22fead...05a`). Node is v24.18.0, npm 12.0.2, and TypeScript 5.9.3. `wat2wasm` is not available in PATH.
- The working-tree RD-0361 verifier reports `29/29`, `allClean=true`, but the committed ledger at the same head still records the older `secret-gate` digest `ce662c...3c36`; the dirty ledger records `f0622171...9166`. This is `HOLD_TOOLCHAIN_DRIFT`, not permission to repin.
- Checked-snapshot/GIR suites passed 15/15 with no skips.
- The original sandbox measurement was 79/80 because the discovery assertion depended on the first ten lexical scopes containing a physical String-parameter candidate. After the test was anchored immediately before the first stable candidate, the focused check passed 1/1 and all 51 sandbox test cases passed; the formerly missing physical-refusal assertion is now exercised. This is a test-determinism repair and does not change production behavior.
- The bounded caller-route/shadow fixture `scripts/tests/rd0873-caller-route-shadow-bake.test.mjs` now exercises the retained TypeScript secret gate, the real gate-9.5 app-kernel route and the admitted Fungi twin over eight cases; it passes 1/1 with one in-memory route receipt per case. This is non-authorizing evidence and does not retire the TypeScript shadow.
- RD-0873 first-native-slice tests passed 3/3. Governance algebra self-test passed 169/169.
- The RD-0873 audit-map test first refused missing owner/Git inputs; with the explicit owner root and approved pinned Git executable it completed its bounded run at **30/30**, 0 failed, 0 skipped. This is a local audit-map result, not an admission or production-authority receipt.

## Advisory reviews

- Grok returned `REVIEW_OUTCOME: HOLD`. It identified exact-head identity, source/snapshot/GIR/SLIDE/VOK preimage, route confusion, crash/restart, caller/shadow, profile, quota and semantic-drift red vectors. It classified local fixtures separately from platform evidence and new owner/R&D decisions. Receipt: `docs/independent-audits/2026-09-13-rd0873-grok-pretranslation-gap-review.json`.
- GPT-6 Astra returned `HOLD`. It found the committed-versus-dirty ledger contradiction, a circular envelope design, insufficient restart evidence, and a signing sequence that would mutate signed bytes. The plan was corrected to use an acyclic subject→receipt→terminal bundle, separate TypeScript and Fungi identities, explicit stale-lock/reconciliation evidence, and a detached owner admission. Receipt: `docs/independent-audits/2026-09-13-rd0873-astra-pretranslation-gate-review.json`.

## What can proceed locally

1. Freeze a reviewed implementation revision and reproduce the compiler/toolchain without the dirty ledger.
2. Add the acyclic identity envelope and substitution/refusal fixtures.
3. Extend journal recovery tests for stale locks, torn tails, crash-before-seal and publication reconciliation.
4. Caller-route/shadow-bake coverage is now present; add the remaining profile-label and restart fixtures.
5. Validate a non-empty, four-symbol, scalar-1 manifest without signing or authorizing it.

## What cannot be closed by local work alone

- Owner signature/admission over the exact manifest bytes.
- Independent physical SLIDE/VOK re-derivation and production authority.
- Profiles 64/256, cross-platform durability, hardware custody, or crash/power-loss receipts.
- Any decision to couple RD-0361 secret-gate closure to translation, open a consumer switch, retire TypeScript, or start bulk `.fungi` authoring.

## R&D search terms if implementation evidence remains unavailable

`immutable build-point succession`; `transitive input custody`; `acyclic execution attestation`; `crash reconciliation and stale-lock ownership`; `caller-route mismatch rejection`; `bounded shadow-bake criteria`; `detached owner admission`; `semantic-versus-physical profile binding`.

## Follow-up review and completed local run

- Astra follow-up reviewed corrected plan SHA `a67d30d954d131a35244cd5470ca2b786e4f443ab05fe132c0cf088876937651` and returned **HOLD**. The four corrections are adequate as control design, but the review still requires a new implementation-freeze revision, transitive tool-byte pinning, captured-byte execution, schema-route refusal, caller/shadow bake evidence, and a versioned slice-auditor contract. Owner admission and physical durability remain outside local proof.
- Grok follow-up returned **HOLD**. It agrees the corrections improve fail-closed design but says exact-head live binding, String-v2/scalar-v1 route separation, RD-0361 rehash, compiler provenance, physical SLIDE/VOK/profile receipts, and owner admission remain unverified. The exact follow-up prompt is retained beside the Grok receipt.
- The approved pinned Git run of the RD-0873 audit-map suite completed **30/30**, 0 failed, 0 skipped. This is bounded local audit-map evidence; it does not override the committed-versus-dirty RD-0361 ledger contradiction or authorize translation.

## Current disposition

The plan and four-symbol manifest are now ready for local implementation work, but the manifest remains a non-authorizing proposal. Local work can add refusal and recovery fixtures and reconcile the implementation on a fresh freeze. The owner still must provide an exact-head admission decision, and independent SLIDE/VOK/platform evidence is required for physical or production claims. New R&D is only needed for unsupported semantics, profiles 64/256, or an owner decision to couple RD-0361 to translation.


## Traceable artifacts

- Non-authorizing manifest SHA-256: `9b707d9ed46845078c570ff8839eb2e649ece159879aaabb249a98c54f6618e8`.
- Toolchain reproduction receipt SHA-256: `476b65561f72de2cce79d0979e4d3c3d056a1d5cc8639aadf442038464044019`.
- Corrected plan SHA-256: `a67d30d954d131a35244cd5470ca2b786e4f443ab05fe132c0cf088876937651`.

## Owner-authorized pilot conversion - 2026-09-13

The owner authorized a bounded `.fungi` conversion run. The first wave used the
four already selected scalar symbol scopes under profile `scalar-1`, with one
symbol/source file per step, concurrency `1`, zero retries, and a chapter
aggregate only after all four items. The exact current-head record is
`docs/independent-audits/2026-09-13-rd0873-fungi-pilot-conversion.json`.

The product-tree twins were already present from the earlier bounded wave, so
this run verified their exact bytes and behavior rather than rewriting identical
outputs. Strict checker results were **4/4**, and the four retained
TypeScript/Fungi package suites passed **8/8** with no failures or skips. The
TypeScript shadows remain active; no consumer, production authority, profile
promotion or retirement changed.

Successes, issues and improvements are recorded in the companion report
`docs/reports/2026-09-13-rd0873-fungi-pilot-conversion.md`. The older
four-item authority manifest is stale at this head and was not reused. Current
snapshot/GIR/SLIDE/VOK receipts and independent review remain separate gates;
the next wave requires a fresh exact-head manifest naming its scope and limits.
