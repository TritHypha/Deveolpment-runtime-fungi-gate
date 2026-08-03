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
const originalPromises = {
  access: fs.promises.access,
  appendFile: fs.promises.appendFile,
  copyFile: fs.promises.copyFile,
  lstat: fs.promises.lstat,
  mkdir: fs.promises.mkdir,
  readFile: fs.promises.readFile,
  rename: fs.promises.rename,
  rm: fs.promises.rm,
  stat: fs.promises.stat,
  unlink: fs.promises.unlink,
  writeFile: fs.promises.writeFile,
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function atomicSiblingTarget(candidate) {
  for (const output of allowed) {
    if (path.dirname(candidate) !== path.dirname(output)) continue;
    const pattern = new RegExp(
      `^\\.${escapeRegex(path.basename(output))}\\.[0-9a-f]{16}\\.tmp$`,
    );
    if (pattern.test(path.basename(candidate))) return output;
  }
  return null;
}

function declaredWrite(candidate) {
  return declaredFile(candidate) || atomicSiblingTarget(candidate) !== null;
}

function declaredDirectory(candidate) {
  const prefix = `${candidate}${path.sep}`;
  return [...allowed].some((item) => item.startsWith(prefix));
}

function mapRead(value) {
  const candidate = absolutePath(value);
  if (candidate === null || !declaredWrite(candidate)) return value;
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
  if (!declaredWrite(candidate)) {
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

fs.promises.readFile = function sandboxReadFile(pathValue, ...args) {
  return originalPromises.readFile(mapRead(pathValue), ...args);
};
fs.promises.stat = function sandboxStat(pathValue, ...args) {
  return originalPromises.stat(mapRead(pathValue), ...args);
};
fs.promises.lstat = function sandboxLstat(pathValue, ...args) {
  return originalPromises.lstat(mapRead(pathValue), ...args);
};
fs.promises.access = function sandboxAccess(pathValue, ...args) {
  return originalPromises.access(mapRead(pathValue), ...args);
};
fs.promises.writeFile = function sandboxWriteFile(pathValue, ...args) {
  return originalPromises.writeFile(mapWrite(pathValue), ...args);
};
fs.promises.appendFile = function sandboxAppendFile(pathValue, ...args) {
  return originalPromises.appendFile(mapWrite(pathValue), ...args);
};
fs.promises.copyFile = function sandboxCopyFile(source, destination, ...args) {
  return originalPromises.copyFile(mapRead(source), mapWrite(destination), ...args);
};
fs.promises.rename = function sandboxRename(source, destination, ...args) {
  return originalPromises.rename(mapRead(source), mapWrite(destination), ...args);
};
fs.promises.unlink = function sandboxUnlink(pathValue, ...args) {
  return originalPromises.unlink(mapWrite(pathValue), ...args);
};
fs.promises.rm = function sandboxRemove(pathValue, ...args) {
  const candidate = absolutePath(pathValue);
  if (candidate !== null && relativeInside(candidate) !== null) {
    return originalPromises.rm(mapWrite(pathValue), ...args);
  }
  return originalPromises.rm(pathValue, ...args);
};
fs.promises.mkdir = function sandboxMkdir(pathValue, options) {
  const candidate = absolutePath(pathValue);
  if (candidate === null || relativeInside(candidate) === null) {
    return originalPromises.mkdir(pathValue, options);
  }
  if (!declaredDirectory(candidate)) {
    record(candidate);
    throw new Error(
      `GENERATOR_SANDBOX_UNDECLARED_DIRECTORY:${path.relative(root, candidate)}`,
    );
  }
  return originalPromises.mkdir(shadowPath(candidate), options);
};

syncBuiltinESMExports();
