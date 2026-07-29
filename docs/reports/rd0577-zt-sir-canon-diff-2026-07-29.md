# RD-0577 ZT-Sir canon diff

**Status:** VERIFIED-CURRENT for the read-only comparison below; PROPOSED for
any future canon change.

**Date:** 2026-07-29

## Scope and authority

RD-0577 was compared against the current `Claude-Zero-Trust-Rules-Sir`
`CLAUDE.md`, all four `brains/*.md` rule modules, and `README.md` at commit
`ff09ee0`. The canon working tree was clean on `main`.

No canon file was changed. RD-0577 identifies that repository as on hold, and
the current Galerina/SLIDE authority does not lift that hold. This report is a
verified disposition for a future owner-authorized canon session.

## Candidate disposition

| RD-0577 candidate | Current canon comparison | Disposition |
|---|---|---|
| 1. Closed “no trust follows from” list plus exact evidence tuple | ZT-08, ZT-12, and ZT-13 establish verification, least privilege, and no ambient authority, but do not enumerate the false trust grounds or require current evidence bound to the exact subject, bytes, target, request, and lifecycle. | **SHARPER-VERSION-AVAILABLE** |
| 2. Fail-closed is not fail-stop | ZT-11 requires gates to fail closed, but does not define the current trust path, cleanup obligations, durable `outcome-unknown`, less-authoritative return, or the operation-to-component-to-process escalation boundary. | **SHARPER-VERSION-AVAILABLE; highest-value port** |
| 3. No implicit fallthrough | ZT-11 prevents skip-to-green in general, but no rule requires total authority-bearing branch handling or an explicit terminal default. | **GENUINELY-ABSENT** |
| 4. Receipts are evidence, not permission | No current rule defines receipt bindings, freshness-constrained reuse, or forbids treating a receipt as a bearer capability. | **GENUINELY-ABSENT** |
| 5. Models propose but do not authorize | ZT-08 says not to trust tools or oneself, and ZT-14 asks whether uncertainty became a decision. No rule expressly prohibits a model from authorizing, widening constraints, installing, suppressing evidence, or mapping uncertainty to allow. | **GENUINELY-ABSENT** |
| 6. Legacy-cut list | ZT-11 through ZT-13, ZT-18, ZT-21, ZT-63, and ZT-71 cover parts of the failure classes. The closed list—especially optional security controls whose absence silently succeeds—is not present. | **PARTLY-COVERED; SHARPER CONSOLIDATION AVAILABLE** |
| 7a. Observation does not create authority | ZT-08, ZT-09, ZT-13, and ZT-14 provide the posture, but not the attributed-observation record or its admission pipeline. | **SHARPER-VERSION-AVAILABLE** |
| 7b. Origin does not create memory safety | No current rule says that language, compiler, signature, extension, or prior success cannot prove memory safety. | **GENUINELY-ABSENT** |
| 7c. Independence has no authority shortcut | No current rule defines implementation independence or forbids importing the other party’s implementation as proof. | **GENUINELY-ABSENT** |
| 8. JPL “Power of 10” precedent | The canon has no equivalent external-precedent note. This is supporting rationale, not a new zero-trust rule, and RD-0577 has not verified the primary source. | **DEFER until primary-source verification** |

## Recommended landing shape if the hold is lifted

1. Add a CORE rule for scoped fail-closed trust-path termination, including
   cleanup, bounded refusal evidence, `outcome-unknown`, and escalation only
   when isolation cannot be restored.
2. Add a CORE rule combining the false-trust enumeration with the exact
   current-evidence tuple.
3. Add a CORE rule that models may propose but never authorize and may never
   map uncertainty to allow.
4. Route total authority-bearing control flow and the consolidated legacy-cut
   list to the architect/custodian rules as appropriate.
5. Add receipt non-authority and observation admission as universal boundary
   rules. Keep product terms such as SLIDE, GIR, K3, `.slide`, and
   `exit_current_trust_path` out of the product-agnostic wording.
6. Preserve continuous stable rule numbering and update every count/index
   claim atomically.

The rules should be ported as principles, not copied as branded syntax. No
tooling should enter the text-only canon without a separate owner decision.

## Relationship to Galerina and SLIDE

This comparison does not weaken or defer the binding Galerina/SLIDE rules.
`triLowLevel-v2/06-ZERO-TRUST-RULES.md` and the architectural invariants in
`triLowLevel-v2/00-CHARTER.md` remain the applicable SLIDE design contract.
The ZT-Sir work is a product-agnostic reuse opportunity, not an authority
source for Galerina implementation.

## Open owner-only gates

- Lift or retain the hold on `Claude-Zero-Trust-Rules-Sir`.
- Confirm custody before any future commit; absent a new grant, owner pushes.
- Decide separately whether tooling may ever enter that deliberately
  text-only repository.
- Verify Candidate 8 from the primary JPL/NASA source before citing it.
