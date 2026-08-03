# Bounded checked-read producer completion

Date: 2026-08-03

## Outcome

Galerina now derives a non-authorizing proposal for the registered bounded
checked-read family already implemented independently by SLIDE. Flow identity
may vary and the literal bound may vary from 1 through 1,000,000. The exact
flow shape, permission target, induction, checked access, exhaustive refusal
and terminal result remain fixed.

This greens the Galerina proposal producer. It does not green the production
execution switch, native authority or general loop lowering.

## Behaviour

`analyzeBoundedReadLoopEnvelope` derives:

- the flow-local `values` parameter and permission;
- equal length-gate and loop-condition bounds;
- the complete thirteen-fact structural and induction record;
- checked integer initial, step, maximum index, terminal and trip-count facts;
- the invariant `i(k)=k AND 0<=k<=bound`; and
- `executionWhenNotAdmitted: checked`.

The proposal returns K3 Unknown for a complete candidate because Galerina is
not allowed to authorize its own optimization. Missing permission, a wrong
target, mismatched bounds, bounds outside the registered range or structural
drift return deny and no proof. Source without the permission remains ordinary
valid checked `.fungi`; only the optimization proposal is refused.

The existing exact-million API and schema remain available unchanged.

## `.fungi` authority model

The self-hosted model now has a bounded proposal flow. It reuses the exhaustive
thirteen-fact decision, then checks the numeric profile boundary. A complete
candidate remains `Verdict.Unknown`; the impossible upstream Allow case is
explicitly denied. Every `check` arm terminates.

## Evidence

- test-first missing-export and missing-flow failures were observed;
- focused analyzer/model evidence: 32/32;
- exhaustive thirteen-fact space: 8,192/8,192 without authority release;
- bound 37 produces the exact independent proof values;
- bounds 0 and 1,000,001 deny;
- missing permission selects checked non-admission;
- TypeScript build and generated compiler evidence complete;
- complete compiler evidence: 5,794/5,794 across 1,218 suites;
- Node process count remains 1 -> 1.

## Remaining integration

The next bounded slice is a confined physical `.fungi`-to-`.slide` file
compiler/CLI. Galerina can then select that independently verified compiler at
the build boundary. Production selection must still bind tool identity,
source, output, context, policy and checked fallback; no ambient sibling path,
Node package lookup or compiler-proposal authority is permitted.
