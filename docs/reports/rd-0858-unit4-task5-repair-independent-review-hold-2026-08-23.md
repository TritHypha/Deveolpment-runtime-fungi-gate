# RD-0858 Unit 4 Task 5 repair independent review - HOLD

Date: 2026-08-23

## Audit identity

- Exact target: `918f6259381aa34b81a3346b7d4dfc61c41a2a29`
- Unit 4 start boundary: `895fde40`
- Reviewer: fresh independent Codex reviewer; no audited-repository changes.
- Verdict: **HOLD** with one Important and one Low finding.
- Authority: non-authorizing; Task 2, Tasks 6-8 and all `.fungi` work remain locked.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| Important | The committed protocol regression changed registry digest metadata rather than the actual imported protocol bytes, so it did not discriminate the original package-graph defect. | An independent disposable-copy mutation of the real protocol file was correctly refused before its marker executed, proving product behavior but not permanent RED capability. |
| Low | TODO, design and plan text still described the graph as pending and the exact range as 37 paths. | The audited graph check was 9/9 and the exact range was 38 paths with zero `.fungi`. |

## Passing evidence retained

- TypeScript typecheck/build and Rust format/check: PASS.
- Focused protocol/worker/launcher suite: 52/52 PASS.
- Adjacent semantics/interpreter/owned-process suite: 50/50 PASS.
- Project graph: 9/9 PASS with the explicit KB directory.
- Actual imported-protocol mutation: refused before bootstrap; marker absent.
- A 1,750 ms pre-registry delay produced `WORKER_TIMEOUT`, `ERROR`, exit 126,
  measured duration 2,219 ms, truthful identity digests and exact missing evidence.
- Exact range: 38 changed paths and zero `.fungi` paths.
- Audited worktree remained clean; Task 2 and Tasks 6-8 stayed locked.

## Limitation

The independent reviewer could resolve repaired symbols through the external
graph project but could not read its `indexed_head_sha` metadata. The primary
agent separately recorded an exact external graph receipt at the audited target.

## Disposition

Replace the metadata-only test with an actual imported-byte mutation, prove its
RED capability, refresh current checkpoint text and exact graph evidence, then
obtain a new independent review. Passing product behavior does not override the
permanent-control gap.
