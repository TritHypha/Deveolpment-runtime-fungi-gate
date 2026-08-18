import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { GRAPH_PROJECT_ALIASES, GraphIdentityError } from "./contracts.mjs";
import { resolveGraphIdentity } from "./core.mjs";

const execFile = promisify(execFileCallback);
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

async function run(command, args, cwd) {
  try {
    const { stdout } = await execFile(command, args, { cwd, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES, windowsHide: true });
    return stdout.trim();
  } catch {
    throw new GraphIdentityError("OWNER_COMMAND_FAILED", `${command} returned a nonzero result`);
  }
}

function parseEnvelope(text, label) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new GraphIdentityError("OWNER_JSON_INVALID", `${label} did not return one JSON value`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new GraphIdentityError("OWNER_JSON_INVALID", `${label} returned the wrong shape`);
  return value;
}

export async function resolveRegisteredGraphProject({ root, logicalKey, projectOverride }) {
  const alias = GRAPH_PROJECT_ALIASES[logicalKey];
  if (alias === undefined) throw new GraphIdentityError("LOGICAL_KEY_INVALID", "logical graph key is not declared");
  const rootPath = await realpath(resolve(root));
  const requiredHead = await run("git", ["rev-parse", "HEAD"], rootPath);
  const project = projectOverride ?? alias.project;
  const status = parseEnvelope(await run("codebase-memory-mcp", ["cli", "index_status", "--project", project], rootPath), "index_status");
  const search = parseEnvelope(await run("codebase-memory-mcp", [
    "cli", "search_graph",
    "--project", project,
    "--name_pattern", `^${alias.probe.name}$`,
    "--limit", "20",
  ], rootPath), "search_graph");
  const symbols = Array.isArray(search.results) ? search.results.map((item) => Object.freeze({
    name: item?.name,
    qualifiedName: item?.qualified_name,
    filePath: item?.file_path,
    label: item?.label,
  })) : [];
  return resolveGraphIdentity({
    logicalKey,
    expectedRoot: rootPath,
    requiredHead,
    projectOverride,
    observations: [{
      project,
      rootPath: status.root_path,
      status: status.status,
      stale: status.stale,
      indexedHeadSha: status.indexed_head_sha,
      gitHeadSha: status.git?.head_sha,
      symbols,
    }],
  });
}
