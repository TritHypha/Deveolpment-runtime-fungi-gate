# Executable Fungi Golden Pack implementation plan

**Goal:** Provide a compact, checker-proven and selectively runtime-proven
Fungi lookup surface whose generated evidence cannot be mistaken for a complete
language specification or production authority.

**Architecture:** The checked-in case definition names an explicit source set
and exact execution vectors. A serial Node runner validates the definition,
strict-checks all sources, runs applicable vectors, derives source/toolchain
digests and atomically writes one deterministic manifest. Tests exercise the
runner in temporary directories and verify fail-closed publication.

**Technology:** Node.js ESM, `node:test`, Galerina CLI, SHA-256 and tracked
`.fungi` examples.

**Status:** Completed and committed locally on 2026-08-03. The full
phase-close passed 87/87, and the refreshed codebase index resolves the new
Golden Pack runner at the committed HEAD.

## Task 1: Prove the missing integration seam

**Files:**

- Create: `scripts/tests/fungi-golden-probe.test.mjs`

- [x] Assert that the public runner exports case validation and manifest-build
  functions.
- [x] Assert that duplicate/missing sources refuse before execution.
- [x] Assert that a failed child probe does not replace an existing manifest.
- [x] Run `node --test scripts/tests/fungi-golden-probe.test.mjs` and observe the
  expected module-not-found failure before implementation.

## Task 2: Promote the Golden Pack

**Files:**

- Create: `docs/examples/golden/README.md`
- Create: `docs/examples/golden/cases.json`
- Create: `docs/examples/golden/001-bool-if.fungi`
- Create: `docs/examples/golden/002-int-match.fungi`
- Create: `docs/examples/golden/003-result-match.fungi`
- Create: `docs/examples/golden/004-k3-check.fungi`
- Create: `docs/examples/golden/005-array-count.fungi`
- Create: `docs/examples/golden/006-array-get-option.fungi`
- Create: `docs/examples/golden/007-string-equality.fungi`
- Create: `docs/examples/golden/008-while-bool-guard.fungi`
- Create: `docs/examples/golden/009-checked-division.fungi`
- Create: `docs/examples/golden/010-checked-remainder.fungi`

- [x] Replace staging-relative header commands with repository-relative commands.
- [x] Record checker coverage for all ten examples.
- [x] Record only execution vectors the current Galerina CLI can supply and
  observe.
- [x] Record structured-input and K3 examples as checker-proven but not executed
  by this Galerina-only harness.

## Task 3: Implement fail-closed evidence generation

**Files:**

- Create: `scripts/fungi-golden-probe.mjs`
- Generate: `build/fungi-capabilities/golden-manifest.json`
- Modify: `package.json`

- [x] Export pure validation/digest helpers for focused tests.
- [x] Use serial `spawnSync`, `shell: false`, a fixed timeout and exact output
  assertions.
- [x] Hash the actual executed CLI/compiler runtime closure as well as source
  inputs.
- [x] Write atomically only after every case passes.
- [x] Add `audit:fungi-golden` and `audit:fungi-golden:update` commands.
- [x] Run the focused test until green, then generate and exact-check the manifest.

## Task 4: Make the authority easy to discover

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/examples/README.md`
- Modify: `docs/examples/TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md`
- Modify: `docs/TODO.md`

- [x] Point AI tools to the Golden Pack before prose when seeking a construct.
- [x] State that current checker/runtime evidence wins over stale prose.
- [x] Preserve the CEC as the teaching corpus and language specification path.
- [x] Record exact completion and remaining non-executed boundaries in TODO.

## Task 5: Verify and commit

- [x] Run the focused node tests.
- [x] Run the Golden Pack audit in exact-check mode.
- [x] Run example diagnostics, corpus check, path-leak and documentation-drift
  gates.
- [x] Regenerate the project graph because docs and AGENTS change.
- [x] Inspect the complete diff and repository status.
- [x] Commit only the intended Galerina files locally; do not push.
- [x] Refresh codebase-memory and verify its indexed commit equals the new HEAD.
