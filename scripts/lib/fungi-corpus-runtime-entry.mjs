import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { AUTHORITY_ENV, loadAuthority } = require("./fungi-corpus-runtime-authority.cjs");
const authority = loadAuthority();
const entryPath = fileURLToPath(import.meta.url);
const targetPath = resolve(dirname(entryPath), "..", "..", "galerina.mjs");

if (
  process.argv[1] !== entryPath
  || process.argv[2] !== targetPath
  || !authority.allowedPaths.has(targetPath)
) throw new Error("CORPUS_RUNTIME_ENTRY_REFUSED");

for (const key of Object.keys(process.env)) {
  if (key.toUpperCase() === AUTHORITY_ENV) delete process.env[key];
}
if (Object.keys(process.env).some((key) => key.toUpperCase() === AUTHORITY_ENV)) {
  throw new Error("CORPUS_RUNTIME_AUTHORITY_REFUSED");
}

process.argv.splice(1, 2, targetPath);
await import(pathToFileURL(targetPath).href);
