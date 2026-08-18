export const GATE_SCHEMA = "galerina.fungi-conversion-gate.run-card.v1";
export const GATE_MANIFEST_SCHEMA = "galerina.fungi-conversion-gate.manifest.v1";
export const GATE_TOOL_VERSION = "1.0.0";
export const GATE_STATUSES = Object.freeze(["ALLOW", "HOLD", "REFUSED", "ERROR"]);
export const REQUEST_OUTCOMES = Object.freeze(["CONVERTED", "BLOCKED", "MANUAL_REVIEW"]);
export const CHAIN_STAGES = Object.freeze([
  "source",
  "candidate",
  "checkedSnapshot",
  "gir",
  "physicalPackage",
  "profile",
  "vokReceipt",
]);
export const GATE_ROSTER = Object.freeze([
  "constellation-preflight",
  "source-graph-identity",
  "semantic-classifier",
  "candidate-compiler",
  "duplicate-shadow",
  "real-source-output-path",
  "typescript-retained",
  "checked-snapshot-gir",
  "slide-physical-package",
  "vok-readmission",
  "lyth-proof-work",
  "commit-policy",
]);

export class ConversionGateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ConversionGateError";
    this.code = code;
  }
}
