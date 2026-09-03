import { spawnSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { isProxy } from 'node:util/types';

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  classifySourcePath,
  sha256Canonical,
  sha256Raw,
  validateParserPolicy,
  validateRepositoryIdentity,
  validateResolutionInputs,
  validateResolutionPolicy,
  validateSourceManifest,
  validateSourcePolicy,
  validateToolchainPins,
} from './contract.mjs';
import { admitFrozenBlobSet } from './git-source.mjs';
import { prepareSemanticToolchain } from './toolchain-snapshot.mjs';

const NODE_ID = /^ga1:[0-9a-f]{64}$/;
const HOST_OPTION_KEYS = Object.freeze([
  'repositoryIdentity', 'sourcePolicy', 'resolutionPolicy', 'parserPolicy',
  'pins', 'sourceManifest', 'sourceBlobs', 'resolutionInputs',
  'resolutionBlobs', 'toolchainBlobs', 'platform', 'arch', 'nodeIdentity',
  'gitIdentity',
]);
const SEMANTIC_ROW_OPTION_KEYS = Object.freeze([
  'repositoryId', 'parserId', 'sourceRows', 'parseResults',
  'declarations', 'relations', 'parserPolicy', 'resolutionPolicy',
]);
const NODE_KINDS = new Set([
  'CLASS', 'FILE', 'FLOW', 'FUNCTION', 'GATE', 'INTERFACE', 'METHOD',
  'MODULE', 'ROUTE', 'SYMBOL', 'TYPE',
]);
const RELATIONSHIP_KINDS = new Set([
  'CALLER', 'CONTRACT', 'GENERATED_CONSUMER', 'IMPORT', 'TEST',
]);
const TARGET_STATES = new Set(['AMBIGUOUS', 'DYNAMIC', 'MISSING', 'OUTSIDE', 'RESOLVED']);

class HostDecoderRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'HostDecoderRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new HostDecoderRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code = 'SOURCE_ORIGIN_HOST_SCHEMA') {
  if (isProxy(value) || value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  const sorted = names.sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (sorted.length !== expected.length || sorted.some((name, index) => name !== expected[index])) refuse(code);
}

function exactArray(value, code = 'SOURCE_ORIGIN_HOST_SCHEMA') {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== value.length + 1 || !names.includes('length')) refuse(code);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  return value;
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const name of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (descriptor && 'value' in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function decodeUtf8(bytes, code = 'SOURCE_ORIGIN_HOST_SOURCE') {
  if (isProxy(bytes) || !Buffer.isBuffer(bytes) || Object.getPrototypeOf(bytes) !== Buffer.prototype || bytes.buffer instanceof SharedArrayBuffer) refuse(code);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
}

function sourcePathFromLocator(locator) {
  const split = locator.lastIndexOf('#');
  return split === -1 ? locator : locator.slice(0, split);
}

function isTestPath(locator, resolutionPolicy) {
  const components = locator.split('/');
  if (components.some((component) => resolutionPolicy.testPathComponents.includes(component))) return true;
  const basename = components.at(-1);
  return new RegExp(resolutionPolicy.testBasenamePattern).test(basename);
}

function byteCompareIdentity(left, right) {
  return left.byteLength === right.byteLength && left.rawSha256 === right.rawSha256;
}

async function authenticateNodeExecutable(nodeIdentity) {
  if (process.version !== nodeIdentity.version) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  let details;
  let canonical;
  let bytes;
  try {
    details = await lstat(process.execPath, { bigint: true });
    canonical = await realpath(process.execPath);
    bytes = await readFile(process.execPath);
  } catch {
    refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  }
  if (
    details.isSymbolicLink()
    || !details.isFile()
    || canonical !== process.execPath
    || bytes.length !== nodeIdentity.executableByteLength
    || sha256Raw(bytes) !== nodeIdentity.executableRawSha256
  ) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
}

function hostChildMain() {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const path = require('node:path');
  const Module = require('node:module');

  class GuardRefusal extends Error {
    constructor(code) { super(code); this.code = code; }
  }
  const fail = (code) => { throw new GuardRefusal(code); };
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  const samePath = (left, right) => process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
  const canonicalBuiltin = new Map();
  for (const name of Module.builtinModules) {
    const canonical = name.startsWith('node:') ? name : `node:${name}`;
    canonicalBuiltin.set(name, canonical);
    canonicalBuiltin.set(canonical, canonical);
  }

  let config;
  try { config = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exitCode = 2; return; }
  const root = path.resolve(config.root);
  const entry = path.resolve(root, ...config.entryLocator.split('/'));
  const admittedRows = new Map(config.allowedRows.map((row) => [row.locator, row]));
  const admittedBuiltins = new Set(config.allowedBuiltins);
  const loadedModules = new Set();
  const loadedBuiltins = new Set();

  const locatorFor = (filename) => {
    const absolute = path.resolve(filename);
    const relative = path.relative(root, absolute);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('LOAD');
    return relative.split(path.sep).join('/');
  };
  const readExact = (filename) => {
    const locator = locatorFor(filename);
    const expected = admittedRows.get(locator);
    if (!expected || !locator.endsWith('.js')) fail('LOAD');
    let details;
    let canonical;
    let bytes;
    try {
      details = fs.lstatSync(filename, { bigint: true });
      canonical = fs.realpathSync.native(filename);
      bytes = fs.readFileSync(filename);
    } catch { fail('LOAD'); }
    if (
      details.isSymbolicLink()
      || !details.isFile()
      || details.nlink !== 1n
      || !samePath(canonical, path.resolve(filename))
      || bytes.length !== expected.byteLength
      || hash(bytes) !== expected.rawSha256
    ) fail('LOAD');
    loadedModules.add(locator);
    return bytes;
  };
  const originalLoad = Module._load;
  Module._load = function guardedLoad(request, parent, isMain) {
    if (typeof request !== 'string') fail('LOAD');
    const builtin = canonicalBuiltin.get(request);
    if (builtin) {
      if (!admittedBuiltins.has(builtin)) fail('LOAD');
      loadedBuiltins.add(builtin);
      return originalLoad.call(this, request, parent, isMain);
    }
    let filename;
    if (path.isAbsolute(request)) {
      if (parent !== null || !isMain || !samePath(path.resolve(request), entry)) fail('LOAD');
      filename = entry;
    } else if ((request.startsWith('./') || request.startsWith('../')) && request.endsWith('.js') && parent && typeof parent.filename === 'string') {
      filename = path.resolve(path.dirname(parent.filename), request);
    } else fail('LOAD');
    if (!admittedRows.has(locatorFor(filename))) fail('LOAD');
    return originalLoad.call(this, filename, parent, isMain);
  };
  Module._extensions['.js'] = function guardedJavaScript(module, filename) {
    const bytes = readExact(filename);
    module._compile(new TextDecoder('utf-8', { fatal: true }).decode(bytes), filename);
  };
  process.chdir = () => fail('LOAD');

  const byteOffset = (text, offset) => Buffer.byteLength(text.slice(0, offset), 'utf8');
  const resolveSpecifier = (sourcePaths, importer, specifier) => {
    if (canonicalBuiltin.has(specifier) || specifier.startsWith('node:')) return { state: 'OUTSIDE', paths: [] };
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) return { state: 'OUTSIDE', paths: [] };
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
    if (base === '..' || base.startsWith('../') || base.startsWith('/')) return { state: 'MISSING', paths: [] };
    const candidates = [];
    const add = (candidate) => { if (sourcePaths.has(candidate) && !candidates.includes(candidate)) candidates.push(candidate); };
    add(base);
    const sourceSuffixes = ['.cjs', '.cts', '.d.ts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'];
    if (/\.(?:c|m)?js$/u.test(base)) {
      const stem = base.replace(/\.(?:c|m)?js$/u, '');
      for (const suffix of sourceSuffixes) add(stem + suffix);
    } else {
      for (const suffix of sourceSuffixes) add(base + suffix);
      for (const suffix of sourceSuffixes) add(`${base}/index${suffix}`);
    }
    candidates.sort(compare);
    return candidates.length === 1
      ? { state: 'RESOLVED', paths: candidates }
      : candidates.length > 1
        ? { state: 'AMBIGUOUS', paths: candidates }
        : { state: 'MISSING', paths: [] };
  };

  const runHost = (ts) => {
    const virtualRoot = '/__galerina_source_origin__';
    const sourceEntries = config.sources.map((row) => [row.path, row.text]);
    const sourceTexts = new Map(sourceEntries);
    const sourcePaths = new Set(sourceEntries.map(([locator]) => locator));
    const virtualByPath = new Map(sourceEntries.map(([locator]) => [locator, `${virtualRoot}/${locator}`]));
    const pathByVirtual = new Map([...virtualByPath].map(([locator, virtual]) => [virtual, locator]));
    const sourceFiles = new Map();
    for (const [locator, text] of sourceEntries) {
      const virtual = virtualByPath.get(locator);
      const scriptKind = typeof ts.getScriptKindFromFileName === 'function'
        ? ts.getScriptKindFromFileName(locator)
        : undefined;
      sourceFiles.set(virtual, ts.createSourceFile(virtual, text, ts.ScriptTarget.Latest, true, scriptKind));
    }
    const compilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowJs: true,
      checkJs: false,
      jsx: ts.JsxEmit.Preserve,
      noLib: true,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
    };
    const resolveVirtual = (specifier, containingVirtual) => {
      const importer = pathByVirtual.get(containingVirtual);
      if (!importer) return undefined;
      const resolution = resolveSpecifier(sourcePaths, importer, specifier);
      if (resolution.state !== 'RESOLVED') return undefined;
      const resolved = resolution.paths[0];
      const resolvedFileName = virtualByPath.get(resolved);
      return { resolvedFileName, extension: ts.Extension?.Ts ?? '.ts', isExternalLibraryImport: false };
    };
    const host = {
      getSourceFile(fileName) { return sourceFiles.get(fileName); },
      getDefaultLibFileName() { return `${virtualRoot}/__no_lib__.d.ts`; },
      writeFile() { fail('HOST'); },
      getCurrentDirectory() { return virtualRoot; },
      getDirectories() { return []; },
      fileExists(fileName) { return sourceFiles.has(fileName); },
      readFile(fileName) { return sourceTexts.get(pathByVirtual.get(fileName)); },
      directoryExists(directory) { return directory === virtualRoot || [...sourceFiles.keys()].some((fileName) => fileName.startsWith(`${directory}/`)); },
      getCanonicalFileName(fileName) { return fileName; },
      useCaseSensitiveFileNames() { return true; },
      getNewLine() { return '\n'; },
      realpath(fileName) { return fileName; },
      resolveModuleNames(moduleNames, containingFile) { return moduleNames.map((specifier) => resolveVirtual(specifier, containingFile)); },
    };
    const program = ts.createProgram({ rootNames: [...sourceFiles.keys()], options: compilerOptions, host });
    const checker = program.getTypeChecker();
    const declarations = [];
    const declarationKey = new Map();

    const declarationKind = (node) => {
      if (ts.isModuleDeclaration(node)) return 'MODULE';
      if (ts.isClassDeclaration(node)) return 'CLASS';
      if (ts.isInterfaceDeclaration(node)) return 'INTERFACE';
      if (ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) return 'TYPE';
      if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return 'METHOD';
      if (ts.isFunctionDeclaration(node)) return 'FUNCTION';
      if (ts.isVariableDeclaration(node)) {
        const container = node.parent?.parent?.parent;
        if (ts.isSourceFile(container) || ts.isModuleBlock(container)) return 'SYMBOL';
      }
      return null;
    };
    const declarationName = (node) => {
      const name = node.name;
      if (!name) return null;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return String(name.text);
      return null;
    };
    for (const [locator, text] of sourceEntries) {
      const sourceFile = sourceFiles.get(virtualByPath.get(locator));
      let preorder = 0;
      const stack = [];
      const visit = (node) => {
        const ordinal = preorder++;
        const kind = declarationKind(node);
        let key = null;
        if (kind !== null) {
          let start;
          let end;
          try { start = node.getStart(sourceFile, false); end = node.getEnd(); } catch { start = node.pos; end = node.end; }
          key = `${locator}\u0000${ordinal}`;
          declarationKey.set(node, key);
          declarations.push({
            key,
            path: locator,
            parentKey: stack.at(-1) ?? null,
            kind,
            name: declarationName(node),
            parserNodeKind: ts.SyntaxKind[node.kind] ?? String(node.kind),
            startByte: byteOffset(text, Math.max(0, start)),
            endByte: byteOffset(text, Math.max(start, end)),
            preorderOrdinal: ordinal,
          });
          stack.push(key);
        }
        ts.forEachChild(node, visit);
        if (key !== null) stack.pop();
      };
      visit(sourceFile);
    }
    const relationOwnerKey = (node) => {
      for (let current = node.parent; current; current = current.parent) {
        const key = declarationKey.get(current);
        if (key) return key;
      }
      return null;
    };
    const targetKeys = (node) => {
      let symbol;
      try { symbol = checker.getSymbolAtLocation(node); } catch { return { keys: [], outside: false }; }
      if (!symbol) return { keys: [], outside: false };
      if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
        try { symbol = checker.getAliasedSymbol(symbol); } catch { /* retain alias */ }
      }
      const keys = [];
      let outside = false;
      for (const declaration of symbol.declarations ?? []) {
        const key = declarationKey.get(declaration);
        if (key) keys.push(key);
        else outside = true;
      }
      keys.sort(compare);
      return { keys: [...new Set(keys)], outside };
    };
    const relations = [];
    const relationSpan = (node, sourceFile, text) => {
      let start;
      let end;
      try { start = node.getStart(sourceFile, false); end = node.getEnd(); } catch { start = node.pos; end = node.end; }
      return { startByte: byteOffset(text, Math.max(0, start)), endByte: byteOffset(text, Math.max(start + 1, end)) };
    };
    for (const [locator, text] of sourceEntries) {
      const sourceFile = sourceFiles.get(virtualByPath.get(locator));
      const visit = (node) => {
        const ownerNativeKey = relationOwnerKey(node);
        const span = relationSpan(node, sourceFile, text);
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const resolution = resolveSpecifier(sourcePaths, locator, node.moduleSpecifier.text);
          relations.push({ path: locator, ownerNativeKey, relationshipClass: 'IMPORT', ...span, targetNativeKeys: [], targetPaths: resolution.paths, targetState: resolution.state });
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            relations.push({ path: locator, ownerNativeKey, relationshipClass: 'IMPORT', ...span, targetNativeKeys: [], targetPaths: [], targetState: 'DYNAMIC' });
          } else {
            const target = targetKeys(ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression);
            const targetState = target.keys.length === 1 ? 'RESOLVED' : target.keys.length > 1 ? 'AMBIGUOUS' : target.outside ? 'OUTSIDE' : ts.isIdentifier(node.expression) ? 'MISSING' : 'DYNAMIC';
            relations.push({ path: locator, ownerNativeKey, relationshipClass: 'CALLER', ...span, targetNativeKeys: target.keys, targetPaths: [], targetState });
          }
        } else if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
          const targetNode = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
          const target = targetKeys(targetNode);
          const targetState = target.keys.length === 1 ? 'RESOLVED' : target.keys.length > 1 ? 'AMBIGUOUS' : target.outside ? 'OUTSIDE' : 'MISSING';
          relations.push({ path: locator, ownerNativeKey, relationshipClass: 'CONTRACT', ...span, targetNativeKeys: target.keys, targetPaths: [], targetState });
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    const diagnostics = [];
    const diagnosticShape = (diagnostic, active = new Set()) => {
      if (!diagnostic || active.has(diagnostic)) fail('HOST');
      active.add(diagnostic);
      const relatedInformation = (diagnostic.relatedInformation ?? []).map((row) => diagnosticShape(row, active));
      active.delete(diagnostic);
      return { code: diagnostic.code, category: diagnostic.category, relatedInformation };
    };
    for (const [locator] of sourceEntries) {
      const sourceFile = sourceFiles.get(virtualByPath.get(locator));
      let rows;
      try { rows = program.getSyntacticDiagnostics(sourceFile).map((row) => diagnosticShape(row)); } catch { fail('HOST'); }
      diagnostics.push({ path: locator, diagnostics: rows });
    }
    return { declarations, relations, diagnostics };
  };

  try {
    if (!samePath(process.cwd(), root)) fail('LOAD');
    const ts = Module._load(entry, null, true);
    for (const name of ['createProgram', 'createSourceFile']) if (typeof ts?.[name] !== 'function') fail('HOST');
    const semantic = runHost(ts);
    const moduleLocators = [...loadedModules].sort(compare);
    const builtinModules = [...loadedBuiltins].sort(compare);
    const expectedModules = config.allowedRows.map((row) => row.locator).sort(compare);
    const expectedBuiltins = [...config.allowedBuiltins].sort(compare);
    if (JSON.stringify(moduleLocators) !== JSON.stringify(expectedModules) || JSON.stringify(builtinModules) !== JSON.stringify(expectedBuiltins)) fail('LOAD');
    process.stdout.write(JSON.stringify({ moduleLocators, builtinModules, semantic }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ refusal: error instanceof GuardRefusal ? error.code : 'CHILD' }));
    process.exitCode = 2;
  }
}

const HOST_CHILD_SOURCE = `(${hostChildMain.toString()})()`;

function childEnvironment() {
  const environment = { NODE_DISABLE_COMPILE_CACHE: '1' };
  if (process.platform === 'win32' && typeof process.env.SystemRoot === 'string') environment.SystemRoot = process.env.SystemRoot;
  return environment;
}

async function runHostChild(selection, entryBytes, sources) {
  let root;
  let result;
  let failure;
  try {
    root = await mkdtemp(path.join(tmpdir(), 'galerina-source-origin-host-'));
    const entryPath = path.join(root, ...selection.entry.locator.split('/'));
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(entryPath, entryBytes, { flag: 'wx', mode: 0o600 });
    const readback = await readFile(entryPath);
    const entryIdentity = selection.moduleRows.find((row) => row.locator === selection.entry.locator);
    if (!entryIdentity || !byteCompareIdentity(entryIdentity, { byteLength: readback.length, rawSha256: sha256Raw(readback) })) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
    const config = {
      root,
      entryLocator: selection.entry.locator,
      allowedRows: selection.moduleRows,
      allowedBuiltins: selection.builtinModules,
      sources,
    };
    const input = canonicalJsonText(config);
    if (Buffer.byteLength(input, 'utf8') > SOURCE_ORIGIN_LIMITS.jsonBytes) refuse('SOURCE_ORIGIN_LIMIT');
    result = spawnSync(process.execPath, ['--no-warnings', '--input-type=commonjs', '--eval', HOST_CHILD_SOURCE], {
      cwd: root,
      env: childEnvironment(),
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: SOURCE_ORIGIN_LIMITS.processMillis,
      maxBuffer: SOURCE_ORIGIN_LIMITS.processOutputBytes,
      windowsHide: true,
    });
  } catch (error) {
    failure = error;
  }
  if (root !== undefined) {
    try { await rm(root, { recursive: true, force: true }); } catch { refuse('SOURCE_ORIGIN_HOST_CLEANUP'); }
  }
  if (failure) {
    if (failure instanceof HostDecoderRefusal) throw failure;
    refuse('SOURCE_ORIGIN_HOST_CHILD');
  }
  if (result.error || result.signal !== null || result.stderr !== '' || result.status !== 0 || Buffer.byteLength(result.stdout, 'utf8') > SOURCE_ORIGIN_LIMITS.processOutputBytes) refuse('SOURCE_ORIGIN_HOST_CHILD');
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { refuse('SOURCE_ORIGIN_HOST_CHILD'); }
  if (parsed?.refusal) refuse(parsed.refusal === 'LOAD' ? 'SOURCE_ORIGIN_HOST_TOOLCHAIN' : 'SOURCE_ORIGIN_HOST_CHILD');
  exactObject(parsed, ['moduleLocators','builtinModules','semantic'], 'SOURCE_ORIGIN_HOST_CHILD');
  return parsed;
}

function canonicalTypeScriptDiagnostic(row, mapping, related = false) {
  exactObject(row, ['code','category','relatedInformation'], 'SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  if (!Number.isSafeInteger(row.code) || row.code < mapping.minimumCode || row.code > mapping.maximumCode) refuse('SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  if (!Number.isSafeInteger(row.category)) refuse('SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  const category = mapping.categoryRows.find((candidate) => candidate.typescriptCategory === row.category);
  if (!category) refuse('SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  exactArray(row.relatedInformation, 'SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  for (const child of row.relatedInformation) canonicalTypeScriptDiagnostic(child, mapping, true);
  if (related || category.codeSetAction === 'EXCLUDE') return null;
  if (category.codeSetAction !== 'INCLUDE') refuse('SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  const digits = String(row.code).padStart(mapping.minimumDigits, '0');
  return `${mapping.prefix}${digits}`;
}

function mappedDiagnostics(rows, parserPolicy) {
  exactArray(rows, 'SOURCE_ORIGIN_HOST_DIAGNOSTIC');
  const codes = [];
  for (const row of rows) {
    const code = canonicalTypeScriptDiagnostic(row, parserPolicy.typescriptDiagnosticMapping);
    if (code !== null) codes.push(code);
  }
  return [...new Set(codes)].sort(compareCodeUnits);
}

function escapeName(name) {
  if (typeof name !== 'string' || !name || name !== name.normalize('NFC')) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  let output = '';
  for (const byte of Buffer.from(name, 'utf8')) {
    const character = String.fromCharCode(byte);
    output += /[A-Za-z0-9_.$-]/.test(character)
      ? character
      : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return output;
}

function nodeId(repositoryId, kind, locator) {
  if (!NODE_KINDS.has(kind)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  return `ga1:${sha256Canonical('galerina.logic-aig-node-id.v1', { repositoryId, kind, locator })}`;
}

function idMapRow(parserId, parserNodeKind, startByte, endByte, preorderOrdinal, node, sourceRow) {
  const body = {
    nativeIdentity: { parserId, parserNodeKind, startByte, endByte, preorderOrdinal },
    nodeId: node.id,
    kind: node.kind,
    locator: node.locator,
    sourceBlobOid: sourceRow.blobOid,
    sourceRawSha256: sourceRow.rawSha256,
  };
  return { ...body, rowDigest: sha256Canonical('galerina.logic-aig-id-map-row.v1', body) };
}

function compareIdMapRows(left, right) {
  for (const field of ['nodeId']) {
    const compared = compareCodeUnits(left[field], right[field]);
    if (compared !== 0) return compared;
  }
  for (const field of ['parserId','parserNodeKind']) {
    const compared = compareCodeUnits(left.nativeIdentity[field], right.nativeIdentity[field]);
    if (compared !== 0) return compared;
  }
  for (const field of ['startByte','endByte','preorderOrdinal']) {
    if (left.nativeIdentity[field] !== right.nativeIdentity[field]) return left.nativeIdentity[field] - right.nativeIdentity[field];
  }
  return 0;
}

function addEdge(edges, evidence, relationshipKind, sourceNodeId, targetNodeId) {
  if (!RELATIONSHIP_KINDS.has(relationshipKind) || !NODE_ID.test(sourceNodeId) || !NODE_ID.test(targetNodeId)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  const evidenceBody = {
    schema: 'galerina.logic-aig-edge-evidence.v1',
    relationshipKind,
    sourceNodeId,
    targetNodeId,
    evidenceLocation: evidence,
    authorizing: false,
  };
  const evidenceDigest = sha256Canonical(evidenceBody.schema, evidenceBody);
  const identity = { relationshipKind, sourceNodeId, targetNodeId, evidenceDigest };
  edges.push({
    id: `ga1:${sha256Canonical('galerina.logic-aig-edge-id.v1', identity)}`,
    kind: relationshipKind,
    from: sourceNodeId,
    to: targetNodeId,
    digest: evidenceDigest,
  });
}

function addUnresolved(unresolved, parserPolicy, relation, sourceNode, sourceRow, candidateNodeIds) {
  let reasonCode;
  let candidateState;
  if (relation.targetState === 'AMBIGUOUS') {
    if (candidateNodeIds.length < 2) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    reasonCode = 'AMBIGUOUS_TARGET'; candidateState = 'EXACT_SET';
  } else if (relation.targetState === 'DYNAMIC') {
    reasonCode = 'DYNAMIC_TARGET'; candidateState = candidateNodeIds.length > 0 ? 'EXACT_SET' : 'UNKNOWN';
  } else if (relation.targetState === 'OUTSIDE') {
    reasonCode = 'TARGET_OUTSIDE_SOURCE_DOMAIN'; candidateState = 'UNKNOWN'; candidateNodeIds = [];
  } else {
    reasonCode = 'MISSING_TARGET'; candidateState = 'UNKNOWN'; candidateNodeIds = [];
  }
  candidateNodeIds = [...new Set(candidateNodeIds)].sort(compareCodeUnits);
  const policyRow = parserPolicy.unresolvedReasonRows.find((row) => row.relationshipClass === relation.relationshipClass && row.reasonCode === reasonCode);
  if (!policyRow || !policyRow.permittedCandidateStates.includes(candidateState)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  const ownerBody = {
    schema: 'galerina.logic-aig-unresolved-relation-owner.v1',
    sourceNodeId: sourceNode.id,
    sourceLocator: sourceNode.locator,
    relationshipClass: relation.relationshipClass,
    reasonCode,
    sourceBinding: {
      sourceBlobOid: sourceRow.blobOid,
      sourceRawSha256: sourceRow.rawSha256,
      startByte: relation.startByte,
      endByte: relation.endByte,
    },
    candidateState,
    candidateNodeIds,
    authorizing: false,
  };
  const evidenceOwnerDigest = sha256Canonical(ownerBody.schema, ownerBody);
  const evidenceBody = {
    sourceNodeId: sourceNode.id,
    sourceLocator: sourceNode.locator,
    relationshipClass: relation.relationshipClass,
    reasonCode,
    evidenceOwnerDigest,
  };
  unresolved.push({ ...evidenceBody, evidenceDigest: sha256Canonical('galerina.logic-aig-unresolved-evidence.v1', evidenceBody) });
}

function semanticText(value) {
  if (typeof value !== 'string' || value.length === 0) refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  return value;
}

function semanticNullableText(value) {
  if (value === null) return value;
  return semanticText(value);
}

function semanticInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  return value;
}

function semanticTextArray(value) {
  exactArray(value, 'SOURCE_ORIGIN_HOST_SCHEMA');
  for (const item of value) semanticText(item);
  return value;
}

function validateSemanticRowClosure(value) {
  if (!value.parserPolicy.parserIds.includes(value.parserId)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  const sourceByPath = new Map();
  for (const row of value.sourceRows) {
    if (sourceByPath.has(row.path)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    sourceByPath.set(row.path, row);
  }
  const parseByPath = new Map();
  const diagnosticPattern = new RegExp(value.parserPolicy.diagnosticCodePattern, 'u');
  for (const row of value.parseResults) {
    if (!sourceByPath.has(row.path) || parseByPath.has(row.path)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    let previous;
    for (const code of row.diagnosticCodes) {
      if (!diagnosticPattern.test(code) || (previous !== undefined && compareCodeUnits(previous, code) >= 0)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
      previous = code;
    }
    if (row.status === 'PARSED' && row.diagnosticCodes.length !== 0) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    parseByPath.set(row.path, row);
  }
  if (parseByPath.size !== sourceByPath.size) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');

  const declarationByKey = new Map();
  const ordinals = new Set();
  for (const row of value.declarations) {
    const sourceRow = sourceByPath.get(row.path);
    if (
      !sourceRow
      || parseByPath.get(row.path)?.status !== 'PARSED'
      || declarationByKey.has(row.key)
      || !NODE_KINDS.has(row.kind)
      || row.endByte <= row.startByte
      || row.endByte > sourceRow.byteLength
    ) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    const ordinalKey = `${row.path}\u0000${row.preorderOrdinal}`;
    if (ordinals.has(ordinalKey)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    ordinals.add(ordinalKey);
    declarationByKey.set(row.key, row);
  }
  for (const row of value.declarations) {
    if (row.parentKey === null) continue;
    const parent = declarationByKey.get(row.parentKey);
    if (!parent || parent.path !== row.path || parent.preorderOrdinal >= row.preorderOrdinal) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  }
  const parentStates = new Map();
  for (const row of value.declarations) {
    if (parentStates.get(row.key) === 'DONE') continue;
    const chain = [];
    let current = row;
    while (current !== null && parentStates.get(current.key) === undefined) {
      parentStates.set(current.key, 'VISITING');
      chain.push(current);
      current = current.parentKey === null ? null : declarationByKey.get(current.parentKey);
    }
    if (current !== null && parentStates.get(current.key) === 'VISITING') refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    for (const member of chain) parentStates.set(member.key, 'DONE');
  }

  for (const row of value.relations) {
    const sourceRow = sourceByPath.get(row.path);
    const owner = row.ownerNativeKey === null ? null : declarationByKey.get(row.ownerNativeKey);
    if (
      !sourceRow
      || parseByPath.get(row.path)?.status !== 'PARSED'
      || (row.ownerNativeKey !== null && (!owner || owner.path !== row.path))
      || !RELATIONSHIP_KINDS.has(row.relationshipClass)
      || row.relationshipClass === 'TEST'
      || row.relationshipClass === 'GENERATED_CONSUMER'
      || row.endByte <= row.startByte
      || row.endByte > sourceRow.byteLength
      || !TARGET_STATES.has(row.targetState)
      || new Set(row.targetNativeKeys).size !== row.targetNativeKeys.length
      || new Set(row.targetPaths).size !== row.targetPaths.length
      || row.targetNativeKeys.some((key) => !declarationByKey.has(key))
      || row.targetPaths.some((path) => !sourceByPath.has(path))
    ) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    const targetCount = row.targetNativeKeys.length + row.targetPaths.length;
    if (
      (row.targetState === 'RESOLVED' && targetCount !== 1)
      || (row.targetState === 'AMBIGUOUS' && targetCount < 2)
      || ((row.targetState === 'MISSING' || row.targetState === 'OUTSIDE') && targetCount !== 0)
    ) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  }
}

function captureSemanticRowsOptions(options) {
  exactObject(options, SEMANTIC_ROW_OPTION_KEYS, 'SOURCE_ORIGIN_HOST_SCHEMA');
  let captured;
  try {
    captured = JSON.parse(canonicalJsonText(options));
  } catch {
    refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  }
  exactObject(captured, SEMANTIC_ROW_OPTION_KEYS, 'SOURCE_ORIGIN_HOST_SCHEMA');
  semanticText(captured.repositoryId);
  semanticText(captured.parserId);
  exactArray(captured.sourceRows, 'SOURCE_ORIGIN_HOST_SCHEMA');
  exactArray(captured.parseResults, 'SOURCE_ORIGIN_HOST_SCHEMA');
  exactArray(captured.declarations, 'SOURCE_ORIGIN_HOST_SCHEMA');
  exactArray(captured.relations, 'SOURCE_ORIGIN_HOST_SCHEMA');
  for (const row of captured.sourceRows) {
    exactObject(row, ['path','mode','blobOid','objectFormat','byteLength','rawSha256'], 'SOURCE_ORIGIN_HOST_SCHEMA');
    semanticText(row.path);
    if (row.mode !== '100644' && row.mode !== '100755') refuse('SOURCE_ORIGIN_HOST_SCHEMA');
    if (row.objectFormat !== 'sha1' && row.objectFormat !== 'sha256') refuse('SOURCE_ORIGIN_HOST_SCHEMA');
    if (!(row.objectFormat === 'sha1' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(row.blobOid)) refuse('SOURCE_ORIGIN_HOST_SCHEMA');
    semanticInteger(row.byteLength);
    if (!/^[0-9a-f]{64}$/.test(row.rawSha256)) refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  }
  for (const row of captured.parseResults) {
    exactObject(row, ['path','status','diagnosticCodes'], 'SOURCE_ORIGIN_HOST_SCHEMA');
    semanticText(row.path);
    if (row.status !== 'PARSED' && row.status !== 'REFUSED') refuse('SOURCE_ORIGIN_HOST_SCHEMA');
    semanticTextArray(row.diagnosticCodes);
  }
  for (const row of captured.declarations) {
    exactObject(row, ['key','path','parentKey','kind','name','parserNodeKind','startByte','endByte','preorderOrdinal'], 'SOURCE_ORIGIN_HOST_SCHEMA');
    semanticText(row.key); semanticText(row.path); semanticNullableText(row.parentKey);
    semanticText(row.kind); semanticNullableText(row.name); semanticText(row.parserNodeKind);
    semanticInteger(row.startByte); semanticInteger(row.endByte); semanticInteger(row.preorderOrdinal);
  }
  for (const row of captured.relations) {
    exactObject(row, ['path','ownerNativeKey','relationshipClass','startByte','endByte','targetNativeKeys','targetPaths','targetState'], 'SOURCE_ORIGIN_HOST_SCHEMA');
    semanticText(row.path); semanticNullableText(row.ownerNativeKey); semanticText(row.relationshipClass);
    semanticInteger(row.startByte); semanticInteger(row.endByte);
    semanticTextArray(row.targetNativeKeys); semanticTextArray(row.targetPaths); semanticText(row.targetState);
  }
  try {
    captured.parserPolicy = validateParserPolicy(captured.parserPolicy);
    captured.resolutionPolicy = validateResolutionPolicy(captured.resolutionPolicy);
  } catch {
    refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  }
  validateSemanticRowClosure(captured);
  return captured;
}

export function buildSemanticRows(options) {
  options = captureSemanticRowsOptions(options);
  const {
    repositoryId, parserId, sourceRows, parseResults, declarations, relations,
    parserPolicy, resolutionPolicy,
  } = options;
  const sourceByPath = new Map(sourceRows.map((row) => [row.path, row]));
  const parseByPath = new Map(parseResults.map((row) => [row.path, row]));
  const nodes = [];
  const idMapRows = [];
  const fileNodeByPath = new Map();
  for (const sourceRow of sourceRows) {
    const result = parseByPath.get(sourceRow.path);
    if (!result) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    const node = {
      id: nodeId(repositoryId, 'FILE', sourceRow.path),
      kind: 'FILE',
      locator: sourceRow.path,
      digest: sourceRow.rawSha256,
    };
    nodes.push(node); fileNodeByPath.set(sourceRow.path, node);
    idMapRows.push(idMapRow(
      parserId,
      result.status === 'PARSED' ? 'SourceFile' : 'OWNER_DISPOSITION_FILE',
      0,
      sourceRow.byteLength,
      0,
      node,
      sourceRow,
    ));
  }

  const admittedDeclarations = declarations;
  const byKey = new Map(admittedDeclarations.map((row) => [row.key, row]));
  if (byKey.size !== admittedDeclarations.length) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  const frameByKey = new Map();
  const baseFrameByKey = new Map();
  const siblingGroups = new Map();
  for (const row of admittedDeclarations) {
    const groupKey = `${row.path}\u0000${row.parentKey ?? ''}\u0000${row.kind}\u0000${row.name ?? ''}`;
    const group = siblingGroups.get(groupKey) ?? [];
    group.push(row); siblingGroups.set(groupKey, group);
  }
  for (const group of siblingGroups.values()) group.sort((left, right) => left.startByte - right.startByte || left.endByte - right.endByte || left.preorderOrdinal - right.preorderOrdinal);
  const foldedFrameGroups = new Map();
  for (const row of admittedDeclarations) {
    const groupKey = `${row.path}\u0000${row.parentKey ?? ''}\u0000${row.kind}\u0000${row.name ?? ''}`;
    const siblings = siblingGroups.get(groupKey);
    let baseFrame;
    if (row.name === null) baseFrame = `${row.kind}!A!${siblings.indexOf(row)}`;
    else if (siblings.length === 1) baseFrame = `${row.kind}!N!${escapeName(row.name)}`;
    else baseFrame = `${row.kind}!O!${escapeName(row.name)}!${siblings.indexOf(row)}`;
    baseFrameByKey.set(row.key, baseFrame);
    const foldedKey = `${row.path}\u0000${row.parentKey ?? ''}\u0000${baseFrame.toLowerCase()}`;
    const foldedGroup = foldedFrameGroups.get(foldedKey) ?? [];
    foldedGroup.push(row);
    foldedFrameGroups.set(foldedKey, foldedGroup);
  }
  for (const group of foldedFrameGroups.values()) group.sort((left, right) => left.startByte - right.startByte || left.endByte - right.endByte || left.preorderOrdinal - right.preorderOrdinal);
  const buildFrame = (row) => {
    const retained = frameByKey.get(row.key);
    if (retained) return retained;
    const chain = [];
    let current = row;
    while (current !== null && !frameByKey.has(current.key)) {
      chain.push(current);
      current = current.parentKey === null ? null : byKey.get(current.parentKey);
      if (current === undefined) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    }
    let qualified = current === null ? null : frameByKey.get(current.key);
    while (chain.length > 0) {
      const member = chain.pop();
      const baseFrame = baseFrameByKey.get(member.key);
      const foldedKey = `${member.path}\u0000${member.parentKey ?? ''}\u0000${baseFrame.toLowerCase()}`;
      const foldedGroup = foldedFrameGroups.get(foldedKey);
      const frame = foldedGroup.length === 1 ? baseFrame : `${baseFrame}!C!${foldedGroup.indexOf(member)}`;
      qualified = qualified === null ? frame : `${qualified}/${frame}`;
      frameByKey.set(member.key, qualified);
    }
    return frameByKey.get(row.key);
  };
  const nodeByNativeKey = new Map();
  for (const row of admittedDeclarations) {
    if (!NODE_KINDS.has(row.kind) || !sourceByPath.has(row.path)) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    const locator = `${row.path}#${buildFrame(row)}`;
    const sourceRow = sourceByPath.get(row.path);
    if (row.startByte < 0 || row.endByte <= row.startByte || row.endByte > sourceRow.byteLength) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    const node = { id: nodeId(repositoryId, row.kind, locator), kind: row.kind, locator, digest: sourceRow.rawSha256 };
    nodes.push(node); nodeByNativeKey.set(row.key, node);
    idMapRows.push(idMapRow(parserId, row.parserNodeKind, row.startByte, row.endByte, row.preorderOrdinal, node, sourceRow));
  }
  if (nodes.length > SOURCE_ORIGIN_LIMITS.nodes) refuse('SOURCE_ORIGIN_LIMIT');
  nodes.sort((left, right) => compareCodeUnits(left.id, right.id));
  const nodeIds = new Set();
  const foldedLocators = new Set();
  for (const node of nodes) {
    if (nodeIds.has(node.id) || foldedLocators.has(node.locator.toLowerCase())) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    nodeIds.add(node.id); foldedLocators.add(node.locator.toLowerCase());
  }
  idMapRows.sort(compareIdMapRows);
  if (new Set(idMapRows.map((row) => row.rowDigest)).size !== idMapRows.length) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  const idMapDigest = sha256Canonical('galerina.logic-aig-id-map.v1', idMapRows);

  const edges = [];
  const unresolved = [];
  for (const relation of relations) {
    const sourceRow = sourceByPath.get(relation.path);
    const sourceNode = relation.ownerNativeKey === null ? fileNodeByPath.get(relation.path) : nodeByNativeKey.get(relation.ownerNativeKey);
    if (!sourceRow || !sourceNode || !RELATIONSHIP_KINDS.has(relation.relationshipClass) || relation.relationshipClass === 'TEST' || relation.relationshipClass === 'GENERATED_CONSUMER') refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    if (!Number.isSafeInteger(relation.startByte) || !Number.isSafeInteger(relation.endByte) || relation.startByte < 0 || relation.endByte <= relation.startByte || relation.endByte > sourceRow.byteLength) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
    let candidateNodes = relation.targetNativeKeys.map((key) => nodeByNativeKey.get(key)).filter(Boolean);
    candidateNodes.push(...relation.targetPaths.map((locator) => fileNodeByPath.get(locator)).filter(Boolean));
    candidateNodes = [...new Map(candidateNodes.map((node) => [node.id, node])).values()].sort((left, right) => compareCodeUnits(left.id, right.id));
    if (relation.targetState === 'RESOLVED' && candidateNodes.length === 1) {
      const targetNode = candidateNodes[0];
      const evidence = {
        kind: 'SOURCE_SYNTAX',
        sourceBlobOid: sourceRow.blobOid,
        sourceRawSha256: sourceRow.rawSha256,
        startByte: relation.startByte,
        endByte: relation.endByte,
      };
      addEdge(edges, evidence, relation.relationshipClass, sourceNode.id, targetNode.id);
      if (isTestPath(relation.path, resolutionPolicy) && !isTestPath(sourcePathFromLocator(targetNode.locator), resolutionPolicy)) addEdge(edges, evidence, 'TEST', sourceNode.id, targetNode.id);
    } else {
      addUnresolved(unresolved, parserPolicy, relation, sourceNode, sourceRow, candidateNodes.map((node) => node.id));
    }
  }
  if (edges.length > SOURCE_ORIGIN_LIMITS.edges || unresolved.length > SOURCE_ORIGIN_LIMITS.unresolvedRows) refuse('SOURCE_ORIGIN_LIMIT');
  edges.sort((left, right) => compareCodeUnits(left.id, right.id));
  unresolved.sort((left, right) => {
    for (const field of ['sourceNodeId','relationshipClass','reasonCode','sourceLocator','evidenceDigest']) {
      const compared = compareCodeUnits(left[field], right[field]);
      if (compared !== 0) return compared;
    }
    return 0;
  });
  if (new Set(edges.map((row) => row.id)).size !== edges.length || new Set(unresolved.map((row) => row.evidenceDigest)).size !== unresolved.length) refuse('SOURCE_ORIGIN_HOST_SEMANTIC');
  return { nodes, edges, unresolved, idMapRows, idMapDigest };
}

function validateChildSemantic(value, sourceRows, parserPolicy) {
  exactObject(value, ['declarations','relations','diagnostics'], 'SOURCE_ORIGIN_HOST_CHILD');
  exactArray(value.declarations, 'SOURCE_ORIGIN_HOST_CHILD');
  exactArray(value.relations, 'SOURCE_ORIGIN_HOST_CHILD');
  exactArray(value.diagnostics, 'SOURCE_ORIGIN_HOST_CHILD');
  const diagnostics = new Map();
  for (const row of value.diagnostics) {
    exactObject(row, ['path','diagnostics'], 'SOURCE_ORIGIN_HOST_CHILD');
    if (diagnostics.has(row.path)) refuse('SOURCE_ORIGIN_HOST_CHILD');
    diagnostics.set(row.path, mappedDiagnostics(row.diagnostics, parserPolicy));
  }
  const parseResults = sourceRows.map((row) => {
    const codes = diagnostics.get(row.path);
    if (!codes) refuse('SOURCE_ORIGIN_HOST_CHILD');
    return { path: row.path, status: codes.length === 0 ? 'PARSED' : 'REFUSED', diagnosticCodes: codes };
  });
  return { declarations: value.declarations, relations: value.relations, parseResults };
}

function captureOptions(options) {
  exactObject(options, HOST_OPTION_KEYS);
  const repositoryIdentity = validateRepositoryIdentity(options.repositoryIdentity);
  const sourcePolicy = validateSourcePolicy(options.sourcePolicy);
  const resolutionPolicy = validateResolutionPolicy(options.resolutionPolicy);
  const parserPolicy = validateParserPolicy(options.parserPolicy);
  const pins = validateToolchainPins(options.pins);
  const sourceManifest = validateSourceManifest(options.sourceManifest, { repositoryIdentity, sourcePolicy });
  const resolutionInputs = validateResolutionInputs(options.resolutionInputs, { repositoryIdentity, resolutionPolicy });
  if (
    resolutionInputs.repositoryId !== sourceManifest.repositoryId
    || resolutionInputs.expectedHead !== sourceManifest.expectedHead
    || resolutionInputs.expectedTree !== sourceManifest.expectedTree
  ) refuse('SOURCE_ORIGIN_HOST_SCHEMA');
  const sourceBlobs = admitFrozenBlobSet(sourceManifest.rows, options.sourceBlobs, { label: 'SOURCE_MANIFEST' });
  const resolutionBlobs = admitFrozenBlobSet(resolutionInputs.rows, options.resolutionBlobs, { label: 'RESOLUTION_INPUTS' });
  const prepared = prepareSemanticToolchain({
    pins,
    platform: options.platform,
    arch: options.arch,
    nodeIdentity: options.nodeIdentity,
    gitIdentity: options.gitIdentity,
  });
  const selection = prepared.selections.find((row) => row.domain === 'HOST');
  if (!selection || selection.entry.locator !== 'lib/typescript.js') refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  const entryJoined = `${selection.entry.rootLocator}/${selection.entry.locator}`;
  const entryRow = selection.moduleRows.find((row) => row.locator === selection.entry.locator);
  if (!entryRow) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  let toolchainBlobs;
  try {
    toolchainBlobs = admitFrozenBlobSet([
      { path: entryJoined, byteLength: entryRow.byteLength, rawSha256: entryRow.rawSha256 },
    ], options.toolchainBlobs, { label: 'SOURCE_MANIFEST' });
  } catch {
    refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  }
  return { repositoryIdentity, sourcePolicy, resolutionPolicy, parserPolicy, pins, sourceManifest, sourceBlobs, resolutionInputs, resolutionBlobs, prepared, selection, toolchainBlobs, entryJoined };
}

export async function decodeHostProject(options) {
  const captured = captureOptions(options);
  await authenticateNodeExecutable(captured.prepared.nodeIdentity);
  const sourceRows = captured.sourceManifest.rows.filter((row) => classifySourcePath(row.path, captured.sourcePolicy) === 'HOST');
  const sourceEntries = sourceRows.map((row) => {
    const bytes = captured.sourceBlobs.get(row.path);
    if (!bytes) refuse('SOURCE_ORIGIN_HOST_SOURCE');
    return [row.path, bytes];
  });
  const sources = sourceEntries.map(([locator, bytes]) => ({ path: locator, text: decodeUtf8(bytes) }));
  const entryBytes = captured.toolchainBlobs.get(captured.entryJoined);
  if (!entryBytes) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  const replay = await runHostChild(captured.selection, entryBytes, sources);
  const semantic = validateChildSemantic(replay.semantic, sourceRows, captured.parserPolicy);
  const rows = buildSemanticRows({
    repositoryId: captured.sourceManifest.repositoryId,
    parserId: captured.selection.parserId,
    sourceRows,
    parseResults: semantic.parseResults,
    declarations: semantic.declarations,
    relations: semantic.relations,
    parserPolicy: captured.parserPolicy,
    resolutionPolicy: captured.resolutionPolicy,
  });
  const actualRuntimeLoadSet = {
    id: 'HOST',
    moduleRows: captured.selection.moduleRows,
    builtinModules: captured.selection.builtinModules,
  };
  if (
    canonicalJsonText(replay.moduleLocators) !== canonicalJsonText(actualRuntimeLoadSet.moduleRows.map((row) => row.locator))
    || canonicalJsonText(replay.builtinModules) !== canonicalJsonText(actualRuntimeLoadSet.builtinModules)
  ) refuse('SOURCE_ORIGIN_HOST_TOOLCHAIN');
  return deepFreeze({
    nodes: rows.nodes,
    edges: rows.edges,
    unresolved: rows.unresolved,
    parseOutcomes: [],
    parseResults: semantic.parseResults,
    idMapRows: rows.idMapRows,
    idMapDigest: rows.idMapDigest,
    toolchain: captured.selection,
    actualRuntimeLoadSet,
    authorizing: false,
  });
}
