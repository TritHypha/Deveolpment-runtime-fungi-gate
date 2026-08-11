// staged-git-index.mjs — one fail-closed, bounded snapshot of Git's staged index.
import { spawnSync } from "node:child_process";

const MAX_INDEX_BYTES = 64 * 1024 * 1024;
const ADMITTED_MODES = new Set(["100644", "100755", "120000", "160000"]);

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`staged Git index ${label} is not UTF-8: ${error.message}`);
  }
}

function validatePath(rawPath) {
  const path = rawPath.normalize("NFC");
  if (
    path !== rawPath
    || path.length === 0
    || path.startsWith("/")
    || path.includes("\\")
    || /^[A-Za-z]:/.test(path)
    || path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`staged Git index contains a non-canonical path: ${JSON.stringify(rawPath)}`);
  }
  return path;
}

/**
 * Capture and parse one exact staged-index view. Filenames remain safe when
 * they contain tabs or newlines because records are NUL-delimited and only the
 * fixed metadata prefix is split at its first tab.
 *
 * @param {string} root repository root
 * @param {{run?: typeof spawnSync}} options injectable process boundary
 */
export function readStagedGitIndex(root, { run = spawnSync } = {}) {
  const result = run("git", ["ls-files", "--stage", "-z"], {
    cwd: root,
    encoding: null,
    maxBuffer: MAX_INDEX_BYTES,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`staged Git index command failed: ${result.error.message}`);
  }
  const stderr = Buffer.isBuffer(result.stderr)
    ? decodeUtf8(result.stderr, "stderr")
    : String(result.stderr ?? "");
  if (result.status !== 0) {
    throw new Error(
      `staged Git index command failed with exit ${String(result.status)}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
    );
  }
  if (!Buffer.isBuffer(result.stdout)) {
    throw new Error("staged Git index command returned a non-buffer result");
  }
  if (result.stdout.length > MAX_INDEX_BYTES) {
    throw new Error(`staged Git index exceeds ${MAX_INDEX_BYTES} bytes`);
  }
  if (result.stdout.length > 0 && result.stdout.at(-1) !== 0) {
    throw new Error("staged Git index is missing its final NUL delimiter");
  }

  const entries = [];
  const seenPaths = new Set();
  let offset = 0;
  while (offset < result.stdout.length) {
    const end = result.stdout.indexOf(0, offset);
    if (end < 0) throw new Error("staged Git index contains an unterminated record");
    const record = result.stdout.subarray(offset, end);
    offset = end + 1;
    if (record.length === 0) {
      throw new Error("staged Git index contains an empty record");
    }
    const tab = record.indexOf(0x09);
    if (tab < 0) throw new Error("staged Git index record has no metadata separator");
    const metadata = decodeUtf8(record.subarray(0, tab), "metadata");
    const match = /^(100644|100755|120000|160000) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])$/.exec(metadata);
    if (!match) throw new Error(`staged Git index has malformed metadata: ${metadata}`);
    const mode = match[1];
    const objectId = match[2];
    const stage = Number(match[3]);
    if (!ADMITTED_MODES.has(mode) || stage !== 0) {
      throw new Error(`staged Git index contains unsupported mode/stage ${mode}/${stage}`);
    }
    const path = validatePath(decodeUtf8(record.subarray(tab + 1), "path"));
    if (seenPaths.has(path)) {
      throw new Error(`staged Git index contains duplicate path ${JSON.stringify(path)}`);
    }
    seenPaths.add(path);
    entries.push(Object.freeze({ mode, objectId, stage, path }));
  }
  return Object.freeze(entries);
}
