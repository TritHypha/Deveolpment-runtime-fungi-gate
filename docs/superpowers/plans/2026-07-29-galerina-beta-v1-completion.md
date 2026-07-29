# Galerina Beta-v1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Galerina to a mechanically verified beta-v1 state whose
in-scope language and governance decisions are authored and authority-ready in
`.fungi`, while retaining TypeScript only as the declared differential,
bootstrap, host-floor, and developer-tool layer until executable SLIDE is
integrated.

**Architecture:** Close truth and test-inventory defects before changing
language authority. Promote the two remaining self-hosted compiler stages and
the twenty remaining governed twins only after their existing parity,
mutation, hash, admission, and functional evidence is current. Keep `.gate`
on hold. After beta-v1 closes, resume SLIDE; only an integrated executable
SLIDE backend can start literal `.ts` and `node_modules` retirement.

**Tech Stack:** Galerina `.fungi`, Node.js prototype/bootstrap tooling, strict
TypeScript differential references, Node `node:test`, WebAssembly differential
execution, JSON authority ledgers, Myco, generated project/package/memory
graphs, Windows PowerShell-compatible commands.

## Global Constraints

- Zero trust: verify, never assume; unknown, missing, stale, malformed,
  uncountable, timed-out, or ambiguous evidence refuses.
- `.fungi` `if` is Boolean-only. Use exhaustive `check` for Kleene K3 and
  exhaustive `match` otherwise; the default/non-allow arm exits the trust path.
- No new `.gate` implementation until the beta-v1 and SLIDE work in this plan
  is complete enough to avoid rework.
- Preserve TypeScript as a differential/bootstrap/host/tool layer during this
  plan. Do not delete it merely to move a percentage.
- Do not start new independent SLIDE implementation during Tasks 1-9.
- Literal TypeScript and `node_modules` removal begins only after executable
  SLIDE integration.
- No benchmark comparison between SLIDE, Wasm, Rust, or Python before SLIDE
  has an executable backend.
- Support developer verification on Windows 10/11, macOS, Ubuntu, Debian,
  Fedora, and Mint. A platform not directly executed is reported as
  unverified, never inferred from another Linux distribution.
- Keep secrets and private keys outside Git. Never print, copy, or commit key
  material from `../notes/`.
- Never push. Make scoped, verified local commits only.

---

### Task 1: Seal and freeze the current SLIDE/G4 pause point

**Files:**

- Modify:
  `packages-galerina/galerina-core-compiler/src/self-hosted/slide-gfrontend-checked-snapshot.fungi`
- Modify:
  `packages-galerina/galerina-core-compiler/src/self-hosted/slide-gfrontend-public-candidate.fungi`
- Test:
  `packages-galerina/galerina-core-compiler/tests/slide-gfrontend-checked-snapshot.test.mjs`
- Test:
  `packages-galerina/galerina-core-compiler/tests/slide-gfrontend-public-candidate.test.mjs`

**Interfaces:**

- Produces an immutable bounded snapshot with an exact 40-node trace and no
  authority.
- Leaves general frontend work and independent SLIDE execution explicitly
  paused.

- [x] **Step 1: Prove caller lexer substitution is rejected**

Run:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/slide-gfrontend-checked-snapshot.test.mjs
```

Expected: 2/2, including a changed caller token returning terminal denial and
an empty snapshot.

- [x] **Step 2: Remove the dead coarse source-map materializer**

Use Myco to prove the two old flows have no remaining caller:

```powershell
node packages-galerina/galerina-tools-myco/dist/cli.js materializeSLIDEG4SourceMappings . --in "packages-galerina/galerina-core-compiler/**" --no-color
```

Expected after removal: zero hits.

- [x] **Step 3: Run source quality, corpus, build, focused, and package checks**

```powershell
node scripts/lint-fungi.mjs packages-galerina/galerina-core-compiler/src/self-hosted/slide-gfrontend-checked-snapshot.fungi packages-galerina/galerina-core-compiler/src/self-hosted/slide-gfrontend-public-candidate.fungi
node scripts/audit-fungi-corpus-check.mjs
npm.cmd --prefix packages-galerina/galerina-core-compiler run build
node --test packages-galerina/galerina-core-compiler/tests/slide-gfrontend-checked-snapshot.test.mjs packages-galerina/galerina-core-compiler/tests/slide-gfrontend-public-candidate.test.mjs
npm.cmd --prefix packages-galerina/galerina-core-compiler test
```

Expected: lint 0, no new corpus breakage, focused 7/7, package 5,717/5,717.

- [x] **Step 4: Commit and branch**

Commit: `fe648ea6 feat: seal bounded G4 checked snapshot`.
Continue Galerina work on `codex/galerina-beta-v1-completion`.

### Task 2: Make the beta-v1 meters describe live evidence

**Files:**

- Modify: `scripts/component-health.mjs`
- Modify: `scripts/ts-retirement-graph.mjs`
- Create: `scripts/tests/component-health-readiness.test.mjs`
- Modify: `scripts/tests/ts-retirement-generator.test.mjs`
- Regenerate: `build/ts-retirement/*`
- Regenerate: `build/component-health/*`

**Interfaces:**

- `component-health` recognizes `test/` and `tests/` only when a runnable test
  command produces a non-zero parsed count.
- `ts-retirement-graph` derives authoritative flip counts from
  `docs/security/rd0528-compiler-authoritative-stages.json` and
  `docs/security/rd0361-authoritative-twins.json`; it never hard-codes zero.
- The percentage audit distinguishes measured ladders from asserted prose.

- [x] **Step 1: Add RED fixtures**

Add fixtures proving:

```text
test/ + runnable non-empty node:test => package has tests
test/ + empty/uncountable command => readiness refusal
ledger entry matching a tracked twin => authoritativeFlips increments
unknown, duplicate, missing, or non-twinned ledger entry => graph refusal
```

- [x] **Step 2: Verify RED**

```powershell
node --test scripts/tests/component-health-readiness.test.mjs scripts/tests/ts-retirement-generator.test.mjs
```

Expected: failures for the current singular-test-directory and hard-coded
authority-count behavior.

- [x] **Step 3: Implement the smallest derived fix**

Read package tests from the reconciled tooling inventory rather than directory
name alone. Parse both authority ledgers, normalize repository-relative
paths, require one-to-one membership in the discovered twin set, and compute
the two authority totals.

- [x] **Step 4: Verify and regenerate**

```powershell
node --test scripts/tests/component-health-readiness.test.mjs scripts/tests/ts-retirement-generator.test.mjs scripts/tests/roadmap-subway-generator.test.mjs
node scripts/ts-retirement-graph.mjs --self-test
node scripts/ts-retirement-graph.mjs
node scripts/component-health.mjs --audit-html
node scripts/audit-percent-evidence.mjs
```

Expected current authority facts before new flips: compiler 5 authoritative,
2 differential; governed twins 9 authoritative, 20 differential.

Verified 2026-07-29: 8/8 focused generator/readiness/roadmap tests pass.
The health meter now recognizes the singular `test/` surface, refuses a
non-positive recorded test count, and reports 96/97 because only the empty
signed registry lacks a denial test. The retirement artifact now separates 24
same-stem TypeScript/Fungi pairs from the actual authority inventories:
5/7 compiler and 9/29 governed. Missing, duplicate, path-ambiguous,
out-of-scope, and cross-ledger authority entries are denied.

### Task 3: Eliminate the implicit `.fungi` known-failure baseline

**Files:**

- Modify: `scripts/audit-fungi-corpus-check.mjs`
- Modify: `scripts/baselines/fungi-corpus-check.json`
- Modify only the 29 currently named source/fixture files after adjudication.
- Add `expected.diagnostics.txt` sidecars only for intentional negative
  fixtures whose owning test proves the same diagnostic set.

**Interfaces:**

- Every production/positive `.fungi` file passes `galerina check`.
- Every intentional negative file has explicit, adjacent, exact diagnostic
  ownership.
- The global `knownFailing` object becomes empty and cannot grow.

- [x] **Step 1: Generate an exact adjudication table**

Run each named baseline file through:

```powershell
node galerina.mjs check <repository-relative-file> --strict
```

Classify it as positive source, teaching example, or intentional negative
fixture. Record actual diagnostics and the test that owns them.

- [x] **Step 2: Add RED audit tests**

Prove a new implicit baseline entry, an unowned diagnostic sidecar, a stale
sidecar, and a positive file with any error all fail.

- [x] **Step 3: Repair positive sources in dependency order**

Repair compiler/core examples first, then framework examples, then benchmark
examples. Use only documented v1 syntax and run the owning package test after
each file group.

- [x] **Step 4: Convert negative fixtures to explicit evidence**

Keep OWASP and syntax-denial programs negative only where an owning test
requires them. Pin exact diagnostic codes beside the fixture and prove a
changed/missing code makes the test red.

- [ ] **Step 5: Verify zero implicit baseline**

```powershell
node scripts/audit-fungi-corpus-check.mjs
node scripts/audit-example-diagnostics.mjs
node scripts/lint-fungi.mjs
```

Expected: `knownFailing` empty, zero unowned failures, zero source-quality
findings.

Checkpoint 2026-07-29: the implicit baseline is empty; all 13 intentional
negatives have exact adjacent ownership; the audit self-test and ownership
test are green; all five affected package suites are green, including the
compiler at 5,718/5,718. The global source-quality lint was then reduced from
584 findings to zero without adding a whitelist entry. Its CRLF-offset and
Galerina `;;` comment false negatives now have regression tests; real
contract-placement and intent-syntax findings were repaired. The curriculum
detector now accepts multi-part diagnostic codes and proves that case in its
16/16 self-test; two false missing-header rows resolved, leaving 87 explicit
known-drift rows. Step 5 remains open on that exact worklist. The debt is recorded in
`docs/reports/fungi-corpus-adjudication-2026-07-29.md` and must be burned down,
not baselined into this gate.

### Task 4: Promote the two remaining compiler stages

**Files:**

- Modify: `docs/security/rd0528-compiler-authoritative-stages.json`
- Modify: `docs/security/rd0528-compiler-stages-evidence-pack.md`
- Test:
  `packages-galerina/galerina-core-compiler/tests/wat-p9-parser-parity.test.mjs`
- Test:
  `packages-galerina/galerina-core-compiler/tests/wat-p9-governance-parity.test.mjs`
- Test:
  `packages-galerina/galerina-core-compiler/tests/self-hosted-i3-functional-corpus.test.mjs`

**Interfaces:**

- `parser.fungi` and `governance-verifier.fungi` move from differential to
  authoritative specification only after fresh R3 byte parity, mutation kill,
  hash pin, #105 admission, and functional corpus evidence.
- TypeScript stays the running differential shadow.

- [ ] **Step 1: Re-run each five-part evidence pack separately**

Record exact command, count, hash, and exit for parser, then governance
verifier. Do not promote one based on the other's evidence.

- [ ] **Step 2: Run a negative ledger mutation**

Temporarily point a fixture ledger at a missing or non-admitted stage and prove
`audit-compiler-stage-twins.mjs` refuses.

- [ ] **Step 3: Add one reviewed ledger entry per stage**

Each entry names the exact evidence files and states that no `.ts` file is
deleted.

- [ ] **Step 4: Verify 7/7 compiler authority**

```powershell
node scripts/audit-compiler-stage-twins.mjs
node scripts/audit-compiler-stage-hashes.mjs
node scripts/audit-mutation.mjs --check-anchors
```

Expected: seven canonical compiler stages authoritative; SLIDE-specific files
remain non-authorizing and outside this denominator.

### Task 5: Complete governed `.fungi` authority from the top of the chain

**Files:**

- Modify: `docs/security/rd0361-authoritative-twins.json`
- Create one evidence-pack document per accepted tranche in `docs/security/`.
- Modify the owning differential tests only where a missing negative or
  anti-neutering case is demonstrated.

**Interfaces:**

- Promotion order:
  app-kernel six; tower-citizen four; core-runtime one; sentinel-I/O two;
  core-network seven.
- Every candidate stays checker-clean, executes through #105, matches its
  TypeScript shadow, kills a targeted mutation, binds a reviewed hash, and
  contains no ambient authority.

- [ ] **Step 1: Produce a live 20-candidate queue**

Use `audit-kernel-fungi-twins.mjs` output; do not copy counts from prose.

- [ ] **Step 2: Process one dependency tranche at a time**

For each tranche, run check, differential, mutation, hash, admission, and
negative failure-path evidence before editing the ledger.

- [ ] **Step 3: Reject incomplete tranches**

A single missing candidate, unsupported platform dependency, unexplained
diagnostic, or non-killed mutation keeps that candidate differential.

- [ ] **Step 4: Verify 29/29 authority**

```powershell
node scripts/audit-kernel-fungi-twins.mjs
node scripts/audit-twin-differential.mjs
node scripts/audit-mutation.mjs
```

Expected: 0 shadow, 0 differential, 29 authoritative.

### Task 6: Close package readiness and release-surface gaps

**Files:**

- Modify: `packages-galerina/galerina-registry/package.json`
- Create: `packages-galerina/galerina-registry/tests/registry-empty.test.mjs`
- Modify benchmark metadata/tests only if Task 2 still reports a gap.
- Modify: `governance/tooling-policy.json`

**Interfaces:**

- The empty registry has a real denial test: no unsigned, unreviewed, or absent
  entry can be admitted.
- All 97 workspace packages have a governed, non-empty test result; the
  exception policy contains no stale no-test exemption.

- [ ] **Step 1: Add a RED empty-registry admission test**

The test invokes the real registry admission seam and expects terminal denial
for an empty registry, unknown package, and unsigned entry.

- [ ] **Step 2: Add the package test command and remove the exemption**

Use `node --test tests/*.test.mjs`; do not add a pass-only placeholder.

- [ ] **Step 3: Verify package health**

```powershell
npm.cmd --prefix packages-galerina/galerina-registry test
node scripts/audit-tooling-contract.mjs
node scripts/component-health.mjs --json
```

Expected: 97/97 package readiness and zero package exceptions.

### Task 7: Verify the supported developer platform matrix

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `scripts/platform-smoke.mjs`
- Create: `scripts/tests/platform-smoke.test.mjs`
- Create: `docs/reports/beta-v1-platform-matrix-2026-07-29.md`

**Interfaces:**

- One hermetic smoke command checks discovery, compiler build, strict `.fungi`
  check, one Wasm execution, path normalization, and no-secret output.
- Windows 10 is executed locally. Windows 11, macOS, Ubuntu, and Debian/Fedora/
  Mint are executed where runners are available; missing external runners stay
  explicitly unverified.

- [ ] **Step 1: Add RED platform contract tests**

Prove unsupported path separators, missing required binary, malformed platform
identity, and empty test evidence all refuse.

- [ ] **Step 2: Implement the smoke command without shell concatenation**

Use argument arrays and direct child processes. Emit structured JSON with OS,
architecture, Node version, command results, and redacted paths.

- [ ] **Step 3: Run Windows 10 locally**

```powershell
node scripts/platform-smoke.mjs --json
```

- [ ] **Step 4: Configure the remaining matrix**

Use Windows, macOS, and Ubuntu hosted jobs plus Debian, Fedora, and Mint
container jobs. Keep the workflow read-only except normal build artifacts.

### Task 8: Resolve signing design and prepare the offline owner ceremony

**Files:**

- Create: `docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md`
- Create:
  `docs/reports/PROMPT-low-level-language-name-prefix-and-crypto-review-2026-07-29.md`
- Modify only public-key, registry, or signature artifacts explicitly named by
  the walkthrough after the owner performs the ceremony.

**Interfaces:**

- The walkthrough consumes no private key bytes and prints none.
- The selected hybrid signature suite and contexts are domain-separated,
  downgrade-resistant, revocation-aware, and based on current primary
  standards and library support.
- “Ready for owner” requires all pre-sign checks green and a dry run using
  disposable development keys.

- [ ] **Step 1: Research primary sources**

Use current NIST standards, IETF/RFC material, official library documentation,
and official platform support. Record dates and separate standards from
implementation maturity.

- [ ] **Step 2: Inspect offline note structure without disclosing values**

Use only key type, public identifier, custody state, and filename metadata.
Never copy values from `../notes/keys.md` or `../notes/*PRIVATE.md`.

- [ ] **Step 3: Write and test the walkthrough**

Include preflight, offline ceremony, public-artifact return, verification,
revocation/rotation, backup, rollback, and incident paths. Run the complete
procedure with disposable keys and prove deliberate tamper and downgrade
refuse.

- [ ] **Step 4: Notify the owner**

Say “ready for owner signing” only when the dry run, inventory, public artifact
paths, and post-sign verification commands are all green.

### Task 9: Close Galerina beta-v1

**Files:**

- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-25.md`
- Modify: `docs/architecture/stage6-hundred-percent-fungi-roadmap-2026-07-10.md`
- Create:
  `docs/reports/zero-trust-tooling-refactor-completion-2026-07-29.md`
- Modify: `../SLIDE/QUESTIONS-FOR-OWNER.md`
- Update relevant public KB records without copying private paths or secrets.

**Interfaces:**

- The completion report distinguishes implemented, verified, owner-blocked,
  post-v1, and deferred-to-SLIDE work.
- The roadmap is generated from live ledgers and then manually adjudicated.

- [ ] **Step 1: Resolve memory authority only with exact owner authorization**

RD-0582 identifies `958d1a5f` but explicitly says identity is not write
authority. Do not regenerate its external sidecar until the owner authorizes
that corpus and write scope.

- [ ] **Step 2: Run the terminal sequence**

```powershell
node scripts/graph-all.mjs
node scripts/graph-all.mjs --check
npm.cmd test
npm.cmd run phase-close
npm.cmd run phase-close:exhaustive
node scripts/rebuild-fusable-packages.mjs --strict
node scripts/component-health.mjs --audit-html
node scripts/gen-roadmap-subway.mjs --write
node scripts/gen-roadmap-subway.mjs --check
```

Run every direct graph, audit, generator, and package test required by the
tooling contract, fix all reproduced issues, and repeat from the first command
after the last fix.

- [ ] **Step 3: Publish no cross-runtime benchmark**

Preserve historical Galerina benchmark evidence only. The owner explicitly
deferred Wasm/Rust/Python/SLIDE comparison until executable SLIDE exists.

- [ ] **Step 4: Commit without pushing**

Verify `git diff --check`, generated provenance, private-document leak audit,
and the full acceptance report before each scoped local commit.

### Task 10: Resume SLIDE only after Task 9 is green

**Files:**

- Resume from: `../SLIDE/TODO.md`
- Resume from: `../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- Resume from Galerina pause commit: `fe648ea6`

**Interfaces:**

- Build the independent executable backend and integrate it behind the
  existing fail-closed frontend receipt/admission boundary.
- Only then measure SLIDE against Wasm, Rust, and Python and generate the
  current plus earliest-archive comparison charts.
- Only after integration begin controlled `.ts` and `node_modules` retirement.

- [ ] **Step 1: Revalidate the pause point**

Re-run the G4 7/7 tests, independent SLIDE suite, and current interface
digests before continuing.

- [ ] **Step 2: Execute the SLIDE plan**

Follow the independent repository’s own tests and stop gates; Galerina-side
evidence never substitutes for independent SLIDE evidence.

## Acceptance Summary

Galerina beta-v1 is not complete until all of the following are simultaneously
true on one clean commit:

```text
compiler authority: 7/7
governed twin authority: 29/29
workspace package readiness: 97/97
implicit .fungi known-failure baseline: 0
tooling-contract violations: 0
all required graphs/tests/audits/generators: PASS
owner signing: completed or named OWNER-BLOCKED without a false release claim
memory graph: current with exact owner authority, or named OWNER-BLOCKED
roadmap and completion report: regenerated and manually adjudicated
cross-runtime SLIDE benchmark: deliberately deferred until executable SLIDE
```
