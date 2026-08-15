import { createHash } from "node:crypto";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  type ArtifactReferenceV1,
  type Sha256Digest,
} from "./artifact-reference.js";
import {
  CHECKED_MODULE_SNAPSHOT_SCHEMA,
  CHECKED_MODULE_TRACE_STAGES,
  canonicalCheckedModuleSnapshotBytes,
  deriveCheckedModuleTraceV1,
  sealCheckedModuleSnapshotV1,
  type CheckedModuleDiagnosticV1,
} from "./checked-module-snapshot.js";
import { lex } from "./lexer.js";
import type { AstNode, FlowMeta, ParseResult } from "./parser.js";

export interface DetachedSnapshotProvenanceV1 {
  readonly compilerCommit: `git:${string}`;
  readonly compilerVersion: string;
  readonly checkerProfileVersion: string;
}

export interface RuntimeCheckedSnapshotInputV1 {
  readonly source: string;
  readonly file: string;
  readonly parseResult: ParseResult;
  readonly diagnostics: readonly { readonly code: string; readonly severity: string; readonly message: string }[];
  readonly governanceDiagnostics: readonly { readonly code: string; readonly severity: string; readonly message: string }[];
  readonly escapeDiagnostics: readonly { readonly code: string; readonly severity: string; readonly message: string }[];
  readonly namingDiagnostics: readonly { readonly code: string; readonly severity: string; readonly message: string }[];
  readonly provenance: DetachedSnapshotProvenanceV1;
}

export type RuntimeCheckedSnapshotResultV1 =
  | Readonly<{ sealed: true; bytes: Readonly<Uint8Array> }>
  | Readonly<{ sealed: false; code: "SNAPSHOT_UNAVAILABLE" }>;

const I32 = /^-?(?:0|[1-9][0-9]*)$/u;
const GIT_COMMIT = /^git:[0-9a-f]{40}$/u;

function sha256Bytes(bytes: Readonly<Uint8Array>): Sha256Digest {
  return ("sha256:" + createHash("sha256").update(Uint8Array.from(bytes)).digest("hex")) as Sha256Digest;
}

function sha256Text(value: string): Sha256Digest {
  return sha256Bytes(new TextEncoder().encode(value));
}

function byteOffset(source: string, codeUnitOffset: number): number {
  return new TextEncoder().encode(source.slice(0, codeUnitOffset)).byteLength;
}

function flowNode(ast: AstNode, flow: FlowMeta): AstNode | undefined {
  const children = ast.children ?? [];
  const matches = children.filter((node) =>
    (node.kind === "flowDecl" || node.kind === "secureFlowDecl" || node.kind === "pureFlowDecl" || node.kind === "guardedFlowDecl")
    && node.value === flow.name
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function literalConstant(node: AstNode | undefined): AstNode | undefined {
  const typeRef = node?.children?.filter((child) => child.kind === "typeRef");
  const blocks = node?.children?.filter((child) => child.kind === "block");
  if (typeRef?.length !== 1 || typeRef[0]?.value !== "Int" || blocks?.length !== 1) return undefined;
  const statements = blocks[0]?.children ?? [];
  if (statements.length !== 1 || statements[0]?.kind !== "returnStmt") return undefined;
  const values = statements[0].children ?? [];
  if (values.length !== 1 || values[0]?.kind !== "numberLiteral") return undefined;
  const value = values[0].value;
  if (value === undefined || !I32.test(value) || value === "-0") return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= -2_147_483_648 && parsed <= 2_147_483_647 && String(parsed) === value
    ? values[0]
    : undefined;
}

function normalSeverity(value: string): "error" | "warning" | "info" {
  return value === "error" || value === "warning" ? value : "info";
}

/** Bootstrap-only adapter. No value returned here retains the source or AST. */
export function sealRuntimeCheckedSnapshotV1(input: RuntimeCheckedSnapshotInputV1): RuntimeCheckedSnapshotResultV1 {
  try {
    const source = input.source;
    const file = input.file;
    const parseResult = input.parseResult;
    const provenance = input.provenance;
    if (
      typeof source !== "string"
      || typeof file !== "string"
      || file.length === 0
      || source.startsWith("\ufeff")
      || parseResult.versionHeader?.present !== true
      || parseResult.versionHeader.value !== 1
      || !GIT_COMMIT.test(provenance.compilerCommit)
      || typeof provenance.compilerVersion !== "string"
      || provenance.compilerVersion.length === 0
      || typeof provenance.checkerProfileVersion !== "string"
      || provenance.checkerProfileVersion.length === 0
    ) return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });

    const sourceBytes = new TextEncoder().encode(source);
    const sourceReference: ArtifactReferenceV1 = Object.freeze({
      schema: ARTIFACT_REFERENCE_SCHEMA,
      owner: "galerina",
      kind: "fungi-source",
      digest: sha256Bytes(sourceBytes),
      byteLength: sourceBytes.byteLength,
    });
    const lexed = lex(source, file);
    const topLevel = parseResult.ast.children ?? [];
    const topLevelFlowCount = topLevel.filter((node) =>
      node.kind === "flowDecl"
      || node.kind === "secureFlowDecl"
      || node.kind === "pureFlowDecl"
      || node.kind === "guardedFlowDecl"
    ).length;
    if (topLevelFlowCount !== topLevel.length || topLevelFlowCount !== parseResult.flows.length) {
      return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
    }
    const spans = [{ spanId: "span.module", startByte: 0, endByte: sourceBytes.byteLength }];
    const tokens = lexed.tokens.map((token, index) => {
      const spanId = `span.token.${index}`;
      const startByte = byteOffset(source, token.start);
      const endByte = byteOffset(source, token.end);
      spans.push({ spanId, startByte, endByte });
      return {
        tokenId: `token.${index}`,
        kind: token.kind,
        lexemeDigest: sha256Text(source.slice(token.start, token.end)),
        spanId,
      };
    });

    const declarations = [];
    const typeFacts = [];
    const effects = [];
    const valueStates = [];
    const governanceDecisions = [];
    const constants = [];
    for (let index = 0; index < parseResult.flows.length; index += 1) {
      const flow = parseResult.flows[index];
      if (flow === undefined) return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
      const node = flowNode(parseResult.ast, flow);
      if (node === undefined) return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
      const declarationId = `decl.${index}.${flow.name}`;
      const spanId = `span.declaration.${index}`;
      const declarationStart = flow.location.offset;
      const declarationEnd = flow.location.endOffset;
      if (declarationStart === undefined || declarationEnd === undefined) {
        return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
      }
      spans.push({
        spanId,
        startByte: byteOffset(source, declarationStart),
        endByte: byteOffset(source, declarationEnd),
      });
      declarations.push({
        declarationId,
        kind: flow.qualifier === "pure" ? "PureFlow" : `${flow.qualifier}Flow`,
        name: flow.name,
        spanId,
      });
      typeFacts.push({
        factId: `type.${index}.${flow.name}`,
        declarationId,
        typeIdentity: `(${flow.params.join(",")}) -> ${flow.returnType}`,
        spanId,
      });
      effects.push({
        factId: `effect.${index}.${flow.name}`,
        declarationId,
        effect: flow.qualifier === "pure" && flow.declaredEffects.length === 0
          ? "pure"
          : flow.declaredEffects.join(","),
        spanId,
      });
      valueStates.push({
        factId: `state.${index}.${flow.name}`,
        declarationId,
        state: "safe",
        spanId,
      });
      const policyDigest = sha256Text(`galerina.reference-governance.v1\u0000${provenance.checkerProfileVersion}`);
      const evidenceDigest = sha256Text(JSON.stringify({
        declarationId,
        qualifier: flow.qualifier,
        declaredEffects: flow.declaredEffects,
        diagnostics: input.governanceDiagnostics,
      }));
      governanceDecisions.push({
        decisionId: `governance.${index}.${flow.name}`,
        declarationId,
        verdict: "ALLOW" as const,
        policyDigest,
        evidenceDigest,
        spanId,
      });
      const literal = literalConstant(node);
      if (literal?.value !== undefined && literal.location !== undefined) {
        const literalStart = literal.location.offset;
        const literalEnd = literal.location.endOffset;
        if (literalStart === undefined || literalEnd === undefined) {
          return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
        }
        const constantSpanId = `span.constant.${index}`;
        spans.push({
          spanId: constantSpanId,
          startByte: byteOffset(source, literalStart),
          endByte: byteOffset(source, literalEnd),
        });
        constants.push({
          constantId: `constant.${index}.${flow.name}`,
          declarationId,
          domainTag: "Int.i32",
          canonicalValue: literal.value,
          valueDigest: sha256Text(literal.value),
          spanId: constantSpanId,
        });
      }
    }

    const allDiagnostics = [
      ...input.diagnostics,
      ...input.governanceDiagnostics,
      ...input.escapeDiagnostics,
      ...input.namingDiagnostics,
      ...lexed.diagnostics,
    ];
    const diagnostics: CheckedModuleDiagnosticV1[] = allDiagnostics.map((diagnostic, index) => ({
      diagnosticId: `diagnostic.${index}`,
      code: diagnostic.code,
      severity: normalSeverity(diagnostic.severity),
      messageDigest: sha256Text(diagnostic.message),
      spanId: "span.module",
    }));
    const checkerVersions = CHECKED_MODULE_TRACE_STAGES.map((stage) => ({
      stage,
      version: `${stage}.reference.v1`,
      rulesetDigest: sha256Text(`${provenance.compilerCommit}\u0000${provenance.checkerProfileVersion}\u0000${stage}`),
    }));
    const facts = {
      source: sourceReference,
      spans,
      tokens,
      declarations,
      typeFacts,
      effects,
      valueStates,
      governanceDecisions,
      constants,
      diagnostics,
    };
    const checkerTrace = deriveCheckedModuleTraceV1({ ...facts, checkerVersions });
    const snapshot = sealCheckedModuleSnapshotV1({
      schema: CHECKED_MODULE_SNAPSHOT_SCHEMA,
      sourceBytes,
      edition: "fungi.v1",
      ...facts,
      checkerTrace,
      compilerCommit: provenance.compilerCommit,
      compilerVersion: provenance.compilerVersion,
      checkerProfileVersion: provenance.checkerProfileVersion,
    });
    return Object.freeze({ sealed: true, bytes: canonicalCheckedModuleSnapshotBytes(snapshot) });
  } catch {
    return Object.freeze({ sealed: false, code: "SNAPSHOT_UNAVAILABLE" });
  }
}
