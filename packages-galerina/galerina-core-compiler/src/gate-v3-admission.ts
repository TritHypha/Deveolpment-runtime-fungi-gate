// =============================================================================
// G7.1 — the admission STATEMENT builder.
//
// Description: builds the statement an admission envelope signs over — the
//   bindings that tie one exact circuit, against one exact registry, with its
//   proof results, to one target and one verdict. This file is deliberately
//   crypto-free: bindings 9–10 of the ratified set (signature-suite identifier
//   and signatures) belong to the WRAPPING release-evidence envelope, which
//   already ships hybrid Ed25519+ML-DSA signing, a canonical encoder and a
//   suite catalogue. The admission statement is a new ROLE inside that
//   envelope (owner ruling, 2026-08-07), never a second signing layer — two
//   canonicalisers disagreeing by one byte is a signature that verifies in one
//   path and not the other.
// Version / change-control: G7.1 (KTA 37-round-seven-g7-plan.md §5).
// Pointers: scripts/lib/beta-release-evidence-envelope.mjs (the envelope);
//   gate-v3-gir.ts circuitProofs (the closed proof set); gate-v3-envelope.ts
//   is the G4 CAPABILITY envelope — same word, different job (plan §1).
//
// ⚠ NAMED gate-v3-admission, NOT "envelope": a successor who greps for
//   "envelope", finds G4's, and marks G7 done ships the exact gap G7 closes.
//
// ★ ONE-CANONICALISER RULE, enforced by a seam: this builder never encodes
//   bytes itself. The caller injects `canonicalBytes` (in production, the
//   release-evidence encoder), and every digest over a structured value goes
//   through it. The only hashing done here is SHA-256 over caller-supplied
//   RAW SOURCE BYTES — binding 1 is defined over the bytes as read, before
//   any normalisation, so no encoder may sit in front of it.
// =============================================================================

import { createHash } from "node:crypto";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";
import type { GIRProof } from "./gir-emitter.js";
import type { ParseDiagnostic } from "./parser.js";

/** G7.1 refusal codes — statement construction fails closed. */
export const GATE_V3_ADMISSION_CODES = {
  ADMIT_001: { code: "GATE-ADMIT-001", name: "GATE_V3_ADMISSION_NO_TARGET", message: "admission requires a non-empty target; an admission is target-scoped, never universal" },
  ADMIT_002: { code: "GATE-ADMIT-002", name: "GATE_V3_ADMISSION_PROOFS_ABSENT", message: "admission requires the proof set; a circuit whose proofs were never evaluated cannot be admitted or refused, only rejected here" },
  ADMIT_003: { code: "GATE-ADMIT-003", name: "GATE_V3_ADMISSION_VERIFIER_UNIDENTIFIED", message: "admission requires the verifier version and rule-set identity; a verdict with no verifier identity cannot be re-checked" },
  ADMIT_004: { code: "GATE-ADMIT-004", name: "GATE_V3_ADMISSION_UNRESOLVED_COMPONENT", message: "admission requires every part's implementation digest; a part with no resolved contract cannot be bound" },
} as const;

/** The statement an admission envelope signs over. Bindings 1–8 of the ratified
 *  set; 9–10 (suite, signatures) are envelope-level. */
export interface GateV3AdmissionStatement {
  readonly kind: "gate-v3-admission.v1";
  /** SHA-256 of the `.gate` source bytes AS READ — before any normalisation. */
  readonly sourceDigest: string;
  /** SHA-256 over canonicalBytes of the registry's canonical form. */
  readonly registryDigest: string;
  /** SHA-256 over canonicalBytes of the canonical circuit — survives
   *  whitespace and comment edits, which is the point. */
  readonly circuitDigest: string;
  readonly verifier: { readonly version: string; readonly ruleSet: string };
  /** The closed proof set, statuses RETAINED verbatim — `missing` here means
   *  NOT OBLIGED (the plan's §3 note conflated it with "unevaluated"; the
   *  source semantics are authoritative, and unevaluated proofs are refused at
   *  construction via ADMIT-002 instead). */
  readonly proofs: readonly GIRProof[];
  readonly components: readonly {
    readonly id: string;
    readonly version: string;
    readonly implementationDigest: string;
  }[];
  readonly target: string;
  /** Computed, never accepted as input — see buildAdmissionStatement. */
  readonly verdict: "admitted" | "refused";
}

export type AdmissionBuildResult =
  | { readonly ok: true; readonly statement: GateV3AdmissionStatement }
  | { readonly ok: false; readonly diagnostics: readonly ParseDiagnostic[] };

/** The seam that keeps the one-canonicaliser rule: injected, never imported. */
export interface AdmissionSeams {
  /** In production, the release-evidence canonical encoder. */
  readonly canonicalBytes: (value: unknown) => Uint8Array;
}

const sha256 = (bytes: Uint8Array): string => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

/**
 * Build the admission statement for one (source, registry, circuit, proofs,
 * target). Fails closed: any missing binding refuses with a GATE-ADMIT code.
 *
 * ★ THE VERDICT IS COMPUTED, NOT ACCEPTED. There is deliberately no verdict
 * parameter: `admitted` is derivable — verification produced zero errors and
 * no proof FAILED — and an input field would let a caller hand a forged
 * verdict to the signer. A proof with status `missing` does not block: it
 * means the obligation does not exist for this drawing (no zone types → no
 * zone proof), and refusing on it would demand proofs of properties the
 * circuit does not have. The KAT pins both directions.
 */
export function buildAdmissionStatement(
  input: {
    readonly sourceBytes: Uint8Array;
    readonly registry: GateV3Registry;
    readonly registryCanonicalForm: unknown;
    readonly circuit: GateV3Circuit;
    readonly circuitCanonicalForm: unknown;
    readonly verifier: { readonly version: string; readonly ruleSet: string };
    readonly proofs: readonly GIRProof[] | undefined;
    readonly verificationErrorCount: number;
    readonly target: string;
  },
  seams: AdmissionSeams,
): AdmissionBuildResult {
  const diagnostics: ParseDiagnostic[] = [];
  const refuse = (entry: { code: string; name: string; message: string }, detail: string): void => {
    diagnostics.push({
      code: entry.code,
      name: entry.name,
      severity: "error",
      message: `${entry.message}: ${detail}`,
      location: input.circuit.location,
    });
  };

  if (input.target.trim() === "") {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_001, `circuit '${input.circuit.name}'`);
  }
  if (input.proofs === undefined || input.proofs.length === 0) {
    // Absent and empty refuse alike: circuitProofs returns the CLOSED set, so
    // an empty list is not "nothing obliged" — it is "never evaluated".
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_002, `circuit '${input.circuit.name}'`);
  }
  if (input.verifier.version.trim() === "" || input.verifier.ruleSet.trim() === "") {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_003, `version='${input.verifier.version}' ruleSet='${input.verifier.ruleSet}'`);
  }

  // Binding 6: one entry per DISTINCT contract, in code-unit order — two parts
  // of one component bind one digest, and ordering is what keeps the canonical
  // bytes stable across authors' PARTS orderings.
  const componentKeys = [...new Set(input.circuit.parts.map((p) => `${p.component}@${p.version}`))].sort();
  const components: { id: string; version: string; implementationDigest: string }[] = [];
  for (const key of componentKeys) {
    const contract = input.registry.components.get(key);
    if (!contract) {
      refuse(GATE_V3_ADMISSION_CODES.ADMIT_004, key);
      continue;
    }
    components.push({ id: contract.id, version: contract.version, implementationDigest: contract.implementationDigest });
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics: Object.freeze(diagnostics) };

  const proofs = input.proofs!;
  const verdict: "admitted" | "refused" =
    input.verificationErrorCount === 0 && proofs.every((p) => p.status !== "failed")
      ? "admitted"
      : "refused";

  return {
    ok: true,
    statement: Object.freeze({
      kind: "gate-v3-admission.v1",
      sourceDigest: sha256(input.sourceBytes),
      registryDigest: sha256(seams.canonicalBytes(input.registryCanonicalForm)),
      circuitDigest: sha256(seams.canonicalBytes(input.circuitCanonicalForm)),
      verifier: Object.freeze({ version: input.verifier.version, ruleSet: input.verifier.ruleSet }),
      proofs: Object.freeze(proofs.map((p) => Object.freeze({ name: p.name, status: p.status }))),
      components: Object.freeze(components.map((c) => Object.freeze(c))),
      target: input.target,
      verdict,
    }),
  };
}
