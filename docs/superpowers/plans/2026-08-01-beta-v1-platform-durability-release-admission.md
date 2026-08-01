# Beta-v1 platform durability and release-admission implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Linux round-two, production rotation activation and beta-v1 release gates with independently verified, fail-closed platform and recovery evidence.

**Architecture:** A closed evidence vocabulary separates functional portability, native live operation, process termination, controlled reboot, controlled power loss and production admission. Statically linked native adapters own complete platform publication, while TypeScript and `.fungi` admission layers verify identities and combine evidence without performing native I/O. One final beta verifier requires every listed OS functional row and every admitted production durability profile before it emits a non-secret release receipt.

**Tech Stack:** Galerina `.fungi` authority contracts; strict TypeScript/Node ESM bootstrap and devtools; Rust 2021 zero-dependency native adapters; `node:test`; Rust integration tests; canonical JSON/SHA-256; existing hybrid Ed25519 + ML-DSA-65 public verification.

## Global Constraints

- Zero trust: verify rather than assume; every unknown or incomplete state terminates fail closed `_=>`.
- `.fungi` uses `if` only for Boolean values; two or more alternatives use `match`; K3 authority uses `check` and has an explicit terminal exit.
- Galerina must build and execute its bounded functional contract on Windows 10, Windows 11, Ubuntu, Debian, Fedora, Linux Mint and macOS.
- Performance, filesystem and barrier variance is allowed only when the security and language contracts remain exact.
- Production rotation is available only for an exact admitted OS/filesystem/storage/adapter profile. Unsupported storage does not prevent ordinary Galerina execution; rotation returns K3 `0` and exits.
- No shell, PowerShell bridge, spawned CLI, writable sidecar, pathname-loaded addon, environment-selected callback or private key is admitted into the production authority path.
- Native fault workers and reboot/power-loss workers are test-only, absent from default release builds and compile-refused in optimized production profiles.
- Process termination is not kernel crash; reboot is not sudden power loss; hosted CI is not bare-host durability evidence.
- Power-loss tests target only an owner-confirmed sacrificial host and sacrificial evidence volume, never a repository, home directory, system volume or unique data.
- Evidence contains no local path, raw mount document, environment value, secret, private key or PII.
- No roadmap node becomes green from implementation alone; external rows must be freshly executed and independently verified.
- Commit locally with exact pathspecs; never push.

---

### Task 1: Closed evidence vocabulary and independent verifier

**Files:**
- Create: `packages-galerina/galerina-framework-app-kernel/src/registry-durability-evidence.ts`
- Create: `packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-evidence.fungi`
- Create: `packages-galerina/galerina-framework-app-kernel/tests/registry-durability-evidence.test.mjs`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/index.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/package.json`

**Interfaces:**
- Produces: `REGISTRY_DURABILITY_EVIDENCE_SCHEMA = "galerina.registry.durability.evidence.v1"`.
- Produces: `RegistryDurabilityEvidenceClass`, `RegistryDurabilityEvidenceRecord`, `VerifiedRegistryDurabilityEvidence`.
- Produces: `verifyRegistryDurabilityEvidence(value: unknown, policy: RegistryDurabilityEvidencePolicy): VerifiedRegistryDurabilityEvidence`.
- Produces: `isVerifiedRegistryDurabilityEvidence(value: unknown): boolean` backed by a module-private `WeakSet`.

- [x] **Step 1: Write the failing closed-schema and claim-ceiling tests**

Add tests that construct each of the six exact evidence classes and prove:

```js
assert.equal(verified.schema, "galerina.registry.durability.evidence.v1");
assert.equal(verified.verdict, 0);
assert.equal(verified.authorityReleased, false);
assert.equal(Object.isFrozen(verified), true);
```

Add one test per missing, surplus, accessor, proxy, duplicate platform/profile,
non-canonical digest, unsafe count, local-path-shaped string and class escalation.
A `PROCESS_TERMINATION` record claiming `powerLoss: "PASS"` must refuse with
`REGISTRY_DURABILITY_EVIDENCE_CLASS_ESCALATION_REFUSED`.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel run build
node --test packages-galerina/galerina-framework-app-kernel/tests/registry-durability-evidence.test.mjs
```

Expected: module import failure because `registry-durability-evidence.ts` does
not exist.

- [x] **Step 3: Implement the minimal verifier and `.fungi` terminal fold**

Use a closed class order:

```ts
const EVIDENCE_CLASS_ORDER = Object.freeze([
  "FUNCTIONAL_PORTABILITY",
  "NATIVE_LIVE",
  "PROCESS_TERMINATION",
  "CONTROLLED_REBOOT",
  "CONTROLLED_POWER_LOSS",
  "PRODUCTION_ADMISSION",
] as const);
```

Own input bytes before decode, require canonical UTF-8 JSON, exact own data
properties, lowercase SHA-256 identities and sorted unique boundary IDs. The
verified wrapper remains K3 `0` and non-authorizing; only the later composition
gate can issue a production capability. The `.fungi` fold must map incomplete
or contradictory evidence to `_=>` and emit no I/O effect.

- [x] **Step 4: Run focused and package tests and verify GREEN**

Run:

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel test
node galerina.mjs check packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-evidence.fungi --strict-governance
```

- [x] **Step 5: Commit Task 1**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/src/registry-durability-evidence.ts packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-evidence.fungi packages-galerina/galerina-framework-app-kernel/tests/registry-durability-evidence.test.mjs packages-galerina/galerina-framework-app-kernel/src/index.ts packages-galerina/galerina-framework-app-kernel/package.json
git commit -m "feat(registry): add closed durability evidence"
```

---

### Task 2: Linux deterministic I/O refusal and recovery controls

**Files:**
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/lib.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_fault_refusal.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_live_host.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_process_kill.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/Cargo.toml`

**Interfaces:**
- Produces: `LinuxPublicationFault::{ShortWrite,ZeroProgress,DiskFull,FileBarrier,Publish,Reopen,DirectoryBarrier,NamespaceChanged,ReadbackChanged}`.
- Produces: test-only `linux_publication_fault_code(fault)` so every closed
  injected-fault code is verifiable off Linux without fabricating live Linux
  filesystem evidence.
- Produces: `publish_linux_generation_injected_candidate(directory, generation_id, bytes, fault) -> LinuxGenerationPublicationVerdict`, compiled only with `fault-injection`.
- Preserves: release `publish_linux_generation_candidate` and its exact no-fallback behavior.

- [x] **Step 1: Write failing pure refusal tests**

For every fault, assert a stable denial code, no candidate receipt and one of:
the final generation is absent or contains the complete expected bytes. Assert
that short-write and zero-progress are distinct and that the operation never
retries into unbounded work.

- [x] **Step 2: Run the fault test and verify RED**

Run from the native crate:

```powershell
cargo test --locked --all-features --test linux_fault_refusal
```

Expected: compile failure because the fault enum and injected entry point do
not exist.

- [x] **Step 3: Extract one bounded publication state machine**

Keep the platform syscall implementation private. Route the release entry
through `LinuxPublicationFault::None`; route the test entry through exactly one
selected fault. Validate the fault enum before opening a descriptor. Use a
checked write loop with a strict remaining-byte decrease invariant. Return
stable codes including:

```text
LINUX_WRITE_SHORT_REFUSED
LINUX_WRITE_ZERO_PROGRESS_REFUSED
LINUX_DISK_FULL_REFUSED
LINUX_FILE_BARRIER_REFUSED
LINUX_PUBLICATION_REFUSED
LINUX_REOPEN_REFUSED
LINUX_DIRECTORY_BARRIER_REFUSED
LINUX_NAMESPACE_CHANGED_REFUSED
LINUX_READBACK_MISMATCH_REFUSED
```

Do not delete uncertain pathnames after losing retained identity.

- [x] **Step 4: Add namespace and barrier hostile live cases**

Extend the ignored live suite to retain the directory descriptor, substitute a
public test namespace only after the boundary callback, and prove the anchor
recheck denies. Verify a planted file-barrier and directory-barrier refusal
cannot publish a candidate receipt.

- [x] **Step 5: Run Windows-available checks and prepare the Linux live run**

Run:

```powershell
cargo fmt --check
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked
cargo test --locked --all-features
```

Off Linux, live operations must return `LINUX_PLATFORM_UNAVAILABLE`; pure
injection/accounting tests must still run. Do not infer the Ubuntu result.

- [x] **Step 6: Commit Task 2**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/lib.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_fault_refusal.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_live_host.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/linux_process_kill.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/Cargo.toml
git commit -m "feat(durability): close Linux refusal controls"
```

---

### Task 3: Ubuntu round-two evidence verifier and handover

**Files:**
- Create: `scripts/verify-platform-durability-evidence.mjs`
- Create: `scripts/tests/verify-platform-durability-evidence.test.mjs`
- Modify: `docs/platform-handover/ubuntu-desktop/RUNBOOK.md`
- Modify: `docs/platform-handover/ubuntu-desktop/REPORT-TEMPLATE.md`
- Modify: `docs/platform-handover/ubuntu-desktop/CODEX-HANDOVER.md`

**Interfaces:**
- Produces CLI: `node scripts/verify-platform-durability-evidence.mjs --report <file> --static-receipt <file> --platform-receipt <file> --native-receipt <file>`.
- Produces one canonical JSON decision with K3 `+1`, `0` or `-1`; only a complete current-commit evidence set can return `+1` for the Linux round-two gate.

- [x] **Step 1: Write failing fixture and forgery tests**

Use temporary fixture paths. Prove valid public fixture admission and refuse:
symlinks, hard links, paths outside the reports directory, stale commit,
report/receipt mismatch, omitted live test, zero executed tests, duplicate
boundary, missing SLIDE row, authorizing child receipt, recomputed self-hash
forgery and local-path/secret-shaped output.

- [x] **Step 2: Run focused test and verify RED**

```powershell
node --test scripts/tests/verify-platform-durability-evidence.test.mjs
```

- [x] **Step 3: Implement bounded stable-handle verification**

Open every direct regular single-link file, enforce 1 MiB per file, read from
the same handle, compare pre/post metadata, decode strict UTF-8 and validate a
closed schema. Recompute each SHA-256 and require one exact Galerina commit and
one exact independent SLIDE commit. The verifier must not invoke Cargo, Node
children, a shell or a callback.

- [x] **Step 4: Update the Ubuntu return contract**

Require four exact sibling files:

```text
ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.md
ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.receipt.json
ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.slide-platform.json
ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.native-evidence.json
```

The native receipt records 10 pure tests, four live tests, nine deterministic
fault refusals and seven process-termination boundaries. Reboot and power loss
remain explicitly unverified in this round.

- [x] **Step 5: Verify and commit Task 3**

```powershell
node --test scripts/tests/verify-platform-durability-evidence.test.mjs scripts/tests/platform-smoke.test.mjs
git add -- scripts/verify-platform-durability-evidence.mjs scripts/tests/verify-platform-durability-evidence.test.mjs docs/platform-handover/ubuntu-desktop/RUNBOOK.md docs/platform-handover/ubuntu-desktop/REPORT-TEMPLATE.md docs/platform-handover/ubuntu-desktop/CODEX-HANDOVER.md
git commit -m "feat(platform): verify Ubuntu durability evidence"
```

---

### Task 4: macOS APFS candidate and Windows profile completion

**Files:**
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/lib.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_host_admission.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_live_host.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_process_kill.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/windows_host_probe.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/windows_process_kill.rs`

**Interfaces:**
- Produces: `probe_macos_host`, `publish_macos_generation_candidate`, and test-only macOS fault entry point.
- Produces: exact macOS denial codes and `MACOS_PLATFORM_UNAVAILABLE` off macOS.
- Narrows first macOS profile to local APFS on Arm64 with successful `F_FULLFSYNC`.

- [ ] **Step 1: Write failing pure macOS fact tests**

Model exact platform, architecture, APFS, local/non-removable/non-network,
single-link retained identity and full-flush availability. Refuse HFS+, FAT,
SMB/NFS, disk images, removable, virtual, unknown and missing facts.

- [ ] **Step 2: Verify RED on the current host**

```powershell
cargo test --locked --test macos_host_admission
```

- [ ] **Step 3: Implement the zero-dependency macOS profile**

Use compile-time `cfg` and direct system ABI declarations. The operation owns
exclusive staging, checked complete writes, `F_FULLFSYNC`, exclusive
publication, exact reopen, single-link identity, directory barrier and final
identity recheck. If `F_FULLFSYNC` is absent, rejected or unsupported, return a
closed denial; ordinary `fsync` is not a production fallback.

- [ ] **Step 4: Extend the common process-termination boundaries**

The macOS and Windows suites must use the same seven native boundary IDs and
old-or-new exact oracle as Linux. Windows additionally tests Windows 11
identity admission without inferring a live Windows 11 result and keeps ReFS
denied until a separate live profile exists.

- [ ] **Step 5: Run current-host complete native checks**

```powershell
cargo fmt --check
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked
cargo test --locked --all-features
cargo build --locked --release
```

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/lib.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_host_admission.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_live_host.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/macos_process_kill.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/windows_host_probe.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/windows_process_kill.rs
git commit -m "feat(durability): add macOS and complete Windows profiles"
```

---

### Task 5: Controlled reboot and power-loss experiment protocol

**Files:**
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/bin/registry-durability-recovery-worker.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/bin/registry-durability-recovery-verifier.rs`
- Create: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/recovery_protocol.rs`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/Cargo.toml`
- Create: `docs/platform-handover/durability-recovery/RUNBOOK.md`
- Create: `docs/platform-handover/durability-recovery/REPORT-TEMPLATE.md`

**Interfaces:**
- Produces test-only binaries behind `recovery-evidence` feature.
- Produces `galerina.registry.durability.recovery-arm.v1` and `galerina.registry.durability.recovery-result.v1` records.
- The worker can arm and stop; it cannot reboot, shut down or cut power.
- The verifier is read-only except for writing one new result file by exclusive creation after verification.

- [ ] **Step 1: Write failing protocol lifecycle tests**

Prove arm record canonicality, exact target/device identity, one boundary only,
exclusive result creation, stale/duplicate replay refusal, old-or-new oracle,
mixed-state refusal and inability to target a repository/home/system volume.

- [ ] **Step 2: Run the protocol test and verify RED**

```powershell
cargo test --locked --all-features --test recovery_protocol
```

- [ ] **Step 3: Implement the bounded worker and independent verifier**

The worker receives only explicit arguments, validates the sacrificial marker
created by the runbook, writes public experiment metadata, reaches one boundary
and exits with `ARMED_FOR_OPERATOR_ACTION`. It contains no reboot or power API.
The verifier independently opens the prior, candidate, checkpoint and arm
records, re-derives exact digests and emits `PRIOR`, `CANDIDATE` or `REFUSED`.

- [ ] **Step 4: Write the operator runbook**

Require a clean disposable checkout, two verified backups, a dedicated
sacrificial data volume, exact device/filesystem/controller recording and an
explicit operator confirmation immediately before reboot or power removal.
Recovery starts from a fresh boot and runs only the read-only verifier. Never
suggest performing sudden power loss on the owner's primary Windows or Ubuntu
development installation.

- [ ] **Step 5: Verify and commit Task 5**

```powershell
cargo fmt --check
cargo test --locked --all-features --test recovery_protocol
git add -- packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/bin/registry-durability-recovery-worker.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/src/bin/registry-durability-recovery-verifier.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/tests/recovery_protocol.rs packages-galerina/galerina-framework-app-kernel/native/registry-durability/Cargo.toml docs/platform-handover/durability-recovery/RUNBOOK.md docs/platform-handover/durability-recovery/REPORT-TEMPLATE.md
git commit -m "feat(durability): add controlled recovery protocol"
```

---

### Task 6: Production admission composition and rotation binding

**Files:**
- Create: `packages-galerina/galerina-framework-app-kernel/src/registry-durability-production-admission.ts`
- Create: `packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-production-admission.fungi`
- Create: `packages-galerina/galerina-framework-app-kernel/tests/registry-durability-production-admission.test.mjs`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/registry-rotation-controller.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/src/index.ts`
- Modify: `packages-galerina/galerina-framework-app-kernel/package.json`

**Interfaces:**
- Produces: `admitRegistryDurabilityProfile(manifest, evidence, authority) -> ProductionRegistryDurabilityProfile`.
- Produces: `isProductionRegistryDurabilityProfile(value)` using a private brand.
- Extends `AdvanceRegistryRotationStateOptions` with exact `durabilityProfile` and refuses before state advancement when it is missing or mismatched.
- Keeps `PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS` empty until a governed evidence manifest is committed and offline-authorized.

- [x] **Step 1: Write failing composition and no-authority tests**

Assert that copied objects, digest-only claims, self-hash-only evidence,
incomplete class ladders, mixed OS/profile identities, stale evidence,
revocation, missing offline authorization and a simulated receipt all refuse.
Assert the complete disposable chain advances exactly one rotation phase and
never widens authority on failure.

- [x] **Step 2: Run focused tests and verify RED**

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel run build
node --test packages-galerina/galerina-framework-app-kernel/tests/registry-durability-production-admission.test.mjs
```

- [ ] **Step 3: Implement private production composition**

The hybrid-root-verified private profile and its complete identity binding are
implemented. The remaining sub-step is intentionally not checked: no Node
callback or pathname-loaded adapter may be upgraded into a native production
receipt. Completion requires the statically linked in-process native-host seam;
until then the Node generation store remains host evidence only and rotation
fails closed before its forward probe.

Verify source, contract, binary, ABI, build recipe, host profile, all evidence
digests, authority window and revocation before issuing a private brand. Do not
accept a caller-provided adapter callback. The Node generation store remains
host evidence only; a production receipt must originate from the statically
linked native host and pass the production admission verifier.

- [x] **Step 4: Bind rotation before any state transition**

Require the production durability profile to match candidate generation ID,
operational key, delegation serial, index issuance, platform profile and
accepted checkpoint. A mismatch returns `Verdict.DENY`; incomplete external
evidence returns `Verdict.INDETERMINATE`; neither calls the forward probe.

- [x] **Step 5: Verify package and `.fungi` authority**

```powershell
npm.cmd --prefix packages-galerina/galerina-framework-app-kernel test
node galerina.mjs check packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-production-admission.fungi --strict-governance
```

- [x] **Step 6: Commit Task 6**

```powershell
git add -- packages-galerina/galerina-framework-app-kernel/src/registry-durability-production-admission.ts packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-production-admission.fungi packages-galerina/galerina-framework-app-kernel/tests/registry-durability-production-admission.test.mjs packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts packages-galerina/galerina-framework-app-kernel/src/registry-rotation-controller.ts packages-galerina/galerina-framework-app-kernel/src/index.ts packages-galerina/galerina-framework-app-kernel/package.json
git commit -m "feat(rotation): bind production durability admission"
```

---

### Task 7: Functional platform receipt and beta release verifier

**Files:**
- Modify: `scripts/platform-smoke.mjs`
- Modify: `scripts/tests/platform-smoke.test.mjs`
- Create: `scripts/beta-v1-release-admission.mjs`
- Create: `scripts/tests/beta-v1-release-admission.test.mjs`
- Create: `governance/beta-v1-platform-policy.json`
- Modify: `.github/workflows/platform-smoke.yml`
- Modify: `governance/status-ledger.json`

**Interfaces:**
- Platform smoke emits `galerina.platform.functional-evidence.v2`, K3 `0`, non-authorizing, with exact OS/distribution/architecture and closed six-row functional evidence.
- Release verifier consumes stable direct files and emits `galerina.beta-v1.release-admission.v1`.
- Policy requires Windows 10, Windows 11, Ubuntu, Debian, Fedora, Linux Mint and macOS rows.

- [x] **Step 1: Write failing policy and release tests**

Use public synthetic receipts to prove the complete seven-OS matrix admits.
Refuse a missing OS, proxy substitution, duplicated OS, wrong architecture,
stale commit, dirty tree, skipped test, critical warning, path/secret leak,
missing durability profile, mixed evidence identity and recomputed self-hash
forgery.

- [x] **Step 2: Run focused tests and verify RED**

```powershell
node --test scripts/tests/platform-smoke.test.mjs scripts/tests/beta-v1-release-admission.test.mjs
```

- [x] **Step 3: Implement v2 functional evidence**

Preserve the six real smoke operations. Add exact schema, repository commit,
clean-source fact, runner class and K3 non-authority. No child output,
arguments, current working directory or environment value may enter the
receipt. An exact Windows Server hosted row is useful evidence but cannot fill
the Windows 11 policy slot.

- [x] **Step 4: Implement final release composition**

Read the policy and every evidence file by stable handle with size limits.
Independently recompute platform coverage, durability coverage, phase-close
receipts, graph/generator receipts and release-build identity. Return `+1`
only for the exact complete matrix, `0` for absent external execution and `-1`
for malformed, contradictory or failed evidence.

- [x] **Step 5: Update hosted and self-hosted jobs**

Keep hosted Ubuntu/macOS/Windows Server jobs as functional evidence. Keep exact
Windows 10, Windows 11 and Mint self-hosted labels. Add explicit Debian,
Fedora and Ubuntu receipts without treating containers as durability. Upload
only bounded public JSON evidence; no private keys or production signatures.

- [x] **Step 6: Verify and commit Task 7**

```powershell
node --test scripts/tests/platform-smoke.test.mjs scripts/tests/beta-v1-release-admission.test.mjs
node scripts/platform-smoke.mjs --json --expect-os windows
git add -- scripts/platform-smoke.mjs scripts/tests/platform-smoke.test.mjs scripts/beta-v1-release-admission.mjs scripts/tests/beta-v1-release-admission.test.mjs governance/beta-v1-platform-policy.json .github/workflows/platform-smoke.yml governance/status-ledger.json
git commit -m "feat(release): add beta-v1 platform admission"
```

---

### Task 8: External evidence execution and final close

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `docs/reports/beta-v1-platform-matrix-2026-07-29.md`
- Create: `docs/reports/beta-v1-platform-durability-completion-2026-08-01.md`
- Modify: `packages-galerina/galerina-framework-app-kernel/native/registry-durability/README.md`

**Interfaces:**
- Consumes exact receipts returned by each platform handover.
- Produces one final release-admission receipt and updated factual roadmap.

- [ ] **Step 1: Run the current Windows 10 implementation matrix**

Run native default/all-feature/release checks, Windows live and process-kill
tests, app-kernel tests and local functional smoke. Record the exact Windows 10
profile without inferring Windows 11.

- [ ] **Step 2: Execute each external runbook**

Execute Ubuntu round two first, then Debian, Fedora, Mint, Windows 11 and macOS
functional/native handovers. Execute controlled reboot and power-loss only on
approved sacrificial hosts. Every refusal remains recorded.

- [ ] **Step 3: Independently admit returned evidence**

Run `verify-platform-durability-evidence.mjs` on each durability set and
`beta-v1-release-admission.mjs` on the complete matrix. Do not hand-edit a
receipt or replace a failed row with prose.

- [ ] **Step 4: Run the complete repository fixed point**

```powershell
node scripts/graph-all.mjs
node scripts/code-index.mjs
node scripts/kb-index.mjs
npm.cmd test
npm.cmd run phase-close
npm.cmd run phase-close:exhaustive
```

Also run every graph, audit, test and generator tool listed by the dev-tool
index, regenerate the full build/package indexes, and rerun the security scan.

- [ ] **Step 5: Update documents from measured facts**

Set Linux green only after its exact verifier passes. Set production rotation
and beta-v1 green only after their exact final verifier returns `+1`. If code is
complete but an external row is absent, set the node yellow and name the
missing receipt; do not leave it red as though implementation were missing.

- [ ] **Step 6: Commit final evidence and refresh codebase memory**

Use exact public evidence pathspecs, exclude private material, commit locally,
never push, then index Galerina in moderate mode and require the indexed head
to match the final commit.
