'use strict';

const { createHash } = require('node:crypto');
const { lstatSync, realpathSync } = require('node:fs');
const { isAbsolute, relative, resolve, sep } = require('node:path');
const { pathToFileURL } = require('node:url');
const { inflateRawSync } = require('node:zlib');

const AUTHORITY_ENV = 'GALERINA_CORPUS_RUNTIME_AUTHORITY';
const AUTHORITY_SCHEMA = 'galerina.fungi-corpus-runtime-authority.v1';
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const LOCAL_NAME = /^@galerina\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const RUNTIME_PATH = /^[A-Za-z0-9@._/-]+$/u;
const MAX_ENCODED_BYTES = 24 * 1024;
const MAX_DECODED_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 8191;
const MAX_ENTRIES = 128;

function exactRecord(value, keys) {
  if (value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function runtimePath(value) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value !== value.normalize('NFC')
    || value.includes('\\')
    || value.includes('\0')
    || !RUNTIME_PATH.test(value)
  ) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function canonicalDigest(value) {
  return `sha256:${createHash('sha256').update(Buffer.from(JSON.stringify(value), 'utf8')).digest('hex')}`;
}

function decodeAuthority() {
  const encoded = process.env[AUTHORITY_ENV];
  if (
    typeof encoded !== 'string'
    || encoded.length === 0
    || encoded.length > MAX_ENCODED_BYTES
    || encoded.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)
  ) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  const compressed = Buffer.from(encoded, 'base64');
  if (compressed.toString('base64') !== encoded) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  let decoded;
  try {
    decoded = inflateRawSync(compressed, { maxOutputLength: MAX_DECODED_BYTES });
  } catch {
    throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  }
  if (decoded.length === 0 || decoded.length > MAX_DECODED_BYTES) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
  } catch {
    throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  }
  if (!exactRecord(parsed, ['schema', 'root', 'files', 'entries', 'digest'])) {
    throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  }
  const input = { schema: parsed.schema, root: parsed.root, files: parsed.files, entries: parsed.entries };
  if (
    parsed.schema !== AUTHORITY_SCHEMA
    || typeof parsed.root !== 'string'
    || !isAbsolute(parsed.root)
    || parsed.root !== resolve(parsed.root)
    || realpathSync(parsed.root) !== parsed.root
    || !Array.isArray(parsed.files)
    || parsed.files.length < 1
    || parsed.files.length > MAX_FILES
    || !Array.isArray(parsed.entries)
    || parsed.entries.length > MAX_ENTRIES
    || !DIGEST.test(parsed.digest)
    || canonicalDigest(input) !== parsed.digest
  ) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
  return parsed;
}

function loadAuthority() {
  const parsed = decodeAuthority();
  const allowedPaths = new Set();
  const allowedUrls = new Set();
  const aliases = new Set();
  let previousPath = null;
  for (const path of parsed.files) {
    const alias = typeof path === 'string' ? path.toLowerCase() : '';
    if (
      !runtimePath(path)
      || (previousPath !== null && previousPath >= path)
      || aliases.has(alias)
    ) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
    const absolute = resolve(parsed.root, ...path.split('/'));
    const confined = relative(parsed.root, absolute).split(sep).join('/');
    let state;
    try { state = lstatSync(absolute); } catch { throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED'); }
    if (
      confined !== path
      || state.isSymbolicLink()
      || !state.isFile()
      || realpathSync(absolute) !== absolute
    ) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
    aliases.add(alias);
    allowedPaths.add(absolute);
    allowedUrls.add(pathToFileURL(absolute).href);
    previousPath = path;
  }

  const entries = Object.create(null);
  const entryAliases = new Set();
  let previousName = null;
  for (const entry of parsed.entries) {
    if (!exactRecord(entry, ['name', 'path'])) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
    const nameAlias = typeof entry.name === 'string' ? entry.name.toLowerCase() : '';
    if (
      !LOCAL_NAME.test(entry.name)
      || (previousName !== null && previousName >= entry.name)
      || entryAliases.has(nameAlias)
      || !runtimePath(entry.path)
    ) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
    const absolute = resolve(parsed.root, ...entry.path.split('/'));
    if (!allowedPaths.has(absolute)) throw new Error('CORPUS_RUNTIME_AUTHORITY_REFUSED');
    entries[entry.name] = Object.freeze({ path: absolute, url: pathToFileURL(absolute).href });
    entryAliases.add(nameAlias);
    previousName = entry.name;
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    allowedPaths,
    allowedUrls,
  });
}

module.exports = Object.freeze({ AUTHORITY_ENV, loadAuthority });
