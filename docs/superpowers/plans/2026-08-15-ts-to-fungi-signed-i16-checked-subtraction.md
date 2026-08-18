# Signed-i16 checked-subtraction converter plan

> Execute in place under the user's full-auto instruction. Do not stage, commit, push, or retire TypeScript.

## Preconditions

- [x] Preserve TypeScript as the whole-domain oracle.
- [x] Limit discovery/test selection to 10 examples.
- [x] Require duplicate and semantic-shadow checks for every candidate.
- [x] Enforce the 40-new-unique-`.fungi` commit gate and one-report cadence.
- [x] Verify SLIDE has checked subtraction and lacks logical unsigned right shift.

## Task 1: specify and test the closed source shape

- [x] Write and self-review the approved design.
- [x] Add classifier tests for direct one- and two-parameter signed-i16 subtraction.
- [x] Add lowerer, boundary-vector, compiler, and physical-evidence tests.
- [x] Add refusal tests for nesting, neighbouring arithmetic, mixed bitwise operations, widening, and forged markers.
- [x] Run focused tests and record the expected RED: two expected positive failures and one closed-refusal pass.

## Task 2: implement minimal classification

- [x] Admit `MinusToken` only for one direct subtraction over number parameters or direct signed-i16 literals.
- [x] Record the signed-i16 numeric domain and checked-subtraction marker without changing authority flags.
- [x] Keep existing signed-i32 and bitwise-AND behavior unchanged.
- [x] Refuse every other arithmetic operator and nested/mixed expression.

## Task 3: implement exact lowering and vectors

- [x] Lower direct subtraction to Fungi checked subtraction syntax.
- [x] Evaluate differential vectors with JavaScript subtraction.
- [x] Use the fixed signed-i16 vector domain and prove extrema remain signed i32.
- [x] Emit and propagate the exact arithmetic restriction marker.
- [x] Refuse missing or forged arithmetic markers.

## Task 4: verify and trial the block

- [x] Run focused RED-to-GREEN tests: 3/3 GREEN after the expected RED.
- [x] Run adjacent converter tests: 35/35 GREEN.
- [x] Run the complete converter suite: 49/49 GREEN.
- [x] Run one graph-backed discovery trial capped at 10: 312 scopes accounted, zero selected, explicit exhausted result.
- [x] Convert and promote only real-package candidates with complete compiler/physical/mutation evidence: no source matched the closed profile, so no file was manufactured or promoted.
- [x] Run exact duplicate and alpha-shadow checks on every pending `.fungi`: 4/4 unique.
- [x] Confirm the worktree commit gate still refuses below 40 new unique `.fungi`: correctly refused at 4.
- [x] Leave all files unstaged and unpushed.
