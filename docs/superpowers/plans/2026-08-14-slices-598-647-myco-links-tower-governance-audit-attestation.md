# Slices 598-647 Myco Links and Tower Governance, Audit, and Attestation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the next 50 unique conversion scopes across the new Myco broken-link scanner/repair command and tests, Tower AI-governance and audit class boundaries, capability grants, compiled policy, the uncredited bridge delegation/context scopes, and the data-plane border.

**Architecture:** Three read-only workers produce pinned source dossiers in parallel while the root agent alone writes receipts, runs focused checks, reconciles independent reviews, publishes owners, commits, and refreshes both indexes. Nested scopes are used only where they own separately observable callback, capability, or wrapper behavior.

**Tech Stack:** TypeScript, Node 24, Galerina `.fungi`, Myco, codebase-memory, node:test, Node crypto, ML-DSA-65, SLIDE/VOK.

## Global Constraints

- The exact predecessor and source dossier build point is clean commit `674aad9d956acc67eafceb5497cf97c7a0ab96ec`, with Myco and codebase-memory independently proved fresh at that same head.
- Use codebase-memory first. The graph is exact at the predecessor; freshness after this plan commit becomes `UNKNOWN` until the final post-commit refresh. Bounded Myco and exact reads remain secondary evidence.
- Root is the sole writer, tester, stager, and committer; workers are strictly read-only.
- Never write placeholder `.fungi`; retain TypeScript/JavaScript and declaration contracts until the complete retirement gate passes.
- Never author `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop`; admitted iteration is bounded Boolean `while` only.
- Preserve RegExp/UTF-16/path/Map/Set/Array semantics, callbacks, filesystem effects, ordered output, clocks, crypto key/signature identity, dynamic imports, active class state, and error/failure identity exactly or record a precise blocker.
- Myco is a governed read-only mirror. Implement only upstream or through a governed overlay; do not author under mirror `src`.
- Tower-Citizen is directly owned; do not project Myco mirror custody onto Tower scopes.
- Treat link repair, audit Booleans, signature verification and caller-supplied verdicts as non-authorizing until their provenance, same-snapshot evidence and physical profile are independently proved.
- Review both private Fungi skills for every slice, record exact private commits, and keep them unpushed.
- Run focused package checks and the receipt audit after authoring. Run all registered owners and refresh both indexes only at the 50-slice boundary.
- Repository-wide closure remains `UNKNOWN`.

### Pinned owning files

- `packages-galerina/galerina-tools-myco/src/query/links.ts` SHA-256 `62F0D434B1B7D004785CA40D04B9E0C9C2E49DC7FD1CAE39E03FFF7E0BD4D82C`
- `packages-galerina/galerina-tools-myco/src/cli.ts` SHA-256 `3DEFAB980880B677875BE2258A40414B581E9FF395E370F02831574850204187`
- `packages-galerina/galerina-tools-myco/tests/links.test.ts` SHA-256 `70D4533B2638878803928841EAC288FFBB351C6A4FEF8D0A820E824F09457B9D`
- `packages-galerina/galerina-tower-citizen/src/ai-governance.ts` SHA-256 `E1CEA2EFD8230787E9C237712082B7B6755ADF9E67820EF97B545FA0EB40C834`
- `packages-galerina/galerina-tower-citizen/src/audit-logger.ts` SHA-256 `2DE052C255E5806915825339928D95E05CCF35084680D3F0A2FD00EE8C50A86D`
- `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts` SHA-256 `91C72D7F43E110680885C11EE1C7AE02F4E2C660CFA67ACB066EB5DC6FA01D02`
- `packages-galerina/galerina-tower-citizen/src/capability-grant.ts` SHA-256 `B8A90324D9D7F92EEC3BF5EF06B4947C8A4F09FAC144993A3410F807B3757883`
- `packages-galerina/galerina-tower-citizen/src/compiled-policy.ts` SHA-256 `C0807BACCD00CD8784CCA12156108C5EE5EA8F2BDA4463102F0803AC54E7BDE0`
- `packages-galerina/galerina-tower-citizen/src/data-plane-border.ts` SHA-256 `16D8E0AB4D9F14144B8EDA2611BA012B4837EAA1DC272D4E403ECE02AD14363D`
- `packages-galerina/galerina-tower-citizen/src/deadzone-dispatcher.ts` SHA-256 `0810858269EF4734AC32FBA4F1EF3D80A0D296A4D0EAD23706D34F6DB5A168BF`

---

## Exact slice map

| Slice | Exact scope |
|---:|---|
| 598 | `LinkClass` |
| 599 | `BrokenLink` |
| 600 | `MD_LINK` |
| 601 | `PLACEHOLDER_BASENAME_RE` |
| 602 | `PLACEHOLDER_PATH_RE` |
| 603 | `ELLIPSIS_RE` |
| 604 | `isExternalHref` |
| 605 | `classifyBroken` |
| 606 | `escapeRe` |
| 607 | `stripTrailingSlash` |
| 608 | `scanText` |
| 609 | `repairText` |
| 610 | `REPAIRABLE` |
| 611 | `cmdLinks` |
| 612 | nested `cmdLinks.scanAll` |
| 613 | `links.test.ts module` |
| 614 | `AiActionDecision` |
| 615 | `AiGovernanceResult` |
| 616 | `governAiProposal` |
| 617 | `AuditLogger` class boundary |
| 618 | `CapabilityGrant` |
| 619 | `SignedCapabilityGrant` |
| 620 | `CAP_MLDSA_CONTEXT` |
| 621 | `canonicalGrantString` |
| 622 | `capabilityGrantHash` |
| 623 | `signCapabilityGrant` |
| 624 | `signCapabilityGrantHybrid` |
| 625 | `verifyCapabilityGrant` |
| 626 | `POL_HAS_ALLOWLIST` |
| 627 | `POL_DENY_HOST_NATIVE` |
| 628 | `POL_HAS_CALL_BUDGET` |
| 629 | `POL_HAS_TOKEN_BUDGET` |
| 630 | `POL_HAS_COST_CEILING` |
| 631 | `PolicyTrap` |
| 632 | `CompiledPolicy` |
| 633 | `compilePolicy` |
| 634 | nested `attestBridge` delegating wrapper |
| 635 | `BRIDGE_MLDSA_CONTEXT` |
| 636 | nested `attestBridgeHybrid` delegating wrapper |
| 637 | `VaultManifestEntry` |
| 638 | `VaultRegistry` |
| 639 | `DataRow` |
| 640 | `UserScope` |
| 641 | `BorderPolicy` |
| 642 | `vaultIsPublic` |
| 643 | `admitRowVerdict` |
| 644 | `admitRow` |
| 645 | `intersectUserScope` |
| 646 | `EMPTY_SCOPES` |
| 647 | `dispatchDeadZone` |

Queue reconciliation: graph-first review proved that the initially proposed
attestation symbols were already governed as Slices 150-160 and most audit
members as Slices 135-149. They are dependencies only and receive no duplicate
credit. `isTrit` remains governed as Slice 76. Slices 634-636 are the three
genuinely uncredited attestation scopes; Slice 647 replaces the duplicate guard
with the previously uncredited `dispatchDeadZone` runtime.

### Task 1: Adjudicate Slices 598-613

**Files:**
- Read: `packages-galerina/galerina-tools-myco/src/query/links.ts`
- Read: the `links` command portion of `packages-galerina/galerina-tools-myco/src/cli.ts`
- Read: `packages-galerina/galerina-tools-myco/tests/links.test.ts`
- Read: package boundary, manifest, callers and mirror evidence.

- [ ] Pin source/test ranges, callers, mirror custody, package assets, physical evidence, and both skill commits.
- [ ] Record exact Markdown-link grammar, classification/repair order, filesystem/path/Map/RegExp semantics, CLI output/exit and test-runner effects.
- [ ] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 598-613.

### Task 2: Adjudicate Slices 614-633

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/ai-governance.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/audit-logger.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/capability-grant.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/compiled-policy.ts`
- Read: owning manifests, exports, callers and focused tests.

- [ ] Pin exact ranges, callers, source/test digests, direct Tower custody, and physical evidence.
- [ ] Record verdict provenance, active logger state, capability grant schemas/canonicalization/signatures, compiled Set/bit-table state and exact trap precedence.
- [ ] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 614-633.

### Task 3: Adjudicate Slices 634-647

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/data-plane-border.ts`
- Read: `packages-galerina/galerina-tower-citizen/src/deadzone-dispatcher.ts`
- Read: bridge-contract declarations, package boundary, callers and focused attestation tests.

- [ ] Pin exact ranges, crypto/runtime dependencies, callers, test identities, direct Tower custody, and physical evidence.
- [ ] Record wrapper delegation/context identity plus exact record, registry, Set, K3 admission, callback and ordered filtering semantics.
- [ ] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 634-647.

### Task 4: Author, verify, review, and publish the wave

**Files:**
- Create: `docs/reports/slice-598-*-fungi-conversion-2026-08-14.md` through `docs/reports/slice-647-*-fungi-conversion-2026-08-14.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

- [ ] Root reconciles all three dossiers against exact live source and authors 50 unique receipts.
- [ ] Run focused Myco and Tower checks, receipt audit and leak checks.
- [ ] Resolve three independent read-only reviews and record the final PASS.
- [ ] Commit authored evidence separately from registered owner outputs.
- [ ] Run all graph/owner publishers and the bounded 50-slice close matrix.
- [ ] Commit the final provenance build point, refresh Myco and codebase-memory, and independently prove both exact indexed build points.
- [ ] Keep repository closure `UNKNOWN` and continue with Slice 648.
