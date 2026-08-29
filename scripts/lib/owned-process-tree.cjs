"use strict";

const { spawn, spawnSync } = require("node:child_process");
const { constants: bufferConstants } = require("node:buffer");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { types: utilTypes } = require("node:util");

const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const DEFAULT_CLEANUP_GRACE_MS = 1_000;
const PROTECTED_FILE_SET_MAX_BYTES = 4 * 1024 * 1024;
const PROTECTED_FILE_SET_MAX_FILES = 8_192;
const PROTECTED_FILE_PATH_MAX_BYTES = 4_096;
const WRAPPER_ALLOWANCE_BYTES = 1024 * 1024;
const OWNED_FRAME_MAGIC = Buffer.from("GLRNOWND", "ascii");
const OWNED_FRAME_VERSION = 1;
const OWNED_FRAME_HEADER_BYTES = 32;
const OWNED_FRAME_METADATA_MAX_BYTES = WRAPPER_ALLOWANCE_BYTES - OWNED_FRAME_HEADER_BYTES;
const OWNED_FRAME_METADATA_KEYS = new Set([
  "status",
  "signal",
  "stdoutBytes",
  "stderrBytes",
  "timedOut",
  "outputLimitExceeded",
  "cleanupAttempted",
  "cleanupAcknowledged",
  "cleanupDetail",
  "spawnError",
]);
const OWNED_FRAME_SPAWN_ERROR_KEYS = new Set(["code", "message"]);
const OWNED_RAW_RESULT_KEYS = new Set([
  ...OWNED_FRAME_METADATA_KEYS,
  "stdoutBuffer",
  "stderrBuffer",
]);
const PROTECTED_FILE_SET_KEYS = new Set(["schema", "root", "files"]);
const PROTECTED_FILE_KEYS = new Set(["path", "sha256"]);
const ASYNC_INPUT_KEYS = new Set([
  "command",
  "args",
  "cwd",
  "env",
  "timeoutMs",
  "cleanupGraceMs",
  "maxOutputBytes",
  "maxStdoutBytes",
  "maxStderrBytes",
  "windowsHide",
  "protectedReadTree",
  "protectedFileSet",
]);
const SYNC_INPUT_KEYS = new Set([
  "command",
  "args",
  "cwd",
  "env",
  "timeoutMs",
  "cleanupGraceMs",
  "maxOutputBytes",
  "maxStdoutBytes",
  "maxStderrBytes",
  "windowsHide",
  "protectedFileSet",
]);
const ROOT = path.join(__dirname, "..", "..");
const WARDEN_CRATE = path.join(ROOT, "scripts", "native", "process-warden");
const WARDEN_BINARY = path.join(
  ROOT,
  "build",
  "target-cache",
  "process-warden",
  "release",
  "galerina-process-warden.exe",
);
const WARDEN_RECEIPT = path.join(ROOT, "build", "_process-warden-receipt.json");
const SYNC_WRAPPER = path.join(__dirname, "owned-process-wrapper.cjs");

function inputError(message) {
  const error = new Error(message);
  error.code = "OWNED-PROCESS-INPUT-INVALID";
  return error;
}

function exactInputRecord(value, allowedKeys) {
  try {
    if (
      value === null
      || typeof value !== "object"
      || Array.isArray(value)
      || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) return null;
    const result = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function exactStringArray(value) {
  try {
    if (!Array.isArray(value) || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (!Number.isSafeInteger(length) || length < 0 || Reflect.ownKeys(descriptors).length !== length + 1) return null;
    const result = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")
        || typeof descriptor.value !== "string"
      ) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
  }
}

function exactArray(value, maxLength) {
  try {
    if (
      !Number.isSafeInteger(maxLength)
      || maxLength < 0
      || !Array.isArray(value)
      || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype
    ) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > maxLength) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).length !== length + 1) return null;
    const result = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
  }
}

function protectedPathIsValid(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.includes("\0")
    || value.includes("\\")
    || value.includes(":")
    || value.startsWith("/")
    || value.normalize("NFC") !== value
    || Buffer.byteLength(value, "utf8") > PROTECTED_FILE_PATH_MAX_BYTES
  ) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function normalizeProtectedFileSet(value) {
  const manifest = exactInputRecord(value, PROTECTED_FILE_SET_KEYS);
  if (manifest === null) throw inputError("Protected file set must be a closed ordinary record.");
  const files = exactArray(manifest.files, PROTECTED_FILE_SET_MAX_FILES);
  if (
    manifest.schema !== "galerina.protected-file-set.v1"
    || typeof manifest.root !== "string"
    || manifest.root.includes("\0")
    || !path.isAbsolute(manifest.root)
    || files === null
    || files.length < 1
    || files.length > PROTECTED_FILE_SET_MAX_FILES
  ) throw inputError("Protected file set schema, root, or file count is invalid.");

  const normalizedFiles = [];
  let previousPath = null;
  for (const valueEntry of files) {
    const entry = exactInputRecord(valueEntry, PROTECTED_FILE_KEYS);
    if (
      entry === null
      || !protectedPathIsValid(entry.path)
      || typeof entry.sha256 !== "string"
      || !/^[0-9a-f]{64}$/.test(entry.sha256)
      || (previousPath !== null && previousPath >= entry.path)
    ) throw inputError("Protected file set entry is invalid or not sorted.");
    previousPath = entry.path;
    normalizedFiles.push({ path: entry.path, sha256: entry.sha256 });
  }

  let canonicalRoot;
  try {
    const rootStats = fs.lstatSync(manifest.root);
    canonicalRoot = fs.realpathSync.native(manifest.root);
    if (
      !rootStats.isDirectory()
      || rootStats.isSymbolicLink()
      || canonicalRoot !== manifest.root
    ) throw new Error("not canonical");
  } catch {
    throw inputError("Protected file set root is not a canonical direct directory.");
  }

  const normalized = {
    schema: "galerina.protected-file-set.v1",
    root: canonicalRoot,
    files: normalizedFiles,
  };
  const buffer = Buffer.from(JSON.stringify(normalized), "utf8");
  if (buffer.length > PROTECTED_FILE_SET_MAX_BYTES) {
    throw inputError("Protected file set exceeds its canonical JSON byte limit.");
  }
  return { value: normalized, buffer };
}

function normalizeInput(value, sync) {
  const input = exactInputRecord(value, sync ? SYNC_INPUT_KEYS : ASYNC_INPUT_KEYS);
  if (input === null) throw inputError("Owned process input must be a closed ordinary record.");
  const args = input.args === undefined ? [] : exactStringArray(input.args);
  const env = input.env === undefined ? process.env : input.env;
  const cleanupGraceMs = input.cleanupGraceMs === undefined
    ? DEFAULT_CLEANUP_GRACE_MS
    : input.cleanupGraceMs;
  const maxOutputBytes = input.maxOutputBytes === undefined
    ? DEFAULT_MAX_OUTPUT_BYTES
    : input.maxOutputBytes;
  const maxStdoutBytes = input.maxStdoutBytes === undefined ? maxOutputBytes : input.maxStdoutBytes;
  const maxStderrBytes = input.maxStderrBytes === undefined ? maxOutputBytes : input.maxStderrBytes;
  const windowsHide = input.windowsHide === undefined ? true : input.windowsHide;
  const protectedReadTree = input.protectedReadTree === undefined ? null : input.protectedReadTree;
  const protectedFileSetInput = input.protectedFileSet === undefined ? null : input.protectedFileSet;
  if (sync && protectedFileSetInput !== null) {
    throw inputError("Protected file sets are asynchronous-only.");
  }
  if (typeof input.command !== "string" || input.command.length === 0
      || args === null
      || typeof input.cwd !== "string" || input.cwd.length === 0
      || (env !== undefined && (env === null || typeof env !== "object" || Array.isArray(env)))
      || !Number.isSafeInteger(input.timeoutMs) || input.timeoutMs < 1
      || !Number.isSafeInteger(cleanupGraceMs) || cleanupGraceMs < 1
      || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1
      || !Number.isSafeInteger(maxStdoutBytes) || maxStdoutBytes < 1
      || !Number.isSafeInteger(maxStderrBytes) || maxStderrBytes < 1
      || typeof windowsHide !== "boolean"
      || (protectedReadTree !== null
        && (typeof protectedReadTree !== "string"
          || !path.isAbsolute(protectedReadTree)
          || protectedReadTree.includes("\0")))
      || (protectedReadTree !== null && protectedFileSetInput !== null)) {
    throw inputError("Owned process command, arguments, paths, limits, or environment are invalid.");
  }
  const protectedFileSet = protectedFileSetInput === null
    ? null
    : normalizeProtectedFileSet(protectedFileSetInput);
  return {
    command: input.command,
    args,
    cwd: input.cwd,
    env,
    timeoutMs: input.timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
    maxStdoutBytes,
    maxStderrBytes,
    windowsHide,
    protectedReadTree,
    protectedFileSet,
  };
}

function appendBounded(chunks, chunk, state) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  state.bytes += buffer.length;
  if (state.bytes > state.limit) return false;
  chunks.push(buffer);
  return true;
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function verifiedWindowsWarden() {
  const source = path.join(WARDEN_CRATE, "src", "main.rs");
  const manifest = path.join(WARDEN_CRATE, "Cargo.toml");
  const lock = path.join(WARDEN_CRATE, "Cargo.lock");
  for (const file of [source, manifest, lock, WARDEN_BINARY, WARDEN_RECEIPT]) {
    if (!fs.existsSync(file)) {
      const error = new Error("Windows process warden is absent; run node scripts/build-process-warden.mjs.");
      error.code = "PROCESS-WARDEN-ABSENT";
      throw error;
    }
    const stats = fs.lstatSync(file);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      const error = new Error("Windows process warden input is not a direct file.");
      error.code = "PROCESS-WARDEN-PATH-REFUSED";
      throw error;
    }
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(WARDEN_RECEIPT, "utf8"));
  } catch {
    const error = new Error("Windows process warden receipt is malformed.");
    error.code = "PROCESS-WARDEN-RECEIPT-MALFORMED";
    throw error;
  }
  const keys = Object.keys(receipt).sort();
  const expected = [
    "arch",
    "binarySha256",
    "lockSha256",
    "manifestSha256",
    "platform",
    "schemaVersion",
    "sourceSha256",
  ].sort();
  const valid = keys.length === expected.length
    && keys.every((key, index) => key === expected[index])
    && receipt.schemaVersion === 1
    && receipt.platform === "win32"
    && receipt.arch === "x64"
    && receipt.sourceSha256 === digest(source)
    && receipt.manifestSha256 === digest(manifest)
    && receipt.lockSha256 === digest(lock)
    && receipt.binarySha256 === digest(WARDEN_BINARY);
  if (!valid) {
    const error = new Error("Windows process warden receipt does not match its source and binary.");
    error.code = "PROCESS-WARDEN-RECEIPT-MISMATCH";
    throw error;
  }
  return WARDEN_BINARY;
}

function signalPosixGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return { acknowledged: true, detail: `${signal} sent to process group ${pid}` };
  } catch (error) {
    if (error.code === "ESRCH") {
      return { acknowledged: true, detail: `process group ${pid} already closed` };
    }
    return {
      acknowledged: false,
      detail: `${signal} process-group refusal: ${error.code || error.message}`,
    };
  }
}

async function runOwnedProcessRaw(value) {
  const {
    command,
    args,
    cwd,
    env,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
    maxStdoutBytes,
    maxStderrBytes,
    windowsHide,
    protectedReadTree,
    protectedFileSet,
  } = normalizeInput(value, false);

  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const stdoutState = { bytes: 0, limit: maxStdoutBytes };
    const stderrState = { bytes: 0, limit: maxStderrBytes };
    let child;
    let timedOut = false;
    let outputLimitExceeded = false;
    let cleanupAttempted = false;
    let cleanupAcknowledged = false;
    let cleanupDetail = "not required";
    let spawnError = null;
    let settled = false;
    let timeoutHandle;
    let forceHandle;
    let hardStopHandle;

    function terminateOwnedTree(reason) {
      if (cleanupAttempted || !child?.pid) return;
      cleanupAttempted = true;
      if (process.platform === "win32") {
        cleanupAcknowledged = child.kill();
        cleanupDetail = cleanupAcknowledged
          ? `${reason}: process warden termination requested; Job Object closes with it`
          : `${reason}: process warden termination was refused`;
        return;
      }
      const cleanup = signalPosixGroup(child.pid, "SIGTERM");
      cleanupAcknowledged = cleanup.acknowledged;
      cleanupDetail = `${reason}: ${cleanup.detail}`;
      forceHandle = setTimeout(() => {
        const forced = signalPosixGroup(child.pid, "SIGKILL");
        cleanupAcknowledged = cleanupAcknowledged && forced.acknowledged;
        cleanupDetail += `; ${forced.detail}`;
      }, cleanupGraceMs);
    }

    function finish(status, signal) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(forceHandle);
      clearTimeout(hardStopHandle);
      if ((timedOut || outputLimitExceeded) && process.platform !== "win32" && child?.pid) {
        const forced = signalPosixGroup(child.pid, "SIGKILL");
        cleanupAcknowledged = cleanupAcknowledged && forced.acknowledged;
        cleanupDetail += `; ${forced.detail}`;
      }
      resolve({
        status: typeof status === "number" ? status : null,
        signal: signal || null,
        stdoutBuffer: Buffer.concat(stdoutChunks),
        stderrBuffer: Buffer.concat(stderrChunks),
        stdoutBytes: stdoutState.bytes,
        stderrBytes: stderrState.bytes,
        timedOut,
        outputLimitExceeded,
        cleanupAttempted,
        cleanupAcknowledged,
        cleanupDetail,
        spawnError,
      });
    }

    let spawnCommand = command;
    let spawnArgs = args;
    const wardenManaged = process.platform === "win32";
    if ((protectedReadTree !== null || protectedFileSet !== null) && !wardenManaged) {
      spawnError = {
        code: "PROCESS-WARDEN-IMMUTABILITY-UNAVAILABLE",
        message: "Protected input requires the verified Windows process warden.",
      };
      finish(null, null);
      return;
    }
    if (wardenManaged) {
      try {
        spawnCommand = verifiedWindowsWarden();
        spawnArgs = [
          "--timeout-ms",
          String(timeoutMs),
          "--owner-pid",
          String(process.pid),
          ...(protectedReadTree === null
            ? []
            : ["--protect-read-tree", protectedReadTree]),
          ...(protectedFileSet === null
            ? []
            : ["--protect-file-set-stdin"]),
          "--",
          command,
          ...args,
        ];
      } catch (error) {
        spawnError = { code: error.code || "PROCESS-WARDEN-REFUSED", message: error.message };
        finish(null, null);
        return;
      }
    }

    try {
      child = spawn(spawnCommand, spawnArgs, {
        cwd,
        env,
        shell: false,
        windowsHide,
        detached: !wardenManaged,
        stdio: [protectedFileSet === null ? "ignore" : "pipe", "pipe", "pipe"],
      });
    } catch (error) {
      spawnError = { code: error.code || "SPAWN-THREW", message: error.message };
      finish(null, null);
      return;
    }

    child.stdout.on("data", (chunk) => {
      if (!appendBounded(stdoutChunks, chunk, stdoutState)) {
        outputLimitExceeded = true;
        terminateOwnedTree("stdout limit exceeded");
      }
    });
    child.stderr.on("data", (chunk) => {
      if (!appendBounded(stderrChunks, chunk, stderrState)) {
        outputLimitExceeded = true;
        terminateOwnedTree("stderr limit exceeded");
      }
    });
    child.once("error", (error) => {
      spawnError = { code: error.code || "SPAWN-ERROR", message: error.message };
    });
    if (protectedFileSet !== null) {
      child.stdin.once("error", (error) => {
        spawnError = {
          code: error.code || "PROCESS-WARDEN-MANIFEST-STDIN",
          message: "Protected file manifest delivery was refused.",
        };
        terminateOwnedTree("protected manifest delivery refused");
      });
      child.stdin.end(protectedFileSet.buffer);
    }
    child.once("close", (status, signal) => {
      if (wardenManaged && status === 124) {
        timedOut = true;
        cleanupAttempted = true;
        cleanupAcknowledged = stderrChunks.some((chunk) =>
          chunk.toString("utf8").includes("WARDEN_TIMEOUT_TREE_CLOSED"));
        cleanupDetail = cleanupAcknowledged
          ? "Windows Job Object timeout tree closed"
          : "Windows process warden returned timeout without its closure marker";
      } else if (wardenManaged && status === 125) {
        cleanupAttempted = true;
        cleanupAcknowledged = stderrChunks.some((chunk) =>
          chunk.toString("utf8").includes("WARDEN_OWNER_EXIT_TREE_CLOSED"));
        cleanupDetail = "Windows process warden observed owner exit";
        spawnError = {
          code: "PROCESS-WARDEN-OWNER-EXIT",
          message: cleanupDetail,
        };
      } else if (wardenManaged && status === 126) {
        spawnError = {
          code: "PROCESS-WARDEN-SETUP-REFUSED",
          message: "Windows process warden refused setup before target authority.",
        };
      }
      finish(status, signal);
    });

    if (!wardenManaged) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        terminateOwnedTree("timeout");
      }, timeoutMs);
    }
    hardStopHandle = setTimeout(() => {
      if (settled) return;
      cleanupAttempted = true;
      cleanupAcknowledged = false;
      cleanupDetail += "; owned tree did not close within the cleanup deadline";
      if (child?.pid) child.kill();
    }, timeoutMs + (cleanupGraceMs * 2) + 5_000);
  });
}

async function runOwnedProcess(value) {
  const { stdoutBuffer, stderrBuffer, ...result } = await runOwnedProcessRaw(value);
  return {
    ...result,
    stdout: stdoutBuffer.toString("utf8"),
    stderr: stderrBuffer.toString("utf8"),
  };
}

function ownedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function ownedFrameError(message) {
  return ownedError("OWNED-PROCESS-WRAPPER-MALFORMED", message);
}

function exactOwnedFrameMetadata(value) {
  const metadata = exactInputRecord(value, OWNED_FRAME_METADATA_KEYS);
  if (metadata === null) return null;
  let spawnError = null;
  if (metadata.spawnError !== null) {
    spawnError = exactInputRecord(metadata.spawnError, OWNED_FRAME_SPAWN_ERROR_KEYS);
    if (
      spawnError === null
      || typeof spawnError.code !== "string"
      || spawnError.code.length === 0
      || typeof spawnError.message !== "string"
    ) return null;
  }
  if (
    (metadata.status !== null
      && (!Number.isSafeInteger(metadata.status) || metadata.status < 0))
    || (metadata.signal !== null
      && (typeof metadata.signal !== "string" || metadata.signal.length === 0))
    || !Number.isSafeInteger(metadata.stdoutBytes) || metadata.stdoutBytes < 0
    || !Number.isSafeInteger(metadata.stderrBytes) || metadata.stderrBytes < 0
    || typeof metadata.timedOut !== "boolean"
    || typeof metadata.outputLimitExceeded !== "boolean"
    || typeof metadata.cleanupAttempted !== "boolean"
    || typeof metadata.cleanupAcknowledged !== "boolean"
    || typeof metadata.cleanupDetail !== "string"
  ) return null;
  return { ...metadata, spawnError };
}

function encodeOwnedProcessFrame(value) {
  const raw = exactInputRecord(value, OWNED_RAW_RESULT_KEYS);
  if (
    raw === null
    || !Buffer.isBuffer(raw.stdoutBuffer)
    || utilTypes.isProxy(raw.stdoutBuffer)
    || Object.getPrototypeOf(raw.stdoutBuffer) !== Buffer.prototype
    || !Buffer.isBuffer(raw.stderrBuffer)
    || utilTypes.isProxy(raw.stderrBuffer)
    || Object.getPrototypeOf(raw.stderrBuffer) !== Buffer.prototype
  ) throw ownedFrameError("Owned process wrapper raw evidence is invalid.");
  const { stdoutBuffer, stderrBuffer, ...metadataInput } = raw;
  const metadata = exactOwnedFrameMetadata(metadataInput);
  if (metadata === null) throw ownedFrameError("Owned process wrapper metadata is invalid.");
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
  if (metadataBuffer.length > OWNED_FRAME_METADATA_MAX_BYTES) {
    throw ownedFrameError("Owned process wrapper metadata exceeds its fixed allowance.");
  }
  const totalLength = OWNED_FRAME_HEADER_BYTES
    + metadataBuffer.length
    + stdoutBuffer.length
    + stderrBuffer.length;
  if (!Number.isSafeInteger(totalLength) || totalLength > bufferConstants.MAX_LENGTH) {
    throw ownedFrameError("Owned process wrapper frame exceeds the runtime buffer range.");
  }
  const header = Buffer.alloc(OWNED_FRAME_HEADER_BYTES);
  OWNED_FRAME_MAGIC.copy(header, 0);
  header.writeUInt8(OWNED_FRAME_VERSION, 8);
  header.writeUInt32BE(metadataBuffer.length, 12);
  header.writeBigUInt64BE(BigInt(stdoutBuffer.length), 16);
  header.writeBigUInt64BE(BigInt(stderrBuffer.length), 24);
  return Buffer.concat([header, metadataBuffer, stdoutBuffer, stderrBuffer], totalLength);
}

function parseOwnedProcessFrame(value, options) {
  const limits = exactInputRecord(options, new Set(["maxStdoutBytes", "maxStderrBytes"]));
  if (
    !Buffer.isBuffer(value)
    || utilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Buffer.prototype
    || limits === null
    || !Number.isSafeInteger(limits.maxStdoutBytes) || limits.maxStdoutBytes < 1
    || !Number.isSafeInteger(limits.maxStderrBytes) || limits.maxStderrBytes < 1
    || value.length < OWNED_FRAME_HEADER_BYTES
    || !value.subarray(0, OWNED_FRAME_MAGIC.length).equals(OWNED_FRAME_MAGIC)
    || value.readUInt8(8) !== OWNED_FRAME_VERSION
    || value.readUInt8(9) !== 0
    || value.readUInt8(10) !== 0
    || value.readUInt8(11) !== 0
  ) throw ownedFrameError("Owned process wrapper frame header is invalid.");

  const metadataLength = value.readUInt32BE(12);
  const stdoutLengthBig = value.readBigUInt64BE(16);
  const stderrLengthBig = value.readBigUInt64BE(24);
  if (
    metadataLength > OWNED_FRAME_METADATA_MAX_BYTES
    || stdoutLengthBig > BigInt(Number.MAX_SAFE_INTEGER)
    || stderrLengthBig > BigInt(Number.MAX_SAFE_INTEGER)
  ) throw ownedFrameError("Owned process wrapper frame lengths are invalid.");
  const stdoutLength = Number(stdoutLengthBig);
  const stderrLength = Number(stderrLengthBig);
  const expectedLength = OWNED_FRAME_HEADER_BYTES
    + metadataLength
    + stdoutLength
    + stderrLength;
  if (
    !Number.isSafeInteger(expectedLength)
    || expectedLength !== value.length
    || stdoutLength > limits.maxStdoutBytes
    || stderrLength > limits.maxStderrBytes
    || stdoutLength > bufferConstants.MAX_STRING_LENGTH
    || stderrLength > bufferConstants.MAX_STRING_LENGTH
  ) throw ownedFrameError("Owned process wrapper frame payload lengths are invalid.");

  const metadataStart = OWNED_FRAME_HEADER_BYTES;
  const stdoutStart = metadataStart + metadataLength;
  const stderrStart = stdoutStart + stdoutLength;
  const metadataBuffer = value.subarray(metadataStart, stdoutStart);
  const metadataText = metadataBuffer.toString("utf8");
  if (!Buffer.from(metadataText, "utf8").equals(metadataBuffer)) {
    throw ownedFrameError("Owned process wrapper metadata is not valid UTF-8.");
  }
  let metadataValue;
  try {
    metadataValue = JSON.parse(metadataText);
  } catch {
    throw ownedFrameError("Owned process wrapper metadata is not valid JSON.");
  }
  const metadata = exactOwnedFrameMetadata(metadataValue);
  if (
    metadata === null
    || metadata.stdoutBytes < stdoutLength
    || metadata.stderrBytes < stderrLength
    || (!metadata.outputLimitExceeded
      && (metadata.stdoutBytes !== stdoutLength || metadata.stderrBytes !== stderrLength))
  ) throw ownedFrameError("Owned process wrapper metadata does not match its payload.");

  return {
    ...metadata,
    stdout: value.subarray(stdoutStart, stderrStart).toString("utf8"),
    stderr: value.subarray(stderrStart, expectedLength).toString("utf8"),
  };
}

function runOwnedProcessSync(value) {
  const {
    command,
    args,
    cwd,
    env,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
    maxStdoutBytes,
    maxStderrBytes,
    windowsHide,
  } = normalizeInput(value, true);
  const wrapperMaxBuffer = maxStdoutBytes + maxStderrBytes + WRAPPER_ALLOWANCE_BYTES;
  if (
    !Number.isSafeInteger(wrapperMaxBuffer)
    || wrapperMaxBuffer > bufferConstants.MAX_LENGTH
  ) {
    throw inputError("Owned process wrapper output limits exceed the safe buffer range.");
  }
  const request = {
    command,
    args,
    cwd,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
    maxStdoutBytes,
    maxStderrBytes,
    windowsHide,
  };
  const wrapper = spawnSync(process.execPath, [SYNC_WRAPPER], {
    cwd: ROOT,
    env,
    input: JSON.stringify(request),
    encoding: null,
    shell: false,
    windowsHide: true,
    timeout: timeoutMs + (cleanupGraceMs * 2) + 10_000,
    maxBuffer: wrapperMaxBuffer,
  });
  const wrapperStderr = Buffer.isBuffer(wrapper.stderr)
    ? wrapper.stderr.toString("utf8")
    : "";
  if (wrapper.error) {
    return {
      status: wrapper.status,
      signal: wrapper.signal,
      stdout: "",
      stderr: wrapperStderr,
      error: wrapper.error,
      owned: null,
    };
  }
  if (wrapper.status !== 0 || wrapper.signal !== null) {
    return {
      status: wrapper.status,
      signal: wrapper.signal,
      stdout: "",
      stderr: wrapperStderr,
      error: ownedError(
        "OWNED-PROCESS-WRAPPER-REFUSED",
        `Owned process wrapper exited ${wrapper.status ?? "unknown"}.`,
      ),
      owned: null,
    };
  }
  let owned;
  try {
    owned = parseOwnedProcessFrame(wrapper.stdout, { maxStdoutBytes, maxStderrBytes });
  } catch {
    return {
      status: null,
      signal: null,
      stdout: "",
      stderr: wrapperStderr,
      error: ownedError(
        "OWNED-PROCESS-WRAPPER-MALFORMED",
        "Owned process wrapper returned malformed evidence.",
      ),
      owned: null,
    };
  }

  let error;
  if (owned.spawnError) {
    error = ownedError(owned.spawnError.code, owned.spawnError.message);
  } else if (owned.outputLimitExceeded) {
    error = ownedError(
      "OWNED-PROCESS-OUTPUT-LIMIT",
      "Owned process exceeded its bounded output limit.",
    );
  } else if (owned.timedOut) {
    error = owned.cleanupAcknowledged
      ? ownedError("ETIMEDOUT", "Owned process timed out and its tree was closed.")
      : ownedError("OWNED-PROCESS-TREE-CLEANUP-REFUSED", owned.cleanupDetail);
  } else if (owned.cleanupAttempted && !owned.cleanupAcknowledged) {
    error = ownedError("OWNED-PROCESS-TREE-CLEANUP-REFUSED", owned.cleanupDetail);
  }
  return {
    status: owned.status,
    signal: owned.signal,
    stdout: owned.stdout,
    stderr: owned.stderr,
    stdoutBytes: owned.stdoutBytes,
    stderrBytes: owned.stderrBytes,
    ...(error ? { error } : {}),
    owned,
  };
}

module.exports = Object.freeze({
  _encodeOwnedProcessFrame: encodeOwnedProcessFrame,
  _parseOwnedProcessFrame: parseOwnedProcessFrame,
  _runOwnedProcessRaw: runOwnedProcessRaw,
  runOwnedProcess,
  runOwnedProcessSync,
});
