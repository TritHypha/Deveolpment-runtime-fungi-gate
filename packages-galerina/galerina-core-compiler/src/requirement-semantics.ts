/** Closed RD-0858 requirement decision domain: DENY < UNKNOWN < ALLOW. */
export type RequirementVerdict = -1 | 0 | 1;

export type RequirementSemanticResult =
  | Readonly<{ ok: true; verdict: RequirementVerdict }>
  | Readonly<{
      ok: false;
      reason: "EMPTY" | "NON_CANONICAL";
      ordinal: number;
    }>;

/**
 * Lift one requirement value without truthiness or integer coercion.
 * `undefined` is a refusal signal, not semantic UNKNOWN.
 */
export function liftRequirementValue(value: unknown): RequirementVerdict | undefined {
  if (value === false || value === -1) return -1;
  if (value === 0) return 0;
  if (value === true || value === 1) return 1;
  return undefined;
}

/**
 * Fold normally yielded values in source order using K3 minimum.
 *
 * DENY does not short-circuit: every later canonical value is consumed. A
 * non-canonical value refuses at its exact ordinal. Iterator failures propagate
 * through the operational envelope and are never converted to UNKNOWN.
 */
export function foldRequirementValues(values: Iterable<unknown>): RequirementSemanticResult {
  let seen = false;
  let ordinal = 0;
  let verdict: RequirementVerdict = 1;

  for (const value of values) {
    const lifted = liftRequirementValue(value);
    if (lifted === undefined) {
      return Object.freeze({ ok: false, reason: "NON_CANONICAL", ordinal });
    }

    seen = true;
    verdict = Math.min(verdict, lifted) as RequirementVerdict;
    ordinal += 1;
  }

  if (!seen) {
    return Object.freeze({ ok: false, reason: "EMPTY", ordinal: 0 });
  }

  return Object.freeze({ ok: true, verdict });
}
