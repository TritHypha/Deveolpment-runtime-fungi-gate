# RD-0858 Unit 4 Task 5 independent implementation review - HOLD

Date: 2026-08-23

## Audit identity

- Exact target: `a1544200ee39959fd095d11648184119b6bc5c36`
- Unit 4 start boundary: `895fde40`
- Reviewer: fresh independent Codex reviewer; the reviewer made no repository changes.
- Verdict: **HOLD** with one High, two Medium and one Low finding.
- Authority: non-authorizing; Task 2, Tasks 6-8 and all `.fungi` work remain locked.

## Findings

| Severity | Finding | Independent reproduction |
|---|---|---|
| High | The registered worker entry imported `requirement-process-protocol.js`, but the registry did not bind that dependency and `packageRootDigest` hashed only root-path text. | A modified unregistered protocol module executed a pre-bootstrap marker while the registered worker digest stayed unchanged and the launcher returned its normal non-authorizing refusal receipt. |
| Medium | Receipts hard-coded zero registry/process-owner identities, zero duration, empty missing evidence and `REFUSED` even for a timeout. | Fresh timeout execution reproduced the zero/misclassified fields. |
| Medium | The configured deadline began inside worker exchange, after registry verification, environment construction, process creation, image verification and resume. | Source and control-flow inspection located the clock reset after those steps. |
| Low | The current TODO evidence named an older exact head and path count. | Exact Git range evidence showed `a1544200` and 37 paths rather than the documented values. |

## Passing evidence retained

- TypeScript typecheck/build: PASS.
- Rust format/check: PASS.
- Focused protocol/worker/launcher suite: 51/51 PASS at the audited target.
- Broader semantics/interpreter/process suite: 96/96 PASS at the audited target.
- Project graph check: 9/9 PASS with the explicit KB root.
- Exact range: 37 changed paths and zero `.fungi` paths.
- Ready-before-write controlled pairing: repaired target stayed marker-free; its exact repair parent disclosed the marker and failed the current detector.
- Audited worktree remained clean.

## Disposition

Repair package-graph admission, receipt truth and the whole-operation deadline;
refresh current documentation and exact graph evidence; then obtain a new
independent review. Passing author tests do not override this HOLD.
