import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import { ConversionGateError } from "./contracts.mjs";

const execFile = promisify(execFileCallback);
const ZERO_DIGEST = `sha256:${"0".repeat(64)}`;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function refuse(code, message) {
  throw new ConversionGateError(code, message);
}

function contained(root, path) {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

async function git(root, args) {
  try {
    return await execFile("git", args, { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    refuse("GIT_CHECK_FAILED", error?.stderr?.trim() || "git check failed");
  }
}

function evidenceEntry(value, verified) {
  return Object.freeze({ digest: DIGEST.test(value) ? value : ZERO_DIGEST, verified: verified === true && DIGEST.test(value) });
}

export function chainFromSandboxReceipt(receipt, { expectedSourceSha256, receiptValid }) {
  const source = receipt?.source?.sourceSha256;
  const candidate = receipt?.candidate?.sha256;
  const compiler = receipt?.evidence?.compiler;
  const physical = receipt?.evidence?.physical;
  const checkedSnapshot = compiler?.checkedSnapshotSha256;
  const girFirst = compiler?.girHashFirst;
  const girSecond = compiler?.girHashSecond;
  const artifact = physical?.artifactSha256;
  const profile = physical?.profileSha256;
  const vokReceipt = Array.isArray(physical?.vokReceiptDigests) ? physical.vokReceiptDigests[0] : undefined;
  const physicalGreen = physical?.green === true && physical?.authorityReleased === false;
  const logicGreen = receipt?.evidence?.logicAnalysis?.status === "SUPPORTED";
  return Object.freeze({
    source: evidenceEntry(source, receiptValid && source === expectedSourceSha256),
    candidate: evidenceEntry(candidate, receiptValid && logicGreen),
    checkedSnapshot: evidenceEntry(checkedSnapshot, receiptValid && logicGreen && compiler?.green === true),
    gir: evidenceEntry(girFirst, receiptValid && logicGreen && compiler?.green === true && girFirst === girSecond),
    physicalPackage: evidenceEntry(artifact, receiptValid && physicalGreen),
    profile: evidenceEntry(profile, receiptValid && physicalGreen),
    vokReceipt: evidenceEntry(vokReceipt, receiptValid && physicalGreen && Array.isArray(physical?.vokReceiptDigests) && physical.vokReceiptDigests.length > 0),
  });
}

export async function inspectSourceRequest({ root, request, graphProject, resolveIdentity }) {
  const canonicalRoot = await realpath(resolve(root));
  const path = resolve(canonicalRoot, ...request.file.split("/"));
  if (!contained(canonicalRoot, path)) refuse("SOURCE_PATH_ESCAPE", "source path escapes repository root");
  let stat;
  try {
    stat = await lstat(path);
  } catch {
    refuse("SOURCE_MISSING", "source file is missing");
  }
  if (!stat.isFile() || stat.isSymbolicLink() || await realpath(path) !== path) refuse("SOURCE_IDENTITY_INVALID", "source must be a regular non-symlink file");
  await git(canonicalRoot, ["ls-files", "--error-unmatch", "--", request.file]);
  const { stdout: dirty } = await git(canonicalRoot, ["status", "--porcelain=v1", "--", request.file]);
  if (dirty.trim() !== "") refuse("SOURCE_DIRTY", "source is dirty or untracked");
  const bytes = await readFile(path);
  const actual = sha256(bytes);
  if (actual !== request.sourceSha256) refuse("SOURCE_DIGEST_DRIFT", "source digest does not match the manifest");
  const identity = await resolveIdentity({ root: canonicalRoot, project: graphProject, file: request.file, symbol: request.symbol });
  if (identity?.sourceSha256 !== actual || !/^[0-9a-f]{40}$/u.test(identity?.sourceBuildPoint ?? "")) refuse("GRAPH_SOURCE_MISMATCH", "graph identity is not bound to the exact source bytes");
  return Object.freeze({ sourceRetained: true, sourceSha256: actual, sourceBuildPoint: identity.sourceBuildPoint, locator: `repo:galerina:${request.file}#${request.symbol}` });
}

export async function assertGateOutputPath(root, value) {
  if (typeof value !== "string" || !value.startsWith("build/ts-to-fungi-sandbox/") || value.includes("\\") || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    refuse("OUTPUT_PATH_INVALID", "sandbox output must be a canonical repository-relative path");
  }
  const canonicalRoot = await realpath(resolve(root));
  const parts = value.split("/");
  let current = canonicalRoot;
  for (const part of parts) {
    current = resolve(current, part);
    if (!contained(canonicalRoot, current)) refuse("OUTPUT_PATH_ESCAPE", "sandbox output escapes repository root");
    if (!existsSync(current)) continue;
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || await realpath(current) !== current) refuse("OUTPUT_PATH_REDIRECTED", "sandbox output has a redirected or symlink ancestor");
  }
  return current;
}
