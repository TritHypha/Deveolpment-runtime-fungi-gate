interface AstNode {
  readonly kind: string;
}

declare function emitGIR(ast: AstNode, options: object): Uint8Array;
declare function visitAst(ast: AstNode): void;
declare function buildSemanticGraph(ast: AstNode): object;
declare function buildExecutionPlan(ast: AstNode): object;

const ast: AstNode = { kind: "snapshot-reentry" };

visitAst(ast);
export const gir = emitGIR(ast, {});
export const semanticGraph = buildSemanticGraph(ast);
export const executionPlan = buildExecutionPlan(ast);
