"use strict";

// Preloaded into governed generator children. Repository-local writes are
// redirected into an isolated shadow tree; any undeclared write is refused
// before it can alter the selected working tree.
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { syncBuiltinESMExports } = require("node:module");

const original = {
  accessSync: fs.accessSync,
  appendFileSync: fs.appendFileSync,
  copyFileSync: fs.copyFileSync,
  existsSync: fs.existsSync,
  lstatSync: fs.lstatSync,
  mkdirSync: fs.mkdirSync,
  readFileSync: fs.readFileSync,
  renameSync: fs.renameSync,
  rmSync: fs.rmSync,
  statSync: fs.statSync,
  unlinkSync: fs.unlinkSync,
  writeFileSync: fs.writeFileSync,
};

const root = path.resolve(process.env.GENERATOR_SANDBOX_ROOT || process.cwd());
const shadow = path.resolve(process.env.GENERATOR_SANDBOX_SHADOW || "");
const logPath = path.resolve(process.env.GENERATOR_SANDBOX_LOG || "");
const allowedRelative = JSON.parse(
  process.env.GENERATOR_SANDBOX_ALLOWED || "[]",
);
const allowed = new Set(
  allowedRelative.map((item) => path.resolve(root, ...item.split("/"))),
);

function absolutePath(value) {
  if (value instanceof URL) return path.resolve(fileURLToPath(value));
  if (Buffer.isBuffer(value)) return path.resolve(value.toString());
  if (typeof value !== "string") return null;
  return path.resolve(value);
}

function relativeInside(candidate) {
  const relative = path.relative(root, candidate);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    return relative === "" ? "" : null;
  }
  return relative;
}

function shadowPath(candidate) {
  const relative = relativeInside(candidate);
  return relative === null ? candidate : path.join(shadow, relative);
}

function record(candidate) {
  const relative = relativeInside(candidate);
  const value = relative === null
    ? candidate
    : relative.split(path.sep).join("/");
  original.appendFileSync(logPath, `${JSON.stringify(value)}\n`);
}

function declaredFile(candidate) {
  return allowed.has(candidate);
}

function declaredDirectory(candidate) {
  const prefix = `${candidate}${path.sep}`;
  return [...allowed].some((item) => item.startsWith(prefix));
}

function mapRead(value) {
  const candidate = absolutePath(value);
  if (candidate === null || !declaredFile(candidate)) return value;
  const redirected = shadowPath(candidate);
  return original.existsSync(redirected) ? redirected : value;
}

function mapWrite(value) {
  const candidate = absolutePath(value);
  if (candidate === null) {
    throw new Error("GENERATOR_SANDBOX_UNSUPPORTED_WRITE_TARGET");
  }
  if (relativeInside(candidate) === null) return value;
  record(candidate);
  if (!declaredFile(candidate)) {
    throw new Error(
      `GENERATOR_SANDBOX_UNDECLARED_WRITE:${path.relative(root, candidate)}`,
    );
  }
  const redirected = shadowPath(candidate);
  original.mkdirSync(path.dirname(redirected), { recursive: true });
  return redirected;
}

fs.readFileSync = function sandboxReadFile(pathValue, ...args) {
  return original.readFileSync(mapRead(pathValue), ...args);
};
fs.existsSync = function sandboxExists(pathValue) {
  return original.existsSync(mapRead(pathValue));
};
fs.statSync = function sandboxStat(pathValue, ...args) {
  return original.statSync(mapRead(pathValue), ...args);
};
fs.lstatSync = function sandboxLstat(pathValue, ...args) {
  return original.lstatSync(mapRead(pathValue), ...args);
};
fs.accessSync = function sandboxAccess(pathValue, ...args) {
  return original.accessSync(mapRead(pathValue), ...args);
};
fs.writeFileSync = function sandboxWriteFile(pathValue, ...args) {
  return original.writeFileSync(mapWrite(pathValue), ...args);
};
fs.appendFileSync = function sandboxAppendFile(pathValue, ...args) {
  return original.appendFileSync(mapWrite(pathValue), ...args);
};
fs.copyFileSync = function sandboxCopyFile(source, destination, ...args) {
  return original.copyFileSync(mapRead(source), mapWrite(destination), ...args);
};
fs.renameSync = function sandboxRename(source, destination, ...args) {
  const sourcePath = mapRead(source);
  return original.renameSync(sourcePath, mapWrite(destination), ...args);
};
fs.unlinkSync = function sandboxUnlink(pathValue, ...args) {
  return original.unlinkSync(mapWrite(pathValue), ...args);
};
fs.rmSync = function sandboxRemove(pathValue, ...args) {
  const candidate = absolutePath(pathValue);
  if (candidate !== null && relativeInside(candidate) !== null) {
    return original.rmSync(mapWrite(pathValue), ...args);
  }
  return original.rmSync(pathValue, ...args);
};
fs.mkdirSync = function sandboxMkdir(pathValue, options) {
  const candidate = absolutePath(pathValue);
  if (candidate === null || relativeInside(candidate) === null) {
    return original.mkdirSync(pathValue, options);
  }
  if (!declaredDirectory(candidate)) {
    record(candidate);
    throw new Error(
      `GENERATOR_SANDBOX_UNDECLARED_DIRECTORY:${path.relative(root, candidate)}`,
    );
  }
  return original.mkdirSync(shadowPath(candidate), options);
};

syncBuiltinESMExports();
