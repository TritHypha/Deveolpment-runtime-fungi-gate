import { createHash } from "node:crypto";
import {
  closeSync, constants, fstatSync, lstatSync, openSync, opendirSync, readFileSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

const sourceRepositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = realpathSync.native(sourceRepositoryRoot);
const utf8 = new TextDecoder("utf-8", { fatal: true });
const MAX_FILES = 1_000;
const MAX_FILE_BYTES = 8_388_608;
const MAX_TOTAL_BYTES = 134_217_728;
const MAX_DIRECTORY_ENTRIES = 1_024;
const MAX_TRAVERSAL_ENTRIES = 4_096;

class AuditFailure extends Error {
  constructor(kind, code, message) {
    super(message);
    this.kind = kind;
    this.code = code;
  }
}

function fail(kind, code, message) {
  throw new AuditFailure(kind, code, message);
}

function insideRoot(candidate) {
  const rel = relative(repositoryRoot, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function pathKey(value) {
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLocaleLowerCase("en-US") : normalized;
}

if (pathKey(sourceRepositoryRoot) !== pathKey(repositoryRoot)) {
  fail("REFUSED", "REPOSITORY_ALIAS", "audit library repository root is aliased or reparsed");
}

function statIdentity(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs];
}

function sameIdentity(left, right) {
  const leftIdentity = statIdentity(left);
  const rightIdentity = statIdentity(right);
  return leftIdentity.every((value, index) => value === rightIdentity[index]);
}

function secureExistingPath(path, relativePath, expectedType, expectedStat) {
  let stat;
  try { stat = lstatSync(path, { bigint: true }); }
  catch { fail("REFUSED", "PATH_MISSING", `required path is unavailable: ${relativePath}`); }
  if (stat.isSymbolicLink()) fail("REFUSED", "PATH_LINK", `linked path refused: ${relativePath}`);
  if (expectedType === "file" && !stat.isFile()) fail("REFUSED", "PATH_TYPE", `regular file required: ${relativePath}`);
  if (expectedType === "directory" && !stat.isDirectory()) fail("REFUSED", "PATH_TYPE", `directory required: ${relativePath}`);
  if (expectedType === undefined && !stat.isFile() && !stat.isDirectory()) {
    fail("REFUSED", "ENTRY_TYPE_REFUSED", `unsupported filesystem entry: ${relativePath}`);
  }
  let canonical;
  try { canonical = realpathSync.native(path); }
  catch { fail("REFUSED", "PATH_CANONICAL_REFUSED", `path cannot be canonicalized: ${relativePath}`); }
  if (pathKey(canonical) !== pathKey(path)) fail("REFUSED", "PATH_ALIAS", `aliased or reparse path refused: ${relativePath}`);
  if (!insideRoot(canonical)) fail("REFUSED", "PATH_ESCAPE", `path escapes the repository: ${relativePath}`);
  if (expectedStat && !sameIdentity(stat, expectedStat)) fail("REFUSED", "PATH_CHANGED", `path identity changed: ${relativePath}`);
  return stat;
}

function createBudget() {
  return { entries: 0 };
}

function visitDirectory(path, relativePath, budget, visitor) {
  let directory;
  try { directory = opendirSync(path); }
  catch { fail("REFUSED", "DIRECTORY_READ_FAILED", `directory read failed: ${relativePath}`); }
  let localEntries = 0;
  try {
    while (true) {
      let entry;
      try { entry = directory.readSync(); }
      catch { fail("REFUSED", "DIRECTORY_READ_FAILED", `directory read failed: ${relativePath}`); }
      if (entry === null) break;
      localEntries += 1;
      budget.entries += 1;
      if (localEntries > MAX_DIRECTORY_ENTRIES || budget.entries > MAX_TRAVERSAL_ENTRIES) {
        fail("REFUSED", "ENTRY_CEILING", `directory traversal ceiling exceeded: ${relativePath}`);
      }
      visitor(entry);
    }
  } finally {
    try { directory.closeSync(); } catch { /* the directory carries no remaining authority */ }
  }
}

function exactChild(parent, parentRelative, component, budget) {
  const folded = component.toLocaleLowerCase("en-US");
  const matches = [];
  visitDirectory(parent, parentRelative, budget, (entry) => {
    if (entry.name.toLocaleLowerCase("en-US") === folded) matches.push(entry.name);
  });
  if (matches.length === 0) fail("REFUSED", "PATH_MISSING", `required component is unavailable: ${component}`);
  if (matches.length !== 1) fail("REFUSED", "PATH_AMBIGUOUS", `case-ambiguous component refused: ${component}`);
  if (matches[0] !== component) fail("REFUSED", "PATH_CASE", `component case is not exact: ${component}`);
  return resolve(parent, component);
}

function exactPath(relativePath, expectedType, budget) {
  if (typeof relativePath !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(relativePath)
      || relativePath.includes("//") || relativePath.split("/").some((part) => part === "." || part === "..")) {
    fail("REFUSED", "PATH_INVALID", "path is not one exact repository-relative locator");
  }
  const parts = relativePath.split("/");
  let current = repositoryRoot;
  let currentRelative = ".";
  let stat;
  for (let index = 0; index < parts.length; index += 1) {
    const component = parts[index];
    current = exactChild(current, currentRelative, component, budget);
    currentRelative = currentRelative === "." ? component : `${currentRelative}/${component}`;
    stat = secureExistingPath(current, currentRelative, index === parts.length - 1 ? expectedType : "directory");
  }
  return { path: current, stat };
}

function digestRows(rows) {
  const hash = createHash("sha256");
  for (const [path, bytes] of rows) {
    hash.update(path, "utf8");
    hash.update("\0", "utf8");
    hash.update(bytes);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

function readBoundedPath(relativePath, path, expectedStat) {
  const pathBefore = secureExistingPath(path, relativePath, "file", expectedStat);
  if (pathBefore.size > BigInt(MAX_FILE_BYTES)) fail("REFUSED", "FILE_TOO_LARGE", `file exceeds ceiling: ${relativePath}`);
  let descriptor;
  let bytes;
  try {
    const noFollow = Number.isInteger(constants.O_NOFOLLOW) ? constants.O_NOFOLLOW : 0;
    descriptor = openSync(path, constants.O_RDONLY | noFollow);
    const descriptorBefore = fstatSync(descriptor, { bigint: true });
    if (!sameIdentity(pathBefore, descriptorBefore)) fail("REFUSED", "FILE_CHANGED", `file changed before read: ${relativePath}`);
    bytes = readFileSync(descriptor);
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = secureExistingPath(path, relativePath, "file");
    if (!sameIdentity(descriptorBefore, descriptorAfter) || !sameIdentity(descriptorAfter, pathAfter)
        || pathAfter.size !== BigInt(bytes.length)) {
      fail("REFUSED", "FILE_CHANGED", `file changed during read: ${relativePath}`);
    }
  } catch (error) {
    if (error instanceof AuditFailure) throw error;
    fail("REFUSED", "READ_FAILED", `file read failed: ${relativePath}`);
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* the descriptor carries no remaining authority */ }
    }
  }
  if (bytes.length > MAX_FILE_BYTES) fail("REFUSED", "FILE_TOO_LARGE", `actual bytes exceed ceiling: ${relativePath}`);
  let text;
  try { text = utf8.decode(bytes); }
  catch { fail("REFUSED", "UTF8_INVALID", `file is not UTF-8: ${relativePath}`); }
  return { bytes, text };
}

function readBounded(relativePath, budget) {
  const { path, stat } = exactPath(relativePath, "file", budget);
  return readBoundedPath(relativePath, path, stat);
}

function scanFungiRoot(relativeRoot, inspect, budget) {
  const { path: root, stat: rootStat } = exactPath(relativeRoot, "directory", budget);
  const pending = [[relativeRoot, root, rootStat]];
  const rows = [];
  let fungiFiles = 0;
  let totalBytes = 0;
  while (pending.length > 0) {
    const [currentRelative, current, expectedStat] = pending.pop();
    secureExistingPath(current, currentRelative, "directory", expectedStat);
    visitDirectory(current, currentRelative, budget, (entry) => {
      const childRelative = `${currentRelative}/${entry.name}`;
      const child = resolve(current, entry.name);
      if (!insideRoot(child)) fail("REFUSED", "PATH_ESCAPE", "walk escaped the repository");
      const childStat = secureExistingPath(child, childRelative);
      if (childStat.isDirectory()) {
        pending.push([childRelative, child, childStat]);
        return;
      }
      if (rows.length >= MAX_FILES) fail("REFUSED", "FILE_COUNT_REFUSED", "corpus file ceiling exceeded");
      const { bytes, text } = readBoundedPath(childRelative, child, childStat);
      if (entry.name.endsWith(".fungi")) {
        fungiFiles += 1;
        inspect(childRelative, text);
      } else if (entry.name.endsWith(".checked.json")) {
        try { JSON.parse(text); }
        catch { fail("REFUSED", "CORPUS_JSON_INVALID", `corpus metadata JSON is invalid: ${childRelative}`); }
      } else {
        fail("REFUSED", "ENTRY_UNSUPPORTED", `unsupported corpus entry refused: ${childRelative}`);
      }
      totalBytes += bytes.length;
      if (totalBytes > MAX_TOTAL_BYTES) fail("REFUSED", "TOTAL_BYTES_REFUSED", "corpus byte ceiling exceeded");
      rows.push([childRelative, bytes]);
    });
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  if (fungiFiles === 0) fail("FINDING", "CORPUS_EMPTY", `no .fungi files in ${relativeRoot}`);
  return { files: rows.length, bytes: totalBytes, digest: digestRows(rows) };
}

function receipt(check, result) {
  return Object.freeze({
    schema: "rd0873-read-only-audit.v1",
    authorizing: false,
    verdict: "PASS",
    check,
    files: result.files,
    bytes: result.bytes,
    digest: result.digest,
  });
}

export function auditCorpus(check, relativeRoot) {
  return receipt(check, scanFungiRoot(relativeRoot, () => {}, createBudget()));
}

export function auditStaticSnippets() {
  let flowSnippets = 0;
  const inspect = (_path, text) => {
    flowSnippets += [...text.matchAll(/\bflow\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/gu)].length;
  };
  const budget = createBudget();
  const left = scanFungiRoot("packages/fungi", inspect, budget);
  const right = scanFungiRoot("packages-ts/galerina-core-compiler/src/self-hosted", inspect, budget);
  if (flowSnippets === 0) fail("FINDING", "STATIC_SNIPPETS_EMPTY", "no static flow snippets were observed");
  return receipt("static-snippets", {
    files: left.files + right.files,
    bytes: left.bytes + right.bytes,
    digest: digestRows([[left.digest, Buffer.from(right.digest)], ["flow-snippets", Buffer.from(String(flowSnippets))]]),
  });
}

export function auditGeneratedState() {
  const paths = ["build/code-index/code-index.json", "build/code-registry/registry.json"];
  const rows = [];
  const budget = createBudget();
  let totalBytes = 0;
  for (const path of paths) {
    const { bytes, text } = readBounded(path, budget);
    try { JSON.parse(text); }
    catch { fail("REFUSED", "GENERATED_JSON_INVALID", `generated JSON is invalid: ${path}`); }
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail("REFUSED", "TOTAL_BYTES_REFUSED", "generated-state byte ceiling exceeded");
    rows.push([path, bytes]);
  }
  return receipt("generated-state", { files: rows.length, bytes: totalBytes, digest: digestRows(rows) });
}

export function auditFinalState() {
  const paths = [
    "governance/rd0873-native-fungi-audit-map.json",
    "scripts/tests/rd0873-native-fungi-audit-map.test.mjs",
    "tools/bounded-tool-batch-policy.json",
    "tools/rd0873-read-only-audit-lib.mjs",
    "tools/rd0873-corpus-packages-fungi.mjs",
    "tools/rd0873-corpus-self-hosted.mjs",
    "tools/rd0873-static-snippets.mjs",
    "tools/rd0873-generated-state.mjs",
    "tools/rd0873-final-check.mjs",
  ];
  const rows = [];
  const budget = createBudget();
  let totalBytes = 0;
  for (const path of paths) {
    const { bytes } = readBounded(path, budget);
    if (bytes.length === 0) fail("FINDING", "FINAL_FILE_EMPTY", `integration file is empty: ${path}`);
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail("REFUSED", "TOTAL_BYTES_REFUSED", "final-state byte ceiling exceeded");
    rows.push([path, bytes]);
  }
  return receipt("final-check", { files: rows.length, bytes: totalBytes, digest: digestRows(rows) });
}

export function runAudit(callback) {
  try {
    if (process.argv.slice(2).length !== 0) fail("REFUSED", "ARGV_REFUSED", "audit entry points accept no arguments");
    process.stdout.write(`${JSON.stringify(callback())}\n`);
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof AuditFailure && error.kind === "FINDING") {
      process.stdout.write(`${JSON.stringify({ schema: "rd0873-read-only-audit.v1", authorizing: false, verdict: "FINDING", code: error.code })}\n`);
      process.exitCode = 1;
      return;
    }
    process.stderr.write(`REFUSED: ${error instanceof AuditFailure ? error.code : "EXECUTION_REFUSED"}\n`);
    process.exitCode = 2;
  }
}
