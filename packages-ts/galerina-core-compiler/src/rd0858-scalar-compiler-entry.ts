import {
  decodeCheckedFlowArtifact,
  digestCheckedFlowArtifact,
  encodeCheckedFlowArtifact,
  type CheckedFlowArtifact,
  type CheckedFlowArtifactNode,
} from "./checked-flow-artifact.js";
import { validateCoreSyntaxSafety } from "./core-syntax-safety.js";
import { checkEffects, effectResultsToDiagnostics } from "./effect-checker.js";
import { verifyGovernance } from "./governance-verifier.js";
import { checkNamingPolicy } from "./naming-policy-checker.js";
import { parseProgram } from "./parser.js";
import { checkSourceEscapes } from "./source-escape-checker.js";
import { resolveSymbols } from "./symbol-resolver.js";
import { snapshotCheckedFlow } from "./taint-checker.js";
import { checkTypes } from "./type-checker.js";
import { checkValueStates } from "./value-state-checker.js";

const SOURCE_LOCATOR = "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi";

export interface Rd0858ScalarArtifactIdentity {
  readonly sourceDigest: string;
  readonly compilerVersion: string;
  readonly compilerPackageGraphDigest: string;
  readonly checkerSetDigest: string;
  readonly generatorSourceDigest: string;
}

export interface Rd0858ScalarBuildResult {
  readonly artifact: CheckedFlowArtifact;
  readonly bytes: Uint8Array;
}

class Rd0858ScalarCompilerRefusal extends Error {
  constructor(readonly code: string) {
    super(`RD0858_SCALAR_COMPILER_${code}: refused`);
    this.name = "Rd0858ScalarCompilerRefusal";
  }
}

function refuse(code: string): never {
  throw new Rd0858ScalarCompilerRefusal(code);
}

function assertExactScalarAst(ast: CheckedFlowArtifactNode): void {
  const children = ast.children ?? [];
  const block = children.find((node) => node.kind === "block");
  const check = block?.children?.[0];
  if (check?.kind !== "checkExpr" || check.children?.length !== 4
    || check.children[0]?.kind !== "identifier" || check.children[0]?.value !== "subject") {
    refuse("CHECKED_AST_SHAPE");
  }
  const expected = [["deny", '"deny"'], ["ambig", '"ambig"'], ["if", '"allow"']] as const;
  for (let index = 0; index < expected.length; index += 1) {
    const arm = check.children[index + 1];
    const literal = arm?.children?.[0]?.children?.[0]?.children?.[0];
    if (arm?.kind !== "checkArm" || arm.value !== expected[index]?.[0]
      || literal?.kind !== "stringLiteral" || literal.value !== expected[index]?.[1]) {
      refuse("CHECKED_AST_TERMINAL");
    }
  }
}

function compileCheckedAst(source: string): CheckedFlowArtifactNode {
  const safety = validateCoreSyntaxSafety({ file: SOURCE_LOCATOR, text: source });
  const parsed = parseProgram(source, SOURCE_LOCATOR, { requireVersionHeader: true });
  const symbols = resolveSymbols(parsed.ast);
  const types = checkTypes(parsed.ast);
  const values = checkValueStates(parsed.ast, "production");
  const effects = checkEffects(parsed.flows, parsed.ast);
  const governance = verifyGovernance(parsed.ast, parsed.flows, effects, "production", SOURCE_LOCATOR);
  const escapes = checkSourceEscapes(parsed.ast);
  const naming = checkNamingPolicy(parsed.ast);
  const diagnostics = [
    ...safety.diagnostics,
    ...parsed.diagnostics,
    ...symbols.diagnostics,
    ...types.diagnostics,
    ...values.diagnostics,
    ...effectResultsToDiagnostics(effects),
    ...governance.diagnostics,
    ...escapes.diagnostics,
    ...naming.diagnostics,
  ];
  if (parsed.flows.length !== 1
    || diagnostics.some((entry) => entry.severity === "error" || entry.severity === "warning")) {
    refuse("CHECKER");
  }
  const flow = parsed.flows[0];
  const flowNode = (parsed.ast.children ?? []).find((node) =>
    node.kind === "pureFlowDecl" && node.value === "scalarOracle");
  if (flow === undefined || flow.name !== "scalarOracle" || flowNode === undefined) {
    refuse("FLOW_IDENTITY");
  }
  const snapshot = snapshotCheckedFlow(flow, flowNode);
  if (snapshot === undefined) refuse("CHECKED_SNAPSHOT");
  assertExactScalarAst(snapshot.ast);
  return snapshot.ast;
}

export function buildRd0858ScalarArtifact(
  source: string,
  identity: Rd0858ScalarArtifactIdentity,
): Rd0858ScalarBuildResult {
  const artifact: CheckedFlowArtifact = {
    schema: "galerina.rd0858.checked-flow.v1",
    hashAlgorithm: "sha256",
    productId: "galerina",
    packageId: "rd0858-unit4-scalar-oracle",
    flowLocator: "rd0858/unit4/scalar-oracle",
    flowName: "scalarOracle",
    languageVersion: 1,
    runtimeProfile: "scalar-1",
    sourceCanonicalization: "UTF8_NO_BOM_LF_NFC_V1",
    sourceDigest: identity.sourceDigest,
    compilerPackageId: "@galerina/core-compiler",
    compilerVersion: identity.compilerVersion,
    compilerPackageGraphDigest: identity.compilerPackageGraphDigest,
    checkerSetId: "galerina.strict-checks.v1",
    checkerSetDigest: identity.checkerSetDigest,
    generatorId: "rd0858-scalar-oracle-generator.v1",
    generatorSourceDigest: identity.generatorSourceDigest,
    qualifier: "pure",
    parameters: [{ name: "subject", type: "Verdict" }],
    returnType: "String",
    declaredEffects: [],
    checkedAst: compileCheckedAst(source),
  };
  const bytes = encodeCheckedFlowArtifact(artifact);
  const decoded = decodeCheckedFlowArtifact(bytes);
  assertExactScalarAst(decoded.checkedAst);
  return Object.freeze({ artifact: decoded, bytes });
}

export function verifyRd0858ScalarArtifact(
  source: string,
  bytes: Uint8Array,
  identity: Rd0858ScalarArtifactIdentity,
): Readonly<{ artifactDigest: string; sourceDigest: string }> {
  const expected = buildRd0858ScalarArtifact(source, identity);
  if (bytes.byteLength !== expected.bytes.byteLength
    || bytes.some((byte, index) => byte !== expected.bytes[index])) refuse("PAIR_BYTES");
  const decoded = decodeCheckedFlowArtifact(bytes);
  assertExactScalarAst(decoded.checkedAst);
  return Object.freeze({
    artifactDigest: digestCheckedFlowArtifact(bytes),
    sourceDigest: decoded.sourceDigest,
  });
}
