import { type AstNode } from "./parser.js";

export type LoopEnvelopeTrit = -1 | 0;

export interface VerifiedLoopEnvelopeFacts {
  readonly exactFlowShape: boolean;
  readonly exactCardinalityGate: boolean;
  readonly exactInductionInitialization: boolean;
  readonly exactLoopCondition: boolean;
  readonly exactIndexAccess: boolean;
  readonly exactOptionMatch: boolean;
  readonly exactInductionStep: boolean;
  readonly closedLoopBody: boolean;
}

export interface VerifiedLoopEnvelopeProposal {
  readonly schemaId: "galerina.verified-loop-envelope.proposal.v1";
  readonly candidate: boolean;
  readonly verdict: LoopEnvelopeTrit;
  readonly flowName: string;
  readonly collectionName: "values";
  readonly inductionName: "i";
  readonly bound: 1000000;
  readonly facts: VerifiedLoopEnvelopeFacts;
  readonly failureIds: readonly string[];
}

const SCHEMA_ID = "galerina.verified-loop-envelope.proposal.v1" as const;
const COLLECTION_NAME = "values" as const;
const INDUCTION_NAME = "i" as const;
const BOUND = 1000000 as const;
const FLOW_KINDS = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);

function children(node: AstNode | undefined): readonly AstNode[] {
  return node?.children ?? [];
}

function isIdentifier(node: AstNode | undefined, value: string): boolean {
  return node?.kind === "identifier" && node.value === value;
}

function isNumber(node: AstNode | undefined, value: number): boolean {
  return node?.kind === "numberLiteral" && node.value === String(value);
}

function isExactBinary(
  node: AstNode | undefined,
  operator: string,
  left: (node: AstNode | undefined) => boolean,
  right: (node: AstNode | undefined) => boolean,
): boolean {
  const operands = children(node);
  return node?.kind === "binaryExpr"
    && node.value === operator
    && operands.length === 2
    && left(operands[0])
    && right(operands[1]);
}

function isTerminalErrorReturn(node: AstNode | undefined): boolean {
  const expression = children(node)[0];
  return node?.kind === "returnStmt"
    && expression?.kind === "callExpr"
    && expression.value === "Err"
    && children(expression).length === 1;
}

function isExactCardinalityGate(node: AstNode | undefined): boolean {
  const parts = children(node);
  const condition = parts[0];
  const refusalBlock = parts[1];
  const leftIsCount = (candidate: AstNode | undefined): boolean => {
    const callChildren = children(candidate);
    return candidate?.kind === "callExpr"
      && candidate.value === "count"
      && candidate.callStyle === "method"
      && callChildren.length === 1
      && isIdentifier(callChildren[0], COLLECTION_NAME);
  };

  return node?.kind === "ifStmt"
    && parts.length === 2
    && isExactBinary(condition, "!=", leftIsCount, (candidate) => isNumber(candidate, BOUND))
    && refusalBlock?.kind === "block"
    && children(refusalBlock).length === 1
    && isTerminalErrorReturn(children(refusalBlock)[0]);
}

function isExactInductionInitialization(node: AstNode | undefined): boolean {
  return node?.kind === "mutDecl"
    && node.value === `${INDUCTION_NAME}: Int`
    && children(node).length === 1
    && isNumber(children(node)[0], 0);
}

function isExactResultInitialization(node: AstNode | undefined): boolean {
  return node?.kind === "mutDecl"
    && node.value === "last: Int"
    && children(node).length === 1
    && isNumber(children(node)[0], 0);
}

function isExactLoopCondition(node: AstNode | undefined): boolean {
  return isExactBinary(
    node,
    "<",
    (candidate) => isIdentifier(candidate, INDUCTION_NAME),
    (candidate) => isNumber(candidate, BOUND),
  );
}

function isExactGet(node: AstNode | undefined): boolean {
  const args = children(node);
  return node?.kind === "callExpr"
    && node.value === "get"
    && node.callStyle === "method"
    && args.length === 2
    && isIdentifier(args[0], COLLECTION_NAME)
    && isIdentifier(args[1], INDUCTION_NAME);
}

function isExactSelection(node: AstNode | undefined): boolean {
  return node?.kind === "letDecl"
    && node.value === "selected: Option<Int>"
    && children(node).length === 1
    && isExactGet(children(node)[0]);
}

function isExactSomeArm(node: AstNode | undefined): boolean {
  const armChildren = children(node);
  const armBody = armChildren[1];
  const statement = children(armBody)[0];
  return node?.kind === "matchArm"
    && node.value === "Some"
    && armChildren.length === 2
    && isIdentifier(armChildren[0], "value")
    && armBody?.kind === "block"
    && children(armBody).length === 1
    && statement?.kind === "assignStmt"
    && statement.value === "last"
    && children(statement).length === 1
    && isIdentifier(children(statement)[0], "value");
}

function isExactRefusalArm(node: AstNode | undefined, name: "None" | "_"): boolean {
  return node?.kind === "matchArm"
    && node.value === name
    && children(node).length === 1
    && isTerminalErrorReturn(children(node)[0]);
}

function isExactOptionMatch(node: AstNode | undefined): boolean {
  const matchChildren = children(node);
  return node?.kind === "matchExpr"
    && matchChildren.length === 4
    && isIdentifier(matchChildren[0], "selected")
    && isExactSomeArm(matchChildren[1])
    && isExactRefusalArm(matchChildren[2], "None")
    && isExactRefusalArm(matchChildren[3], "_");
}

function isExactInductionStep(node: AstNode | undefined): boolean {
  return node?.kind === "assignStmt"
    && node.value === INDUCTION_NAME
    && children(node).length === 1
    && isExactBinary(
      children(node)[0],
      "+",
      (candidate) => isIdentifier(candidate, INDUCTION_NAME),
      (candidate) => isNumber(candidate, 1),
    );
}

function isExactSuccessReturn(node: AstNode | undefined): boolean {
  const expression = children(node)[0];
  return node?.kind === "returnStmt"
    && children(node).length === 1
    && expression?.kind === "callExpr"
    && expression.value === "Ok"
    && children(expression).length === 1
    && isIdentifier(children(expression)[0], "last");
}

function collectNodes(root: AstNode, predicate: (node: AstNode) => boolean): readonly AstNode[] {
  const matches: AstNode[] = [];
  const visit = (node: AstNode): void => {
    if (predicate(node)) matches.push(node);
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return matches;
}

function isExactFlowShape(flow: AstNode): boolean {
  const flowChildren = children(flow);
  const params = flowChildren.filter((node) => node.kind === "paramDecl");
  const resultTypes = flowChildren.filter((node) => node.kind === "typeRef");
  const contracts = flowChildren.filter((node) => node.kind === "contractDecl");
  const bodies = flowChildren.filter((node) => node.kind === "block");
  const contractParts = children(contracts[0]);
  const effects = contractParts.filter((node) => node.kind === "identifier" && node.value === "effects:block");

  return flow.kind === "secureFlowDecl"
    && params.length === 1
    && params[0]?.value === "values: Array<Int>"
    && resultTypes.length === 1
    && resultTypes[0]?.value === "Result<Int,String>"
    && contracts.length === 1
    && effects.length === 1
    && children(effects[0]).length === 0
    && bodies.length === 1;
}

function refusalIds(facts: VerifiedLoopEnvelopeFacts): readonly string[] {
  const failures: string[] = [];
  if (!facts.exactFlowShape) failures.push("FLOW_SHAPE_NOT_EXACT");
  if (!facts.exactCardinalityGate) failures.push("CARDINALITY_GATE_MISSING");
  if (!facts.exactInductionInitialization) failures.push("INDUCTION_INITIALIZATION_NOT_EXACT");
  if (!facts.exactLoopCondition) failures.push("LOOP_CONDITION_NOT_EXACT");
  if (!facts.exactIndexAccess) failures.push("INDEX_ACCESS_NOT_EXACT");
  if (!facts.exactOptionMatch) failures.push("OPTION_MATCH_NOT_EXACT");
  if (!facts.exactInductionStep) failures.push("INDUCTION_STEP_NOT_EXACT");
  if (!facts.closedLoopBody) failures.push("LOOP_BODY_NOT_CLOSED");
  return Object.freeze(failures);
}

function proposal(
  flowName: string,
  facts: VerifiedLoopEnvelopeFacts,
  failureIds: readonly string[],
): VerifiedLoopEnvelopeProposal {
  const candidate = failureIds.length === 0;
  return Object.freeze({
    schemaId: SCHEMA_ID,
    candidate,
    verdict: candidate ? 0 : -1,
    flowName,
    collectionName: COLLECTION_NAME,
    inductionName: INDUCTION_NAME,
    bound: BOUND,
    facts: Object.freeze(facts),
    failureIds: candidate
      ? Object.freeze(["INDEPENDENT_VERIFIER_UNAVAILABLE"])
      : failureIds,
  });
}

export function analyzeMillionReadLoopEnvelope(
  ast: AstNode,
  flowName: string,
): VerifiedLoopEnvelopeProposal {
  const flow = children(ast).find((node) => FLOW_KINDS.has(node.kind) && node.value === flowName);
  if (flow === undefined) {
    const facts: VerifiedLoopEnvelopeFacts = {
      exactFlowShape: false,
      exactCardinalityGate: false,
      exactInductionInitialization: false,
      exactLoopCondition: false,
      exactIndexAccess: false,
      exactOptionMatch: false,
      exactInductionStep: false,
      closedLoopBody: false,
    };
    return proposal(flowName, facts, Object.freeze(["FLOW_NOT_FOUND"]));
  }

  const body = children(flow).find((node) => node.kind === "block");
  const statements = children(body);
  const loops = collectNodes(flow, (node) => node.kind === "whileStmt");
  const loop = loops[0];
  const loopStatementIndex = loop === undefined ? -1 : statements.indexOf(loop);
  const beforeLoop = loopStatementIndex < 0 ? [] : statements.slice(0, loopStatementIndex);
  const cardinalityGates = beforeLoop.filter(isExactCardinalityGate);
  const inductionInitializations = beforeLoop.filter(isExactInductionInitialization);
  const loopStatements = children(children(loop)[1]);
  const getCalls = loop === undefined
    ? []
    : collectNodes(loop, (node) => node.kind === "callExpr" && node.value === "get");
  const inductionWrites = loop === undefined
    ? []
    : collectNodes(loop, (node) => node.kind === "assignStmt" && node.value === INDUCTION_NAME);
  const collectionWrites = loop === undefined
    ? []
    : collectNodes(loop, (node) => node.kind === "assignStmt" && node.value === COLLECTION_NAME);
  const loopCalls = loop === undefined
    ? []
    : collectNodes(loop, (node) => node.kind === "callExpr");
  const allowedCalls = loopCalls.every((node) => node.value === "get" || node.value === "Err");
  const exactOuterShape = statements.length === 5
    && isExactCardinalityGate(statements[0])
    && isExactInductionInitialization(statements[1])
    && isExactResultInitialization(statements[2])
    && statements[3] === loop
    && isExactSuccessReturn(statements[4]);

  const facts: VerifiedLoopEnvelopeFacts = {
    exactFlowShape: isExactFlowShape(flow),
    exactCardinalityGate: cardinalityGates.length === 1,
    exactInductionInitialization: inductionInitializations.length === 1,
    exactLoopCondition: loops.length >= 1 && isExactLoopCondition(children(loop)[0]),
    exactIndexAccess: getCalls.length === 1 && isExactGet(getCalls[0]),
    exactOptionMatch: isExactSelection(loopStatements[0]) && isExactOptionMatch(loopStatements[1]),
    exactInductionStep: inductionWrites.length === 1
      && loopStatements.length === 3
      && isExactInductionStep(loopStatements[2]),
    closedLoopBody: loops.length === 1
      && exactOuterShape
      && loopStatements.length === 3
      && collectionWrites.length === 0
      && allowedCalls,
  };

  return proposal(flowName, facts, refusalIds(facts));
}
