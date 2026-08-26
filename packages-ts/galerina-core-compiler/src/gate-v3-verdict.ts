// =============================================================================
// K3 verdict algebra — G3 rung 5 (KTA plan 27).
//
// Description: the three-valued verdict domain and its fold, exactly as
//   machine-proven in RD-0231 V3: `vAnd ≡ min` over the order
//   DENY < INDETERMINATE < ALLOW; deny dominates; the fold is monotone (an
//   ANDed operand can only lower a verdict, never raise it); and the EMPTY
//   fold is INDETERMINATE, never ALLOW.
// Version / change-control: G3 rung 5.
// Pointers: gate-v3-authority.ts (rung 6 reads this to reason about decision
//   shapes); the G4 authority semantics will compose circuit verdicts with
//   this fold and nothing else.
//
// WHY THE EMPTY FOLD IS THE LOAD-BEARING LINE: "no evidence" folding to ALLOW
//   is the fail-open an authority system dies of — an unwired obligation
//   would VANISH into permission. INDETERMINATE keeps the deny-by-default
//   lattice honest: absence of evidence is not evidence of permission, and
//   the boundary collapse (indeterminate -> deny) happens at the boundary,
//   never inside the algebra.
// =============================================================================

/** The three verdicts. Order is the ALGEBRA: deny(0) < indeterminate(1) <
 *  allow(2), and vAnd is min over that order. */
export type GateVerdict = "deny" | "indeterminate" | "allow";

/** Numeric rank backing the min fold. Not exported: the rank is an
 *  implementation of the order, not a second API for it. */
const RANK: Readonly<Record<GateVerdict, number>> = Object.freeze({ deny: 0, indeterminate: 1, allow: 2 });
const BY_RANK: readonly GateVerdict[] = Object.freeze(["deny", "indeterminate", "allow"]);

/** `vAnd` — the K3 conjunction, RD-0231 V3's proven `min`. */
export function vAnd(left: GateVerdict, right: GateVerdict): GateVerdict {
  return BY_RANK[Math.min(RANK[left], RANK[right])]!;
}

/**
 * Fold a collection of verdicts with `vAnd`.
 *
 * The EMPTY fold is INDETERMINATE — never ALLOW. An empty evidence set means
 * nothing was established; folding it to ALLOW would turn a missing
 * obligation into permission, which is the fail-open the whole K3 lattice
 * exists to forbid. (It is also not the semiring identity: min's identity is
 * the TOP element ALLOW, and using it as the empty answer is precisely the
 * trap — the algebraically convenient value is the security-wrong one.)
 */
export function foldVerdicts(verdicts: Iterable<GateVerdict>): GateVerdict {
  // `seen` rather than a null accumulator (null audit, 2026-08-07). The null
  // here was LOAD-BEARING — it was the only thing distinguishing "nothing was
  // established" from "everything allowed", and initialising to ALLOW to remove
  // it would have created the exact fail-open the comment above forbids.
  //
  // So the emptiness test is now asked as its own question instead of being
  // encoded in a sentinel. ALLOW is safe as the seed precisely BECAUSE `seen`
  // decides the empty case separately: it is min's identity, used only where
  // the identity is the right answer.
  let seen = false;
  let result: GateVerdict = "allow";
  for (const verdict of verdicts) {
    seen = true;
    result = vAnd(result, verdict);
  }
  return seen ? result : "indeterminate";
}
