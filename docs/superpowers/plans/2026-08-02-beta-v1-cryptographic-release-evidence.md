# Beta-v1 cryptographic release evidence implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Boolean-authenticated durability and repository evidence with role-separated, hybrid-signed, provenance-bound release receipts.

**Architecture:** A dedicated root-signed operational evidence authority signs in-toto-style statements under separate durability and repository contexts. The final beta verifier independently validates the delegation, both signature components, statement subjects, closed predicates and exact evidence relationships before producing K3 `+1`.

**Tech Stack:** Node.js ESM; `node:crypto` Ed25519; `@noble/post-quantum` ML-DSA-65; canonical JSON; SHA-256; `node:test`; existing Galerina stable-handle evidence readers.

## Global constraints

- Verify rather than assume; unknown stays K3 `0`, invalid is `-1`.
- Both Ed25519 and ML-DSA-65 signatures are mandatory.
- The registry operational key and its delegated roles must not be reused or widened.
- No production private key is generated or committed.
- No caller-supplied Boolean can establish authentication, successful checks or production authority.
- No shell, network, dynamic loader or writable sidecar enters verification.
- All files are bounded direct single-link regular files read through stable handles.
- Existing functional platform evidence stays non-authorizing.
- Commit locally; never push.

---

### Task 1: Canonical hybrid evidence envelope

**Files:**
- Create: `scripts/lib/beta-release-evidence-envelope.mjs`
- Create: `scripts/tests/beta-release-evidence-envelope.test.mjs`

**Interfaces:**
- Produces `releaseEvidenceDelegationPreimage(delegation)`.
- Produces `releaseEvidenceStatementPreimage(statement, role)`.
- Produces `verifyReleaseEvidenceDelegation(delegation, options)`.
- Produces `verifyReleaseEvidenceEnvelope(envelope, options)`.
- Consumes verifier callbacks for the exact root or operational public bundle.

- [ ] Write a failing real-signature test using disposable Ed25519 and ML-DSA-65 keys.
- [ ] Run `node --test scripts/tests/beta-release-evidence-envelope.test.mjs` and require module-not-found RED.
- [ ] Implement bounded canonical values, role contexts, delegation checks and two-component verification.
- [ ] Add mutation cases for each signature half, role, context, key, serial, time, revocation, proxy and accessor boundary.
- [ ] Run the focused test and require GREEN.

### Task 2: Closed derived receipt predicates

**Files:**
- Create: `scripts/lib/beta-release-evidence-receipts.mjs`
- Create: `scripts/tests/beta-release-evidence-receipts.test.mjs`

**Interfaces:**
- Produces `validateDurabilityStatement(statement, expected)`.
- Produces `validateRepositoryStatement(statement, expected)`.
- Produces `deriveDurabilityStatement(input)` and `deriveRepositoryStatement(input)`; both return canonical, deeply frozen, unsigned statements.
- Exports the exact six repository check definitions.

- [ ] Write failing literal-fixture tests for a complete durability and repository statement.
- [ ] Run the focused test and require module-not-found RED.
- [ ] Implement exact in-toto statement subjects and closed Galerina predicates.
- [ ] Refuse missing recovery digests, subject mismatch, wrong commands, reordered/missing/nonzero checks and unsafe values.
- [ ] Run both receipt and envelope tests and require GREEN.

### Task 3: Integrate cryptographic receipts into beta admission

**Files:**
- Modify: `scripts/beta-v1-release-admission.mjs`
- Modify: `scripts/tests/beta-v1-release-admission.test.mjs`
- Modify: `governance/beta-v1-platform-policy.json`

**Interfaces:**
- Policy schema becomes `galerina.beta-v1.platform-policy.v2`.
- Policy gains one exact `releaseEvidenceAuthority` block.
- Durability and repository files become hybrid envelopes.
- `verifyBetaV1ReleaseFiles` receives only public verification inputs in tests; CLI loads exact governance public files.

- [ ] Convert the fixture to real disposable hybrid signatures and watch the existing verifier fail for the expected schema gap.
- [ ] Add negative integration tests for a forged signed predicate, signature downgrade, stale delegation and Boolean-only legacy receipts.
- [ ] Implement delegation/public-bundle loading and envelope validation before predicate validation.
- [ ] Remove `authenticated: true` handling from durability and repository predicates.
- [ ] Preserve K3 `0` only for absent ceremony/external files; cryptographic or semantic failures remain terminal.
- [ ] Run platform-smoke and beta admission tests and require GREEN.

### Task 4: Ceremony-ready offline signing tool

**Files:**
- Create: `scripts/release-evidence-authority-cli.mjs`
- Create: `scripts/tests/release-evidence-authority-cli.test.mjs`
- Create: `docs/security/BETA-V1-RELEASE-EVIDENCE-SIGNING-WALKTHROUGH.md`

**Interfaces:**
- `inspect-environment --operational-key-id <id>`.
- `sign-statement --role <durability|repository> --input <file> --output <file> --operational-key-id <id>`.
- A later root-delegation ceremony remains explicit; the online tool never synthesizes root authority.

- [ ] Write failing CLI tests for malformed/duplicate environment records, wrong key/role, private-value leakage and valid disposable signing.
- [ ] Run the focused CLI test and require RED.
- [ ] Implement data-only private-environment parsing, role/predicate matching, exclusive output and post-sign self-verification.
- [ ] Write the current-state walkthrough with separate “now” and “later offline ceremony” tables.
- [ ] Run the CLI tests and path/private-document leak audits.

### Task 5: Documentation, generators and verification

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `governance/status-ledger.json`
- Modify: `docs/superpowers/plans/2026-08-01-beta-v1-platform-durability-release-admission.md`
- Modify: `AGENTS.md`
- Regenerate repository-owned graph/status/index artefacts.

- [ ] Record implementation green separately from authority activation.
- [ ] Mark the offline evidence delegation and external signed receipts as the only remaining release-admission blockers.
- [ ] Correct stale test-count claims encountered in active guidance.
- [ ] Run focused tests, app-kernel tests, strict `.fungi` checks, graph/generator checks, phase-close and security audits.
- [ ] Inspect the full diff for keys, paths, generated noise and unrelated changes.
- [ ] Commit exact pathspecs locally, never push, reindex codebase memory and require indexed head equality.

