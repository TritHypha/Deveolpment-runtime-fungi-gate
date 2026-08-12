# Transport permit-data Fungi conversion implementation plan

> Execute task by task with test-first, fail-closed verification. Commit
> locally and never push.

**Goal:** Physically execute Tower-Citizen's exact `permitData` state decision
as package-owned Fungi without changing the live consumer or FSM authority.

**Architecture:** Extend the existing package-owned transport FSM asset with
one pure Bool projection over its frozen integer state encoding. Compile only
that named flow through independent SLIDE/VOK and retain TypeScript as the
executing differential layer.

## Constraints

- Preserve `Established -> true`, `Recovering -> false`, `Closed -> false`.
- Every unknown Int encoding returns false; non-Int physical arguments refuse.
- Add no null, NaN, `else`, `else if`, exception syntax, or loop form.
- Add or widen no SLIDE registry and raise no limit.
- Keep `permitData`, `step`, key custody, timeout logic, and all consumers live.
- Exclude crash-linked full tooling, normal phase-close, graph-all, and
  monolithic memory evaluation.

### Task 1: RED differential proof

**Create:**
`packages-galerina/galerina-tower-citizen/tests/transport-permit-data-fungi-conversion.test.mjs`

- [ ] Require package ownership of the exact Fungi asset and named flow.
- [ ] Compare TypeScript and Fungi across all three declared states.
- [ ] Prove unknown integer encodings deny and forbidden forms are absent.
- [ ] Run the focused test and retain the expected RED refusal.
- [ ] Commit only the RED proof.

### Task 2: Minimal Fungi projection

**Modify:**
`packages-galerina/galerina-tower-citizen/src/self-hosted/transport-fsm.fungi`

- [ ] Add `s4PermitData(state: Int) -> Bool` with one happy-path `if` and a
  terminal false exit.
- [ ] Strict-check the complete asset with zero errors and warnings.
- [ ] Re-run the differential proof to green.
- [ ] Commit only the source change.

### Task 3: Physical SLIDE/VOK proof

**Create:** `scripts/tests/transport-permit-data-fungi-slide.integration.test.mjs`

- [ ] Compile the exact package-owned asset and named flow through local SLIDE.
- [ ] Pin the independently observed absence or exact registry identity; never
  guess or widen one.
- [ ] Verify declared and hostile integer vectors through typed Bool receipts.
- [ ] Prove invalid arguments, inadequate work, source/receipt/envelope bytes,
  and physical artifact mutation refuse.
- [ ] Commit the green physical proof.

### Task 4: Bounded owner closure

- [ ] Run the Tower-Citizen package and canonical 100-package owner as isolated
  monitored processes.
- [ ] Regenerate only owners whose exact checks refuse as stale.
- [ ] Update TODO, active roadmap, subway SVG, and a focused report with exact
  counts and non-authority boundaries.
- [ ] Run the bounded final matrix without crash-linked aggregate wrappers.
- [ ] Commit locally, refresh the primary graph and Myco, verify exact HEAD and
  symbol queryability, and do not push.
