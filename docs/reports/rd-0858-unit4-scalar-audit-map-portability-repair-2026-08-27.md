# RD-0858 Unit 4 scalar audit-map portability repair

Date: 2026-08-27

Status: `PASS` for the bounded scalar audit-map repair only.

## Trigger

After the scalar closure fast-forward, the owner-visible Windows checkout
returned `AUDIT_MAP_FIXED_POINT_REFUSED` while the clean LF feature worktree
passed. The same Git tree had materialized the governing plan and generated
map with CRLF bytes.

## Repair

- Exact code target: `e045e8388fe5edb4b9283d8817b967d8397b954a`.
- Exact tree: `bfe583450a34690be9404dd7ca8c42ae87786f78`.
- The governing-plan digest is derived from `HEAD:<plan>` Git-object bytes.
- The committed audit-map Git blob must equal the canonical LF candidate.
- The checked-out map must equal either that LF blob or its exact whole-file
  LF-to-CRLF projection.
- Mixed newlines, bare CR, missing or surplus bytes, semantic changes, empty or
  non-buffer reads and Git failures refuse.

## Evidence

- RED: the original target refused the physical-CRLF owner projection.
- LF focused estate: 8/8.
- Physical-CRLF focused estate: 8/8.
- `--check` and `--self-test`: PASS under both line-ending estates.
- Dirty-checkout hostile replay: one appended byte refuses.
- Independent immutable review: Critical 0 / Important 0 / Minor 0.

## Authority boundary

This receipt authorizes no additional `.fungi`, `.gate`, physical profile,
GIR/SLIDE/VOK, Trametes, production, release or `main` work. The repository
phase-close remains 94/96 and the scalar-local process-root route remains the
only admitted integration target.
