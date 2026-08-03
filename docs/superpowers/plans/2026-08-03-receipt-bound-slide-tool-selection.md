# Receipt-bound SLIDE tool selection plan

Status: completed as a bounded reference increment; production authority remains closed

## Outcome

Add a bounded reference build route in which Galerina invokes one explicitly
selected SLIDE package compiler and independently verifies its installed tool
identity, bootstrap runtime identity, physical publication receipt and every
published `.slide` member. The route must not search `PATH`, a sibling checkout,
`node_modules`, or an alternate backend.

This chapter does not release production authority, convert package sources, or
retire the existing Wasm bootstrap.

## Task 1 - Canonical SLIDE tool identity

Completed.

- Add test-first coverage for a canonical reference-tool manifest.
- Inventory stable non-symlink SLIDE source files in deterministic path order.
- Bind the exact package compiler entrypoint, profile and every file byte digest.
- Add write/check commands and commit the generated manifest.

## Task 2 - Galerina verifier and build boundary

Completed.

- Add test-first refusal coverage for malformed manifests, wrong manifest/runtime
  pins, symlink or mutated tool files, child-process failure, malformed child
  output and forged/mutated publications.
- Verify the exact tool and current bootstrap runtime before execution.
- Run the child through the owned-process boundary with bounded time and output.
- Re-open the receipt and every `.slide` file; re-derive bundle digests and exact
  filenames rather than trusting the child exit code or claimed Boolean.
- Return a non-authorizing Galerina receipt with K3 authority unchanged.

## Task 3 - Explicit CLI surface

Completed.

- Expose a separate `build-slide-package` command with explicit paths and pins.
- Keep ordinary `build` behavior unchanged in this bounded chapter.
- Refuse missing, duplicate, surplus or reordered flags.

## Task 4 - Verification and documentation

Completed. Focused and real cross-repository evidence is green. Complete
repository evidence and generated indexes were refreshed at chapter close.

- Run focused SLIDE and Galerina tests first, then bounded complete repository
  tests/audits appropriate to the touched surfaces.
- Confirm Node-process count returns to baseline.
- Update both TODO files, the Galerina roadmap and completion reports.
- Commit each repository locally and do not push.
