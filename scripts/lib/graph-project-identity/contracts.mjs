export const GRAPH_IDENTITY_SCHEMA = "galerina.graph-project-identity.v1";
export const GRAPH_IDENTITY_TOOL_VERSION = "1.0.0";

export const GRAPH_PROJECT_ALIASES = Object.freeze({
  galerina: Object.freeze({
    project: "Galerina",
    repository: "Galerina",
    componentScope: ".",
    probe: Object.freeze({ name: "parseProgram", label: "Function", filePath: "packages-galerina/galerina-core-compiler/src/parser.ts" }),
  }),
  slide: Object.freeze({
    project: "SLIDE",
    repository: "SLIDE",
    componentScope: ".",
    probe: Object.freeze({ name: "compileCheckedFungiPackageSet", label: "Function", filePath: "src/checked-fungi-package-compiler.mjs" }),
  }),
  vok: Object.freeze({
    project: "SLIDE",
    repository: "SLIDE",
    componentScope: "src/checked-fungi-package-file.mjs",
    probe: Object.freeze({ name: "verifyTypedCheckedFungiPackageReceipt", label: "Function", filePath: "src/checked-fungi-package-file.mjs" }),
  }),
  lyth: Object.freeze({
    project: "lyth-weaver",
    repository: "lyth-weaver",
    componentScope: ".",
    probe: Object.freeze({ name: "adaptLythAdmissionWork", label: "Function", filePath: "src/slide-admission-work-adapter.ts" }),
  }),
});

export class GraphIdentityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GraphIdentityError";
    this.code = code;
  }
}
