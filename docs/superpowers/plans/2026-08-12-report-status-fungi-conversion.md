# Report Status Fungi Conversion Implementation Plan

**Goal:** Prove the reports package's private `selectReportStatus` decision as
an exact nominal-record `.fungi` twin through canonical execution and physical
SLIDE/VOK without switching or retiring TypeScript.

**Architecture:** Add one package-owned Fungi asset with a closed record and a
pure priority decision. Bind it to the existing public TypeScript caller in a
differential test, then compile the exact bytes into a physical `.slide` and
verify them independently through VOK.

## Constraints

- [x] Preserve `critical > error > warning > ok` exactly.
- [x] Admit only an exact `ReportStatusCounts` record of three `Int` fields.
- [x] Use no null, NaN, `else if`, exception syntax, `for`, `while` or `loop`.
- [x] Add no effect, capability, contract permission, Hallmark, border grant or
  host API.
- [x] Keep TypeScript and all consumers active.
- [x] Commit locally only; do not push.
- [x] Do not run full tooling, `graph-all`, normal phase-close or a monolithic
  memory evaluation.

## Task 1: Differential RED

- [x] Add `tests/report-status-fungi-conversion.test.mjs`.
- [x] Bind the exact private TypeScript source shape and public
  `summarizeDiagnostics` caller.
- [x] Require the absent package-owned Fungi asset and export; retain the
  intended missing-file/export RED.

## Task 2: Canonical Fungi proof

- [x] Add `src/self-hosted/report-status.fungi` with the nominal record and pure
  priority flow.
- [x] Check strict types and governance.
- [x] Compare TypeScript, typed interpretation and signed/admitted Wasm over a
  bounded complete priority family.
- [x] Run the focused test and the owning reports package.

## Task 3: Physical SLIDE/VOK proof

- [x] Add `scripts/tests/report-status-fungi-slide.integration.test.mjs`.
- [x] Compile and publish the exact Fungi bytes through independent SLIDE.
- [x] Re-admit and verify typed String receipts for every bounded vector.
- [x] Prove exact-object and typed-border refusals plus source and artifact
  mutation refusal with zero skips.

## Task 4: Governed closure

- [x] Register the physical test in the governed tooling manifest.
- [x] Update package and root TODOs, the active roadmap, and a dated report.
- [x] Run the focused compiler/package/physical checks and the canonical
  100-package owner.
- [x] Refresh Golden, retirement, semantic, package/project/KB/Fungi/code
  graphs, canonical counts, percentage status and roadmap/subway through their
  owners.
- [x] Refresh the primary codebase graph and Myco index at the final commit and
  verify the new report-status flow is queryable.
- [x] Review both public Fungi skills, commit reusable exact-record, reporting,
  text-budget and slice-close guidance, and verify each skill independently.
- [x] Verify the final local commit and a clean tracked worktree; do not push.
