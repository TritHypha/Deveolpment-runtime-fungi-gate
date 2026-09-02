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
import { buildSemanticRows } from './host-decoder.mjs';
import { prepareSemanticToolchain } from './toolchain-snapshot.mjs';

const OPTION_KEYS = Object.freeze([
  'repositoryIdentity', 'sourcePolicy', 'resolutionPolicy', 'parserPolicy',
  'pins', 'sourceManifest', 'sourceBlobs', 'resolutionInputs',
  'resolutionBlobs', 'toolchainBlobs', 'platform', 'arch', 'nodeIdentity',
  'gitIdentity',
]);
const PARSER_SOURCE_LOCATORS = Object.freeze([
  'src/gate-v3-parser.ts',
  'src/lexer.ts',
  'src/parser.ts',
  'src/requirement-diagnostics.ts',
  'src/source-origin-parser-entry.ts',
]);
const PARSER_OUTPUT_LOCATORS = Object.freeze([
  'gate-v3-parser.js',
  'lexer.js',
  'parser.js',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.js',
]);
const NODE_KINDS = new Set([
  'CLASS', 'FILE', 'FLOW', 'FUNCTION', 'GATE', 'INTERFACE', 'METHOD',
  'MODULE', 'ROUTE', 'SYMBOL', 'TYPE',
]);
const RELATIONSHIP_KINDS = new Set(['CALLER', 'CONTRACT', 'IMPORT']);

class FungiDecoderRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'FungiDecoderRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new FungiDecoderRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code = 'SOURCE_ORIGIN_FUNGI_SCHEMA') {
  if (isProxy(value) || value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  const sorted = names.sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (sorted.length !== expected.length || sorted.some((name, index) => name !== expected[index])) refuse(code);
}

function exactArray(value, code = 'SOURCE_ORIGIN_FUNGI_SCHEMA') {
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

function decodeUtf8(bytes, code = 'SOURCE_ORIGIN_FUNGI_SOURCE') {
  if (isProxy(bytes) || !Buffer.isBuffer(bytes) || Object.getPrototypeOf(bytes) !== Buffer.prototype || bytes.buffer instanceof SharedArrayBuffer) refuse(code);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
}

async function authenticateNodeExecutable(nodeIdentity) {
  if (process.version !== nodeIdentity.version) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  let details;
  let canonical;
  let bytes;
  try {
    details = await lstat(process.execPath, { bigint: true });
    canonical = await realpath(process.execPath);
    bytes = await readFile(process.execPath);
  } catch {
    refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  }
  const samePath = process.platform === 'win32'
    ? canonical.toLowerCase() === process.execPath.toLowerCase()
    : canonical === process.execPath;
  if (
    details.isSymbolicLink()
    || !details.isFile()
    || !samePath
    || bytes.length !== nodeIdentity.executableByteLength
    || sha256Raw(bytes) !== nodeIdentity.executableRawSha256
  ) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
}

function parserChildMain() {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const path = require('node:path');
  const Module = require('node:module');
  const { fileURLToPath, pathToFileURL } = require('node:url');

  class GuardRefusal extends Error {
    constructor(code) { super(code); this.code = code; }
  }
  const fail = (code) => { throw new GuardRefusal(code); };
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  const samePath = (left, right) => process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
  let config;
  try { config = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exitCode = 2; return; }
  const hostRoot = path.resolve(config.hostRoot);
  const parserRoot = path.resolve(config.parserRoot);
  const hostEntry = path.resolve(hostRoot, ...config.hostEntryLocator.split('/'));
  const hostRows = new Map(config.hostRows.map((row) => [row.locator, row]));
  const parserRows = new Map(config.parserRows.map((row) => [row.locator, row]));
  const hostBuiltins = new Set(config.hostBuiltins);
  const loadedHostModules = new Set();
  const loadedHostBuiltins = new Set();
  const loadedParserModules = new Set();
  const canonicalBuiltin = new Map();
  for (const name of Module.builtinModules) {
    const canonical = name.startsWith('node:') ? name : `node:${name}`;
    canonicalBuiltin.set(name, canonical);
    canonicalBuiltin.set(canonical, canonical);
  }
  const hostLocatorFor = (filename) => {
    const absolute = path.resolve(filename);
    const relative = path.relative(hostRoot, absolute);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('LOAD');
    return relative.split(path.sep).join('/');
  };
  const readHostExact = (filename) => {
    const locator = hostLocatorFor(filename);
    const expected = hostRows.get(locator);
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
    loadedHostModules.add(locator);
    return bytes;
  };
  const originalLoad = Module._load;
  Module._load = function guardedLoad(request, parent, isMain) {
    if (typeof request !== 'string') fail('LOAD');
    const builtin = canonicalBuiltin.get(request);
    if (builtin) {
      if (!hostBuiltins.has(builtin)) fail('LOAD');
      loadedHostBuiltins.add(builtin);
      return originalLoad.call(this, request, parent, isMain);
    }
    if (!path.isAbsolute(request) || parent !== null || !isMain || !samePath(path.resolve(request), hostEntry)) fail('LOAD');
    return originalLoad.call(this, hostEntry, parent, isMain);
  };
  Module._extensions['.js'] = function guardedJavaScript(module, filename) {
    const bytes = readHostExact(filename);
    module._compile(new TextDecoder('utf-8', { fatal: true }).decode(bytes), filename);
  };
  process.chdir = () => fail('LOAD');

  const byteSpan = (text, location) => {
    if (!location || typeof location !== 'object') fail('SEMANTIC');
    const start = location.offset;
    const end = location.endOffset;
    if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(end) || end <= start || end > Buffer.byteLength(text, 'utf8')) fail('SEMANTIC');
    return { startByte: start, endByte: end };
  };
  const lineStarts = (text) => {
    const rows = [0];
    for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') rows.push(index + 1);
    return rows;
  };
  const gateSpan = (text, starts, location) => {
    if (!location || !Number.isSafeInteger(location.line) || !Number.isSafeInteger(location.column)) fail('SEMANTIC');
    const lineIndex = location.line - 1;
    if (lineIndex < 0 || lineIndex >= starts.length) fail('SEMANTIC');
    const endLineIndex = Number.isSafeInteger(location.endLine) ? location.endLine - 1 : lineIndex;
    if (endLineIndex < lineIndex || endLineIndex >= starts.length) fail('SEMANTIC');
    const startCharacter = starts[lineIndex] + location.column - 1;
    const endColumn = Number.isSafeInteger(location.endColumn) ? location.endColumn : location.column;
    const endCharacter = starts[endLineIndex] + Math.max(endColumn, location.column);
    const startByte = Buffer.byteLength(text.slice(0, startCharacter), 'utf8');
    const endByte = Buffer.byteLength(text.slice(0, Math.min(text.length, Math.max(startCharacter + 1, endCharacter))), 'utf8');
    if (startByte < 0 || endByte <= startByte || endByte > Buffer.byteLength(text, 'utf8')) fail('SEMANTIC');
    return { startByte, endByte };
  };
  const fungiDeclarationKinds = new Map([
    ['flowDecl', 'FLOW'], ['secureFlowDecl', 'FLOW'], ['pureFlowDecl', 'FLOW'],
    ['guardedFlowDecl', 'FLOW'], ['governedFlowDecl', 'FLOW'], ['fnDecl', 'FUNCTION'],
    ['typeDecl', 'TYPE'], ['recordDecl', 'TYPE'], ['enumDecl', 'TYPE'],
    ['hallmarkDecl', 'TYPE'], ['bitfieldDecl', 'TYPE'], ['resourceDecl', 'TYPE'],
    ['vaultDecl', 'TYPE'], ['contractDecl', 'TYPE'], ['contractSetDecl', 'TYPE'],
    ['apiDecl', 'INTERFACE'], ['routeDecl', 'ROUTE'], ['gateDecl', 'GATE'],
    ['guardDecl', 'GATE'], ['governanceDecl', 'MODULE'], ['authorityDecl', 'MODULE'],
    ['policyDecl', 'MODULE'], ['intentDecl', 'SYMBOL'], ['staticDecl', 'SYMBOL'],
  ]);
  const normalizeFungi = (namespace, source) => {
    const parsed = namespace.parseProgram(source.text, source.path);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.diagnostics) || !Array.isArray(parsed.flows)) fail('PARSER');
    const diagnosticCodes = [...new Set(parsed.diagnostics
      .filter((row) => row && row.severity === 'error')
      .map((row) => {
        if (typeof row.code !== 'string' || !(new RegExp(config.diagnosticCodePattern, 'u')).test(row.code)) fail('PARSER');
        return row.code;
      }))].sort(compare);
    const parseResult = { path: source.path, status: diagnosticCodes.length === 0 ? 'PARSED' : 'REFUSED', diagnosticCodes };
    const declarations = [];
    const relations = [];
    if (parseResult.status === 'REFUSED') return { declarations, relations, parseResult };
    if (!parsed.ast || parsed.ast.kind !== 'program') fail('PARSER');
    const declarationStack = [];
    const declarationByName = new Map();
    const pendingRelations = [];
    let ordinal = 0;
    const visit = (node) => {
      if (!node || typeof node !== 'object' || typeof node.kind !== 'string') fail('SEMANTIC');
      const currentOrdinal = ordinal++;
      const semanticKind = fungiDeclarationKinds.get(node.kind) ?? null;
      let key = null;
      if (semanticKind !== null) {
        const span = byteSpan(source.text, node.location);
        const name = typeof node.value === 'string' && node.value.length > 0 ? node.value : null;
        key = `${source.path}\u0000${currentOrdinal}`;
        declarations.push({
          key,
          path: source.path,
          parentKey: declarationStack.at(-1) ?? null,
          kind: semanticKind,
          name,
          parserNodeKind: node.kind,
          ...span,
          preorderOrdinal: currentOrdinal,
        });
        if (name !== null) {
          const rows = declarationByName.get(name) ?? [];
          rows.push(key); declarationByName.set(name, rows);
        }
        declarationStack.push(key);
      }
      const ownerNativeKey = declarationStack.at(-1) ?? null;
      if (node.kind === 'callExpr') {
        const span = byteSpan(source.text, node.location);
        pendingRelations.push({ relationshipClass: 'CALLER', ownerNativeKey, name: typeof node.value === 'string' ? node.value : null, dynamic: node.callStyle === 'method', ...span });
      } else if (node.kind === 'typeRef') {
        const span = byteSpan(source.text, node.location);
        pendingRelations.push({ relationshipClass: 'CONTRACT', ownerNativeKey, name: typeof node.value === 'string' ? node.value : null, dynamic: false, ...span });
      } else if (node.kind === 'importDecl') {
        const span = byteSpan(source.text, node.location);
        pendingRelations.push({ relationshipClass: 'IMPORT', ownerNativeKey, name: typeof node.value === 'string' ? node.value : null, dynamic: false, ...span });
      }
      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) fail('SEMANTIC');
        for (const child of node.children) visit(child);
      }
      if (key !== null) declarationStack.pop();
    };
    visit(parsed.ast);
    const sourcePaths = new Set(config.sources.map((row) => row.path));
    const resolveImport = (specifier) => {
      if (typeof specifier !== 'string' || (!specifier.startsWith('./') && !specifier.startsWith('../'))) return { state: 'OUTSIDE', paths: [] };
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(source.path), specifier));
      if (base === '..' || base.startsWith('../') || base.startsWith('/')) return { state: 'MISSING', paths: [] };
      const candidates = [];
      const add = (candidate) => { if (sourcePaths.has(candidate) && !candidates.includes(candidate)) candidates.push(candidate); };
      add(base); add(`${base}.fungi`); add(`${base}/index.fungi`);
      candidates.sort(compare);
      return candidates.length === 1 ? { state: 'RESOLVED', paths: candidates }
        : candidates.length > 1 ? { state: 'AMBIGUOUS', paths: candidates }
          : { state: 'MISSING', paths: [] };
    };
    for (const relation of pendingRelations) {
      let targetNativeKeys = [];
      let targetPaths = [];
      let targetState;
      if (relation.relationshipClass === 'IMPORT') {
        const resolution = resolveImport(relation.name);
        targetPaths = resolution.paths; targetState = resolution.state;
      } else if (relation.dynamic || relation.name === null) {
        targetState = 'DYNAMIC';
      } else {
        targetNativeKeys = [...(declarationByName.get(relation.name) ?? [])].sort(compare);
        targetState = targetNativeKeys.length === 1 ? 'RESOLVED' : targetNativeKeys.length > 1 ? 'AMBIGUOUS' : 'MISSING';
      }
      relations.push({
        path: source.path,
        ownerNativeKey: relation.ownerNativeKey,
        relationshipClass: relation.relationshipClass,
        startByte: relation.startByte,
        endByte: relation.endByte,
        targetNativeKeys,
        targetPaths,
        targetState,
      });
    }
    return { declarations, relations, parseResult };
  };
  const normalizeGate = (namespace, source) => {
    const parsed = namespace.parseGateV3(source.text, source.path);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.ok !== 'boolean' || !Array.isArray(parsed.diagnostics)) fail('PARSER');
    const diagnosticCodes = [...new Set(parsed.diagnostics.map((row) => {
      if (!row || typeof row.code !== 'string' || !(new RegExp(config.diagnosticCodePattern, 'u')).test(row.code)) fail('PARSER');
      return row.code;
    }))].sort(compare);
    const parseResult = { path: source.path, status: parsed.ok ? 'PARSED' : 'REFUSED', diagnosticCodes };
    const declarations = [];
    const relations = [];
    if (!parsed.ok) {
      if (diagnosticCodes.length === 0 || Object.prototype.hasOwnProperty.call(parsed, 'circuit')) fail('PARSER');
      return { declarations, relations, parseResult };
    }
    if (diagnosticCodes.length !== 0 || !parsed.circuit || typeof parsed.circuit.name !== 'string') fail('PARSER');
    const starts = lineStarts(source.text);
    let ordinal = 1;
    const circuitSpan = gateSpan(source.text, starts, parsed.circuit.location);
    const gateKey = `${source.path}\u00000`;
    declarations.push({ key: gateKey, path: source.path, parentKey: null, kind: 'GATE', name: parsed.circuit.name, parserNodeKind: 'GateV3Circuit', ...circuitSpan, preorderOrdinal: 0 });
    const partByName = new Map();
    for (const part of parsed.circuit.parts) {
      if (!part || typeof part.instance !== 'string' || typeof part.component !== 'string') fail('SEMANTIC');
      const span = gateSpan(source.text, starts, part.location);
      const key = `${source.path}\u0000${ordinal}`;
      declarations.push({ key, path: source.path, parentKey: gateKey, kind: 'SYMBOL', name: part.instance, parserNodeKind: 'GateV3Part', ...span, preorderOrdinal: ordinal++ });
      if (partByName.has(part.instance)) fail('SEMANTIC');
      partByName.set(part.instance, key);
      relations.push({ path: source.path, ownerNativeKey: key, relationshipClass: 'CONTRACT', ...span, targetNativeKeys: [], targetPaths: [], targetState: 'OUTSIDE' });
    }
    for (const wire of parsed.circuit.wires) {
      if (!wire || !wire.from || !wire.to || typeof wire.from.node !== 'string' || typeof wire.to.node !== 'string') fail('SEMANTIC');
      const span = gateSpan(source.text, starts, wire.location);
      const sourceKey = partByName.get(wire.from.node) ?? gateKey;
      const targetKey = partByName.get(wire.to.node);
      relations.push({
        path: source.path,
        ownerNativeKey: sourceKey,
        relationshipClass: 'CALLER',
        ...span,
        targetNativeKeys: targetKey === undefined ? [] : [targetKey],
        targetPaths: [],
        targetState: targetKey === undefined ? 'OUTSIDE' : 'RESOLVED',
      });
    }
    return { declarations, relations, parseResult };
  };

  (async () => {
    try {
      if (!samePath(process.cwd(), config.root)) fail('LOAD');
      const ts = Module._load(hostEntry, null, true);
      if (typeof ts?.transpileModule !== 'function') fail('HOST');
      const outputs = new Map();
      const outputBySource = new Map(config.outputBySource.map((row) => [row.sourceLocator, row.outputLocator]));
      for (const source of config.parserSources) {
        const outputLocator = outputBySource.get(source.locator);
        if (!outputLocator || outputs.has(outputLocator)) fail('COMPILE');
        const transpiled = ts.transpileModule(source.text, {
          fileName: source.locator,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            strict: true,
            noUncheckedIndexedAccess: true,
            exactOptionalPropertyTypes: true,
            declaration: true,
            skipLibCheck: true,
          },
        });
        if (!transpiled || typeof transpiled.outputText !== 'string') fail('COMPILE');
        const bytes = Buffer.from(transpiled.outputText, 'utf8');
        const expected = parserRows.get(outputLocator);
        if (!expected || bytes.length !== expected.byteLength || hash(bytes) !== expected.rawSha256) fail('COMPILE');
        outputs.set(outputLocator, bytes);
      }
      const hostModuleLocators = [...loadedHostModules].sort(compare);
      const hostBuiltinModules = [...loadedHostBuiltins].sort(compare);
      if (
        JSON.stringify(hostModuleLocators) !== JSON.stringify([...hostRows.keys()].sort(compare))
        || JSON.stringify(hostBuiltinModules) !== JSON.stringify([...hostBuiltins].sort(compare))
      ) fail('LOAD');
      if (outputs.size !== parserRows.size) fail('COMPILE');
      fs.mkdirSync(parserRoot, { recursive: true });
      for (const [locator, bytes] of [...outputs].sort(([left], [right]) => compare(left, right))) {
        const filename = path.resolve(parserRoot, ...locator.split('/'));
        if (!samePath(path.dirname(filename), parserRoot)) fail('LOAD');
        fs.writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 });
      }
      const edgeMap = new Map();
      for (const edge of config.emittedEdges) {
        const key = `${edge.fromLocator}\u0000${edge.specifier}`;
        if (edgeMap.has(key)) fail('LOAD');
        edgeMap.set(key, edge.toLocator);
      }
      const entryUrl = pathToFileURL(path.resolve(parserRoot, ...config.parserEntryLocator.split('/'))).href;
      const parserLocatorFromUrl = (url) => {
        let filename;
        try { filename = fileURLToPath(url); } catch { fail('LOAD'); }
        const relative = path.relative(parserRoot, path.resolve(filename));
        if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('LOAD');
        return relative.split(path.sep).join('/');
      };
      if (typeof Module.registerHooks !== 'function') fail('LOAD');
      Module.registerHooks({
        resolve(specifier, context) {
          if (specifier === entryUrl) return { url: entryUrl, shortCircuit: true };
          if (typeof specifier !== 'string' || typeof context.parentURL !== 'string') fail('LOAD');
          const parentLocator = parserLocatorFromUrl(context.parentURL);
          const targetLocator = edgeMap.get(`${parentLocator}\u0000${specifier}`);
          if (!targetLocator) fail('LOAD');
          return { url: pathToFileURL(path.resolve(parserRoot, ...targetLocator.split('/'))).href, shortCircuit: true };
        },
        load(url) {
          const locator = parserLocatorFromUrl(url);
          const expected = parserRows.get(locator);
          if (!expected) fail('LOAD');
          const filename = path.resolve(parserRoot, ...locator.split('/'));
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
            || !samePath(canonical, filename)
            || bytes.length !== expected.byteLength
            || hash(bytes) !== expected.rawSha256
          ) fail('LOAD');
          loadedParserModules.add(locator);
          return { format: 'module', source: bytes, shortCircuit: true };
        },
      });
      const namespace = await import(entryUrl);
      const parserExportNames = Object.keys(namespace).sort(compare);
      if (JSON.stringify(parserExportNames) !== JSON.stringify(config.parserExportNames)) fail('EXPORT');
      for (const name of parserExportNames) if (typeof namespace[name] !== 'function') fail('EXPORT');
      const fungi = { declarations: [], relations: [], parseResults: [] };
      const gate = { declarations: [], relations: [], parseResults: [] };
      for (const source of config.sources) {
        const normalized = source.domain === 'FUNGI'
          ? normalizeFungi(namespace, source)
          : source.domain === 'GATE'
            ? normalizeGate(namespace, source)
            : fail('CHILD');
        const target = source.domain === 'FUNGI' ? fungi : gate;
        target.declarations.push(...normalized.declarations);
        target.relations.push(...normalized.relations);
        target.parseResults.push(normalized.parseResult);
      }
      const parserModuleLocators = [...loadedParserModules].sort(compare);
      if (JSON.stringify(parserModuleLocators) !== JSON.stringify([...parserRows.keys()].sort(compare))) fail('LOAD');
      process.stdout.write(JSON.stringify({
        hostModuleLocators,
        hostBuiltinModules,
        parserModuleLocators,
        parserBuiltinModules: [],
        parserExportNames,
        semantic: { fungi, gate },
      }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ refusal: error instanceof GuardRefusal ? error.code : 'CHILD' }));
      process.exitCode = 2;
    }
  })();
}

const PARSER_CHILD_SOURCE = `(${parserChildMain.toString()})()`;

function childEnvironment() {
  const environment = { NODE_DISABLE_COMPILE_CACHE: '1' };
  if (process.platform === 'win32' && typeof process.env.SystemRoot === 'string') environment.SystemRoot = process.env.SystemRoot;
  return environment;
}

async function runParserChild(captured, sourceRows) {
  let root;
  let result;
  let failure;
  try {
    root = await mkdtemp(path.join(tmpdir(), 'galerina-source-origin-parser-'));
    const hostRoot = path.join(root, 'host');
    const parserRoot = path.join(root, 'parser');
    const hostEntryPath = path.join(hostRoot, ...captured.hostSelection.entry.locator.split('/'));
    await mkdir(path.dirname(hostEntryPath), { recursive: true });
    const hostEntryJoined = `${captured.hostSelection.entry.rootLocator}/${captured.hostSelection.entry.locator}`;
    const hostEntryBytes = captured.toolchainBlobs.get(hostEntryJoined);
    if (!hostEntryBytes) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
    await writeFile(hostEntryPath, hostEntryBytes, { flag: 'wx', mode: 0o600 });
    const readback = await readFile(hostEntryPath);
    const hostEntryRow = captured.hostSelection.moduleRows.find((row) => row.locator === captured.hostSelection.entry.locator);
    if (!hostEntryRow || readback.length !== hostEntryRow.byteLength || sha256Raw(readback) !== hostEntryRow.rawSha256) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
    const parserSources = PARSER_SOURCE_LOCATORS.map((locator) => {
      const joined = `${captured.parserSourceRoot}/${locator}`;
      const bytes = captured.toolchainBlobs.get(joined);
      if (!bytes) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
      return { locator, text: decodeUtf8(bytes, 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN') };
    });
    const sources = sourceRows.map((row) => {
      const bytes = captured.sourceBlobs.get(row.path);
      if (!bytes) refuse('SOURCE_ORIGIN_FUNGI_SOURCE');
      return { path: row.path, domain: classifySourcePath(row.path, captured.sourcePolicy), text: decodeUtf8(bytes) };
    });
    const record = captured.pins.records.find((row) => row.recordId === captured.prepared.recordId);
    if (!record) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
    const config = {
      root,
      hostRoot,
      parserRoot,
      hostEntryLocator: captured.hostSelection.entry.locator,
      hostRows: captured.hostSelection.moduleRows,
      hostBuiltins: captured.hostSelection.builtinModules,
      parserRows: captured.parserRuntime.moduleRows,
      parserEntryLocator: captured.parserRuntime.entry.locator,
      parserExportNames: captured.fungiSelection.parserExportNames,
      parserSources,
      outputBySource: PARSER_SOURCE_LOCATORS.map((sourceLocator, index) => ({ sourceLocator, outputLocator: PARSER_OUTPUT_LOCATORS[index] })),
      emittedEdges: record.sourceOriginParser.emittedEdgeRows,
      diagnosticCodePattern: captured.parserPolicy.diagnosticCodePattern,
      sources,
    };
    const input = canonicalJsonText(config);
    if (Buffer.byteLength(input, 'utf8') > SOURCE_ORIGIN_LIMITS.jsonBytes) refuse('SOURCE_ORIGIN_LIMIT');
    result = spawnSync(process.execPath, ['--no-warnings', '--input-type=commonjs', '--eval', PARSER_CHILD_SOURCE], {
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
    try { await rm(root, { recursive: true, force: true }); } catch { refuse('SOURCE_ORIGIN_FUNGI_CLEANUP'); }
  }
  if (failure) {
    if (failure instanceof FungiDecoderRefusal) throw failure;
    refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  }
  if (result.error || result.signal !== null || result.stderr !== '' || result.status !== 0 || Buffer.byteLength(result.stdout, 'utf8') > SOURCE_ORIGIN_LIMITS.processOutputBytes) {
    let parsedRefusal;
    try { parsedRefusal = JSON.parse(result.stdout); } catch { /* no child artifact */ }
    if (parsedRefusal?.refusal === 'COMPILE' || parsedRefusal?.refusal === 'LOAD' || parsedRefusal?.refusal === 'EXPORT') refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
    if (typeof parsedRefusal?.refusal === 'string') refuse('SOURCE_ORIGIN_FUNGI_CHILD');
    refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  }
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { refuse('SOURCE_ORIGIN_FUNGI_CHILD'); }
  exactObject(parsed, ['hostModuleLocators','hostBuiltinModules','parserModuleLocators','parserBuiltinModules','parserExportNames','semantic'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  return parsed;
}

function equalData(left, right) {
  return canonicalJsonText(left) === canonicalJsonText(right);
}

function validateTextArray(value, expected, code) {
  exactArray(value, code);
  for (const item of value) if (typeof item !== 'string') refuse(code);
  if (!equalData(value, expected)) refuse(code);
}

function validateParseResult(row, sourcePathSet, parserPolicy) {
  exactObject(row, ['path','status','diagnosticCodes'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  if (!sourcePathSet.has(row.path) || (row.status !== 'PARSED' && row.status !== 'REFUSED')) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(row.diagnosticCodes, 'SOURCE_ORIGIN_FUNGI_CHILD');
  const pattern = new RegExp(parserPolicy.diagnosticCodePattern, 'u');
  let previous;
  for (const code of row.diagnosticCodes) {
    if (typeof code !== 'string' || !pattern.test(code) || (previous !== undefined && compareCodeUnits(previous, code) >= 0)) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
    previous = code;
  }
  if ((row.status === 'PARSED') !== (row.diagnosticCodes.length === 0)) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
}

function validateDeclaration(row, sourcePathSet) {
  exactObject(row, ['key','path','parentKey','kind','name','parserNodeKind','startByte','endByte','preorderOrdinal'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  if (
    typeof row.key !== 'string'
    || !sourcePathSet.has(row.path)
    || (row.parentKey !== null && typeof row.parentKey !== 'string')
    || !NODE_KINDS.has(row.kind)
    || (row.name !== null && typeof row.name !== 'string')
    || typeof row.parserNodeKind !== 'string'
    || !Number.isSafeInteger(row.startByte)
    || !Number.isSafeInteger(row.endByte)
    || row.startByte < 0
    || row.endByte <= row.startByte
    || !Number.isSafeInteger(row.preorderOrdinal)
    || row.preorderOrdinal < 0
  ) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
}

function validateRelation(row, sourcePathSet) {
  exactObject(row, ['path','ownerNativeKey','relationshipClass','startByte','endByte','targetNativeKeys','targetPaths','targetState'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  if (
    !sourcePathSet.has(row.path)
    || (row.ownerNativeKey !== null && typeof row.ownerNativeKey !== 'string')
    || !RELATIONSHIP_KINDS.has(row.relationshipClass)
    || !Number.isSafeInteger(row.startByte)
    || !Number.isSafeInteger(row.endByte)
    || row.startByte < 0
    || row.endByte <= row.startByte
    || !['AMBIGUOUS','DYNAMIC','MISSING','OUTSIDE','RESOLVED'].includes(row.targetState)
  ) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(row.targetNativeKeys, 'SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(row.targetPaths, 'SOURCE_ORIGIN_FUNGI_CHILD');
  for (const key of row.targetNativeKeys) if (typeof key !== 'string') refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  for (const locator of row.targetPaths) if (typeof locator !== 'string') refuse('SOURCE_ORIGIN_FUNGI_CHILD');
}

function validateDomainSemantic(value, sourceRows, parserPolicy) {
  exactObject(value, ['declarations','relations','parseResults'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(value.declarations, 'SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(value.relations, 'SOURCE_ORIGIN_FUNGI_CHILD');
  exactArray(value.parseResults, 'SOURCE_ORIGIN_FUNGI_CHILD');
  const paths = new Set(sourceRows.map((row) => row.path));
  if (value.parseResults.length !== paths.size) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
  const seen = new Set();
  for (const row of value.parseResults) {
    validateParseResult(row, paths, parserPolicy);
    if (seen.has(row.path)) refuse('SOURCE_ORIGIN_FUNGI_CHILD');
    seen.add(row.path);
  }
  for (const row of value.declarations) validateDeclaration(row, paths);
  for (const row of value.relations) validateRelation(row, paths);
  return value;
}

function captureOptions(options) {
  exactObject(options, OPTION_KEYS);
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
  ) refuse('SOURCE_ORIGIN_FUNGI_SCHEMA');
  const sourceBlobs = admitFrozenBlobSet(sourceManifest.rows, options.sourceBlobs, { label: 'SOURCE_MANIFEST' });
  const resolutionBlobs = admitFrozenBlobSet(resolutionInputs.rows, options.resolutionBlobs, { label: 'RESOLUTION_INPUTS' });
  const prepared = prepareSemanticToolchain({
    pins,
    platform: options.platform,
    arch: options.arch,
    nodeIdentity: options.nodeIdentity,
    gitIdentity: options.gitIdentity,
  });
  const hostSelection = prepared.selections.find((row) => row.domain === 'HOST');
  const fungiSelection = prepared.selections.find((row) => row.domain === 'FUNGI');
  const gateSelection = prepared.selections.find((row) => row.domain === 'GATE');
  if (
    !hostSelection
    || !fungiSelection
    || !gateSelection
    || hostSelection.operation !== 'typescript-compiler-api'
    || fungiSelection.operation !== 'parseProgram'
    || gateSelection.operation !== 'parseGateV3'
    || fungiSelection.runtimeLoadSetId !== 'PARSER'
    || gateSelection.runtimeLoadSetId !== 'PARSER'
    || !equalData(fungiSelection.moduleRows, gateSelection.moduleRows)
    || !equalData(fungiSelection.builtinModules, gateSelection.builtinModules)
    || !equalData(fungiSelection.parserExportNames, ['lex','parseGateV3','parseProgram'])
    || !equalData(gateSelection.parserExportNames, fungiSelection.parserExportNames)
  ) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  const record = pins.records.find((row) => row.recordId === prepared.recordId);
  const parserRuntime = record?.runtimeLoadSets.find((row) => row.id === 'PARSER');
  if (!record || !parserRuntime || !equalData(parserRuntime.moduleRows.map((row) => row.locator), PARSER_OUTPUT_LOCATORS)) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  const parserSourceLocators = [...new Set([
    record.sourceOriginParser.sourceEntry.locator,
    ...record.sourceOriginParser.sourceEdgeRows.flatMap((edge) => [edge.fromLocator, edge.toLocator]),
  ])].sort(compareCodeUnits);
  if (!equalData(parserSourceLocators, PARSER_SOURCE_LOCATORS)) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  const parserSourceRoot = record.sourceOriginParser.sourceEntry.rootLocator;
  const expectedToolchainRows = [];
  const hostEntryJoined = `${hostSelection.entry.rootLocator}/${hostSelection.entry.locator}`;
  const hostEntryRow = hostSelection.moduleRows.find((row) => row.locator === hostSelection.entry.locator);
  if (!hostEntryRow) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  expectedToolchainRows.push({ path: hostEntryJoined, byteLength: hostEntryRow.byteLength, rawSha256: hostEntryRow.rawSha256 });
  for (const locator of PARSER_SOURCE_LOCATORS) {
    const joined = `${parserSourceRoot}/${locator}`;
    const dataRow = record.dataRows.find((row) => row.locator === joined);
    if (!dataRow) refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
    expectedToolchainRows.push({ path: joined, byteLength: dataRow.byteLength, rawSha256: dataRow.rawSha256 });
  }
  expectedToolchainRows.sort((left, right) => compareCodeUnits(left.path, right.path));
  let toolchainBlobs;
  try {
    toolchainBlobs = admitFrozenBlobSet(expectedToolchainRows, options.toolchainBlobs, { label: 'SOURCE_MANIFEST' });
  } catch {
    refuse('SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  }
  return {
    repositoryIdentity, sourcePolicy, resolutionPolicy, parserPolicy, pins,
    sourceManifest, sourceBlobs, resolutionInputs, resolutionBlobs, prepared,
    hostSelection, fungiSelection, gateSelection, parserRuntime,
    parserSourceRoot, toolchainBlobs,
  };
}

function compareIdMapRows(left, right) {
  let compared = compareCodeUnits(left.nodeId, right.nodeId);
  if (compared !== 0) return compared;
  compared = compareCodeUnits(left.nativeIdentity.parserId, right.nativeIdentity.parserId);
  if (compared !== 0) return compared;
  compared = compareCodeUnits(left.nativeIdentity.parserNodeKind, right.nativeIdentity.parserNodeKind);
  if (compared !== 0) return compared;
  for (const field of ['startByte','endByte','preorderOrdinal']) {
    if (left.nativeIdentity[field] !== right.nativeIdentity[field]) return left.nativeIdentity[field] - right.nativeIdentity[field];
  }
  return 0;
}

export async function decodeFungiGateProject(options) {
  const captured = captureOptions(options);
  await authenticateNodeExecutable(captured.prepared.nodeIdentity);
  const sourceRows = captured.sourceManifest.rows.filter((row) => {
    const domain = classifySourcePath(row.path, captured.sourcePolicy);
    return domain === 'FUNGI' || domain === 'GATE';
  });
  const replay = await runParserChild(captured, sourceRows);
  validateTextArray(replay.hostModuleLocators, captured.hostSelection.moduleRows.map((row) => row.locator), 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  validateTextArray(replay.hostBuiltinModules, captured.hostSelection.builtinModules, 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  validateTextArray(replay.parserModuleLocators, captured.parserRuntime.moduleRows.map((row) => row.locator), 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  validateTextArray(replay.parserBuiltinModules, captured.parserRuntime.builtinModules, 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  validateTextArray(replay.parserExportNames, captured.fungiSelection.parserExportNames, 'SOURCE_ORIGIN_FUNGI_TOOLCHAIN');
  exactObject(replay.semantic, ['fungi','gate'], 'SOURCE_ORIGIN_FUNGI_CHILD');
  const fungiRows = sourceRows.filter((row) => classifySourcePath(row.path, captured.sourcePolicy) === 'FUNGI');
  const gateRows = sourceRows.filter((row) => classifySourcePath(row.path, captured.sourcePolicy) === 'GATE');
  const fungiSemantic = validateDomainSemantic(replay.semantic.fungi, fungiRows, captured.parserPolicy);
  const gateSemantic = validateDomainSemantic(replay.semantic.gate, gateRows, captured.parserPolicy);
  let fungiOutput;
  let gateOutput;
  try {
    fungiOutput = buildSemanticRows({
      repositoryId: captured.sourceManifest.repositoryId,
      parserId: captured.fungiSelection.parserId,
      sourceRows: fungiRows,
      parseResults: fungiSemantic.parseResults,
      declarations: fungiSemantic.declarations,
      relations: fungiSemantic.relations,
      parserPolicy: captured.parserPolicy,
      resolutionPolicy: captured.resolutionPolicy,
    });
    gateOutput = buildSemanticRows({
      repositoryId: captured.sourceManifest.repositoryId,
      parserId: captured.gateSelection.parserId,
      sourceRows: gateRows,
      parseResults: gateSemantic.parseResults,
      declarations: gateSemantic.declarations,
      relations: gateSemantic.relations,
      parserPolicy: captured.parserPolicy,
      resolutionPolicy: captured.resolutionPolicy,
    });
  } catch {
    refuse('SOURCE_ORIGIN_FUNGI_SEMANTIC');
  }
  const nodes = [...fungiOutput.nodes, ...gateOutput.nodes].sort((left, right) => compareCodeUnits(left.id, right.id));
  const edges = [...fungiOutput.edges, ...gateOutput.edges].sort((left, right) => compareCodeUnits(left.id, right.id));
  const unresolved = [...fungiOutput.unresolved, ...gateOutput.unresolved].sort((left, right) => {
    for (const field of ['sourceNodeId','relationshipClass','reasonCode','sourceLocator','evidenceDigest']) {
      const compared = compareCodeUnits(left[field], right[field]);
      if (compared !== 0) return compared;
    }
    return 0;
  });
  const idMapRows = [...fungiOutput.idMapRows, ...gateOutput.idMapRows].sort(compareIdMapRows);
  if (
    new Set(nodes.map((row) => row.id)).size !== nodes.length
    || new Set(edges.map((row) => row.id)).size !== edges.length
    || new Set(unresolved.map((row) => row.evidenceDigest)).size !== unresolved.length
    || new Set(idMapRows.map((row) => row.rowDigest)).size !== idMapRows.length
  ) refuse('SOURCE_ORIGIN_FUNGI_SEMANTIC');
  const parseResults = [...fungiSemantic.parseResults, ...gateSemantic.parseResults].sort((left, right) => compareCodeUnits(left.path, right.path));
  const actualRuntimeLoadSets = [
    { id: 'HOST', moduleRows: captured.hostSelection.moduleRows, builtinModules: captured.hostSelection.builtinModules },
    { id: 'PARSER', moduleRows: captured.parserRuntime.moduleRows, builtinModules: captured.parserRuntime.builtinModules },
  ];
  return deepFreeze({
    nodes,
    edges,
    unresolved,
    parseOutcomes: [],
    parseResults,
    idMapRows,
    idMapDigest: sha256Canonical('galerina.logic-aig-id-map.v1', idMapRows),
    toolchains: [captured.fungiSelection, captured.gateSelection],
    actualRuntimeLoadSets,
    actualParserExportNames: replay.parserExportNames,
    authorizing: false,
  });
}
