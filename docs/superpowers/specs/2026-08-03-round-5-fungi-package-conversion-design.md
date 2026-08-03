# Round 5 external Fungi package conversion design

## Outcome

Round 5 is a clean external, non-authorizing re-translation exercise. It
revisits every TypeScript file with verified file-level attempt evidence from
Rounds 1, 3 and 4, separately identifies incomplete package-only history, and
adds 30 reproducibly selected backup files from different unattempted package
peers.

No Round 5 artifact enters Galerina, grants SLIDE execution authority, or
permits TypeScript or dependency deletion. Import remains a later independent
coordinator decision backed by semantic parity, strict checking, execution,
mutation, graph, effect, provenance and platform evidence.

## Approaches considered

1. **Repeat only previously successful candidates.** This is small, but it
   avoids the exact blocked and incompletely assessed surfaces Round 5 needs to
   test. Rejected.
2. **Re-run the entire 496-file corpus.** This maximizes breadth but makes
   evidence quality and review impractical before the package ABI is fully
   production-authorizing. Rejected for this round.
3. **Evidence-bound retries plus deterministic reserves.** Revisit the known
   attempt surface, recover package-only history honestly, and add 30 distinct
   reserve peers. Every assigned file receives a full-read outcome and one
   blocked file never stops the batch. Adopted.

## Source and output boundary

- Galerina, SLIDE, the Knowledge Base, standards, prior staging rounds and key
  material are read-only.
- The worker writes only to the new Round 5 external sandbox.
- Candidate dependencies remain references to one canonical top-level peer;
  nested packages, copied dependencies, install scripts and `node_modules` are
  forbidden.
- The worker re-derives source from current Galerina. Earlier candidate code is
  evidence of issues, not source to copy.

## Selection model

The primary list contains 32 exact TypeScript paths supported by candidate
manifests or an explicit Round 3/4 report. Round 2 created a corpus ledger but
no candidate package directory, so it contributes no fabricated file-level
attempt. Four packages excluded by the Round 4 manifest have incomplete
history; the manifest records one evidence-backed or deterministic recovery
entrypoint for each without relabelling it as a verified prior file attempt.

The backup list uses seed
`galerina-round-5-2026-08-03-backup-one-file-per-package-v1`. It excludes every
primary/recovery package, chooses one tracked non-declaration `src/**/*.ts`
path per remaining package by SHA-256, then selects 30 packages by a second
SHA-256 ordering. This provides reproducibility without using randomness to
decide program semantics.

## Per-file workflow

For every assigned path, the worker:

1. freezes the source commit and clean package state;
2. reads existing `.fungi`, package boundary, public surface, tests and direct
   dependencies before the TypeScript behavior;
3. writes a source dossier, control/effect ledger and parity/refusal vectors;
4. chooses `if`, `check` or `match` only from the proven subject type;
5. derives direct and transitive effects from actual operations;
6. translates every safely expressible surface and records precise blockers
   for the remainder;
7. runs strict frontend checks on each candidate source; and
8. records one final evidence-backed outcome.

`NOT ASSESSED` is not a final outcome. A full read may end in `BLOCKED`, but a
blocker must name the exact missing language, ABI, effect, authority or parity
contract. Unknown state never becomes guessed syntax or authority.

## Completion evidence

The batch is complete only when its report contains every assigned path once,
with source commit, evidence tier, outcome, represented surface, exact strict
check result and remaining execution/admission blockers. Static frontend
acceptance is labelled as such. The report must explicitly confirm that no
repository, prior staging round, dependency tree, key or private document was
modified.
