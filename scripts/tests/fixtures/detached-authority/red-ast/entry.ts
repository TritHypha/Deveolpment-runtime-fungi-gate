interface AstNode {
  readonly kind: string;
}

declare function emitGIR(ast: AstNode, options: object): Uint8Array;

const ast: AstNode = { kind: "snapshot-reentry" };

export const gir = emitGIR(ast, {});
