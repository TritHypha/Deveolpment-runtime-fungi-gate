"use strict";

const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const DEFAULT_CLEANUP_GRACE_MS = 1_000;
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

function validateInput({
  command,
  args,
  cwd,
  env,
  timeoutMs,
  cleanupGraceMs,
  maxOutputBytes,
}) {
  if (typeof command !== "string" || command.length === 0
      || !Array.isArray(args)
      || args.some((argument) => typeof argument !== "string")
      || typeof cwd !== "string" || cwd.length === 0
      || (env !== undefined && (env === null || typeof env !== "object" || Array.isArray(env)))
      || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1
      || !Number.isSafeInteger(cleanupGraceMs) || cleanupGraceMs < 1
      || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) {
    throw inputError("Owned process command, arguments, paths, limits, or environment are invalid.");
  }
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

async function runOwnedProcess({
  command,
  args = [],
  cwd,
  env = process.env,
  timeoutMs,
  cleanupGraceMs = DEFAULT_CLEANUP_GRACE_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  windowsHide = true,
}) {
  validateInput({
    command,
    args,
    cwd,
    env,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
  });

  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const stdoutState = { bytes: 0, limit: maxOutputBytes };
    const stderrState = { bytes: 0, limit: maxOutputBytes };
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
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
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
    if (wardenManaged) {
      try {
        spawnCommand = verifiedWindowsWarden();
        spawnArgs = [
          "--timeout-ms",
          String(timeoutMs),
          "--owner-pid",
          String(process.pid),
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
        stdio: ["ignore", "pipe", "pipe"],
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

function ownedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function runOwnedProcessSync({
  command,
  args = [],
  cwd,
  env = process.env,
  timeoutMs,
  cleanupGraceMs = DEFAULT_CLEANUP_GRACE_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  windowsHide = true,
}) {
  validateInput({
    command,
    args,
    cwd,
    env,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
  });
  const request = {
    command,
    args,
    cwd,
    timeoutMs,
    cleanupGraceMs,
    maxOutputBytes,
    windowsHide,
  };
  const wrapper = spawnSync(process.execPath, [SYNC_WRAPPER], {
    cwd: ROOT,
    env,
    input: JSON.stringify(request),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: timeoutMs + (cleanupGraceMs * 2) + 10_000,
    maxBuffer: (maxOutputBytes * 2) + (1024 * 1024),
  });
  if (wrapper.error) {
    return {
      status: wrapper.status,
      signal: wrapper.signal,
      stdout: "",
      stderr: wrapper.stderr || "",
      error: wrapper.error,
      owned: null,
    };
  }
  if (wrapper.status !== 0 || wrapper.signal !== null) {
    return {
      status: wrapper.status,
      signal: wrapper.signal,
      stdout: "",
      stderr: wrapper.stderr || "",
      error: ownedError(
        "OWNED-PROCESS-WRAPPER-REFUSED",
        `Owned process wrapper exited ${wrapper.status ?? "unknown"}.`,
      ),
      owned: null,
    };
  }
  let owned;
  try {
    owned = JSON.parse(wrapper.stdout);
  } catch {
    return {
      status: null,
      signal: null,
      stdout: "",
      stderr: wrapper.stderr || "",
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
    ...(error ? { error } : {}),
    owned,
  };
}

module.exports = Object.freeze({
  runOwnedProcess,
  runOwnedProcessSync,
});
