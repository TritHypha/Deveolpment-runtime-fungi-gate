# RD-0873 integration checkpoint

## Current working location

Work on `codex/rd0873-local-integration` in the existing
`.worktrees/rd0873-task6cr-hosted-evidence` directory. The directory name is
historical: the current implementation route uses local Windows/WSL evidence.
Git is optional backup; hosted observations remain advisory.

The integration branch started at `43dad8f00858de66053569cdbf6c20555298bbe2`.
Local `main` was `917aedc1d89062e673e57a548c7da187fcbeea08`; the freshly fetched
remote `main` was `730d95d77dfe3cd142b05998403570c9aab8d53d` on 2026-09-07.
The merge base is `d15f5269a0131a0674e65d5fdfe3c9ed4e4b926c` from 28 July.
Remote main has 14 exclusive commits and the source has 2,338. This includes
accumulated compiler, runtime, SLIDE and package development, not just RD-0873.

## Branch roles

| Branch | Role and integration treatment |
| --- | --- |
| `codex/rd0873-local-integration` | Active consolidation; final verified result is intended for main. |
| `codex/rd0873-task6cr-hosted-evidence` | Preserved source checkpoint at `43dad8f00`; superseded as the active working branch. |
| `main` | Final destination; its checkout is `.worktrees/rd-0873-native-fungi-bootstrap-implementation`. |
| `codex/rd-0858-unit4-process-root` | Repository-root checkout; leave its working files intact during integration. |
| `codex/rd0873-task6f-dispatch-registration` | Remote-main history through `730d95d77`; incorporate with main. |
| `codex/rd0873-pinned-upload-format-observation-source` | Advisory hosted transport; already contained by remote main. |
| `codex/rd0873-task6c-frozen-frame-candidate` | Frozen producer checkpoint `20f303edc`; preserve historical identity. |
| `codex/rd0873-task6b-split-evidence-candidate` | Earlier candidate; its eight relevant production paths already match the active source. |
| `codex/rd0873-toolchain-pin-observation-fix` | Earlier implementation and protected dirty graph residue; preserve its worktree. |
| `codex/rd0873-task6d-cumulative` | Historical documents and local scratch; do not merge wholesale. |
| `codex/rd0873-pre-restart-docs-20260905` | Historical restart documentation; retain as a checkpoint. |
| `codex/rd0873-source-origin-galerina` | Earlier source-origin/provenance checkpoints; no additional implementation identified. |
| `codex/rd0873-docs-index-manifest` | Separate, uncontained index-tool changes; Windows-specific test path handling needs correction before integration. |

This is the RD-0873 integration selection, not an inventory or deletion approval
for every historical branch or worktree. AGENTS remains a separate repository.

## Local checkpoint verification

The local capture/verification/reciprocal helper and its tests are ready for a
bounded checkpoint review. Two accessor controls failed before the validation
ordering correction and passed after it. The temporary byte-length comparison
was corrected; test names now distinguish unowned-object rejection from
revalidation of an owned buffer. Stale comments claiming implementation absence
were corrected.

On 2026-09-07, Windows x64 and Ubuntu WSL x64 each passed 30 local byte-custody
tests and six process-resource unit controls, with zero failed/skipped/cancelled
tests, using Node v24.18.0. These are synthetic controls. They do not prove frame
semantics, host identity, matching peer runs or a cross-host evidence exchange.
Task 7 and `.fungi` authoring remain closed pending their actual prerequisites.

Four uncommitted tests for the superseded hosted-workflow design failed because
their expected jobs were absent. Their original diff, together with all five
initial dirty paths, is retained locally at
`.superpowers/sdd/2026-09-07-rd0873-local-first-evidence-decoupling/pre-integration-working-changes.patch`.
Those four tests are excluded from this checkpoint; the six original resource
tests are unchanged. No valid existing test was weakened or skipped.

## Artifact custody and remaining work

- Preserve the existing narrow toolchain ignore rule. Stage explicit source and
  documentation paths only; local toolchain unpackings and scratch are excluded.
- Existing native benchmark executables have a documented tracking exception in
  `.gitignore`; none is changed by the local checkpoint. Review their provenance
  before the broader history reaches main. Do not execute binaries to identify them.
- Preserve the dirty graph report in the original toolchain worktree. Committed
  counterparts elsewhere are separate from that residue; no regenerated graph or
  fresh graph claim is part of this checkpoint.
- Reconcile main's nine other changed paths, keeping the current local route,
  exact-byte attributes and ignore rules. Preserve useful main-side document and
  advisory workflow changes.
- Complete fresh independent review, broader integration verification and final
  staged-artifact checks before promoting the combined result to main.
- Earlier host-audit findings, documentation-index drift and the separate index
  branch remain open; the focused results above do not clear those conditions.
