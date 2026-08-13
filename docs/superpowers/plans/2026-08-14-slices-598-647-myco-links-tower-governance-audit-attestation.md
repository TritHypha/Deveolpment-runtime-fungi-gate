# Slices 598-647 Myco Links and Tower Governance, Audit, and Attestation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the next 50 unique conversion scopes across the new Myco broken-link scanner/repair command and tests, Tower AI-governance runtime, Tower audit logger, and the first complete bridge-attestation family.

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
| 616 | `isTrit` |
| 617 | `governAiProposal` |
| 618 | `TowerAuditEvent` |
| 619 | `EgressSink` |
| 620 | `AuditFilter` |
| 621 | `AuditLoggerOptions` |
| 622 | `AuditLogger` |
| 623 | `AuditLogger.constructor` |
| 624 | `AuditLogger.append` |
| 625 | `AuditLogger.flush` |
| 626 | `AuditLogger.pendingCount` |
| 627 | `AuditLogger.load` |
| 628 | `AuditLogger.exec` |
| 629 | `AuditLogger.trap` |
| 630 | `AuditLogger.erase` |
| 631 | `AuditLogger.query` |
| 632 | `AuditLogger.logTransition` |
| 633 | `AuditLogger.getLifecycle` |
| 634 | `AttestationPolicy` |
| 635 | `AttestationResult` |
| 636 | `attestationHash` |
| 637 | `signManifest` |
| 638 | `verifyAttestation` |
| 639 | `generateAttestationKeypair` |
| 640 | `attestBridge` |
| 641 | nested `attestBridge` delegating wrapper |
| 642 | `BRIDGE_MLDSA_CONTEXT` |
| 643 | `generateHybridAttestationKeypair` |
| 644 | `signManifestHybrid` |
| 645 | `verifyAttestationHybrid` |
| 646 | `attestBridgeHybrid` |
| 647 | nested `attestBridgeHybrid` delegating wrapper |

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
- Read: owning manifests, exports, callers and focused tests.

- [ ] Pin exact ranges, callers, source/test digests, direct Tower custody, and physical evidence.
- [ ] Record verdict provenance, structural record validation, mutable logger state, filesystem/egress/clock/JSON effects, lifecycle aggregation and failure ordering.
- [ ] Return per-scope classification, blocker/exit, threadability, minimum vectors, defects, and skill dispositions for Slices 614-633.

### Task 3: Adjudicate Slices 634-647

**Files:**
- Read: `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts`
- Read: bridge-contract declarations, package boundary, callers and focused attestation tests.

- [ ] Pin exact ranges, crypto/runtime dependencies, callers, test identities, direct Tower custody, and physical evidence.
- [ ] Record canonical-manifest hashing, Ed25519 and ML-DSA key/signature semantics, policy/revocation decisions, dynamic imports, wrapper delegation and typed failure gaps.
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
