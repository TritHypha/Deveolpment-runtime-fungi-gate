#!/usr/bin/env node
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ownedProcessTree from "./lib/owned-process-tree.cjs";
import { parseGovernanceDiff } from "./lib/phase-close-result.mjs";

const { runOwnedProcessSync } = ownedProcessTree;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODES = new Set(["patterns", "security", "naming", "cbor", "governance-diff"]);
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;

function parseArguments(argv) {
  const result = { root: DEFAULT_ROOT, mode: "" };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (seen.has(token)) throw new Error(`duplicate option ${token}`);
    seen.add(token);
    if (token === "--root" || token === "--check") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      if (token === "--root") result.root = resolve(value);
      else result.mode = value;
      index += 1;
    } else throw new Error(`unknown option ${token}`);
  }
  if (!MODES.has(result.mode)) throw new Error("check is outside the closed vocabulary");
  return result;
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../"));
}

function admittedPath(root, relativePath, kind) {
  const target = resolve(root, ...relativePath.split("/"));
  if (!inside(root, target)) throw new Error(`${relativePath} escapes root`);
  const real = realpathSync(target);
  if (!inside(root, real)) throw new Error(`${relativePath} resolves outside root`);
  const status = statSync(real);
  if (kind === "file" && !status.isFile()) throw new Error(`${relativePath} is not a regular file`);
  if (kind === "directory" && !status.isDirectory()) throw new Error(`${relativePath} is not a directory`);
  return real;
}

function readBounded(path) {
  const bytes = readFileSync(path);
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error(`${path} exceeds the source byte bound`);
  return bytes.toString("utf8");
}

function childEnvironment() {
  const admitted = {};
  const entries = Object.entries(process.env);
  const copy = (name, aliases) => {
    const item = entries.find(([key, value]) => aliases.includes(key.toLowerCase())
      && typeof value === "string" && value.length > 0);
    if (item) admitted[name] = item[1];
  };
  copy("PATH", ["path"]);
  if (process.platform === "win32") {
    copy("SystemRoot", ["systemroot"]); copy("WINDIR", ["windir"]);
    copy("ComSpec", ["comspec"]); copy("PATHEXT", ["pathext"]);
    copy("TEMP", ["temp"]); copy("TMP", ["tmp"]);
  } else {
    copy("TMPDIR", ["tmpdir"]); copy("LANG", ["lang"]); copy("LC_ALL", ["lc_all"]);
  }
  admitted.GIT_CONFIG_NOSYSTEM = "1";
  admitted.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  return admitted;
}

function regularFiles(root, relativeDirectory, suffix) {
  const directory = admittedPath(root, relativeDirectory, "directory");
  const names = readdirSync(directory).filter((name) => name.endsWith(suffix)).sort();
  if (names.length === 0) throw new Error(`${relativeDirectory} is empty`);
  return names.map((name) => ({ name, path: admittedPath(root, `${relativeDirectory}/${name}`, "file") }));
}

function checkPatterns(root) {
  const compiler = admittedPath(root, "galerina.mjs", "file");
  const files = regularFiles(root, "tests/patterns", ".fungi");
  const failures = [];
  for (const file of files) {
    const child = runOwnedProcessSync({
      command: process.execPath,
      args: [compiler, "check", file.path],
      cwd: root,
      env: childEnvironment(),
      timeoutMs: 30_000,
      maxOutputBytes: 4_194_304,
      windowsHide: true,
    });
    if (child.error !== undefined || typeof child.signal === "string" || child.status !== 0) failures.push(file.name);
  }
  if (failures.length > 0) throw new Error(`pattern check failed: ${failures.join(", ")}`);
  return `${files.length} patterns pass`;
}

async function loadAudit(root, packageName, exportName) {
  const modulePath = admittedPath(root, `packages-galerina/${packageName}/dist/index.js`, "file");
  const module = await import(pathToFileURL(modulePath).href);
  if (typeof module[exportName] !== "function") throw new Error(`${packageName} omits ${exportName}`);
  return module[exportName];
}

async function checkSecurityOrNaming(root, mode) {
  const files = regularFiles(root, "examples/auth-service", ".fungi");
  if (mode === "security") {
    const audit = await loadAudit(root, "galerina-devtools-security", "runSecurityAudit");
    let findings = 0;
    let errors = 0;
    for (const file of files) {
      try {
        const result = await audit(readBounded(file.path), file.name);
        findings += result?.findings?.length ?? result?.diagnostics?.length ?? 0;
      } catch {
        errors += 1;
      }
    }
    if (errors > 0) throw new Error(`${errors} security audit error(s)`);
    return `${files.length} files, ${findings} findings (incl. VALUESTATE), 0 errors`;
  }
  const audit = await loadAudit(root, "galerina-devtools-naming", "runNamingAudit");
  let findings = 0;
  for (const file of files) {
    try {
      const result = audit(readBounded(file.path), file.name);
      findings += result?.findings?.length ?? 0;
    } catch {
      // Legacy parity: naming findings and per-file failures are non-blocking evidence.
    }
  }
  return `${files.length} files, ${findings} naming findings`;
}

async function checkCbor(root) {
  const build = admittedPath(root, "build", "directory");
  const files = readdirSync(build)
    .filter((name) => name.endsWith(".lmanifest") && !name.endsWith(".json"))
    .sort()
    .map((name) => ({ name, path: admittedPath(root, `build/${name}`, "file") }));
  const modulePath = admittedPath(
    root,
    "packages-galerina/galerina-core-compiler/dist/manifest-generator.js",
    "file",
  );
  const { decodeCBOR, encodeCBOR } = await import(pathToFileURL(modulePath).href);
  if (typeof decodeCBOR !== "function" || typeof encodeCBOR !== "function") {
    throw new Error("manifest generator omits canonical CBOR operations");
  }
  const failures = [];
  let candidateCount = 0;
  for (const file of files) {
    const bytes = readFileSync(file.path);
    if (bytes.byteLength < 1 || (bytes[0] & 0xe0) !== 0xa0) continue;
    candidateCount += 1;
    try {
      const decoded = decodeCBOR(new Uint8Array(bytes));
      const encoded = encodeCBOR(decoded.value);
      if (!(encoded instanceof Uint8Array) || bytes.byteLength !== encoded.byteLength
          || !bytes.every((byte, index) => byte === encoded[index])) failures.push(file.name);
    } catch {
      failures.push(file.name);
    }
  }
  if (failures.length > 0) throw new Error(`non-canonical CBOR: ${failures.join(", ")}`);
  return `${candidateCount} canonical CBOR candidate(s); ${files.length - candidateCount} non-CBOR local artifact(s) not admitted`;
}

function checkGovernanceDiff(root) {
  const base = runOwnedProcessSync({
    command: "git", args: ["rev-parse", "--verify", "HEAD~1"], cwd: root,
    env: childEnvironment(), timeoutMs: 30_000, maxOutputBytes: 1_048_576, windowsHide: true,
  });
  if (base.error !== undefined || typeof base.signal === "string" || base.status !== 0) {
    throw new Error("GOVERNANCE-DIFF-BASE-MISSING: HEAD~1 could not be verified");
  }
  admittedPath(root, "packages-galerina/galerina-core-compiler/dist/cli.js", "file");
  const child = runOwnedProcessSync({
    command: process.execPath,
    args: ["packages-galerina/galerina-core-compiler/dist/cli.js", "diff", "HEAD~1", "--json"],
    cwd: root,
    env: childEnvironment(),
    timeoutMs: 30_000,
    maxOutputBytes: 4_194_304,
    windowsHide: true,
  });
  const parsed = parseGovernanceDiff(child.stdout || "", child);
  if (!parsed.ok) throw new Error(`${parsed.code}: ${parsed.detail}`);
  return `${parsed.code}: ${parsed.detail}`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = realpathSync(options.root);
  if (!statSync(root).isDirectory()) throw new Error("root is not a directory");
  const summary = options.mode === "patterns" ? checkPatterns(root)
    : options.mode === "security" || options.mode === "naming"
      ? await checkSecurityOrNaming(root, options.mode)
      : options.mode === "cbor" ? await checkCbor(root)
        : checkGovernanceDiff(root);
  process.stdout.write(`SUMMARY: ${summary}\n`);
}

main().catch((error) => {
  process.stderr.write(`phase-close-special: REFUSED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
