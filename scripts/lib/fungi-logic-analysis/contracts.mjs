export const LOGIC_ANALYSIS_SCHEMA = "galerina.fungi-logic-analysis.v1";
export const LOGIC_ANALYSIS_TOOL_VERSION = "1.0.0";
export const LOGIC_ANALYSIS_STATUSES = Object.freeze(["SUPPORTED", "BLOCKED", "MANUAL_REVIEW"]);
export const CONSTRUCT_IDS = Object.freeze(["if", "match", "check", "contract", "flow", "global", "vault", "hallmark"]);
export const ANALYSIS_COMMANDS = Object.freeze(["scan", ...CONSTRUCT_IDS]);

export const CONSTRUCT_REGISTRY = Object.freeze([
  Object.freeze({ id: "if", astKinds: Object.freeze(["ifStmt"]), obligations: Object.freeze(["condition:Bool", "condition-effects:proved"]) }),
  Object.freeze({ id: "match", astKinds: Object.freeze(["matchExpr", "matchArm"]), obligations: Object.freeze(["exhaustiveness:proved", "arm-order:preserved"]) }),
  Object.freeze({ id: "check", astKinds: Object.freeze(["checkExpr", "checkArm"]), obligations: Object.freeze(["arms:deny,ambig,if", "subject:Verdict"]) }),
  Object.freeze({ id: "contract", astKinds: Object.freeze(["contractDecl", "contractSetDecl"]), obligations: Object.freeze(["flow-contract:evidence-present"]) }),
  Object.freeze({ id: "flow", astKinds: Object.freeze(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl", "fnDecl"]), obligations: Object.freeze(["types:checked", "effects:checked", "governance:checked"]) }),
  Object.freeze({ id: "global", astKinds: Object.freeze(["vaultDecl"]), obligations: Object.freeze(["vault-global:implemented-and-checked"]) }),
  Object.freeze({ id: "vault", astKinds: Object.freeze(["vaultDecl", "vaultEntryDecl"]), obligations: Object.freeze(["scope:secure", "permissions:closed", "audit-policy:present"]) }),
  Object.freeze({ id: "hallmark", astKinds: Object.freeze(["hallmarkDecl"]), obligations: Object.freeze(["carrier:present", "assay-gate:present"]) }),
]);

export class LogicAnalysisError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LogicAnalysisError";
    this.code = code;
  }
}
