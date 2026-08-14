import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { SandboxRefusal } from "./contracts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");
const TYPESCRIPT_PATH = resolve(DEFAULT_ROOT, "packages-galerina", "galerina-core-compiler", "node_modules", "typescript", "lib", "typescript.js");

function contained(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`);
}

export function loadTypeScript(root = DEFAULT_ROOT) {
  const requested = resolve(root, "packages-galerina", "galerina-core-compiler", "node_modules", "typescript", "lib", "typescript.js");
  if (!contained(resolve(root), requested) || requested !== TYPESCRIPT_PATH) {
    throw new SandboxRefusal("TYPESCRIPT_COMPILER_IDENTITY", "TypeScript must resolve from the pinned core-compiler workspace");
  }
  try {
    const ts = createRequire(import.meta.url)(requested);
    if (typeof ts.version !== "string" || typeof ts.createSourceFile !== "function") throw new Error("invalid TypeScript API");
    return ts;
  } catch (error) {
    throw new SandboxRefusal("TYPESCRIPT_COMPILER_UNAVAILABLE", `pinned TypeScript compiler unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const ts = loadTypeScript();
export const TYPESCRIPT_VERSION = ts.version;
