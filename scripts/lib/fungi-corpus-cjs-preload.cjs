'use strict';

const Module = require('node:module');
const { isAbsolute, resolve } = require('node:path');
const { loadAuthority } = require('./fungi-corpus-runtime-authority.cjs');

const authority = loadAuthority();
const builtins = new Set(Module.builtinModules.flatMap((name) => [name, `node:${name}`]));
const originalResolveFilename = Module._resolveFilename;
if (typeof originalResolveFilename !== 'function') throw new Error('CORPUS_RUNTIME_CJS_GUARD_REFUSED');

function protectedResolveFilename(request, parent, isMain, options) {
  const local = typeof request === 'string' ? authority.entries[request] : undefined;
  if (local !== undefined) return local.path;
  if (typeof request === 'string' && request.startsWith('@galerina/')) {
    throw new Error('CORPUS_RUNTIME_DEPENDENCY_REFUSED');
  }
  const resolved = Reflect.apply(originalResolveFilename, this, [request, parent, isMain, options]);
  if (typeof resolved !== 'string') throw new Error('CORPUS_RUNTIME_FILE_REFUSED');
  if (builtins.has(resolved) || resolved.startsWith('node:')) return resolved;
  if (!isAbsolute(resolved) || resolve(resolved) !== resolved || !authority.allowedPaths.has(resolved)) {
    throw new Error('CORPUS_RUNTIME_FILE_REFUSED');
  }
  return resolved;
}

Object.defineProperty(Module, '_resolveFilename', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: protectedResolveFilename,
});
