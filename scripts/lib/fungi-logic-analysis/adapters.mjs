import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkEffects,
  checkTypes,
  parseProgram,
  verifyGovernance,
} from "../../../packages-galerina/galerina-core-compiler/dist/index.js";

import { buildAnalysisRun } from "./core.mjs";
import { LogicAnalysisError } from "./contracts.mjs";
import { canonicalAnalysisJson } from "./publication.mjs";

const COMPILER_DIST = fileURLToPath(new URL("../../../packages-galerina/galerina-core-compiler/dist/", import.meta.url));
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export async function digestCompilerTree(root = COMPILER_DIST) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new LogicAnalysisError("COMPILER_TREE_REDIRECTED", "compiler tree contains a symbolic link");
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
      else throw new LogicAnalysisError("COMPILER_TREE_ENTRY_INVALID", "compiler tree contains a non-file entry");
    }
  }
  await visit(root);
  if (files.length === 0) throw new LogicAnalysisError("COMPILER_TREE_EMPTY", "compiler tree has no executable evidence");
  const hash = createHash("sha256");
  for (const path of files) {
    const name = relative(root, path).split(sep).join("/");
    const bytes = await readFile(path);
    hash.update(Buffer.from(`${Buffer.byteLength(name, "utf8")}:`, "utf8"));
    hash.update(Buffer.from(name, "utf8"));
    hash.update(Buffer.from(`:${bytes.length}:`, "utf8"));
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

function errors(diagnostics) {
  return (diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error").map((diagnostic) => diagnostic.code);
}

function vaultScopes(source) {
  return [...source.matchAll(/(?:^|\n)[ \t]*vault[ \t]+(secure|global|session)\b/gu)].map((match) => match[1]);
}

export async function analyzeFungiSource({ source, file, command = "scan", graphBuildPoint, profile = "dev" }) {
  const parsed = parseProgram(source, file, { requireVersionHeader: true });
  const types = checkTypes(parsed.ast);
  const effects = checkEffects(parsed.flows, parsed.ast);
  const governance = verifyGovernance(parsed.ast, parsed.flows, effects, profile, file);
  const compilerSha256 = await digestCompilerTree();
  const profileSha256 = sha256(Buffer.from(canonicalAnalysisJson({ profile }), "utf8"));
  return buildAnalysisRun({
    command,
    identity: {
      sourceSha256: sha256(Buffer.from(source, "utf8")),
      compilerSha256,
      profileSha256,
      graphBuildPoint,
    },
    facts: {
      ast: parsed.ast,
      flows: parsed.flows,
      effectResults: effects,
      governanceObligations: governance.proofObligations ?? [],
      diagnostics: {
        parse: errors(parsed.diagnostics),
        type: errors(types.diagnostics),
        effect: effects.flatMap((result) => errors(result.diagnostics)),
        governance: errors(governance.diagnostics),
      },
      requestedVaultScopes: vaultScopes(source),
    },
  });
}
