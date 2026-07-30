# Governed memory and Wasmtime-oracle implementation plan

Date: 2026-07-30  
Design:
`../specs/2026-07-30-governed-memory-and-wasmtime-oracle-design.md`

## Task 1: Freeze the decision and continuity state

- Add the accepted design.
- Update `docs/TODO.md` with the current task, exact paths, and non-claims.
- Update `SLIDE/TODO.md` and `SLIDE/QUESTIONS-FOR-OWNER.md`: plaintext external
  sidecar write is rejected, so it is no longer an owner blocker.
- Commit the design checkpoint before structural migration.

## Task 2: Make the no-sidecar and injection contract executable

Files:

- `scripts/tests/memory-graph-generator.test.mjs`
- `scripts/memory-graph.mjs`
- `scripts/tests/graph-all.test.mjs`
- `scripts/graph-all.mjs`
- `scripts/run-phase-close.mjs`

Sequence:

1. Replace the test that expects in-place plaintext generation with tests that
   require zero source-tree writes, strict limits, and injection/control
   refusal.
2. Add a query-output test proving retrieved descriptions are quoted,
   length-bounded, control-clean, and labelled untrusted.
3. Run the focused tests red against the old implementation.
4. Refactor the tool to derive an ephemeral graph in memory.
5. Make `--check` a read-only source/health validation rather than sidecar
   drift comparison.
6. Remove personal memory from the repository-owned `graph:all` aggregate.
7. Run focused tests green.

## Task 3: Migrate the Wasmtime experiment into the flat topology

Files:

- `scripts/audit-wasmtime-presence.mjs`
- `packages-galerina/galerina-devtools-wasmtime-oracle/**`
- `galerina.workspace.json`
- active Wasmtime/DSS documentation

Sequence:

1. Add a failing layout assertion that requires the new direct-child package
   and refuses the legacy `subprojects/dss-host` path.
2. Run it red.
3. Move the tracked Rust crate without changing its locked dependency bytes.
4. Add the package manifest and package contract.
5. Rename the Rust crate/binary and active terminology from `dss-host` to
   `galerina-wasmtime-oracle`.
6. Correct fixture-relative paths.
7. Update the availability gate and phase-close comments.
8. Run Rust tests, cargo metadata, Wasmtime gate self-tests, and the flat
   package audit.

## Task 4: Create independent review prompts

Create one self-contained document per question under:

`docs/research-prompts/sidecar-and-wasmtime/`

1. governed memory contract versus conventional memory safety;
2. memory-read and graph prompt-injection resistance;
3. sidecar-free encrypted immutable graph architecture;
4. `dss-host` capability inventory and preservation/removal audit;
5. SLIDE runner, broker, and memory-authority threat model;
6. Wasmtime development-oracle supply-chain and sandbox configuration;
7. flat package/SLIDE migration and deletion gates;
8. adversarial tests, falsification criteria, and measurable acceptance.

Each prompt is read-only, asks for facts/inferences/proposals to be separated,
requires primary sources, forbids secrets and external writes, and requests a
verdict, evidence map, attack paths, alternatives, falsification tests, and
unresolved questions.

## Task 5: Update active architecture and status

- Update active Galerina DSS/Wasmtime references.
- Add a supersession note to the older constellation and trusted-environment
  documents without rewriting their historical content.
- Update the Galerina/SLIDE integration map, roadmap, completion report, and
  both TODOs.
- Regenerate package, project, KB, and dev-tool indexes.

## Task 6: Verification and commits

Focused:

- memory graph tests and self-test;
- graph-all tests;
- Wasmtime presence self-test/layout;
- flat-package topology self-test and live audit;
- Rust oracle `cargo test --locked`;
- package graph and workspace validation.

Broad:

- scripts suite;
- graph generation and check;
- all applicable audit/lint gates;
- strict and exhaustive phase close if the focused migration is green.

Commit Galerina and SLIDE separately. Never push. Preserve unrelated work.

