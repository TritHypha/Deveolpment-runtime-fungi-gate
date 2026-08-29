import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadAuthority } = require("./fungi-corpus-runtime-authority.cjs");
const authority = loadAuthority();

function admitted(url) {
  return typeof url === "string" && (url.startsWith("node:") || authority.allowedUrls.has(url));
}

export async function resolve(specifier, context, nextResolve) {
  let result;
  if (Object.prototype.hasOwnProperty.call(authority.entries, specifier)) {
    result = { url: authority.entries[specifier].url, shortCircuit: true };
  } else {
    if (specifier.startsWith("@galerina/")) throw new Error("CORPUS_RUNTIME_DEPENDENCY_REFUSED");
    result = await nextResolve(specifier, context);
  }
  if (result === null || typeof result !== "object" || !admitted(result.url)) {
    throw new Error("CORPUS_RUNTIME_FILE_REFUSED");
  }
  return result;
}

export async function load(url, context, nextLoad) {
  if (!admitted(url)) throw new Error("CORPUS_RUNTIME_FILE_REFUSED");
  return nextLoad(url, context);
}
