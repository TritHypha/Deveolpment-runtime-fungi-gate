# Report Status Fungi Conversion Implementation Plan

**Goal:** Prove the reports package's private `selectReportStatus` decision as
an exact nominal-record `.fungi` twin through canonical execution and physical
SLIDE/VOK without switching or retiring TypeScript.

**Architecture:** Add one package-owned Fungi asset with a closed record and a
pure priority decision. Bind it to the existing public TypeScript caller in a
differential test, then compile the exact bytes into a physical `.slide` and
verify them independently through VOK.

## Constraints

- [ ] Preserve `critical > error > warning > ok` exactly.
- [ ] Admit only an exact `ReportStatusCounts` record of three `Int` fields.
- [ ] Use no null, NaN, `else if`, exception syntax, `for`, `while` or `loop`.
- [ ] Add no effect, capability, contract permission, Hallmark, border grant or
  host API.
- [ ] Keep TypeScript and all consumers active.
- [ ] Commit locally only; do not push.
- [ ] Do not run full tooling, `graph-all`, normal phase-close or a monolithic
  memory evaluation.

## Task 1: Differential RED

- [ ] Add `tests/report-status-fungi-conversion.test.mjs`.
- [ ] Bind the exact private TypeScript source shape and public
  `summarizeDiagnostics` caller.
- [ ] Require the absent package-owned Fungi asset and export; retain the
  intended missing-file/export RED.

## Task 2: Canonical Fungi proof

- [ ] Add `src/self-hosted/report-status.fungi` with the nominal record and pure
  priority flow.
- [ ] Check strict types and governance.
- [ ] Compare TypeScript, typed interpretation and signed/admitted Wasm over a
  bounded complete priority family.
- [ ] Run the focused test and the owning reports package.

## Task 3: Physical SLIDE/VOK proof

- [ ] Add `scripts/tests/report-status-fungi-slide.integration.test.mjs`.
- [ ] Compile and publish the exact Fungi bytes through independent SLIDE.
- [ ] Re-admit and verify typed String receipts for every bounded vector.
- [ ] Prove exact-object and typed-border refusals plus source and artifact
  mutation refusal with zero skips.

## Task 4: Governed closure

- [ ] Register the physical test in the governed tooling manifest.
- [ ] Update package and root TODOs, the active roadmap, and a dated report.
- [ ] Run the focused compiler/package/physical checks and the canonical
  100-package owner.
- [ ] Refresh Golden, retirement, semantic, package/project/KB/Fungi/code
  graphs, canonical counts, percentage status, roadmap/subway and both indexes
  through their owners.
- [ ] Verify the final local commit and a clean tracked worktree; do not push.

