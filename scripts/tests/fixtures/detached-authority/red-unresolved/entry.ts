const moduleName = "outside-root";

export const unresolvedClosure = import(`./${moduleName}.ts`);
export const missingClosure = import("./missing.ts");
export const outsideRootClosure = import("../../../../outside-root.ts");
