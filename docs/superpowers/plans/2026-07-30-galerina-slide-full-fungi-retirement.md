# Galerina, SLIDE, and full package TypeScript retirement implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Galerina beta v1, make independent SLIDE executable, move
every Galerina package implementation to authoritative `.fungi`, retire every
tracked `.ts` file and npm dependency tree under `packages-galerina`, then run
the complete governed verification and benchmark programme.

**Architecture:** Preserve a working compiler at every checkpoint. First close
the production registry and automatic operational-key rotation path. Then make
SLIDE execute a bounded, independently verified frontend contract. Convert
packages in dependency order, switching one admitted surface at a time from
TypeScript execution to `.fungi`/SLIDE execution only after semantic,
failure-edge, mutation, provenance and resource evidence passes. Rust, native
code, and Wasmtime are not rejected by language: they may remain only in
explicitly bounded, independently verified roles with no undeclared authority.

**Tech stack:** Galerina `.fungi`, independent SLIDE, Kleene K3, TypeScript and
Node only as removable bootstrap/differential inputs, Node `node:test`,
WebAssembly differential evidence, Rust Wasmtime differential oracle, hybrid
Ed25519 + ML-DSA-65 public verification, Myco, project/package/memory graphs,
and Windows PowerShell-compatible commands.

## Global constraints

- Zero trust: verify, never assume. Missing, unknown, stale, malformed,
  duplicated, ambiguous, unbounded, timed-out, unsigned or unverifiable input
  reaches a typed terminal refusal.
- `.fungi` `if` is Boolean-only. Use exhaustive `check` for K3 and exhaustive
  `match` for alternatives. The default or non-allow arm exits the trust path.
- The target is zero tracked `*.ts` files under `packages-galerina/**`; it is
  not a ban on Rust. Language identity never grants trust.
- Do not bulk rename, transpile blindly, delete the running compiler, fabricate
  a green percentage, or count a `.fungi` file that is not executed.
- Ordinary Galerina developers receive no raw pointers or manual-free
  authority. Flow-local values are destroyed at the total flow exit unless
  explicitly moved into an admitted global vault.
- Every independently resolvable package/plugin appears exactly once as a
  direct child of `packages-galerina/`. No npm-shaped nested dependency forest.
- A package switch requires positive, negative, edge-differential, mutation,
  resource-ceiling, provenance and public-boundary evidence.
- Host, crypto, driver and FFI bridges are data-plane mechanisms only. They
  cannot decide policy, collapse K3, grant capability, choose a package, or
  turn unavailable hardware into available hardware.
- Keep the optional Wasmtime implementation as an independent differential
  oracle until its replacement gate passes. It has no production, runtime or
  memory authority.
- Support Windows 10/11, macOS, Debian/Ubuntu, Fedora and Mint. A platform not
  executed is unverified, never inferred.
- Never expose or commit private keys. The cold root remains offline and
  manual. Operational rotation is automatic only inside its bounded
  delegation and custody contract.
- Keep `.gate` late to avoid rework.
- Never push. Make scoped, verified local commits and preserve unrelated work.

## Measured starting ratchets

Recorded 2026-07-30 from executable repository tools:

- `audit-selfhost-readiness --json`: 95 code packages, 459 `.ts`, 101
  `.fungi`, 2 fully `.fungi`, 50 pure-logic packages convertible now and 38
  packages with declared floors.
- `ts-retirement-graph --self-test`: 473 tracked package-source `.ts` files,
  exact corpus partition and authority-ledger reconciliation pass.
- `audit-flat-package-topology`: 99 canonical identities, one named nested
  native package debt and 95 package-local `node_modules` trees.
- `audit-flat-package-topology --post-slide`: intentionally red until the
  nested package and all 95 dependency trees are retired.
- `subprojects/`: the former `dss-host` was already moved to the flat
  development-only Wasmtime oracle; the remaining empty, untracked directory
  was removed.

These sets may only decrease through a verified replacement. Any new member is
a release failure.

---

### Task 1: Make the retirement ledger an authorizing, non-gameable gate

**Files:**

- Modify: `scripts/audit-selfhost-readiness.mjs`
- Modify: `scripts/ts-retirement-graph.mjs`
- Modify: `scripts/audit-flat-package-topology.mjs`
- Create: `scripts/tests/full-fungi-retirement-gate.test.mjs`
- Regenerate: `build/ts-retirement/**`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

**Produces:** one machine-readable ledger containing every tracked package
`.ts` path, package dependency tranche, present `.fungi` replacement,
execution authority, declared floor, replacement owner, evidence status and
retirement state.

- [x] Write a failing hermetic test proving a renamed or newly introduced
  tracked `.ts` file cannot reduce the measured debt. Fresh RED: 2/2 tests
  failed because `--terminal-check` was ignored and returned success.
- [x] Prove the test fails against the current report-only inventory, then
  close this first physical-path slice. Fresh GREEN: focused retirement
  evidence 8/8; live terminal refusal names 484 tracked package `.ts` paths
  (465 under `src`) and returns exit 1.
- [x] Add strict `--check` and `--post-slide` profiles. The terminal profile
  requires zero package `.ts`, zero nested package identities, zero package
  `node_modules`, no unexecuted `.fungi`, and no unowned host bridge. The
  post-SLIDE authority ledger binds each source and evidence artifact by
  SHA-256; older shadow-bake authority is reported but cannot authorize this
  terminal profile.
- [x] Run focused tests, regenerate the ledger and record the exact starting
  path set without changing its baseline to hide debt. Fresh evidence is
  16/16 focused tests and generator fixed point. Live debt is 491 tracked
  package `.ts` paths (477 under `src`), 104/104 production `.fungi` sources
  awaiting terminal re-admission, 31/31 detected production host boundaries
  awaiting ownership, 95 `node_modules` trees and one nested native package.
- [x] Commit the gate and synchronized roadmap/TODO checkpoint locally; never
  push it from this worker.

### Task 2: Close the production registry consumption boundary

**Files:**

- Modify: `packages-galerina/galerina-framework-app-kernel/src/registry-index.ts`
- Create:
  `packages-galerina/galerina-framework-app-kernel/src/registry-runtime.ts`
- Modify:
  `packages-galerina/galerina-framework-app-kernel/src/index.ts`
- Create:
  `packages-galerina/galerina-framework-app-kernel/tests/registry-runtime.test.mjs`
- Create:
  `packages-galerina/galerina-tower-citizen/src/registry-public-verifier.ts`
- Create:
  `packages-galerina/galerina-tower-citizen/tests/registry-public-verifier.test.mjs`

**Produces:** the canonical signed `registry-index-v2.json` is the default
runtime source, loaded by exact path and bytes, verified under the active
root-signed operational delegation, freshness floor, hybrid public keys and
revocation state before any package lookup.

- [x] Write failing tests for default signed-index consumption and refusal of
  missing, unsigned, stale, malformed, symlinked, substituted-key, downgraded,
  rollback and payload-divergent artifacts. Loader, flat-artifact, registry
  ceremony and verifier suites jointly own these cases; no single permissive
  fixture is treated as the proof.
- [x] Prove the tests fail because production currently requires caller
  injection and `admitFromRegistry` has no production caller.
- [x] Implement the smallest read-only loader. It never searches parent paths,
  downloads, falls back to an unsigned index or treats a parse success as
  admission. The cryptographic verifier is concrete Tower Citizen code; a
  caller cannot inject a callback that invents signature truth.
- [x] Run app-kernel, registry, auth, package-border and registry-authority
  suites plus mutation checks.
- [x] Record the default-consumption evidence and commit.

**Verified 2026-07-30:** Tower Citizen 480/480, app-kernel 151/151,
registry 35/35, auth 59/59, Hardened Border 98/98, authority CLI 9/9 and
registry-index CLI 20/20. The live root `21415420b447e219` delegation and
operational `f31…` index were verified from their public artifacts.
Freshness time and rollback floors remain explicit policy inputs until Task 3
binds them to authenticated epoch state.

### Task 3: Add epoch-aware state and automatic operational-key rotation

**Files:**

- Modify:
  `packages-galerina/galerina-core-sentinel-state/src/state-serializer.ts`
- Create:
  `packages-galerina/galerina-core-sentinel-state/src/key-epoch-provider.ts`
- Modify:
  `packages-galerina/galerina-core-sentinel-state/tests/state-serializer.test.mjs`
- Modify:
  `packages-galerina/galerina-tower-citizen/src/key-rotation.ts`
- Create:
  `packages-galerina/galerina-tower-citizen/src/registry-key-rotation.ts`
- Create:
  `packages-galerina/galerina-tower-citizen/tests/registry-key-rotation.test.mjs`
- Modify:
  `packages-galerina/galerina-framework-app-kernel/src/registry-authority.ts`

**Produces:** snapshots bind a non-secret epoch identity; verification accepts
only the bounded active/retiring window selected by an authenticated key ring.
Tower Citizen orchestrates propose, readiness, stage, Triple-Lock, canary,
switch, triple verification, drain, fallback, revoke and retire against real
registry delegation/public artifacts. Private-key operations remain behind a
least-authority custody provider.

- [x] Write failing snapshot tests for missing epoch, unknown epoch,
  active/retiring verification, revoked epoch, rollback, key substitution and
  ambiguous two-key success.
- [x] Write failing orchestration tests using disposable keys for every phase,
  crash/restart boundary, expired delegation, failed canary, failed drain,
  fallback and candidate revocation.
- [x] Implement epoch-aware serialization without serializing private key
  material or accepting a caller-selected verifier.
- [x] Implement the custody and registry decision adapters. Triggers propose only;
  Triple-Lock K3 gates decide; `UNKNOWN` exits without switching.
- [x] Prove automatic rotation with disposable keys, then rerun all Tower
  Citizen, Sentinel State/Egress and registry suites.
- [x] Update rotation architecture, TODO, roadmap and completion evidence;
  commit without performing a real owner ceremony.

**Automatic-control checkpoint 2026-07-30:** Snapshot v2 binds `keyEpoch` and `keyId`
into the MAC. Tower's adapter verifies the MACed ring, permits active/retired
symmetric epochs only, resolves exact custody bytes, and re-derives their
domain-separated commitment. Missing, substituted, revoked, asymmetric,
tampered or throwing inputs return no authority. Sentinel State 20/20 and
Tower Citizen 490/490 and app-kernel 158/158 pass. The automatic controller
requires a freshly authenticated checkpoint between every phase, verifies a
root-admitted candidate and candidate-signed index, and advances the exact
accepted delegation/index identity only after canary. The remaining Task-3
deployment slice is a production custody/publisher implementation that
re-signs all package manifests and crash-safely activates the complete
candidate artifact set; disposable custody is evidence, not owner-key
authorization.

### Task 4: Close Galerina beta v1 at a fresh fixed point

**Files:**

- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify:
  `docs/reports/zero-trust-tooling-refactor-completion-2026-07-29.md`

- [ ] Run strict and exhaustive phase-close, all five graph tools, all
  discovered test tools, all discovered audit/lint tools, generator fixed
  points, strict fusable rebuild and the unified five-lane harness.
- [ ] Fix every product, test, tool, generator or stale-evidence failure at
  root cause; never disable or reclassify a red gate to obtain green.
- [ ] Confirm no production path uses a caller-injected unsigned registry and
  automatic rotation passes disposable-key end-to-end evidence.
- [ ] Regenerate graphs, code/dev-tool/KB/package indexes, coverage, SBOM,
  provenance, component health and roadmap measurements.
- [ ] Commit the beta close. Do not push.

### Task 5: Make independent SLIDE executable

**Files:**

- Modify under: `../SLIDE/src/**`
- Modify under: `../SLIDE/tests/**`
- Modify: `../SLIDE/TODO.md`
- Modify:
  `docs/architecture/slide-v2-status-and-implementation-plan-2026-07-29.md`

**Produces:** an independent bounded executor for the admitted frontend-neutral
semantic archive, with explicit K3, checked arithmetic, typed memory,
capability leases, deterministic resource ceilings, canonical artifact
identity and terminal outcomes. Galerina is one frontend; the independent
fixture frontend remains the non-Galerina conformance authority.

- [ ] Re-run and pin the frozen R1 and V2-A through V2-E corpora.
- [ ] Write failing conformance tests for a complete executable body,
  post-optimization semantic re-verification, final-artifact binding,
  capability broker isolation, memory cleanup and deterministic clean/cached
  equivalence.
- [ ] Implement the smallest executable vertical slice without learned or
  cached authority and without silently falling back to Wasm.
- [ ] Add Windows, macOS, Debian/Ubuntu, Fedora and Mint build/run contracts;
  locally execute Windows and retain unexecuted platforms as CI-unverified.
- [ ] Run independent SLIDE plus Galerina frontend differential evidence.
- [ ] Update both repositories' ledgers and commit separately without pushing.

### Task 6: Build the flat native package resolver and root lock

**Files:**

- Create:
  `packages-galerina/galerina-registry/src/package-resolver.fungi`
- Create:
  `packages-galerina/galerina-registry/src/root-lock.fungi`
- Create:
  `packages-galerina/galerina-registry/src/graph-receipt.fungi`
- Create:
  `packages-galerina/galerina-registry/tests/package-resolver.test.mjs`
- Modify: `galerina.workspace.json`
- Modify: `scripts/audit-flat-package-topology.mjs`

- [ ] Write failing tests for missing, duplicate, nested, shadowed,
  symlink-escaped, undeclared, cyclic, hash-mismatched, ABI-conflicting,
  capability-expanding and multi-version-conflicting packages.
- [ ] Implement exact direct-child resolution, one root lock, deterministic
  topological order and a signed provenance receipt.
- [ ] Move the nested greeting identity to one direct
  `packages-galerina/<identity>` package and update the example app edge.
- [ ] Prove one admitted identity resolves to one admitted instance.
- [ ] Commit the flat package resolver before removing any `node_modules`.

### Task 7: Convert pure-logic package tranches

**Scope:** all packages classified `TS-ONLY (convertible-now)` or
`PARTIAL (convertible)` by the strict retirement ledger.

**Order:**

1. shared types and pure compute: core, core-logic, core-compute,
   core-economics, core-photonic, core-reports, core-vector, substrate-math,
   CPU kernels and target descriptors;
2. data/model/query/response packages and database contracts;
3. AI, web, telemetry and protocol packages;
4. tri-regex, tritsocket, graph algorithms and remaining pure devtool logic;
5. partial Sentinel Memory/Power/Time, core runtime and core security logic.

- [ ] For each public behavior, write and observe a failing `.fungi`
  functional/edge test before adding the implementation.
- [ ] Implement the smallest total `.fungi` flow set using `if` only for
  Boolean, `check` for K3 and `match` otherwise.
- [ ] Run `.ts`/`.fungi` differential, hostile input, mutation, resource and
  package tests.
- [ ] Switch package authority/execution to `.fungi`, re-run its consumers,
  then remove the exact `.ts` path only after the switch is proven.
- [ ] Update the strict retirement ledger and commit each independently
  reviewable tranche.

### Task 8: Convert the compiler and bootstrap the self-host

**Scope:** `galerina-core-compiler`, its seven canonical authoritative stages,
detached executable GIR, `.fungi` Wasm compatibility profile and SLIDE
frontend.

- [ ] Complete executable GIR so no backend recovers semantics from the AST.
- [ ] Reach byte/semantic/failure parity for every canonical stage and run the
  assurance fuzz/Z3/mutation layers.
- [ ] Execute each admitted `.fungi` compiler stage through SLIDE, preserve the
  old TypeScript only as a temporary external oracle, then re-anchor the oracle
  on frozen vectors.
- [ ] Bootstrap the complete compiler from admitted `.fungi` and prove two
  clean builds produce byte-identical compiler/artifact/provenance outputs.
- [ ] Remove compiler package `.ts` only after a clean checkout can compile,
  check, build and run `.fungi` without it.
- [ ] Run the complete compiler corpus and refusal suite before committing.

### Task 9: Replace declared host, crypto, FFI and interop floors

**Scope:** every package still classified floored after Tasks 7-8.

- [ ] Split each floor into `.fungi` policy/decision logic and a minimal
  data-plane bridge with an explicit capability, byte schema, resource limit,
  provenance identity and terminal error.
- [ ] Prefer SLIDE broker/driver/crypto providers where implemented. Rust,
  native or Wasm bridges are allowed only when independently pinned, sandboxed
  and unable to grant their own authority.
- [ ] Add injection, confused-deputy, TOCTOU, replay, downgrade, malformed
  frame, exhaustion, crash/restart and revocation tests.
- [ ] Switch callers to the admitted bridge and delete the corresponding
  TypeScript only after cross-platform evidence.
- [ ] Preserve the Wasmtime oracle until the narrow `.fungi` compatibility
  engine and independent differential replacement gate pass.

### Task 10: Retire TypeScript and npm package trees completely

- [ ] Require the strict ledger to report zero tracked
  `packages-galerina/**/*.ts`.
- [ ] Remove package-local TypeScript configs/build commands only after no
  source, test, tool, generated artifact or CI lane imports them.
- [ ] Replace every npm dependency edge with the canonical flat resolver/root
  lock edge, proving semantic/security/platform parity one dependency at a
  time.
- [ ] Remove all 95 package-local `node_modules` trees and package npm lock
  worlds only after their verified replacements exist.
- [ ] Run `audit-flat-package-topology --post-slide`; require zero nested
  packages and zero `node_modules`.
- [ ] Prove a clean environment can restore/build without npm package
  resolution inside `packages-galerina`.

### Task 11: Terminal graphs, tests, audits, build and benchmarks

- [ ] Run every graph tool and exact check mode; fix every issue.
- [ ] Run every test tool, including independent SLIDE; fix every issue.
- [ ] Run every audit/lint/mutation/security/tooling contract; fix every issue.
- [ ] Regenerate the complete build including packages, indexes, graphs,
  coverage, SBOM, provenance, fuses and charts; prove fixed-point check modes.
- [ ] Run the percentage audit and manually update the roadmap diagram from
  executable evidence.
- [ ] Run the full benchmark through the governed benchmark CLI and chart
  generator.
- [ ] Produce a second chart comparing the completed Galerina/SLIDE result
  with the earliest archived equivalent Galerina/Wasm result. Compare only
  equivalent workloads and label non-equivalent lanes uncomparable.
- [ ] Run the requested SLIDE/Wasm/Rust/Python comparison only now that SLIDE
  is executable; record hardware, OS, toolchain, samples, warmup, dispersion,
  hashes and refusal conditions.
- [ ] Update `docs/TODO.md`, `../SLIDE/TODO.md`, both roadmaps, the completion
  report, diagrams and owner questions.
- [ ] Verify zero secrets and unrelated changes, create final scoped local
  commits in each repository, and never push.

## Terminal acceptance

Completion requires fresh evidence for all of the following:

1. Galerina beta-v1 registry consumption and automatic operational-key
   rotation are fail-closed and executable with disposable keys.
2. Independent SLIDE has an executable, frontend-neutral backend.
3. `git ls-files packages-galerina | *.ts` is empty.
4. Every package implementation is authoritative and executed from `.fungi`;
   every residual non-Fungi bridge is explicitly admitted and non-authorizing.
5. `audit-flat-package-topology --post-slide` passes with zero nested package
   identities and zero package-local `node_modules`.
6. All graphs, tests, audits, mutations, generators and builds pass from a
   clean reproducible state.
7. The benchmark and both requested charts are generated from equivalent,
   provenance-bound workloads.
8. TODOs, roadmap, diagrams, reports and questions state exactly what is and
   is not complete.
