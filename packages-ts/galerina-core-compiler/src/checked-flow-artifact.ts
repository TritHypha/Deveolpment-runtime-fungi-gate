import { createHash } from "node:crypto";

export const CHECKED_FLOW_ARTIFACT_MAX_BYTES = 262_144;
export const CHECKED_FLOW_ARTIFACT_MAX_DEPTH = 64;
export const CHECKED_FLOW_ARTIFACT_MAX_VALUES = 16_384;
export const CHECKED_FLOW_ARTIFACT_MAX_AST_NODES = 8_192;

const MAX_STRING_BYTES = 65_536;
const MAX_ARRAY_ITEMS = 8_192;
const MAX_RECORD_FIELDS = 32;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

type CanonicalNull = null;
type CanonicalValue =
  | CanonicalNull
  | boolean
  | number
  | string
  | CanonicalArray
  | CanonicalRecord;

interface CanonicalArray extends ReadonlyArray<CanonicalValue> {}

interface CanonicalRecord {
  readonly [field: string]: CanonicalValue;
}

export interface CheckedFlowArtifactParameter {
  readonly name: "subject";
  readonly type: "Verdict";
}

export interface CheckedFlowArtifactNode {
  readonly kind: string;
  readonly value?: string;
  readonly callStyle?: "method";
  readonly typeName?: string;
  readonly conformsTo?: string;
  readonly flowRef?: string;
  readonly claim?: string;
  readonly flags?: number;
  readonly children?: readonly CheckedFlowArtifactNode[];
}

export interface CheckedFlowArtifact {
  readonly schema: "galerina.rd0858.checked-flow.v1";
  readonly hashAlgorithm: "sha256";
  readonly productId: "galerina";
  readonly packageId: "rd0858-unit4-scalar-oracle";
  readonly flowLocator: "rd0858/unit4/scalar-oracle";
  readonly flowName: "scalarOracle";
  readonly languageVersion: 1;
  readonly runtimeProfile: "scalar-1";
  readonly sourceCanonicalization: "UTF8_NO_BOM_LF_NFC_V1";
  readonly sourceDigest: string;
  readonly compilerPackageId: "@galerina/core-compiler";
  readonly compilerVersion: string;
  readonly compilerPackageGraphDigest: string;
  readonly checkerSetId: "galerina.strict-checks.v1";
  readonly checkerSetDigest: string;
  readonly generatorId: "rd0858-scalar-oracle-generator.v1";
  readonly generatorSourceDigest: string;
  readonly qualifier: "pure";
  readonly parameters: readonly [CheckedFlowArtifactParameter];
  readonly returnType: "String";
  readonly declaredEffects: readonly [];
  readonly checkedAst: CheckedFlowArtifactNode;
}

export class CheckedFlowArtifactRefusal extends Error {
  constructor(readonly code: string) {
    super(`CHECKED_FLOW_ARTIFACT_${code}: refused`);
    this.name = "CheckedFlowArtifactRefusal";
  }
}

function refuse(code: string): never {
  throw new CheckedFlowArtifactRefusal(code);
}

interface Budget {
  values: number;
  astNodes: number;
}

function spendValue(budget: Budget): void {
  budget.values += 1;
  if (budget.values > CHECKED_FLOW_ARTIFACT_MAX_VALUES) refuse("VALUE_BOUND");
}

function checkedString(value: unknown, code: string): string {
  if (typeof value !== "string") refuse(`${code}_STRING`);
  if (value.normalize("NFC") !== value) refuse(`${code}_NFC`);
  if (textEncoder.encode(value).byteLength > MAX_STRING_BYTES) refuse(`${code}_STRING_BOUND`);
  return value;
}

function ownDataRecord(value: unknown, code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse(`${code}_OBJECT`);
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) refuse(`${code}_OBJECT`);
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const names = Reflect.ownKeys(descriptors);
    if (names.some((name) => typeof name !== "string")) refuse(`${code}_SYMBOL`);
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const name of names as string[]) {
      const descriptor = descriptors[name];
      if (descriptor === undefined || !("value" in descriptor)) refuse(`${code}_ACCESSOR`);
      snapshot[name] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof CheckedFlowArtifactRefusal) throw error;
    refuse(`${code}_ACCESS`);
  }
}

function ownDataArray(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) refuse(`${code}_ARRAY`);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors.length;
    const lengthValue: unknown = lengthDescriptor?.value;
    if (typeof lengthValue !== "number" || !Number.isSafeInteger(lengthValue)
      || lengthValue < 0 || lengthValue > MAX_ARRAY_ITEMS) refuse(`${code}_BOUND`);
    const length = lengthValue;
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || !("value" in descriptor)) refuse(`${code}_SPARSE`);
      result.push(descriptor.value);
    }
    const expected = new Set(["length", ...Array.from({ length }, (_, index) => String(index))]);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string" || !expected.has(key))) {
      refuse(`${code}_FIELD`);
    }
    return Object.freeze(result);
  } catch (error) {
    if (error instanceof CheckedFlowArtifactRefusal) throw error;
    refuse(`${code}_ACCESS`);
  }
}

function exactFields(record: Readonly<Record<string, unknown>>, expected: readonly string[], code: string): void {
  const actual = Object.keys(record);
  if (actual.length !== expected.length || actual.some((field) => !expected.includes(field))) {
    refuse(`${code}_FIELD`);
  }
}

const AST_FIELDS = [
  "kind",
  "value",
  "callStyle",
  "typeName",
  "conformsTo",
  "flowRef",
  "claim",
  "flags",
  "children",
] as const;

function snapshotAst(value: unknown, depth: number, budget: Budget): CheckedFlowArtifactNode {
  if (depth > CHECKED_FLOW_ARTIFACT_MAX_DEPTH) refuse("AST_DEPTH_BOUND");
  spendValue(budget);
  budget.astNodes += 1;
  if (budget.astNodes > CHECKED_FLOW_ARTIFACT_MAX_AST_NODES) refuse("AST_NODE_BOUND");
  const record = ownDataRecord(value, "AST");
  if (Object.keys(record).some((field) => !AST_FIELDS.includes(field as typeof AST_FIELDS[number]))) {
    refuse("AST_UNKNOWN_FIELD");
  }
  const kind = checkedString(record.kind, "AST_KIND");
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(kind)) refuse("AST_KIND");
  const result: {
    kind: string;
    value?: string;
    callStyle?: "method";
    typeName?: string;
    conformsTo?: string;
    flowRef?: string;
    claim?: string;
    flags?: number;
    children?: readonly CheckedFlowArtifactNode[];
  } = { kind };
  for (const field of ["value", "typeName", "conformsTo", "flowRef", "claim"] as const) {
    if (record[field] !== undefined) result[field] = checkedString(record[field], `AST_${field.toUpperCase()}`);
  }
  if (record.callStyle !== undefined) {
    if (record.callStyle !== "method") refuse("AST_CALL_STYLE");
    result.callStyle = "method";
  }
  if (record.flags !== undefined) {
    if (!Number.isSafeInteger(record.flags) || (record.flags as number) < 0) refuse("AST_FLAGS");
    result.flags = record.flags as number;
  }
  if (record.children !== undefined) {
    const children = ownDataArray(record.children, "AST_CHILDREN");
    result.children = Object.freeze(children.map((child) => snapshotAst(child, depth + 1, budget)));
  }
  return Object.freeze(result);
}

function hasExactScalarContract(ast: CheckedFlowArtifactNode): boolean {
  const children = ast.children;
  if (
    ast.kind !== "pureFlowDecl" ||
    ast.value !== "scalarOracle" ||
    ast.flags !== 33 ||
    children?.length !== 4
  ) return false;
  const [parameter, returnType, contract, block] = children;
  if (
    parameter?.kind !== "paramDecl" ||
    parameter.value !== "subject: Verdict" ||
    parameter.children?.length !== 1 ||
    parameter.children[0]?.kind !== "typeRef" ||
    parameter.children[0]?.value !== "Verdict" ||
    parameter.children[0]?.children?.length !== 0 ||
    returnType?.kind !== "typeRef" ||
    returnType.value !== "String" ||
    returnType.children?.length !== 0 ||
    contract?.kind !== "contractDecl" ||
    contract.children?.length !== 1 ||
    contract.children[0]?.kind !== "identifier" ||
    contract.children[0]?.value !== "effects:block" ||
    contract.children[0]?.children?.length !== 0 ||
    block?.kind !== "block" ||
    block.children?.length !== 1
  ) return false;
  const check = block.children[0];
  if (
    check?.kind !== "checkExpr" ||
    check.children?.length !== 4 ||
    check.children[0]?.kind !== "identifier" ||
    check.children[0]?.value !== "subject" ||
    check.children[0]?.children?.length !== 0
  ) return false;
  const terminals = [["deny", '"deny"'], ["ambig", '"ambig"'], ["if", '"allow"']] as const;
  return terminals.every(([armName, literalValue], index) => {
    const arm = check.children?.[index + 1];
    const armBlock = arm?.children?.[0];
    const returnNode = armBlock?.children?.[0];
    const literal = returnNode?.children?.[0];
    return arm?.kind === "checkArm" &&
      arm.value === armName &&
      arm.children?.length === 1 &&
      armBlock?.kind === "block" &&
      armBlock.children?.length === 1 &&
      returnNode?.kind === "returnStmt" &&
      returnNode.children?.length === 1 &&
      literal?.kind === "stringLiteral" &&
      literal.value === literalValue &&
      literal.children?.length === 0;
  });
}

const ARTIFACT_FIELDS = [
  "schema",
  "hashAlgorithm",
  "productId",
  "packageId",
  "flowLocator",
  "flowName",
  "languageVersion",
  "runtimeProfile",
  "sourceCanonicalization",
  "sourceDigest",
  "compilerPackageId",
  "compilerVersion",
  "compilerPackageGraphDigest",
  "checkerSetId",
  "checkerSetDigest",
  "generatorId",
  "generatorSourceDigest",
  "qualifier",
  "parameters",
  "returnType",
  "declaredEffects",
  "checkedAst",
] as const;

function exactString(record: Readonly<Record<string, unknown>>, field: string, expected: string): string {
  const current = checkedString(record[field], field.toUpperCase());
  if (current !== expected) refuse(`${field.toUpperCase()}_IDENTITY`);
  return current;
}

function exactDigest(record: Readonly<Record<string, unknown>>, field: string): string {
  const current = checkedString(record[field], field.toUpperCase());
  if (!digestPattern.test(current)) refuse(`${field.toUpperCase()}_DIGEST`);
  return current;
}

export function validateCheckedFlowArtifact(value: unknown): CheckedFlowArtifact {
  const budget: Budget = { values: 0, astNodes: 0 };
  spendValue(budget);
  const record = ownDataRecord(value, "ARTIFACT");
  exactFields(record, ARTIFACT_FIELDS, "ARTIFACT");
  const parameters = ownDataArray(record.parameters, "PARAMETERS");
  if (parameters.length !== 1) refuse("PARAMETERS_BOUND");
  const parameter = ownDataRecord(parameters[0], "PARAMETER");
  exactFields(parameter, ["name", "type"], "PARAMETER");
  exactString(parameter, "name", "subject");
  exactString(parameter, "type", "Verdict");
  const declaredEffects = ownDataArray(record.declaredEffects, "EFFECTS");
  if (declaredEffects.length !== 0) refuse("EFFECTS_IDENTITY");
  const checkedAst = snapshotAst(record.checkedAst, 1, budget);
  if (!hasExactScalarContract(checkedAst)) refuse("AST_CONTRACT");
  if (record.languageVersion !== 1) refuse("LANGUAGE_VERSION_INTEGER");
  const compilerVersion = checkedString(record.compilerVersion, "COMPILER_VERSION");
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(compilerVersion)) {
    refuse("COMPILER_VERSION");
  }
  const canonicalParameters: readonly [CheckedFlowArtifactParameter] = Object.freeze([
    Object.freeze({ name: "subject", type: "Verdict" }),
  ]);
  const canonicalEffects: readonly [] = Object.freeze([]);
  return Object.freeze({
    schema: exactString(record, "schema", "galerina.rd0858.checked-flow.v1") as CheckedFlowArtifact["schema"],
    hashAlgorithm: exactString(record, "hashAlgorithm", "sha256") as "sha256",
    productId: exactString(record, "productId", "galerina") as "galerina",
    packageId: exactString(record, "packageId", "rd0858-unit4-scalar-oracle") as CheckedFlowArtifact["packageId"],
    flowLocator: exactString(record, "flowLocator", "rd0858/unit4/scalar-oracle") as CheckedFlowArtifact["flowLocator"],
    flowName: exactString(record, "flowName", "scalarOracle") as "scalarOracle",
    languageVersion: 1,
    runtimeProfile: exactString(record, "runtimeProfile", "scalar-1") as "scalar-1",
    sourceCanonicalization: exactString(record, "sourceCanonicalization", "UTF8_NO_BOM_LF_NFC_V1") as CheckedFlowArtifact["sourceCanonicalization"],
    sourceDigest: exactDigest(record, "sourceDigest"),
    compilerPackageId: exactString(record, "compilerPackageId", "@galerina/core-compiler") as CheckedFlowArtifact["compilerPackageId"],
    compilerVersion,
    compilerPackageGraphDigest: exactDigest(record, "compilerPackageGraphDigest"),
    checkerSetId: exactString(record, "checkerSetId", "galerina.strict-checks.v1") as CheckedFlowArtifact["checkerSetId"],
    checkerSetDigest: exactDigest(record, "checkerSetDigest"),
    generatorId: exactString(record, "generatorId", "rd0858-scalar-oracle-generator.v1") as CheckedFlowArtifact["generatorId"],
    generatorSourceDigest: exactDigest(record, "generatorSourceDigest"),
    qualifier: exactString(record, "qualifier", "pure") as "pure",
    parameters: canonicalParameters,
    returnType: exactString(record, "returnType", "String") as "String",
    declaredEffects: canonicalEffects,
    checkedAst,
  });
}

function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  const record = value as Readonly<Record<string, CanonicalValue>>;
  return `{${Object.keys(record).map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key] ?? null)}`).join(",")}}`;
}

function artifactCanonicalValue(artifact: CheckedFlowArtifact): CanonicalValue {
  return artifact as unknown as CanonicalValue;
}

class JsonScanner {
  private index = 0;
  private values = 0;

  constructor(private readonly source: string) {}

  parse(): CanonicalValue {
    const value = this.parseValue(1);
    if (this.index !== this.source.length) refuse("JSON_TRAILING");
    return value;
  }

  private spend(depth: number): void {
    if (depth > CHECKED_FLOW_ARTIFACT_MAX_DEPTH) refuse("JSON_DEPTH_BOUND");
    this.values += 1;
    if (this.values > CHECKED_FLOW_ARTIFACT_MAX_VALUES) refuse("JSON_VALUE_BOUND");
  }

  private parseValue(depth: number): CanonicalValue {
    this.spend(depth);
    const current = this.source[this.index];
    if (current === "{") return this.parseObject(depth);
    if (current === "[") return this.parseArray(depth);
    if (current === '"') return this.parseString();
    if (current === "t" && this.takeLiteral("true")) return true;
    if (current === "f" && this.takeLiteral("false")) return false;
    if (current === "n" && this.takeLiteral("null")) return null;
    return this.parseNumber();
  }

  private takeLiteral(literal: string): boolean {
    if (!this.source.startsWith(literal, this.index)) return false;
    this.index += literal.length;
    return true;
  }

  private parseString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const code = this.source.charCodeAt(this.index);
      if (code === 0x22) {
        this.index += 1;
        let decoded: unknown;
        try {
          decoded = JSON.parse(this.source.slice(start, this.index));
        } catch {
          refuse("JSON_STRING");
        }
        return checkedString(decoded, "JSON_STRING");
      }
      if (code < 0x20) refuse("JSON_STRING_CONTROL");
      if (code === 0x5c) {
        this.index += 1;
        const escaped = this.source[this.index];
        if (escaped === "u") {
          const digits = this.source.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(digits)) refuse("JSON_ESCAPE");
          this.index += 5;
          continue;
        }
        if (escaped === undefined || !'"\\/bfnrt'.includes(escaped)) refuse("JSON_ESCAPE");
      }
      this.index += 1;
    }
    refuse("JSON_STRING_TRUNCATED");
  }

  private parseNumber(): number {
    const match = /^-?(?:0|[1-9][0-9]*)/u.exec(this.source.slice(this.index));
    if (match === null) refuse("JSON_TOKEN");
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isSafeInteger(value)) refuse("JSON_INTEGER");
    return value;
  }

  private parseArray(depth: number): readonly CanonicalValue[] {
    this.index += 1;
    const values: CanonicalValue[] = [];
    if (this.source[this.index] === "]") {
      this.index += 1;
      return Object.freeze(values);
    }
    while (true) {
      if (values.length >= MAX_ARRAY_ITEMS) refuse("JSON_ARRAY_BOUND");
      values.push(this.parseValue(depth + 1));
      const separator = this.source[this.index];
      this.index += 1;
      if (separator === "]") return Object.freeze(values);
      if (separator !== ",") refuse("JSON_ARRAY");
    }
  }

  private parseObject(depth: number): Readonly<Record<string, CanonicalValue>> {
    this.index += 1;
    const result: Record<string, CanonicalValue> = Object.create(null);
    const seen = new Set<string>();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return Object.freeze(result);
    }
    while (true) {
      if (seen.size >= MAX_RECORD_FIELDS) refuse("JSON_FIELD_BOUND");
      if (this.source[this.index] !== '"') refuse("JSON_OBJECT_KEY");
      const key = this.parseString();
      if (seen.has(key)) refuse("JSON_DUPLICATE_KEY");
      seen.add(key);
      if (this.source[this.index] !== ":") refuse("JSON_OBJECT_COLON");
      this.index += 1;
      result[key] = this.parseValue(depth + 1);
      const separator = this.source[this.index];
      this.index += 1;
      if (separator === "}") return Object.freeze(result);
      if (separator !== ",") refuse("JSON_OBJECT");
    }
  }
}

export function encodeCheckedFlowArtifact(value: unknown): Uint8Array {
  const artifact = validateCheckedFlowArtifact(value);
  const bytes = textEncoder.encode(`${canonicalJson(artifactCanonicalValue(artifact))}\n`);
  if (bytes.byteLength < 2 || bytes.byteLength > CHECKED_FLOW_ARTIFACT_MAX_BYTES) refuse("BYTE_BOUND");
  return bytes;
}

export function decodeCheckedFlowArtifact(bytes: Uint8Array): CheckedFlowArtifact {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 2 || bytes.byteLength > CHECKED_FLOW_ARTIFACT_MAX_BYTES) {
    refuse("BYTE_BOUND");
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) refuse("UTF8_BOM");
  if (bytes[bytes.byteLength - 1] !== 0x0a || bytes[bytes.byteLength - 2] === 0x0a) refuse("CANONICAL_LF");
  for (const byte of bytes) if (byte === 0x0d) refuse("CANONICAL_CR");
  let source: string;
  try {
    source = textDecoder.decode(bytes.subarray(0, bytes.byteLength - 1));
  } catch {
    refuse("UTF8_INVALID");
  }
  const parsed = new JsonScanner(source).parse();
  const artifact = validateCheckedFlowArtifact(parsed);
  const reencoded = encodeCheckedFlowArtifact(artifact);
  if (reencoded.byteLength !== bytes.byteLength) refuse("JSON_NON_CANONICAL");
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (reencoded[index] !== bytes[index]) refuse("JSON_NON_CANONICAL");
  }
  return artifact;
}

export function digestCheckedFlowArtifact(bytes: Uint8Array): string {
  decodeCheckedFlowArtifact(bytes);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
