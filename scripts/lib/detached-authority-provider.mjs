import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, resolve } from "node:path";

const { runOwnedProcess } = createRequire(import.meta.url)("./owned-process-tree.cjs");

const DIGEST = /^[0-9a-f]{64}$/u;
const MAXIMUM_PROVIDER_BYTES = 512 * 1024 * 1024;
const PROVIDER_CHUNK_BYTES = 1024 * 1024;
const MAXIMUM_PROVIDER_ARGUMENTS = 16;
const MAXIMUM_PROVIDER_ARGUMENT_BYTES = 16 * 1024;
const MAXIMUM_PROVIDER_TIMEOUT_MS = 60_000;
const MAXIMUM_PROVIDER_OUTPUT_BYTES = 1024 * 1024;
const VERSION_TIMEOUT_MS = 5_000;
const VERSION_OUTPUT_BYTES = 4 * 1024;

function remaining(deadline) {
  return Number.isSafeInteger(deadline) ? Math.max(0, deadline - Date.now()) : 0;
}

async function providerSnapshot(executable, deadline) {
  if (remaining(deadline) === 0) return null;
  let pathStat;
  try {
    pathStat = await lstat(executable);
  } catch {
    return null;
  }
  if (!pathStat.isFile()
      || pathStat.isSymbolicLink()
      || pathStat.size < 1
      || pathStat.size > MAXIMUM_PROVIDER_BYTES
      || await realpath(executable) !== executable) return null;

  let handle;
  try {
    handle = await open(executable, "r");
    const openedStat = await handle.stat();
    if (!openedStat.isFile()
        || openedStat.size !== pathStat.size
        || openedStat.dev !== pathStat.dev
        || openedStat.ino !== pathStat.ino) return null;
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(PROVIDER_CHUNK_BYTES);
    let position = 0;
    while (position < openedStat.size) {
      if (remaining(deadline) === 0) return null;
      const requested = Math.min(buffer.length, openedStat.size - position);
      const { bytesRead } = await handle.read(buffer, 0, requested, position);
      if (bytesRead < 1) return null;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    const trailing = await handle.read(buffer, 0, 1, position);
    if (trailing.bytesRead !== 0) return null;
    const finalStat = await handle.stat();
    if (!finalStat.isFile()
        || finalStat.size !== openedStat.size
        || finalStat.dev !== openedStat.dev
        || finalStat.ino !== openedStat.ino
        || finalStat.mtimeMs !== openedStat.mtimeMs) return null;
    return Object.freeze({
      digest: hash.digest("hex"),
      size: finalStat.size,
      dev: finalStat.dev,
      ino: finalStat.ino,
      mtimeMs: finalStat.mtimeMs,
    });
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

function sameSnapshot(left, right) {
  return left !== null
    && right !== null
    && left.digest === right.digest
    && left.size === right.size
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mtimeMs === right.mtimeMs;
}

function validArguments(args) {
  if (!Array.isArray(args) || args.length > MAXIMUM_PROVIDER_ARGUMENTS) return false;
  let bytes = 0;
  for (const argument of args) {
    if (typeof argument !== "string" || argument.includes("\0")) return false;
    bytes += Buffer.byteLength(argument, "utf8");
    if (bytes > MAXIMUM_PROVIDER_ARGUMENT_BYTES) return false;
  }
  return true;
}

export async function runAuthenticatedProviderCommand({
  executable,
  expectedDigest,
  args,
  cwd,
  env,
  deadline,
  timeoutMs,
  maxOutputBytes,
} = {}) {
  if (typeof executable !== "string"
      || !isAbsolute(executable)
      || resolve(executable) !== executable
      || typeof cwd !== "string"
      || !isAbsolute(cwd)
      || resolve(cwd) !== cwd
      || env === null
      || typeof env !== "object"
      || Array.isArray(env)
      || !validArguments(args)
      || !DIGEST.test(expectedDigest ?? "")
      || !Number.isSafeInteger(timeoutMs)
      || timeoutMs < 1
      || timeoutMs > MAXIMUM_PROVIDER_TIMEOUT_MS
      || !Number.isSafeInteger(maxOutputBytes)
      || maxOutputBytes < 1
      || maxOutputBytes > MAXIMUM_PROVIDER_OUTPUT_BYTES
      || remaining(deadline) === 0) return null;

  const before = await providerSnapshot(executable, deadline);
  if (before === null || before.digest !== expectedDigest) return null;
  const outcome = await runOwnedProcess({
    command: executable,
    args,
    cwd,
    env,
    timeoutMs: Math.max(1, Math.min(timeoutMs, remaining(deadline))),
    maxOutputBytes,
    windowsHide: true,
  });
  const after = await providerSnapshot(executable, deadline);
  if (!sameSnapshot(before, after) || after.digest !== expectedDigest) return null;
  return Object.freeze({ ...outcome });
}

export async function authenticateDetachedAuthorityProvider({
  executable,
  expectedDigest,
  expectedVersion,
  cwd,
  env = process.env,
  deadline,
} = {}) {
  if (typeof executable !== "string"
      || !isAbsolute(executable)
      || resolve(executable) !== executable
      || typeof cwd !== "string"
      || !isAbsolute(cwd)
      || resolve(cwd) !== cwd
      || env === null
      || typeof env !== "object"
      || Array.isArray(env)
      || !DIGEST.test(expectedDigest ?? "")
      || typeof expectedVersion !== "string"
      || expectedVersion.length < 1
      || expectedVersion.length > 128
      || remaining(deadline) === 0) return null;

  const outcome = await runAuthenticatedProviderCommand({
    executable,
    expectedDigest,
    args: ["--version"],
    cwd,
    env,
    deadline,
    timeoutMs: VERSION_TIMEOUT_MS,
    maxOutputBytes: VERSION_OUTPUT_BYTES,
  });
  if (outcome === null
      || outcome.error !== undefined
      || outcome.spawnError !== null
      || outcome.status !== 0
      || outcome.signal !== null
      || outcome.stdout.trim() !== expectedVersion) return null;
  return Object.freeze({ executable, digest: expectedDigest, version: expectedVersion });
}
