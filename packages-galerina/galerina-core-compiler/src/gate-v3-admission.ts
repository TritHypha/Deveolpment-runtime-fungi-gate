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

/** G7.1 refusal codes — statement construction fails closed. G7.2 adds the
 *  verification refusals, one code per DISTINGUISHABLE failure (§3.1): tamper
 *  and substitution are different attacks needing different responses, so they
 *  never share a code. */
export const GATE_V3_ADMISSION_CODES = {
  ADMIT_001: { code: "GATE-ADMIT-001", name: "GATE_V3_ADMISSION_NO_TARGET", message: "admission requires a non-empty target; an admission is target-scoped, never universal" },
  ADMIT_002: { code: "GATE-ADMIT-002", name: "GATE_V3_ADMISSION_PROOFS_ABSENT", message: "admission requires the proof set; a circuit whose proofs were never evaluated cannot be admitted or refused, only rejected here" },
  ADMIT_003: { code: "GATE-ADMIT-003", name: "GATE_V3_ADMISSION_VERIFIER_UNIDENTIFIED", message: "admission requires the verifier version and rule-set identity; a verdict with no verifier identity cannot be re-checked" },
  ADMIT_004: { code: "GATE-ADMIT-004", name: "GATE_V3_ADMISSION_UNRESOLVED_COMPONENT", message: "admission requires every part's implementation digest; a part with no resolved contract cannot be bound" },
  ADMIT_005: { code: "GATE-ADMIT-005", name: "GATE_V3_ADMISSION_SOURCE_TAMPERED", message: "source bytes in hand do not match the admitted source digest" },
  ADMIT_006: { code: "GATE-ADMIT-006", name: "GATE_V3_ADMISSION_WRONG_REGISTRY", message: "registry in hand does not match the admitted registry digest; admission under one component catalogue is not admission under another" },
  ADMIT_007: { code: "GATE-ADMIT-007", name: "GATE_V3_ADMISSION_WRONG_TARGET", message: "target in hand does not match the admitted target; a universal admission is not an admission" },
  ADMIT_008: { code: "GATE-ADMIT-008", name: "GATE_V3_ADMISSION_PROOFS_DISAGREE", message: "statement proofs disagree with recomputation from the artifacts in hand" },
  ADMIT_009: { code: "GATE-ADMIT-009", name: "GATE_V3_ADMISSION_SUBSTITUTED_CIRCUIT", message: "circuit in hand does not match the admitted circuit digest; the envelope is internally consistent but was issued for a different circuit" },
  ADMIT_010: { code: "GATE-ADMIT-010", name: "GATE_V3_ADMISSION_NOT_A_STATEMENT", message: "value is not a gate-v3-admission.v1 statement" },
  ADMIT_011: { code: "GATE-ADMIT-011", name: "GATE_V3_ADMISSION_VERDICT_NOT_ADMITTED", message: "statement is authentic and records a refusal; a refused admission does not become admissible by verifying" },
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
 * G7.2 — check an admission statement's BINDINGS against the artifacts in hand.
 *
 * 🔴 THIS IS HALF THE CHECK, AND THE NAME SAYS SO ON PURPOSE. It answers
 * "is this statement ABOUT these exact artifacts?" — nothing more. It does NOT
 * establish that anyone signed the statement, or that whoever did was
 * authorised to. **A statement forged wholesale, never signed by anybody, has
 * matching bindings and passes here.** That is not a defect; it is the
 * division of labour. Authenticity belongs to the release-evidence envelope
 * layer, which already owns suites, keys, delegation and revocation.
 *
 * ⚠ RENAMED from `verifyAdmissionStatement` during the G7 exit review (cycle
 * 0139), which reached for it as "the" verifier and got `ok: true` on a forged
 * statement. The old name and an `ok` field promised the whole answer; the
 * result field is now `bindingsMatch`, because no caller should be able to
 * read this return value as "admitted". **Use `verifyGateAdmissionEnvelope` or
 * `linkableFromAdmission` (scripts/lib/gate-admission-envelope.mjs) for the
 * real question** — they run the envelope FIRST and this second.
 *
 * ★ EVERY comparison is against a value recomputed from what the caller holds,
 * never against the statement's own fields — a substituted envelope is
 * trivially self-consistent, which is exactly why binding 3 must be checked
 * against the circuit in hand (`ADMIT-009`) and not against itself.
 *
 * All applicable refusals are reported in one pass (§8.1 rule 1).
 */
export function verifyAdmissionBindings(
  statement: unknown,
  inHand: {
    readonly sourceBytes: Uint8Array;
    readonly registryCanonicalForm: unknown;
    readonly circuitCanonicalForm: unknown;
    readonly proofs: readonly GIRProof[];
    readonly target: string;
  },
  seams: AdmissionSeams,
): { readonly bindingsMatch: boolean; readonly diagnostics: readonly ParseDiagnostic[] } {
  const diagnostics: ParseDiagnostic[] = [];
  const here = { file: "<admission>", line: 1, column: 1 } as const;
  const refuse = (entry: { code: string; name: string; message: string }, detail: string): void => {
    diagnostics.push({ code: entry.code, name: entry.name, severity: "error", message: `${entry.message}: ${detail}`, location: here });
  };

  // Shape first, and fail closed on anything that is not the statement kind —
  // the remaining checks would read fields off an arbitrary object.
  if (statement === null || typeof statement !== "object") {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_010, typeof statement);
    return { bindingsMatch: false, diagnostics: Object.freeze(diagnostics) };
  }

  const s = statement as Partial<GateV3AdmissionStatement>;
  if (s.kind !== "gate-v3-admission.v1"
    || typeof s.sourceDigest !== "string" || typeof s.registryDigest !== "string"
    || typeof s.circuitDigest !== "string" || !Array.isArray(s.proofs)
    || typeof s.target !== "string" || (s.verdict !== "admitted" && s.verdict !== "refused")) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_010, String((s as { kind?: unknown }).kind ?? typeof statement));
    return { bindingsMatch: false, diagnostics: Object.freeze(diagnostics) };
  }

  if (sha256(inHand.sourceBytes) !== s.sourceDigest) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_005, "sourceDigest");
  }
  if (sha256(seams.canonicalBytes(inHand.registryCanonicalForm)) !== s.registryDigest) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_006, "registryDigest");
  }
  if (sha256(seams.canonicalBytes(inHand.circuitCanonicalForm)) !== s.circuitDigest) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_009, "circuitDigest");
  }
  if (inHand.target !== s.target) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_007, `statement '${s.target}', in hand '${inHand.target}'`);
  }

  // Proofs: the statement's list must equal RECOMPUTATION — name for name,
  // status for status, in the closed declared order. A deleted entry and a
  // forged status both land here; both are the statement disagreeing with
  // what the artifacts actually prove.
  const recomputed = inHand.proofs.map((p) => `${p.name}=${p.status}`).join(",");
  const claimed = (s.proofs as readonly GIRProof[]).map((p) => `${p?.name}=${p?.status}`).join(",");
  if (recomputed !== claimed) {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_008, `recomputed [${recomputed}], statement [${claimed}]`);
  }

  if (s.verdict !== "admitted") {
    refuse(GATE_V3_ADMISSION_CODES.ADMIT_011, `verdict '${s.verdict}'`);
  }

  return { bindingsMatch: diagnostics.length === 0, diagnostics: Object.freeze(diagnostics) };
}

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
 *
 * ⚠ Building a statement is NOT admitting one: this returns an unsigned
 * assertion, and nothing downstream may treat it as authority until the
 * envelope layer has signed it and `linkableFromAdmission` has minted a
 * linkable from it.
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
