"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SCHEMA_VERSION = 1;
const RECORD_NAME = "lease.json";
const COMMAND_CLASSES = new Set(["phase-close", "all-tests"]);
const NONCE_RE = /^[0-9a-f]{64}$/;
const ROOT_ID_RE = /^[0-9a-f]{64}$/;

function leaseError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function canonicalRoot(root) {
  if (typeof root !== "string" || root.length === 0) {
    throw leaseError("SUITE-LEASE-ROOT-INVALID", "Suite lease root is missing.");
  }
  let resolved;
  try {
    resolved = fs.realpathSync.native(path.resolve(root));
  } catch {
    throw leaseError(
      "SUITE-LEASE-ROOT-INVALID",
      "Suite lease root must be an existing canonical directory.",
    );
  }
  const stats = fs.lstatSync(resolved);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw leaseError(
      "SUITE-LEASE-ROOT-INVALID",
      "Suite lease root must be a real directory.",
    );
  }
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function rootIdFor(root) {
  return crypto.createHash("sha256").update(root, "utf8").digest("hex");
}

function ensureLeaseBase(leaseBase) {
  const resolved = path.resolve(
    leaseBase || path.join(os.tmpdir(), "galerina-suite-leases"),
  );
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const stats = fs.lstatSync(resolved);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw leaseError(
      "SUITE-LEASE-BASE-INVALID",
      "Suite lease base must be a real directory.",
    );
  }
  return resolved;
}

function leasePathForRoot(root, { leaseBase } = {}) {
  const canonical = canonicalRoot(root);
  const rootId = rootIdFor(canonical);
  return path.join(ensureLeaseBase(leaseBase), `${rootId}.lock`);
}

function validPositivePid(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const keys = Object.keys(record).sort();
  const expectedKeys = [
    "commandClass",
    "nonce",
    "ownerParentPid",
    "ownerPid",
    "root",
    "rootId",
    "schemaVersion",
    "startedAt",
  ].sort();
  if (keys.length !== expectedKeys.length
      || keys.some((key, index) => key !== expectedKeys[index])) return false;
  if (record.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof record.root !== "string" || record.root.length === 0) return false;
  if (!ROOT_ID_RE.test(record.rootId)) return false;
  if (rootIdFor(record.root) !== record.rootId) return false;
  if (!COMMAND_CLASSES.has(record.commandClass)) return false;
  if (!validPositivePid(record.ownerPid)
      || !validPositivePid(record.ownerParentPid)) return false;
  if (typeof record.startedAt !== "string"
      || Number.isNaN(Date.parse(record.startedAt))) return false;
  if (!NONCE_RE.test(record.nonce)) return false;
  return true;
}

function readRecord(leasePath, missingCode = "SUITE-LEASE-MISSING") {
  const recordPath = path.join(leasePath, RECORD_NAME);
  let raw;
  try {
    raw = fs.readFileSync(recordPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw leaseError(missingCode, "Suite lease record is missing.");
    }
    throw leaseError("SUITE-LEASE-READ-REFUSED", "Suite lease record cannot be read.");
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    throw leaseError("SUITE-LEASE-MALFORMED", "Suite lease record is malformed.");
  }
  if (!validateRecord(record)) {
    throw leaseError("SUITE-LEASE-MALFORMED", "Suite lease record is malformed.");
  }
  return record;
}

function validateAcquireInput({ commandClass, ownerPid, ownerParentPid, now, nonce }) {
  if (!COMMAND_CLASSES.has(commandClass)) {
    throw leaseError("SUITE-LEASE-CLASS-INVALID", "Suite lease command class is invalid.");
  }
  if (!validPositivePid(ownerPid) || !validPositivePid(ownerParentPid)) {
    throw leaseError("SUITE-LEASE-PID-INVALID", "Suite lease owner PID is invalid.");
  }
  if (typeof now !== "string" || Number.isNaN(Date.parse(now))) {
    throw leaseError("SUITE-LEASE-TIME-INVALID", "Suite lease start time is invalid.");
  }
  if (!NONCE_RE.test(nonce)) {
    throw leaseError("SUITE-LEASE-NONCE-INVALID", "Suite lease nonce is invalid.");
  }
}

function acquireSuiteLease({
  root,
  commandClass,
  leaseBase,
  ownerPid = process.pid,
  ownerParentPid = process.ppid,
  now = new Date().toISOString(),
  nonce = crypto.randomBytes(32).toString("hex"),
}) {
  validateAcquireInput({ commandClass, ownerPid, ownerParentPid, now, nonce });
  const canonical = canonicalRoot(root);
  const rootId = rootIdFor(canonical);
  const base = ensureLeaseBase(leaseBase);
  const leasePath = path.join(base, `${rootId}.lock`);
  try {
    fs.mkdirSync(leasePath, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    readRecord(leasePath, "SUITE-LEASE-MALFORMED");
    throw leaseError("SUITE-LEASE-HELD", "Another root verification suite owns this checkout.");
  }
  const stats = fs.lstatSync(leasePath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw leaseError("SUITE-LEASE-MALFORMED", "Suite lease path is not a real directory.");
  }
  const record = {
    schemaVersion: SCHEMA_VERSION,
    root: canonical,
    rootId,
    commandClass,
    ownerPid,
    ownerParentPid,
    startedAt: now,
    nonce,
  };
  try {
    fs.writeFileSync(
      path.join(leasePath, RECORD_NAME),
      `${JSON.stringify(record, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    try { fs.rmdirSync(leasePath); } catch { /* best-effort rollback only */ }
    throw leaseError("SUITE-LEASE-WRITE-REFUSED", `Suite lease record cannot be created: ${error.code || "UNKNOWN"}.`);
  }

  let released = false;
  return Object.freeze({
    inherited: false,
    path: leasePath,
    root: canonical,
    rootId,
    ownerPid,
    childEnvironment(environment = process.env) {
      return {
        ...environment,
        GALERINA_SUITE_LEASE_NONCE: nonce,
        GALERINA_SUITE_LEASE_ROOT_ID: rootId,
        GALERINA_SUITE_LEASE_OWNER_PID: String(ownerPid),
      };
    },
    release() {
      if (released) return true;
      let current;
      try {
        current = readRecord(leasePath);
      } catch {
        return false;
      }
      if (current.nonce !== nonce
          || current.rootId !== rootId
          || current.ownerPid !== ownerPid) return false;
      try {
        fs.unlinkSync(path.join(leasePath, RECORD_NAME));
        fs.rmdirSync(leasePath);
        released = true;
        return true;
      } catch {
        return false;
      }
    },
  });
}

function admitInheritedSuiteLease({
  root,
  expectedCommandClass,
  leaseBase,
  environment = process.env,
  parentPid = process.ppid,
}) {
  const canonical = canonicalRoot(root);
  const rootId = rootIdFor(canonical);
  const leasePath = path.join(ensureLeaseBase(leaseBase), `${rootId}.lock`);
  const record = readRecord(leasePath);
  if (environment.GALERINA_SUITE_LEASE_ROOT_ID !== rootId) {
    throw leaseError("SUITE-LEASE-ROOT-MISMATCH", "Inherited suite lease root does not match.");
  }
  if (record.root !== canonical || record.rootId !== rootId) {
    throw leaseError("SUITE-LEASE-ROOT-MISMATCH", "Recorded suite lease root does not match.");
  }
  if (record.commandClass !== expectedCommandClass) {
    throw leaseError("SUITE-LEASE-CLASS-MISMATCH", "Inherited suite lease class does not match.");
  }
  if (environment.GALERINA_SUITE_LEASE_OWNER_PID !== String(record.ownerPid)) {
    throw leaseError("SUITE-LEASE-OWNER-MISMATCH", "Inherited suite lease owner does not match.");
  }
  const mediatorPid = /^[1-9][0-9]*$/.test(environment.GALERINA_SUITE_LEASE_MEDIATOR_PID || "")
    ? Number(environment.GALERINA_SUITE_LEASE_MEDIATOR_PID)
    : null;
  if (record.ownerPid !== parentPid && mediatorPid !== parentPid) {
    throw leaseError("SUITE-LEASE-PARENT-MISMATCH", "Inherited suite lease parent does not match.");
  }
  if (record.nonce !== environment.GALERINA_SUITE_LEASE_NONCE) {
    throw leaseError("SUITE-LEASE-NONCE-MISMATCH", "Inherited suite lease nonce does not match.");
  }
  return Object.freeze({
    inherited: true,
    path: leasePath,
    root: canonical,
    rootId,
    ownerPid: record.ownerPid,
    release() { return false; },
  });
}

module.exports = Object.freeze({
  acquireSuiteLease,
  admitInheritedSuiteLease,
  leasePathForRoot,
});
