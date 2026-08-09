#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parseProgram } from "../packages-galerina/galerina-core-compiler/dist/index.js";
import { parseStrictJsonObject } from "./lib/flat-package-root-lock.mjs";

const MAX_FILES = 4096;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const KNOWN_AST_KINDS = new Set([
  "program", "importDecl", "typeDecl", "recordDecl", "enumDecl", "enumVariant",
  "intentDecl", "governanceDecl", "apiDecl", "flowDecl", "secureFlowDecl",
  "pureFlowDecl", "guardedFlowDecl", "fnDecl", "paramDecl", "typeRef",
  "effectsDecl", "effectRef", "ensureDecl", "paramAdmissionDecl", "admissionEntry",
  "block", "letDecl", "mutDecl", "readonlyDecl", "assignStmt", "returnStmt",
  "ifStmt", "whileStmt", "forEachStmt", "matchExpr", "matchArm", "checkExpr",
  "checkArm", "faultStmt", "prefilterExpr", "prefilterArm", "callExpr",
  "memberExpr", "binaryExpr", "unaryExpr", "k3FoldExpr", "identifier",
  "stringLiteral", "numberLiteral", "boolLiteral", "errorPropagation",
  "computeTargetBlock", "routeDecl", "contractDecl", "contractSetDecl",
  "authorityDecl", "policyDecl", "guardDecl", "resourceDecl", "hallmarkDecl",
  "charLiteral", "listLiteral", "preferHint", "attributeDecl", "assumingDecl",
  "emergencyTransitionDecl", "trapDecl", "governedFlowDecl", "accessDecl",
  "staticDecl", "bitfieldDecl", "gateDecl", "importPluginDecl",
  "assimilatedPluginDecl", "secretsBlock", "credentialDecl", "rotationDecl",
  "vaultDecl", "vaultEntryDecl",
]);

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedRecord(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function normalizeRoot(path) {
  const requested = resolve(path);
  const requestedStat = lstatSync(requested);
  if (!requestedStat.isDirectory() || requestedStat.isSymbolicLink()) {
    throw new Error("root is not a regular non-symlink directory");
  }
  const real = realpathSync(requested);
  if (real !== requested) throw new Error("root path is redirected");
  return real;
}

function confinedFile(root, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
    || !relativePath.startsWith("packages-galerina/")
    || !relativePath.endsWith(".fungi")
  ) {
    throw new Error(`non-canonical source path: ${String(relativePath)}`);
  }
  const candidate = resolve(root, ...relativePath.split("/"));
  const rel = relative(root, candidate);
  if (rel === "" || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) {
    throw new Error(`source escapes repository root: ${relativePath}`);
  }
  const stat = lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`source is not a regular non-symlink file: ${relativePath}`);
  }
  const real = realpathSync(candidate);
  const realRel = relative(root, real);
  if (realRel.startsWith(`..${sep}`) || realRel === ".." || isAbsolute(realRel)) {
    throw new Error(`source real path escapes repository root: ${relativePath}`);
  }
  return real;
}

export function collectAstFeatures(ast) {
  const kinds = new Map();
  const typeRefs = new Map();
  const operators = new Map();
  const memberCalls = new Map();
  const stack = [ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw new Error("malformed AST node");
    }
    if (typeof node.kind !== "string" || !KNOWN_AST_KINDS.has(node.kind)) {
      throw new Error(`unknown AST kind ${String(node.kind)}`);
    }
    increment(kinds, node.kind);
    if (node.kind === "typeRef") {
      if (typeof node.value !== "string" || node.value.length === 0) {
        throw new Error("typeRef lacks a canonical value");
      }
      increment(typeRefs, node.value);
    }
    if (node.kind === "binaryExpr" || node.kind === "unaryExpr") {
      if (typeof node.value !== "string" || node.value.length === 0) {
        throw new Error(`${node.kind} lacks an operator`);
      }
      increment(operators, node.value);
    }
    if (node.kind === "callExpr" && node.callStyle === "method") {
      if (typeof node.value !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.value)) {
        throw new Error("method call lacks a canonical name");
      }
      increment(memberCalls, node.value);
    }
    const children = node.children ?? [];
    if (!Array.isArray(children)) throw new Error(`${node.kind} children are not an array`);
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
  }
  return Object.freeze({
    astKinds: sortedRecord(kinds),
    typeRefs: sortedRecord(typeRefs),
    operators: sortedRecord(operators),
    memberCalls: sortedRecord(memberCalls),
  });
}

export function inventoryFungiSources({
  root = DEFAULT_ROOT,
  retirementPath = resolve(root, "build", "ts-retirement", "ts-retirement.json"),
} = {}) {
  const realRoot = normalizeRoot(root);
  const requestedRetirement = resolve(retirementPath);
  const retirementRelative = relative(realRoot, requestedRetirement);
  if (
    retirementRelative === ""
    || retirementRelative.startsWith(`..${sep}`)
    || retirementRelative === ".."
    || isAbsolute(retirementRelative)
  ) throw new Error("retirement input escapes repository root");
  const retirementStat = lstatSync(requestedRetirement);
  if (!retirementStat.isFile() || retirementStat.isSymbolicLink()) {
    throw new Error("retirement input is not a regular non-symlink file");
  }
  const realRetirement = realpathSync(requestedRetirement);
  if (realRetirement !== requestedRetirement) throw new Error("retirement input path is redirected");
  const retirementBytes = readFileSync(realRetirement);
  let retirement;
  try {
    const retirementText = new TextDecoder("utf-8", { fatal: true }).decode(retirementBytes);
    retirement = parseStrictJsonObject(retirementText, "Fungi source retirement input");
  } catch {
    throw new Error("retirement input is not valid JSON");
  }
  const paths = retirement?.unexecutedFungiPaths;
  if (!Array.isArray(paths) || paths.length > MAX_FILES) {
    throw new Error("retirement input has an invalid source-path list");
  }
  for (let index = 0; index < paths.length; index += 1) {
    if (index > 0 && !(paths[index - 1] < paths[index])) {
      throw new Error("source paths are not strictly sorted unique");
    }
  }

  const aggregateKinds = new Map();
  const aggregateTypes = new Map();
  const aggregateOperators = new Map();
  const aggregateCalls = new Map();
  const files = [];
  let totalBytes = 0;

  for (const relativePath of paths) {
    const absolutePath = confinedFile(realRoot, relativePath);
    const bytes = readFileSync(absolutePath);
    if (bytes.length > MAX_FILE_BYTES) throw new Error(`source exceeds byte limit: ${relativePath}`);
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("source corpus exceeds total byte limit");
    const source = bytes.toString("utf8");
    if (!Buffer.from(source, "utf8").equals(bytes)) {
      throw new Error(`source is not canonical UTF-8: ${relativePath}`);
    }
    const parsed = parseProgram(source, relativePath);
    const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length > 0) {
      const codes = [...new Set(errors.map((diagnostic) => diagnostic.code))].sort().join(",");
      throw new Error(`parser refused source ${relativePath}: ${codes}`);
    }
    const features = collectAstFeatures(parsed.ast);
    for (const [name, count] of Object.entries(features.astKinds)) aggregateKinds.set(name, (aggregateKinds.get(name) ?? 0) + count);
    for (const [name, count] of Object.entries(features.typeRefs)) aggregateTypes.set(name, (aggregateTypes.get(name) ?? 0) + count);
    for (const [name, count] of Object.entries(features.operators)) aggregateOperators.set(name, (aggregateOperators.get(name) ?? 0) + count);
    for (const [name, count] of Object.entries(features.memberCalls)) aggregateCalls.set(name, (aggregateCalls.get(name) ?? 0) + count);
    files.push({
      path: relativePath,
      sourceSha256: sha256(bytes),
      byteLength: bytes.length,
      flowCount: parsed.flows.length,
      diagnosticCodes: [...new Set(parsed.diagnostics.map((diagnostic) => diagnostic.code))].sort(),
      ...features,
    });
  }

  return canonicalize({
    schema: "galerina.fungi-source-capability-inventory.v1",
    authority: {
      productionAuthorityReleased: false,
      retirementAuthorized: false,
      slideAdmissionAuthorized: false,
    },
    source: {
      retirementGraphSha256: sha256(retirementBytes),
      retirementField: "unexecutedFungiPaths",
    },
    limits: {
      maxFiles: MAX_FILES,
      maxFileBytes: MAX_FILE_BYTES,
      maxTotalBytes: MAX_TOTAL_BYTES,
    },
    totals: {
      files: files.length,
      bytes: totalBytes,
      flows: files.reduce((sum, file) => sum + file.flowCount, 0),
      astKinds: sortedRecord(aggregateKinds),
      typeRefs: sortedRecord(aggregateTypes),
      operators: sortedRecord(aggregateOperators),
      memberCalls: sortedRecord(aggregateCalls),
    },
    files,
  });
}

export function renderInventoryMarkdown(inventory) {
  const rows = (record) => Object.entries(record)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => `| \`${name.replaceAll("|", "\\|")}\` | ${count} |`)
    .join("\n");
  return `# Galerina .fungi source capability inventory

Generated from the retirement graph. This is measured source demand, not SLIDE
admission, execution parity, retirement credit or production authority.

- Files: ${inventory.totals.files}
- Flows: ${inventory.totals.flows}
- Bytes: ${inventory.totals.bytes}
- Retirement graph: \`${inventory.source.retirementGraphSha256}\`

## AST kinds

| Kind | Count |
|---|---:|
${rows(inventory.totals.astKinds)}

## Type references

| Type | Count |
|---|---:|
${rows(inventory.totals.typeRefs)}

## Method calls

| Method | Count |
|---|---:|
${rows(inventory.totals.memberCalls)}

## Operators

| Operator | Count |
|---|---:|
${rows(inventory.totals.operators)}
`;
}

function parseArgs(argv) {
  let root = DEFAULT_ROOT;
  let check = false;
  let rootSeen = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check" && !check) {
      check = true;
    } else if (arg === "--root" && !rootSeen && index + 1 < argv.length && !argv[index + 1].startsWith("--")) {
      root = resolve(argv[index + 1]);
      rootSeen = true;
      index += 1;
    } else {
      throw new Error(`unknown or duplicate argument ${arg}`);
    }
  }
  return { root, check };
}

function runCli() {
  const { root, check } = parseArgs(process.argv.slice(2));
  const inventory = inventoryFungiSources({ root });
  const json = canonicalJson(inventory);
  const markdown = renderInventoryMarkdown(inventory);
  const outputDir = resolve(root, "build", "fungi-source-capabilities");
  const jsonPath = resolve(outputDir, "source-capability-inventory.json");
  const markdownPath = resolve(outputDir, "SOURCE-CAPABILITY-INVENTORY.md");
  if (check) {
    if (readFileSync(jsonPath, "utf8") !== json || readFileSync(markdownPath, "utf8") !== markdown) {
      throw new Error("fungi source capability inventory drift");
    }
    console.log(`fungi-source-capability-inventory: CURRENT (${inventory.totals.files} files)`);
    return;
  }
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(jsonPath, json, "utf8");
  writeFileSync(markdownPath, markdown, "utf8");
  console.log(`fungi-source-capability-inventory: WROTE (${inventory.totals.files} files)`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    console.error(`fungi-source-capability-inventory: REFUSED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
