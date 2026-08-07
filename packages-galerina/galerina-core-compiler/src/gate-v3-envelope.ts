// =============================================================================
// Effect/capability envelope — G4 (KTA plan 27's stated remainder).
//
// Description: the circuit's REQUIRES block DECLARES an envelope; the resolved
//   components' contracts say what the circuit actually DOES. This pass
//   refuses any component effect or capability the declared envelope does not
//   cover — the envelope must be an upper bound, never prose.
// Version / change-control: G4.
// Pointers: gate-v3-parser.ts (REQUIRES); gate-v3-registry.ts (per-component
//   effects/capabilities); the registry-mode differential, whose
//   REFERENCE_ONLY entries for the reference's GATE-EFFECT-101/102 are
//   cleared by this pass (count-matched equivalence, not code identity).
//
// DIRECTION MATTERS: only UNDER-declaration refuses. A component doing
//   `database.write` under an envelope that never declared it is the envelope
//   lying to the reader — refused. The reverse (a declared effect no resolved
//   component exercises) is an over-broad envelope: not a leak, legal, and
//   deliberately NOT even a warning here — REQUIRES states an upper bound,
//   and demanding exactness would push authors to trim envelopes reactively,
//   the wrong incentive for a declaration meant to be reviewed as a budget.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";
import { CANONICAL_EFFECTS } from "./effect-checker.js";

/** G4 refusal: an effect name outside `.fungi`'s closed canonical set. */
export const GATE_SEM_012 = Object.freeze({
  code: "GATE-SEM-012",
  name: "GATE_V3_UNKNOWN_EFFECT_NAME",
  message: "effect name is not in the canonical effect vocabulary",
});

/**
 * Refuse any effect name — in a component contract OR the circuit's declared
 * envelope — that is not in `.fungi`'s canonical set.
 *
 * WHY THIS IS A PARITY FIX AND NOT A NEW OPINION. `.fungi`'s effect-checker
 * holds `CANONICAL_EFFECTS` closed and a production compile refuses an unknown
 * name outright. `.gate` had no equivalent: `GATE-SEM-009` compares contract
 * effects against the envelope, so a name misspelled CONSISTENTLY on both
 * sides satisfied it and passed clean. One governance system was accepting
 * what its twin refuses.
 *
 * WHY IT MATTERS BEYOND TYPOS: an effect name is what an admission policy
 * filters on. `databse.write` is invisible to a rule watching
 * `database.write`, so a misspelling silently exempts a component from the
 * policy meant to govern it — a fail-open reachable by a single keystroke.
 *
 * THE SET IS IMPORTED, NEVER COPIED. A second list here would drift from the
 * one `.fungi` enforces, and two vocabularies that disagree are worse than
 * one that is merely incomplete.
 *
 * CAPABILITIES ARE DELIBERATELY NOT JUDGED. They are application-defined
 * (`customer.read`, `refund.issue`) where effects name a closed set of host
 * interactions; checking them against a fixed list would refuse every
 * legitimate application.
 */
export function verifyEffectNames(circuit: GateV3Circuit, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  const seen = new Set<string>();

  // `location` is spread only when present: under exactOptionalPropertyTypes an
  // explicit `location: undefined` is NOT the same as an absent one, and the
  // diagnostic type declines the former.
  const judge = (name: string, where: string, location: ParseDiagnostic["location"] | undefined): void => {
    if (CANONICAL_EFFECTS.has(name) || seen.has(name)) return;
    seen.add(name);
    diagnostics.push({
      code: GATE_SEM_012.code,
      name: GATE_SEM_012.name,
      severity: "error",
      message: `${circuit.name}: ${where} declares effect '${name}' — ${GATE_SEM_012.message}`,
      ...(location ? { location } : {}),
    });
  };

  for (const entry of circuit.requirements.effects) judge(entry.name, "REQUIRES", entry.location);
  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`);
    if (!contract) continue;
    for (const effect of contract.effects) judge(effect, `part '${part.instance}'`, part.location);
  }
  return Object.freeze(diagnostics);
}

/** G4 refusal: a resolved component exercises an effect the circuit's
 *  declared envelope does not cover. */
export const GATE_SEM_009 = Object.freeze({
  code: "GATE-SEM-009",
  name: "GATE_V3_EFFECT_OUTSIDE_ENVELOPE",
  message: "component effect is not covered by the circuit's declared REQUIRES envelope",
});

/** G4 refusal: same axis, capabilities. Two fields, two invariants, two codes. */
export const GATE_SEM_010 = Object.freeze({
  code: "GATE-SEM-010",
  name: "GATE_V3_CAPABILITY_OUTSIDE_ENVELOPE",
  message: "component capability is not covered by the circuit's declared REQUIRES envelope",
});

/**
 * Refuse every (part, effect/capability) pair the declared envelope misses.
 *
 * Emission is per pair — a part with two undeclared effects is two refusals,
 * and two parts sharing one undeclared effect are two refusals — because each
 * is a separate lie the envelope tells, and fixing one must not hide the
 * next. Unresolved parts are not judged (resolution owns that refusal).
 */
export function verifyEffectEnvelope(circuit: GateV3Circuit, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const declaredEffects = new Set(circuit.requirements.effects.map((entry) => entry.name));
  const declaredCapabilities = new Set(circuit.requirements.capabilities.map((entry) => entry.name));
  const diagnostics: ParseDiagnostic[] = [];

  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`);
    if (!contract) continue;
    for (const effect of contract.effects) {
      if (declaredEffects.has(effect)) continue;
      diagnostics.push({
        code: GATE_SEM_009.code,
        name: GATE_SEM_009.name,
        severity: "error",
        message: `${circuit.name}: part '${part.instance}' exercises effect '${effect}' — ${GATE_SEM_009.message}`,
        location: part.location,
      });
    }
    for (const capability of contract.capabilities) {
      if (declaredCapabilities.has(capability)) continue;
      diagnostics.push({
        code: GATE_SEM_010.code,
        name: GATE_SEM_010.name,
        severity: "error",
        message: `${circuit.name}: part '${part.instance}' requires capability '${capability}' — ${GATE_SEM_010.message}`,
        location: part.location,
      });
    }
  }
  return Object.freeze(diagnostics);
}
