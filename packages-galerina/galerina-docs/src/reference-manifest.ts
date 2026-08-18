import { createHash } from "node:crypto";

import {
  checkEffects,
  checkTypes,
  parseProgram,
  verifyGovernance,
  type AstNode,
  type FlowMeta,
} from "../../galerina-core-compiler/dist/index.js";

import {
  GALERINA_REFERENCE_MANIFEST_SCHEMA,
  ReferenceManifestError,
  type BuildReferenceManifestInput,
  type GalerinaReferenceManifest,
  type ReferenceContractFact,
  type ReferenceDeclaration,
  type ReferenceDeclarationKind,
  type ReferenceParameter,
  type ReferenceSourceModule,
  type ReferenceSourceRecord,
} from "./reference-types.js";

const SUPPORTED_KINDS = new Map<string, ReferenceDeclarationKind>([
  ["flowDecl", "flow"],
  ["secureFlowDecl", "flow"],
  ["pureFlowDecl", "flow"],
  ["guardedFlowDecl", "flow"],
  ["typeDecl", "type"],
  ["recordDecl", "record"],
  ["enumDecl", "enum"],
  ["guardDecl", "guard"],
  ["staticDecl", "static"],
  ["bitfieldDecl", "bitfield"],
]);

const BUILTIN_TYPES = new Set([
  "Any", "Array", "Bool", "Byte", "ByteArray", "Char", "Decimal", "Duration",
  "Float", "Float32", "Float64", "Int", "Int8", "Int16", "Int32", "Int64",
  "List", "Map", "Money", "Never", "Option", "Result", "Set", "String", "Trit",
  "UInt", "UInt8", "UInt16", "UInt32", "UInt64", "Unit", "Unknown", "Verdict", "Void",
]);

interface ParsedModule {
  readonly input: ReferenceSourceModule;
  readonly ast: AstNode;
  readonly flows: readonly FlowMeta[];
  readonly sourceSha256: string;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(code: ConstructorParameters<typeof ReferenceManifestError>[0], message: string): never {
  throw new ReferenceManifestError(code, message);
}

function validateInput(input: BuildReferenceManifestInput): void {
  if (!/^[0-9a-f]{40}$/u.test(input.buildPoint)) {
    fail("INVALID_INPUT", "buildPoint must be an exact 40-character lowercase Git object id");
  }
  if (!Array.isArray(input.modules) || input.modules.length === 0) {
    fail("INVALID_INPUT", "at least one source module is required");
  }
  for (const module of input.modules) {
    if (module.packageName.trim() === "" || module.moduleName.trim() === "") {
      fail("INVALID_INPUT", "packageName and moduleName must be non-empty");
    }
    if (module.source.length === 0) fail("INVALID_INPUT", `${module.packageName}/${module.moduleName} has empty source`);
    if (`${module.packageName}\0${module.moduleName}\0${module.file}`.includes("-PRIVATE")) {
      fail("INVALID_INPUT", "private-marked custody must not enter the public reference manifest");
    }
    if (
      module.file.trim() === "" ||
      module.file.includes("\\") ||
      module.file.startsWith("/") ||
      /^[A-Za-z]:/u.test(module.file) ||
      module.file.split("/").includes("..")
    ) {
      fail("INVALID_INPUT", `source file must be a repository-relative POSIX path: ${module.file}`);
    }
  }
}

function diagnosticSummary(diagnostics: readonly { readonly code?: string; readonly message: string }[]): string {
  return diagnostics.slice(0, 3).map((entry) => `${entry.code ?? "DIAGNOSTIC"}: ${entry.message}`).join(" | ");
}

function parseAndCheck(input: ReferenceSourceModule): ParsedModule {
  const parsed = parseProgram(input.source, input.file, { requireVersionHeader: true });
  const parseErrors = parsed.diagnostics.filter((entry) => entry.severity === "error");
  if (parseErrors.length > 0) fail("PARSE_REFUSED", `${input.file}: ${diagnosticSummary(parseErrors)}`);

  for (const node of parsed.ast.children ?? []) {
    if (node.kind !== "importDecl" && !SUPPORTED_KINDS.has(node.kind)) {
      fail("UNSUPPORTED_PUBLIC_AST", `${input.file}: unsupported top-level AST node ${node.kind}`);
    }
  }

  const typeResult = checkTypes(parsed.ast);
  const typeErrors = typeResult.diagnostics.filter((entry) => entry.severity === "error");
  if (typeErrors.length > 0) fail("CHECK_REFUSED", `${input.file}: ${diagnosticSummary(typeErrors)}`);

  const effectResults = checkEffects(parsed.flows, parsed.ast, "production");
  const effectErrors = effectResults.flatMap((entry) => entry.diagnostics).filter((entry) => entry.severity === "error");
  if (effectErrors.length > 0) fail("CHECK_REFUSED", `${input.file}: ${diagnosticSummary(effectErrors)}`);

  const governance = verifyGovernance(parsed.ast, parsed.flows, effectResults, "check-only", input.file);
  const governanceErrors = governance.diagnostics.filter((entry) => entry.severity === "error");
  if (governanceErrors.length > 0) fail("CHECK_REFUSED", `${input.file}: ${diagnosticSummary(governanceErrors)}`);

  return { input, ast: parsed.ast, flows: parsed.flows, sourceSha256: sha256(input.source) };
}

function declarationName(node: AstNode, flows: readonly FlowMeta[]): string {
  if (SUPPORTED_KINDS.get(node.kind) !== "flow") return node.value ?? "";
  const line = node.location?.line;
  const flow = flows.find((entry) => entry.location.line === line);
  return flow?.name ?? node.value ?? "";
}

function flowFor(node: AstNode, flows: readonly FlowMeta[]): FlowMeta {
  const result = flows.find((entry) => entry.location.line === node.location?.line);
  if (result === undefined) fail("CHECK_REFUSED", `flow metadata is missing at line ${node.location?.line ?? 0}`);
  return result;
}

function splitParameter(value: string): ReferenceParameter {
  const colon = value.indexOf(":");
  if (colon < 1) fail("CHECK_REFUSED", `malformed checked parameter ${JSON.stringify(value)}`);
  const left = value.slice(0, colon).trim().split(/\s+/u);
  const name = left.at(-1) ?? "";
  const qualifiers = left.slice(0, -1).filter((part): part is "readonly" | "tainted" => part === "readonly" || part === "tainted");
  const right = value.slice(colon + 1).trim();
  const sourceMarker = " source_from ";
  const marker = right.indexOf(sourceMarker);
  const type = marker === -1 ? right : right.slice(0, marker);
  const sourceFrom = marker === -1 ? undefined : right.slice(marker + sourceMarker.length);
  return {
    name,
    type,
    ...(qualifiers.length > 0 ? { qualifiers } : {}),
    ...(sourceFrom !== undefined ? { sourceFrom } : {}),
  };
}

function collectContractFacts(node: AstNode): ReferenceContractFact[] {
  const contracts: ReferenceContractFact[] = [];
  for (const contract of node.children?.filter((child) => child.kind === "contractDecl") ?? []) {
    for (const clause of contract.children ?? []) {
      const values: string[] = [];
      if (clause.value !== undefined) values.push(clause.value);
      const visit = (part: AstNode): void => {
        if (part.value !== undefined && part.children === undefined) values.push(part.value);
        for (const child of part.children ?? []) visit(child);
      };
      for (const child of clause.children ?? []) visit(child);
      contracts.push({ kind: clause.kind.replace(/Decl$/u, ""), values });
    }
  }
  return contracts;
}

function typeTokens(types: readonly string[]): string[] {
  const result = new Set<string>();
  for (const type of types) {
    for (const token of type.match(/[A-Z][A-Za-z0-9_]*/gu) ?? []) {
      if (!BUILTIN_TYPES.has(token)) result.add(token);
    }
  }
  return [...result].sort(compareCodeUnits);
}

function signatureFor(kind: ReferenceDeclarationKind, name: string, node: AstNode, flow: FlowMeta | undefined): {
  readonly signature: string;
  readonly parameters?: readonly ReferenceParameter[];
  readonly returnType?: string;
  readonly qualifier?: "flow" | "secure" | "pure" | "guarded";
  readonly effects?: readonly string[];
  readonly contracts?: readonly ReferenceContractFact[];
  readonly typeLinks: readonly string[];
} {
  if (kind === "flow") {
    if (flow === undefined) fail("CHECK_REFUSED", `flow metadata missing for ${name}`);
    const parameters = (node.children ?? []).filter((child) => child.kind === "paramDecl").map((child) => splitParameter(child.value ?? ""));
    const contracts = collectContractFacts(node);
    const signature = `${flow.qualifier} flow ${name}(${parameters.map((entry) => `${entry.name}: ${entry.type}`).join(", ")}) -> ${flow.returnType}` +
      (flow.declaredEffects.length > 0 ? ` effects [${flow.declaredEffects.join(", ")}]` : "");
    return {
      signature,
      parameters,
      returnType: flow.returnType,
      qualifier: flow.qualifier,
      effects: [...flow.declaredEffects],
      contracts,
      typeLinks: typeTokens([...parameters.map((entry) => entry.type), flow.returnType]),
    };
  }

  const children = node.children ?? [];
  if (kind === "type") {
    const target = children.find((child) => child.kind === "typeRef")?.value ?? "";
    return { signature: `type ${name} = ${target}`, typeLinks: typeTokens([target]) };
  }
  if (kind === "record") {
    const fields = children.map((child) => child.value ?? "");
    const types = fields.map((field) => field.slice(field.indexOf(":") + 1).trim());
    return { signature: `record ${name} { ${fields.join(", ")} }`, typeLinks: typeTokens(types) };
  }
  if (kind === "enum") {
    return { signature: `enum ${name} { ${children.map((child) => child.value ?? "").join(", ")} }`, typeLinks: [] };
  }
  if (kind === "guard") {
    return { signature: `guard ${name} { ${children.map((child) => child.value ?? "").join(", ")} }`, typeLinks: [] };
  }
  if (kind === "static") {
    return { signature: `static ${name} = ${children[0]?.value ?? ""}`, typeLinks: [] };
  }
  return { signature: `bitfield ${name} { ${children.map((child) => child.value ?? "").join(", ")} }`, typeLinks: [] };
}

function declarationEndOffset(source: string, start: number, nextStart: number | undefined): number {
  let end = nextStart ?? source.length;
  while (end > start && /\s/u.test(source[end - 1] ?? "")) end -= 1;
  return end;
}

function buildDeclarations(module: ParsedModule): ReferenceDeclaration[] {
  const topLevel = module.ast.children ?? [];
  const declarations: ReferenceDeclaration[] = [];
  for (let index = 0; index < topLevel.length; index += 1) {
    const node = topLevel[index];
    if (node === undefined || node.kind === "importDecl") continue;
    const kind = SUPPORTED_KINDS.get(node.kind);
    if (kind === undefined) {
      fail("UNSUPPORTED_PUBLIC_AST", `${module.input.file}: unsupported top-level AST node ${node.kind}`);
    }
    const name = declarationName(node, module.flows);
    if (name === "" || name === "<unknown>") fail("CHECK_REFUSED", `${module.input.file}: declaration name is unavailable`);
    const flow = kind === "flow" ? flowFor(node, module.flows) : undefined;
    const facts = signatureFor(kind, name, node, flow);
    const charStart = node.location?.offset ?? 0;
    const charEnd = declarationEndOffset(module.input.source, charStart, topLevel[index + 1]?.location?.offset);
    const byteStart = Buffer.byteLength(module.input.source.slice(0, charStart), "utf8");
    const byteEnd = Buffer.byteLength(module.input.source.slice(0, charEnd), "utf8");
    declarations.push({
      packageName: module.input.packageName,
      moduleName: module.input.moduleName,
      qualifiedName: `${module.input.packageName}::${module.input.moduleName}::${name}`,
      name,
      kind,
      visibility: "public",
      ...facts,
      locator: {
        file: module.input.file,
        line: node.location?.line ?? 1,
        column: node.location?.column ?? 1,
        byteStart,
        byteEnd,
        sourceSha256: module.sourceSha256,
      },
    });
  }
  return declarations;
}

function checkNames(declarations: readonly ReferenceDeclaration[]): void {
  const exact = new Set<string>();
  const folded = new Map<string, string>();
  for (const declaration of declarations) {
    if (exact.has(declaration.qualifiedName)) fail("DUPLICATE_QUALIFIED_NAME", declaration.qualifiedName);
    exact.add(declaration.qualifiedName);
    const key = declaration.qualifiedName.toLowerCase();
    const previous = folded.get(key);
    if (previous !== undefined && previous !== declaration.qualifiedName) {
      fail("CASE_COLLISION", `${previous} collides with ${declaration.qualifiedName}`);
    }
    folded.set(key, declaration.qualifiedName);
  }
}

function checkTypeLinks(declarations: readonly ReferenceDeclaration[]): void {
  const names = new Map<string, string[]>();
  for (const declaration of declarations) {
    const existing = names.get(declaration.name) ?? [];
    existing.push(declaration.qualifiedName);
    names.set(declaration.name, existing);
  }
  for (const declaration of declarations) {
    for (const link of declaration.typeLinks) {
      const targets = names.get(link) ?? [];
      if (targets.length === 0) fail("BROKEN_TYPE_LINK", `${declaration.qualifiedName} references missing type ${link}`);
      if (targets.length > 1) fail("BROKEN_TYPE_LINK", `${declaration.qualifiedName} has ambiguous type link ${link}`);
    }
  }
}

export function buildReferenceManifest(input: BuildReferenceManifestInput): GalerinaReferenceManifest {
  validateInput(input);
  const parsed = input.modules.map(parseAndCheck);
  const sources: ReferenceSourceRecord[] = parsed.map((module) => ({
    packageName: module.input.packageName,
    moduleName: module.input.moduleName,
    file: module.input.file,
    sourceSha256: module.sourceSha256,
    byteLength: Buffer.byteLength(module.input.source, "utf8"),
  })).sort((left, right) => compareCodeUnits(`${left.packageName}\0${left.moduleName}\0${left.file}`, `${right.packageName}\0${right.moduleName}\0${right.file}`));

  const declarations = parsed.flatMap(buildDeclarations).sort((left, right) =>
    compareCodeUnits(`${left.packageName}\0${left.moduleName}\0${left.qualifiedName}`, `${right.packageName}\0${right.moduleName}\0${right.qualifiedName}`));
  checkNames(declarations);
  checkTypeLinks(declarations);

  const body = {
    schema: GALERINA_REFERENCE_MANIFEST_SCHEMA,
    buildPoint: input.buildPoint,
    sources,
    declarations,
  } as const;
  return { ...body, manifestSha256: sha256(JSON.stringify(body)) };
}

export function assertReferenceManifestIntegrity(manifest: GalerinaReferenceManifest): void {
  if (manifest.schema !== GALERINA_REFERENCE_MANIFEST_SCHEMA || !/^[0-9a-f]{40}$/u.test(manifest.buildPoint)) {
    fail("INVALID_INPUT", "reference manifest schema or build point is invalid");
  }
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0 || !Array.isArray(manifest.declarations)) {
    fail("INVALID_INPUT", "reference manifest sources/declarations are malformed");
  }
  const sourceKeys = new Set<string>();
  for (const source of manifest.sources) {
    const key = `${source.packageName}\0${source.moduleName}\0${source.file}`;
    if (
      sourceKeys.has(key) || key.includes("-PRIVATE") || source.file.includes("\\") || source.file.startsWith("/") ||
      /^[A-Za-z]:/u.test(source.file) || source.file.split("/").includes("..") ||
      !/^[0-9A-F]{64}$/u.test(source.sourceSha256) || !Number.isSafeInteger(source.byteLength) || source.byteLength < 1
    ) fail("INVALID_INPUT", `invalid reference source record ${source.file}`);
    sourceKeys.add(key);
  }
  for (const declaration of manifest.declarations) {
    const sourceKey = `${declaration.packageName}\0${declaration.moduleName}\0${declaration.locator.file}`;
    const source = manifest.sources.find((entry) => `${entry.packageName}\0${entry.moduleName}\0${entry.file}` === sourceKey);
    if (
      source === undefined || source.sourceSha256 !== declaration.locator.sourceSha256 ||
      declaration.qualifiedName !== `${declaration.packageName}::${declaration.moduleName}::${declaration.name}` ||
      declaration.visibility !== "public" || declaration.signature.trim() === "" ||
      declaration.locator.byteStart < 0 || declaration.locator.byteEnd <= declaration.locator.byteStart ||
      declaration.locator.byteEnd > source.byteLength
    ) fail("INVALID_INPUT", `invalid declaration record ${declaration.qualifiedName}`);
  }
  checkNames(manifest.declarations);
  checkTypeLinks(manifest.declarations);
  const sortedSources = [...manifest.sources].sort((left, right) => compareCodeUnits(`${left.packageName}\0${left.moduleName}\0${left.file}`, `${right.packageName}\0${right.moduleName}\0${right.file}`));
  const sortedDeclarations = [...manifest.declarations].sort((left, right) => compareCodeUnits(`${left.packageName}\0${left.moduleName}\0${left.qualifiedName}`, `${right.packageName}\0${right.moduleName}\0${right.qualifiedName}`));
  if (JSON.stringify(sortedSources) !== JSON.stringify(manifest.sources) || JSON.stringify(sortedDeclarations) !== JSON.stringify(manifest.declarations)) {
    fail("INVALID_INPUT", "reference manifest records are not in canonical code-unit order");
  }
  const body = {
    schema: manifest.schema,
    buildPoint: manifest.buildPoint,
    sources: manifest.sources,
    declarations: manifest.declarations,
  };
  if (manifest.manifestSha256 !== sha256(JSON.stringify(body))) {
    fail("INVALID_INPUT", "reference manifest digest does not match its canonical body");
  }
}
