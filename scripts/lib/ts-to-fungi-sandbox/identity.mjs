import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { MAX_SOURCE_BYTES, SandboxRefusal, canonicalRelativeTsPath } from "./contracts.mjs";

const execFile = promisify(execFileCallback);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function run(command, args, cwd) {
  try {
    const { stdout } = await execFile(command, args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    return stdout.trim();
  } catch {
    throw new SandboxRefusal("IDENTITY_COMMAND_FAILED", `${command} returned a nonzero result`);
  }
}

function parseJson(text, label) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new SandboxRefusal("IDENTITY_JSON_INVALID", `${label} did not return one JSON value`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new SandboxRefusal("IDENTITY_JSON_INVALID", `${label} returned the wrong shape`);
  return value;
}

function contained(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function comparablePath(value) {
  return resolve(value).replaceAll("\\", "/").toLowerCase();
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export async function discoverGraphProject(root) {
  const rootPath = await realpath(resolve(root));
  const head = await run("git", ["rev-parse", "HEAD"], rootPath);
  const project = rootPath.replace(/[:\\/]+/gu, "-").replace(/^-+|-+$/gu, "");
  const status = parseJson(await run("codebase-memory-mcp", ["cli", "index_status", "--project", project], rootPath), "index_status");
  if (status.status !== "ready"
    || status.stale !== false
    || status.indexed_head_sha !== head
    || status.git?.head_sha !== head
    || comparablePath(status.root_path) !== comparablePath(rootPath)) {
    throw new SandboxRefusal("GRAPH_PROJECT_NOT_FRESH", "canonical graph project is not independently exact; use an explicit verified --project override");
  }
  return project;
}

export async function resolveSourceIdentity({ root, project, file, symbol }) {
  const canonicalFile = canonicalRelativeTsPath(file);
  if (typeof project !== "string" || project.length === 0 || typeof symbol !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol)) {
    throw new SandboxRefusal("IDENTITY_INPUT_INVALID", "identity requires graph project and identifier symbol");
  }
  const rootPath = resolve(root);
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new SandboxRefusal("ROOT_IDENTITY_INVALID", "repository root must be a regular directory");
  const realRoot = await realpath(rootPath);
  if (realRoot !== rootPath) throw new SandboxRefusal("ROOT_IDENTITY_REDIRECTED", "repository root cannot be redirected");
  const sourcePath = resolve(realRoot, ...canonicalFile.split("/"));
  if (!contained(realRoot, sourcePath)) throw new SandboxRefusal("SOURCE_PATH_ESCAPE", "source escapes repository root");
  let stat;
  try {
    stat = await lstat(sourcePath);
  } catch {
    throw new SandboxRefusal("SOURCE_MISSING", "source file does not exist");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new SandboxRefusal("SOURCE_IDENTITY_INVALID", "source must be a regular non-symlink file");
  const realSource = await realpath(sourcePath);
  if (realSource !== sourcePath || !contained(realRoot, realSource)) throw new SandboxRefusal("SOURCE_IDENTITY_REDIRECTED", "source path is redirected");
  const tracked = await run("git", ["ls-files", "--error-unmatch", "--", canonicalFile], realRoot);
  if (tracked !== canonicalFile) throw new SandboxRefusal("SOURCE_UNTRACKED", "source is not tracked at the exact path");
  const dirty = await run("git", ["status", "--porcelain=v1", "--", canonicalFile], realRoot);
  if (dirty !== "") throw new SandboxRefusal("SOURCE_DIRTY", "source has uncommitted changes");
  const head = await run("git", ["rev-parse", "HEAD"], realRoot);
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new SandboxRefusal("SOURCE_BUILD_POINT_INVALID", "Git HEAD is not an exact commit");
  const status = parseJson(await run("codebase-memory-mcp", ["cli", "index_status", "--project", project], realRoot), "index_status");
  if (status.status !== "ready" || status.stale !== false || status.indexed_head_sha !== head || status.git?.head_sha !== head) {
    throw new SandboxRefusal("GRAPH_STALE", "graph build point is not independently exact");
  }
  const search = parseJson(await run("codebase-memory-mcp", ["cli", "search_graph", "--project", project, "--name_pattern", `^${escapeRegularExpression(symbol)}$`, "--file_pattern", `*${canonicalFile.split("/").at(-1)}`, "--limit", "20"], realRoot), "search_graph");
  const matches = Array.isArray(search.results) ? search.results.filter((item) => item?.name === symbol && item?.file_path === canonicalFile) : [];
  if (matches.length !== 1 || search.has_more === true) throw new SandboxRefusal("GRAPH_SYMBOL_AMBIGUOUS", `graph resolved ${matches.length} exact symbols`);
  const bytes = await readFile(realSource);
  if (bytes.length < 1 || bytes.length > MAX_SOURCE_BYTES) throw new SandboxRefusal("SOURCE_SIZE_INVALID", "source byte length is outside the sandbox bounds");
  const dirtyAfterRead = await run("git", ["status", "--porcelain=v1", "--", canonicalFile], realRoot);
  const confirmedBytes = await readFile(realSource);
  if (dirtyAfterRead !== "" || !confirmedBytes.equals(bytes)) throw new SandboxRefusal("SOURCE_CHANGED_DURING_IDENTITY", "source changed while its identity was being established");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!Buffer.from(text, "utf8").equals(bytes)) throw new SandboxRefusal("SOURCE_UTF8_INVALID", "source is not canonical UTF-8");
  return Object.freeze({
    file: canonicalFile,
    symbol,
    sourceBuildPoint: head,
    sourceSha256: sha256(bytes),
    byteLength: bytes.length,
    source: text,
    graph: Object.freeze({ project, indexedHeadSha: status.indexed_head_sha, stale: false, qualifiedName: matches[0].qualified_name, label: matches[0].label }),
  });
}

export async function rehashSource(root, identity) {
  const bytes = await readFile(resolve(root, ...identity.file.split("/")));
  return sha256(bytes);
}
