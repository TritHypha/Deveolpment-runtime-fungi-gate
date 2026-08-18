export const GALERINA_REFERENCE_MANIFEST_SCHEMA = "galerina.reference-manifest.v1" as const;

export type ReferenceDeclarationKind =
  | "flow"
  | "type"
  | "record"
  | "enum"
  | "guard"
  | "static"
  | "bitfield";

export interface ReferenceSourceModule {
  readonly packageName: string;
  readonly moduleName: string;
  /** Repository-relative POSIX path. Source bodies are never emitted. */
  readonly file: string;
  readonly source: string;
}

export interface BuildReferenceManifestInput {
  readonly buildPoint: string;
  readonly modules: readonly ReferenceSourceModule[];
}

export interface ReferenceSourceRecord {
  readonly packageName: string;
  readonly moduleName: string;
  readonly file: string;
  readonly sourceSha256: string;
  readonly byteLength: number;
}

export interface ReferenceSourceLocator {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly byteStart: number;
  readonly byteEnd: number;
  readonly sourceSha256: string;
}

export interface ReferenceParameter {
  readonly name: string;
  readonly type: string;
  readonly qualifiers?: readonly ("readonly" | "tainted")[];
  readonly sourceFrom?: string;
}

export interface ReferenceContractFact {
  readonly kind: string;
  readonly values: readonly string[];
}

export interface ReferenceDeclaration {
  readonly packageName: string;
  readonly moduleName: string;
  readonly qualifiedName: string;
  readonly name: string;
  readonly kind: ReferenceDeclarationKind;
  readonly visibility: "public";
  readonly signature: string;
  readonly parameters?: readonly ReferenceParameter[];
  readonly returnType?: string;
  readonly qualifier?: "flow" | "secure" | "pure" | "guarded";
  readonly effects?: readonly string[];
  readonly contracts?: readonly ReferenceContractFact[];
  readonly typeLinks: readonly string[];
  readonly locator: ReferenceSourceLocator;
}

export interface GalerinaReferenceManifest {
  readonly schema: typeof GALERINA_REFERENCE_MANIFEST_SCHEMA;
  readonly buildPoint: string;
  readonly sources: readonly ReferenceSourceRecord[];
  readonly declarations: readonly ReferenceDeclaration[];
  readonly manifestSha256: string;
}

export type ReferenceManifestErrorCode =
  | "INVALID_INPUT"
  | "PARSE_REFUSED"
  | "CHECK_REFUSED"
  | "UNSUPPORTED_PUBLIC_AST"
  | "DUPLICATE_QUALIFIED_NAME"
  | "CASE_COLLISION"
  | "BROKEN_TYPE_LINK";

export class ReferenceManifestError extends Error {
  readonly code: ReferenceManifestErrorCode;

  constructor(code: ReferenceManifestErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ReferenceManifestError";
    this.code = code;
  }
}
