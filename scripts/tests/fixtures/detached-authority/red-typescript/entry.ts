import ts from "typescript";
import tsserver from "tsserverlibrary";

declare function classifyTypeScriptSandbox(source: string): string;
declare function lowerTypeScriptSandbox(source: string): Uint8Array;

export const program = ts.createProgram([], {});
export const server = tsserver.server;
export const classified = classifyTypeScriptSandbox("snapshot");
export const lowered = lowerTypeScriptSandbox("snapshot");
