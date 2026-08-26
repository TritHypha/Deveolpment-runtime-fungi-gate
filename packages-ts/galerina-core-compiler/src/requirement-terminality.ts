import { type AstNode } from "./parser.js";

export const MAX_REQUIREMENT_TERMINALITY_DEPTH = 256;
export const MAX_REQUIREMENT_TERMINALITY_NODES = 4_096;

export type RequirementTerminalityState = "TERMINAL" | "NON_TERMINAL" | "UNRESOLVED";

export type RequirementTerminalityResult = Readonly<{
  state: RequirementTerminalityState;
  reason:
    | "RETURN"
    | "FAULT"
    | "SEQUENCE_TERMINATES"
    | "BRANCHES_TERMINATE"
    | "MATCH_TERMINATES"
    | "FALLTHROUGH"
    | "MISSING_BRANCH"
    | "NON_EXHAUSTIVE_MATCH"
    | "UNSUPPORTED_NODE"
    | "MALFORMED"
    | "DEPTH_LIMIT"
    | "NODE_LIMIT";
  path: readonly number[];
}>;

export type RequirementTerminalityOptions = Readonly<{
  maxDepth?: number;
  maxNodes?: number;
}>;

function result(
  state: RequirementTerminalityState,
  reason: RequirementTerminalityResult["reason"],
  path: readonly number[],
): RequirementTerminalityResult {
  return Object.freeze({ state, reason, path: Object.freeze([...path]) });
}

/**
 * Prove that a requirement handler cannot reach the guarded continuation.
 * Unknown, malformed and over-bound shapes never mint terminality.
 */
export function proveRequirementHandlerTerminality(
  node: AstNode | undefined,
  options: RequirementTerminalityOptions = {},
): RequirementTerminalityResult {
  const maxDepth = options.maxDepth ?? MAX_REQUIREMENT_TERMINALITY_DEPTH;
  const maxNodes = options.maxNodes ?? MAX_REQUIREMENT_TERMINALITY_NODES;
  let visited = 0;

  const visit = (
    current: AstNode | undefined,
    depth: number,
    path: readonly number[],
  ): RequirementTerminalityResult => {
    if (current === undefined) return result("UNRESOLVED", "MALFORMED", path);
    if (depth > maxDepth) return result("UNRESOLVED", "DEPTH_LIMIT", path);
    visited += 1;
    if (visited > maxNodes) return result("UNRESOLVED", "NODE_LIMIT", path);

    switch (current.kind) {
      case "returnStmt":
        return result("TERMINAL", "RETURN", path);
      case "faultStmt":
        return result("TERMINAL", "FAULT", path);

      case "requireArm": {
        if (current.children?.length !== 1) return result("UNRESOLVED", "MALFORMED", path);
        return visit(current.children[0], depth + 1, [...path, 0]);
      }

      case "block": {
        const children = current.children ?? [];
        for (let index = 0; index < children.length; index += 1) {
          const child = visit(children[index], depth + 1, [...path, index]);
          if (child.state === "TERMINAL") {
            return result("TERMINAL", "SEQUENCE_TERMINATES", child.path);
          }
          if (child.state === "UNRESOLVED") return child;
        }
        return result("NON_TERMINAL", "FALLTHROUGH", path);
      }

      case "ifStmt": {
        const thenBranch = current.children?.[1];
        const elseBranch = current.children?.[2];
        if (thenBranch === undefined || elseBranch === undefined) {
          return result("NON_TERMINAL", "MISSING_BRANCH", path);
        }
        const thenResult = visit(thenBranch, depth + 1, [...path, 1]);
        if (thenResult.state === "UNRESOLVED") return thenResult;
        const elseResult = visit(elseBranch, depth + 1, [...path, 2]);
        if (elseResult.state === "UNRESOLVED") return elseResult;
        if (thenResult.state === "TERMINAL" && elseResult.state === "TERMINAL") {
          return result("TERMINAL", "BRANCHES_TERMINATE", path);
        }
        return thenResult.state === "NON_TERMINAL" ? thenResult : elseResult;
      }

      case "matchExpr": {
        const arms = (current.children ?? []).slice(1);
        if (arms.length === 0) return result("UNRESOLVED", "MALFORMED", path);
        if (!arms.some((arm) => arm.kind === "matchArm" && (arm.value === "_" || arm.value === "else"))) {
          return result("NON_TERMINAL", "NON_EXHAUSTIVE_MATCH", path);
        }
        for (let index = 0; index < arms.length; index += 1) {
          const arm = arms[index];
          if (arm?.kind !== "matchArm" || (arm.children?.length ?? 0) === 0) {
            return result("UNRESOLVED", "MALFORMED", [...path, index + 1]);
          }
          const bodyIndex = arm.children!.length - 1;
          const armResult = visit(arm.children![bodyIndex], depth + 1, [...path, index + 1, bodyIndex]);
          if (armResult.state !== "TERMINAL") return armResult;
        }
        return result("TERMINAL", "MATCH_TERMINATES", path);
      }

      case "whileStmt":
      case "forEachStmt":
      case "letDecl":
      case "mutDecl":
      case "readonlyDecl":
      case "assignStmt":
      case "callExpr":
      case "binaryExpr":
      case "unaryExpr":
      case "identifier":
      case "numberLiteral":
      case "stringLiteral":
      case "charLiteral":
      case "boolLiteral":
        return result("NON_TERMINAL", "FALLTHROUGH", path);

      default:
        return result("UNRESOLVED", "UNSUPPORTED_NODE", path);
    }
  };

  return visit(node, 0, []);
}
