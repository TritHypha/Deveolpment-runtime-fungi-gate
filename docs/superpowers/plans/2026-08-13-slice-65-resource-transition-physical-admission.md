# Slice 65 Resource-Transition Physical Admission Plan

**Goal:** Physically publish and independently re-admit the exact existing
two-String `validateTransition` Fungi decision under the reconciled SLIDE pin.

## Constraints

- Keep TypeScript and all consumers active.
- Do not pack parameters, change the Fungi decision table or widen SLIDE.
- Use focused checks only; aggregate graphs, indexes, roadmaps and full closure
  remain deferred until Slice 87.
- Commit locally only and do not push.

## Task 1: Turn the stale refusal into a physical proof requirement

- [ ] Replace the Slice 45 compile-refusal assertion in
  `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs`
  with publication, exact two-argument execution, VOK verification, exhausted
  work, receipt mutation and artifact mutation requirements.
- [ ] Run that focused test against the independent SLIDE repository. A valid
  RED must be a missing proof behavior, not a missing repository or stale pin.

## Task 2: Prove the unchanged candidate

- [ ] Strict-check `resource-transition.fungi`.
- [ ] Run the package-owned 7 by 7 differential and signed-Wasm test.
- [ ] Run the focused physical suite and require the exact Slice 65 proof to
  pass without changing SLIDE or the Fungi table.

## Task 3: Conserve the result

- [ ] Record the exact result in the live conversion register, a Slice 65
  report and `docs/TODO.md`.
- [ ] Review both private Fungi skills. Record `NO_SKILL_UPDATE` if the existing
  multi-parameter/exact-boundary rules already cover the result.
- [ ] Run the conversion-queue freshness check, path-leak audit and
  `git diff --check`.
- [ ] Commit only the Slice 65 files locally; do not push.

