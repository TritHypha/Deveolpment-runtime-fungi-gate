import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { parseStrictJsonBytes } from "../assurance-fabric/strict-json.mjs";
import {
  BLOCKERS,
  MAX_BATCH_REQUESTS,
  OUTCOMES,
  SCHEMA,
  TOOL_VERSION,
  SandboxRefusal,
  assertPlainRecord,
  canonicalRelativeTsPath,
  canonicalSourceSymbol,
  codeUnitCompare,
} from "./contracts.mjs";
import { classifyTypeScriptSource, discoverTypeScriptScopes, inventoryTypeScriptScopes } from "./classifier.mjs";
import {
  buildCompilerEvidence,
  buildPhysicalEvidence,
  findCorpusCollision,
  loadWorkingFungiCorpus,
  stablePhysicalEvidenceMatches,
} from "./evidence.mjs";
import { rehashSource, resolveSourceIdentity } from "./identity.mjs";
import { appendOutcomeRecord, canonicalJson } from "./journal.mjs";
import { lowerClassifiedSymbol } from "./lowerer.mjs";
import { analyzeFungiSource } from "../fungi-logic-analysis/index.mjs";

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function slug(value) {
  const result = value.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").replace(/[^A-Za-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").toLowerCase();
  if (result.length === 0 || result.length > 120) throw new SandboxRefusal("OUTPUT_SLUG_INVALID", "symbol cannot form a bounded output name");
  return result;
}

function contained(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function validateRequest(value) {
  const request = assertPlainRecord(value, "conversion request");
  const keys = Object.keys(request).sort(codeUnitCompare);
  if (canonicalJson(keys) !== canonicalJson(["file", "symbol"])) throw new SandboxRefusal("REQUEST_FIELDS_INVALID", "request fields must be exactly file and symbol");
  canonicalRelativeTsPath(request.file);
  try {
    canonicalSourceSymbol(request.symbol);
  } catch {
    throw new SandboxRefusal("REQUEST_SYMBOL_INVALID", "request symbol must be one identifier or one qualified member");
  }
  return Object.freeze({ file: request.file, symbol: request.symbol });
}

export function validateManifest(value) {
  const manifest = assertPlainRecord(value, "batch manifest");
  const keys = Object.keys(manifest).sort(codeUnitCompare);
  if (canonicalJson(keys) !== canonicalJson(["requests", "schema"])) throw new SandboxRefusal("MANIFEST_FIELDS_INVALID", "manifest fields must be exactly schema and requests");
  if (manifest.schema !== "galerina.ts-to-fungi-sandbox.batch.v1" || !Array.isArray(manifest.requests) || manifest.requests.length < 1 || manifest.requests.length > MAX_BATCH_REQUESTS) {
    throw new SandboxRefusal("MANIFEST_SHAPE_INVALID", "manifest requires 1..10 requests and the v1 schema");
  }
  const requests = manifest.requests.map(validateRequest);
  const seen = new Set();
  for (const request of requests) {
    const key = `${request.file}#${request.symbol}`;
    if (seen.has(key)) throw new SandboxRefusal("MANIFEST_DUPLICATE", "manifest contains a duplicate scope");
    seen.add(key);
  }
  return Object.freeze({ schema: manifest.schema, requests: Object.freeze(requests) });
}

function sourceRecord(request, identity) {
  return Object.freeze({
    file: request.file,
    symbol: request.symbol,
    ...(identity === undefined ? {} : {
      sourceBuildPoint: identity.sourceBuildPoint,
      sourceSha256: identity.sourceSha256,
      byteLength: identity.byteLength,
      graph: identity.graph,
    }),
  });
}

function refusalReason(error) {
  return error instanceof SandboxRefusal ? { code: error.code, detail: error.message } : { code: "UNEXPECTED_SANDBOX_FAILURE", detail: "unexpected sandbox failure" };
}

function finalizeReceipt(record) {
  const receiptSha256 = sha256(Buffer.from(canonicalJson(record), "utf8"));
  return Object.freeze({ ...record, receiptSha256 });
}

async function atomicWrite(path, text) {
  if (existsSync(path)) throw new SandboxRefusal("OUTPUT_COLLISION", `output already exists: ${basename(path)}`);
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.partial-${process.pid}-${createHash("sha256").update(path).digest("hex").slice(0, 12)}`;
  await writeFile(temp, text, { encoding: "utf8", flag: "wx" });
  if (existsSync(path)) throw new SandboxRefusal("OUTPUT_COLLISION", `output appeared during publication: ${basename(path)}`);
  await rename(temp, path);
}

async function writeOutcome({ out, request, record, candidate }) {
  const stem = `${slug(request.symbol)}-${sha256(Buffer.from(`${request.file}#${request.symbol}`, "utf8")).slice(7, 19)}`;
  let candidateRelative;
  if (candidate !== undefined) {
    candidateRelative = `candidates/${stem}.fungi`;
    await atomicWrite(resolve(out, ...candidateRelative.split("/")), candidate.source);
  }
  const completed = finalizeReceipt({
    ...record,
    ...(candidate === undefined ? {} : {
      candidate: {
        relativePath: `../${candidateRelative}`,
        sha256: sha256(Buffer.from(candidate.source, "utf8")),
        flow: candidate.flow,
        parameterNames: candidate.parameterNames,
        vectors: candidate.vectors,
      },
    }),
  });
  const receiptRelative = `records/${stem}.json`;
  await atomicWrite(resolve(out, ...receiptRelative.split("/")), `${canonicalJson(completed)}\n`);
  await appendOutcomeRecord(resolve(out, "journal.jsonl"), completed);
  return Object.freeze({ file: request.file, symbol: request.symbol, outcome: completed.outcome, receiptPath: receiptRelative, ...(candidateRelative === undefined ? {} : { candidatePath: candidateRelative }) });
}

async function processRequest({ root, project, request, out, corpus }) {
  let identity;
  try {
    identity = await resolveSourceIdentity({ root, project, ...request });
  } catch (error) {
    const refusal = refusalReason(error);
    return writeOutcome({
      out,
      request,
      record: {
        schema: SCHEMA,
        toolVersion: TOOL_VERSION,
        source: sourceRecord(request),
        outcome: "MANUAL_REVIEW",
        blockers: [],
        reasonCode: refusal.code,
        reason: refusal.detail,
        authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
      },
    });
  }
  const classification = classifyTypeScriptSource({ source: identity.source, file: request.file, symbol: request.symbol });
  if (classification.outcome !== "SUPPORTED") {
    return writeOutcome({
      out,
      request,
      record: {
        schema: SCHEMA,
        toolVersion: TOOL_VERSION,
        source: sourceRecord(request, identity),
        classifier: classification,
        outcome: classification.outcome === "BLOCKED" ? "BLOCKED" : "MANUAL_REVIEW",
        blockers: classification.blockers,
        reason: classification.reason ?? "known unsupported source semantics",
        authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
      },
    });
  }
  let lowered;
  try {
    lowered = lowerClassifiedSymbol(classification);
    const collision = findCorpusCollision(lowered.source, corpus);
    if (collision !== undefined) {
      return writeOutcome({
        out,
        request,
        record: {
          schema: SCHEMA,
          toolVersion: TOOL_VERSION,
          source: sourceRecord(request, identity),
          classifier: classification,
          outcome: "BLOCKED",
          blockers: [BLOCKERS.DUPLICATE_OR_SHADOW],
          reason: `${collision.kind} with ${collision.path}`,
          authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
        },
      });
    }
    const logicAnalysis = await analyzeFungiSource({
      source: lowered.source,
      file: `sandbox/${lowered.flow}.fungi`,
      command: "scan",
      graphBuildPoint: identity.graph.indexedHeadSha,
      profile: "dev",
    });
    if (logicAnalysis.status !== "SUPPORTED") {
      const blockerCodes = logicAnalysis.constructs.flatMap((item) => item.blockerCodes);
      return writeOutcome({
        out,
        request,
        record: {
          schema: SCHEMA,
          toolVersion: TOOL_VERSION,
          source: sourceRecord(request, identity),
          classifier: classification,
          outcome: logicAnalysis.status === "BLOCKED" ? "BLOCKED" : "MANUAL_REVIEW",
          blockers: blockerCodes,
          reasonCode: logicAnalysis.status === "BLOCKED" ? "FUNGI_LOGIC_ANALYSIS_BLOCKED" : "FUNGI_LOGIC_ANALYSIS_REVIEW",
          reason: "construct analysis stopped candidate compilation and physical proof",
          evidence: { logicAnalysis },
          authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
        },
      });
    }
    const compiler = await buildCompilerEvidence({ source: lowered.source, file: `sandbox/${lowered.flow}.fungi`, flow: lowered.flow, expected: lowered.expected, parameterNames: lowered.parameterNames, vectors: lowered.vectors });
    if (!compiler.green) throw new SandboxRefusal("COMPILER_EVIDENCE_FAILED", "Galerina compiler evidence was not fully green");
    const physical = await buildPhysicalEvidence({ root, source: lowered.source, flow: lowered.flow, expected: lowered.expected, vectors: lowered.vectors });
    if (!physical.green) throw new SandboxRefusal("PHYSICAL_EVIDENCE_FAILED", "SLIDE/VOK evidence was not fully green");
    const afterSha256 = await rehashSource(root, identity);
    if (afterSha256 !== identity.sourceSha256) throw new SandboxRefusal("SOURCE_MUTATED", "TypeScript changed during conversion");
    const record = {
      schema: SCHEMA,
      toolVersion: TOOL_VERSION,
      source: sourceRecord(request, identity),
      classifier: classification,
      outcome: "CONVERTED",
      blockers: [],
      evidence: { logicAnalysis, compiler, duplicateShadow: { green: true }, physical },
      authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
    };
    const summary = await writeOutcome({ out, request, record, candidate: lowered });
    corpus.push(Object.freeze({ path: `sandbox/${summary.candidatePath}`, source: lowered.source }));
    return summary;
  } catch (error) {
    const refusal = refusalReason(error);
    return writeOutcome({
      out,
      request,
      record: {
        schema: SCHEMA,
        toolVersion: TOOL_VERSION,
        source: sourceRecord(request, identity),
        classifier: classification,
        outcome: "MANUAL_REVIEW",
        blockers: [],
        reasonCode: refusal.code,
        reason: refusal.detail,
        authority: { productionAuthorityReleased: false, consumerSwitched: false, typescriptRetired: false },
      },
    });
  }
}

export async function runBatch({ root, project, manifest, out, auditOnly = false }) {
  const admitted = validateManifest(manifest);
  const outPath = resolve(out);
  if (existsSync(outPath)) throw new SandboxRefusal("OUTPUT_COLLISION", "final batch output already exists");
  await mkdir(dirname(outPath), { recursive: true });
  const stagingPath = `${outPath}.partial-${process.pid}-${createHash("sha256").update(outPath).digest("hex").slice(0, 12)}`;
  if (existsSync(stagingPath)) throw new SandboxRefusal("OUTPUT_STAGING_COLLISION", "batch staging path already exists");
  await mkdir(stagingPath);
  let published = false;
  try {
    const corpus = [...await loadWorkingFungiCorpus(root)];
    const records = [];
    for (const request of admitted.requests) records.push(await processRequest({ root: resolve(root), project, request, out: stagingPath, corpus }));
    const outcomes = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, records.filter((record) => record.outcome === outcome).length]));
    const summary = Object.freeze({ schema: "galerina.ts-to-fungi-sandbox.summary.v1", total: records.length, auditOnly: auditOnly === true, outcomes, records: Object.freeze(records) });
    await atomicWrite(resolve(stagingPath, "summary.json"), `${canonicalJson(summary)}\n`);
    for (const record of records) {
      const receipt = JSON.parse(await readFile(resolve(stagingPath, ...record.receiptPath.split("/")), "utf8"));
      if (typeof receipt.source?.sourceSha256 === "string" && await rehashSource(root, receipt.source) !== receipt.source.sourceSha256) {
        throw new SandboxRefusal("SOURCE_MUTATED", `TypeScript changed before atomic publication: ${record.file}#${record.symbol}`);
      }
    }
    if (existsSync(outPath)) throw new SandboxRefusal("OUTPUT_COLLISION", "final batch output appeared during publication");
    await rename(stagingPath, outPath);
    published = true;
    return summary;
  } finally {
    if (!published) await rm(stagingPath, { recursive: true, force: true });
  }
}

export async function runInspect({ root, project, file, symbol, out, auditOnly = false }) {
  return runBatch({ root, project, manifest: { schema: "galerina.ts-to-fungi-sandbox.batch.v1", requests: [{ file, symbol }] }, out, auditOnly });
}

function trackedTypeScriptSources(root) {
  let bytes;
  try {
    bytes = execFileSync("git", ["ls-files", "-z", "--", "packages-galerina"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    throw new SandboxRefusal("DISCOVERY_GIT_INDEX_UNAVAILABLE", "tracked source index is unavailable");
  }
  return bytes
    .split("\0")
    .filter((file) => /^packages-galerina\/[^/]+\/src\/.+\.ts$/u.test(file))
    .filter((file) => !file.startsWith("packages-galerina/galerina-test/"))
    .sort(codeUnitCompare);
}

function discoveryCursor(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new SandboxRefusal("DISCOVERY_CURSOR_INVALID", "discovery cursor must be file#symbol");
  const separator = value.lastIndexOf("#");
  if (separator <= 0) throw new SandboxRefusal("DISCOVERY_CURSOR_INVALID", "discovery cursor must be file#symbol");
  const file = value.slice(0, separator);
  const symbol = value.slice(separator + 1);
  canonicalRelativeTsPath(file);
  try {
    canonicalSourceSymbol(symbol);
  } catch {
    throw new SandboxRefusal("DISCOVERY_CURSOR_INVALID", "discovery cursor symbol is invalid");
  }
  return `${file}#${symbol}`;
}

function oracleScopes(corpus) {
  const scopes = new Set();
  const pattern = /^\/\/\/ TypeScript oracle: (packages-galerina\/[^\s#]+\.ts)#([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)?)\r?$/gmu;
  for (const item of corpus) {
    for (const match of item.source.matchAll(pattern)) scopes.add(`${match[1]}#${match[2]}`);
  }
  return scopes;
}

async function isVendoredPackage(root, file, cache) {
  const packageRoot = file.split("/").slice(0, 2).join("/");
  if (cache.has(packageRoot)) return cache.get(packageRoot);
  const packagePath = resolve(root, ...packageRoot.split("/"), "package.json");
  let vendored = false;
  if (existsSync(packagePath)) {
    const metadata = parseStrictJsonBytes(await readFile(packagePath), { label: `${packageRoot} package manifest`, maxBytes: 1024 * 1024 });
    assertPlainRecord(metadata, `${packageRoot} package manifest`);
    vendored = Object.hasOwn(metadata, "galerinaVendor");
  }
  cache.set(packageRoot, vendored);
  return vendored;
}

export async function loadPriorRefusalScopes({ root, project, directory }) {
  if (typeof project !== "string" || project.length === 0 || !existsSync(directory)) return Object.freeze([]);
  const scopes = new Set();
  const sourceDigests = new Map();
  let inspected = 0;
  const batches = (await readdir(directory, { withFileTypes: true })).sort((left, right) => codeUnitCompare(left.name, right.name));
  for (const batch of batches) {
    if (!batch.isDirectory() || batch.isSymbolicLink()) continue;
    const recordsDirectory = resolve(directory, batch.name, "records");
    if (!existsSync(recordsDirectory)) continue;
    const recordsStat = lstatSync(recordsDirectory);
    if (!recordsStat.isDirectory() || recordsStat.isSymbolicLink() || realpathSync(recordsDirectory) !== recordsDirectory) continue;
    const records = (await readdir(recordsDirectory, { withFileTypes: true })).sort((left, right) => codeUnitCompare(left.name, right.name));
    for (const record of records) {
      if (inspected >= 1000) return Object.freeze([...scopes].sort(codeUnitCompare));
      if (!record.isFile() || record.isSymbolicLink() || !record.name.endsWith(".json")) continue;
      inspected += 1;
      try {
        const path = resolve(recordsDirectory, record.name);
        const bytes = await readFile(path);
        if (bytes.byteLength > 4 * 1024 * 1024) continue;
        const parsed = parseStrictJsonBytes(bytes, { label: "sandbox refusal receipt", maxBytes: 4 * 1024 * 1024 });
        assertPlainRecord(parsed, "sandbox refusal receipt");
        if (parsed.schema !== SCHEMA || parsed.toolVersion !== TOOL_VERSION || (parsed.outcome !== "BLOCKED" && parsed.outcome !== "MANUAL_REVIEW")) continue;
        const { receiptSha256, ...unsigned } = parsed;
        if (receiptSha256 !== sha256(Buffer.from(canonicalJson(unsigned), "utf8"))) continue;
        if (parsed.source?.graph?.project !== project || parsed.source.graph.stale !== false || parsed.source.graph.indexedHeadSha !== parsed.source.sourceBuildPoint) continue;
        const file = canonicalRelativeTsPath(parsed.source.file);
        const symbol = parsed.source.symbol;
        try {
          canonicalSourceSymbol(symbol);
        } catch {
          continue;
        }
        let currentDigest = sourceDigests.get(file);
        if (currentDigest === undefined) {
          currentDigest = sha256(await readFile(resolve(root, ...file.split("/"))));
          sourceDigests.set(file, currentDigest);
        }
        if (parsed.source.sourceSha256 !== currentDigest) continue;
        scopes.add(`${file}#${symbol}`);
      } catch {
        continue;
      }
    }
  }
  return Object.freeze([...scopes].sort(codeUnitCompare));
}

export function selectedPhysicalProfileRefusal(classification) {
  if (classification.kind === "function" && classification.parameters.some((parameter) => parameter.type === "string")) {
    return Object.freeze({
      code: BLOCKERS.PHYSICAL_STRING_PARAMETER,
      detail: "selected physical String ABI refuses lone UTF-16 surrogate code units and cannot preserve the complete JavaScript String parameter domain",
    });
  }
  return undefined;
}

export async function runDiscover({ root, project, out, limit = MAX_BATCH_REQUESTS, after }) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BATCH_REQUESTS) {
    throw new SandboxRefusal("DISCOVERY_LIMIT_INVALID", `discovery limit must be 1..${MAX_BATCH_REQUESTS}`);
  }
  const cursor = discoveryCursor(after);
  const corpus = [...await loadWorkingFungiCorpus(root)];
  const fungiScopes = oracleScopes(corpus);
  const priorRefusals = await loadPriorRefusalScopes({ root, project, directory: dirname(resolve(out)) });
  const priorRefusalScopes = new Set(priorRefusals);
  const packageCache = new Map();
  const requests = [];
  const skipped = [];
  const exclusions = {
    existingFungi: 0,
    priorReceipt: 0,
    physicalProfile: 0,
    loweringRefusal: 0,
    duplicateOrShadow: 0,
    identityRefusal: 0,
  };
  const exclude = (kind) => { exclusions[kind] += 1; };
  let scanned = 0;
  let cursorPassed = cursor === undefined;
  for (const file of trackedTypeScriptSources(root)) {
    if (await isVendoredPackage(root, file, packageCache)) continue;
    const sourceBytes = await readFile(resolve(root, ...file.split("/")));
    if (sourceBytes.byteLength > 4 * 1024 * 1024) continue;
    const source = sourceBytes.toString("utf8");
    for (const classification of discoverTypeScriptScopes({ source, file })) {
      const key = `${file}#${classification.symbol}`;
      if (!cursorPassed) {
        if (key === cursor) cursorPassed = true;
        continue;
      }
      scanned += 1;
      if (fungiScopes.has(key)) {
        exclude("existingFungi");
        continue;
      }
      if (priorRefusalScopes.has(key)) {
        exclude("priorReceipt");
        continue;
      }
      const physicalRefusal = selectedPhysicalProfileRefusal(classification);
      if (physicalRefusal !== undefined) {
        exclude("physicalProfile");
        if (skipped.length < MAX_BATCH_REQUESTS * 10) {
          skipped.push(Object.freeze({ scope: key, reasonCode: physicalRefusal.code, reason: physicalRefusal.detail }));
        }
        continue;
      }
      let lowered;
      try {
        lowered = lowerClassifiedSymbol(classification);
      } catch (error) {
        exclude("loweringRefusal");
        const refusal = refusalReason(error);
        if (skipped.length < MAX_BATCH_REQUESTS * 10) skipped.push(Object.freeze({ scope: key, reasonCode: refusal.code, reason: refusal.detail }));
        continue;
      }
      const collision = findCorpusCollision(lowered.source, corpus);
      if (collision !== undefined) {
        exclude("duplicateOrShadow");
        if (skipped.length < MAX_BATCH_REQUESTS * 10) {
          skipped.push(Object.freeze({ scope: key, reasonCode: BLOCKERS.DUPLICATE_OR_SHADOW, reason: `${collision.kind} with ${collision.path}` }));
        }
        continue;
      }
      try {
        await resolveSourceIdentity({ root, project, file, symbol: classification.symbol });
      } catch (error) {
        exclude("identityRefusal");
        const refusal = refusalReason(error);
        if (skipped.length < MAX_BATCH_REQUESTS * 10) skipped.push(Object.freeze({ scope: key, reasonCode: refusal.code, reason: refusal.detail }));
        continue;
      }
      requests.push(Object.freeze({ file, symbol: classification.symbol }));
      corpus.push(Object.freeze({ path: `discovery/${key}.fungi`, source: lowered.source }));
      if (requests.length === limit) break;
    }
    if (requests.length === limit) break;
  }
  const frozenExclusions = Object.freeze({ ...exclusions });
  const accounted = Object.values(exclusions).reduce((sum, count) => sum + count, requests.length);
  if (requests.length === 0) {
    const exhausted = Object.freeze({
      schema: "galerina.ts-to-fungi-sandbox.discovery.v1",
      limit,
      scanned,
      accounted,
      selected: 0,
      exclusions: frozenExclusions,
      skipped: Object.freeze(skipped),
      priorRefusals: priorRefusals.length,
      nextAfter: cursor,
      exhausted: true,
      manifest: null,
    });
    await atomicWrite(resolve(out), `${canonicalJson(exhausted)}\n`);
    return exhausted;
  }
  const manifest = validateManifest({ schema: "galerina.ts-to-fungi-sandbox.batch.v1", requests });
  await atomicWrite(resolve(out), `${canonicalJson(manifest)}\n`);
  return Object.freeze({
    schema: "galerina.ts-to-fungi-sandbox.discovery.v1",
    limit,
    scanned,
    accounted,
    selected: requests.length,
    exclusions: frozenExclusions,
    skipped: Object.freeze(skipped),
    priorRefusals: priorRefusals.length,
    nextAfter: `${requests.at(-1).file}#${requests.at(-1).symbol}`,
    exhausted: false,
    manifest,
  });
}

export async function runInventory({ root, project, out, examples = MAX_BATCH_REQUESTS }) {
  if (!Number.isSafeInteger(examples) || examples < 1 || examples > MAX_BATCH_REQUESTS) {
    throw new SandboxRefusal("INVENTORY_EXAMPLES_INVALID", `inventory examples must be 1..${MAX_BATCH_REQUESTS}`);
  }
  const packageCache = new Map();
  const totals = Object.fromEntries([...OUTCOMES, "SUPPORTED"].map((outcome) => [outcome, 0]));
  const groups = new Map();
  for (const file of trackedTypeScriptSources(root)) {
    if (await isVendoredPackage(root, file, packageCache)) continue;
    const sourceBytes = await readFile(resolve(root, ...file.split("/")));
    if (sourceBytes.byteLength > 4 * 1024 * 1024) continue;
    const source = sourceBytes.toString("utf8");
    for (const classification of inventoryTypeScriptScopes({ source, file })) {
      const outcome = classification.outcome;
      totals[outcome] = (totals[outcome] ?? 0) + 1;
      if (outcome === "SUPPORTED") continue;
      const baseKey = classification.blockers?.[0] ?? classification.reason ?? "UNCLASSIFIED";
      const detail = classification.obligations?.[0];
      const key = detail === undefined ? baseKey : `${baseKey} :: ${detail}`;
      const group = groups.get(key) ?? { key, outcome, count: 0, examples: [] };
      group.count += 1;
      if (group.examples.length < examples) group.examples.push(`${file}#${classification.symbol}`);
      groups.set(key, group);
    }
  }
  const result = Object.freeze({
    schema: "galerina.ts-to-fungi-sandbox.inventory.v1",
    project,
    examples,
    totals: Object.freeze(totals),
    groups: Object.freeze([...groups.values()]
      .sort((left, right) => right.count - left.count || codeUnitCompare(left.key, right.key))
      .map((group) => Object.freeze({ ...group, examples: Object.freeze(group.examples) }))),
  });
  await atomicWrite(resolve(out), `${canonicalJson(result)}\n`);
  return result;
}

export async function verifyReceipt({ root, receipt }) {
  try {
    const receiptPath = resolve(receipt);
    const bytes = await readFile(receiptPath);
    const parsed = parseStrictJsonBytes(bytes, { label: "sandbox receipt", maxBytes: 4 * 1024 * 1024 });
    assertPlainRecord(parsed, "sandbox receipt");
    const { receiptSha256, ...unsigned } = parsed;
    if (receiptSha256 !== sha256(Buffer.from(canonicalJson(unsigned), "utf8"))) return { valid: false, reason: "receipt digest mismatch" };
    if (parsed.source?.sourceSha256 !== undefined) {
      const file = canonicalRelativeTsPath(parsed.source.file);
      const current = sha256(await readFile(resolve(root, ...file.split("/"))));
      if (current !== parsed.source.sourceSha256) return { valid: false, reason: "source digest mismatch" };
    }
    if (parsed.outcome === "CONVERTED") {
      const identity = await resolveSourceIdentity({ root, project: parsed.source.graph.project, file: parsed.source.file, symbol: parsed.source.symbol });
      if (identity.sourceSha256 !== parsed.source.sourceSha256 || identity.sourceBuildPoint !== parsed.source.sourceBuildPoint) return { valid: false, reason: "source identity drift" };
      const outputRoot = dirname(dirname(receiptPath));
      const candidatePath = resolve(dirname(receiptPath), parsed.candidate.relativePath);
      if (!contained(outputRoot, candidatePath)) return { valid: false, reason: "candidate path escapes output" };
      const source = await readFile(candidatePath, "utf8");
      if (sha256(Buffer.from(source, "utf8")) !== parsed.candidate.sha256) return { valid: false, reason: "candidate digest mismatch" };
      const collision = findCorpusCollision(source, await loadWorkingFungiCorpus(root));
      if (collision !== undefined) return { valid: false, reason: `${collision.kind} with ${collision.path}` };
      const expected = parsed.classifier?.value?.value;
      const logicAnalysis = await analyzeFungiSource({ source, file: `sandbox/${parsed.candidate.flow}.fungi`, command: "scan", graphBuildPoint: identity.graph.indexedHeadSha, profile: "dev" });
      if (logicAnalysis.status !== "SUPPORTED" || canonicalJson(logicAnalysis) !== canonicalJson(parsed.evidence.logicAnalysis)) return { valid: false, reason: "logic analysis drift" };
      const compiler = await buildCompilerEvidence({ source, file: `sandbox/${parsed.candidate.flow}.fungi`, flow: parsed.candidate.flow, expected, parameterNames: parsed.candidate.parameterNames, vectors: parsed.candidate.vectors });
      if (!compiler.green || canonicalJson(compiler) !== canonicalJson(parsed.evidence.compiler)) return { valid: false, reason: "compiler evidence drift" };
      const physical = await buildPhysicalEvidence({ root, source, flow: parsed.candidate.flow, expected, vectors: parsed.candidate.vectors });
      if (!physical.green || !stablePhysicalEvidenceMatches(physical, parsed.evidence.physical)) return { valid: false, reason: "physical evidence drift" };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function readManifest(path) {
  const bytes = await readFile(path);
  return validateManifest(parseStrictJsonBytes(bytes, { label: "sandbox batch manifest", maxBytes: 1024 * 1024 }));
}

function canonicalCliPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || isAbsolute(value)) {
    throw new SandboxRefusal("CLI_PATH_INVALID", `${label} must be repository-relative`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) throw new SandboxRefusal("CLI_PATH_INVALID", `${label} contains a non-canonical segment`);
  return parts;
}

export function assertCliInput(root, value, { sandboxOnly }) {
  const parts = canonicalCliPath(value, "CLI input");
  if (!value.endsWith(".json")) throw new SandboxRefusal("CLI_INPUT_EXTENSION_INVALID", "CLI input must be JSON");
  if (sandboxOnly === true && (parts[0] !== "build" || parts[1] !== "ts-to-fungi-sandbox")) {
    throw new SandboxRefusal("CLI_RECEIPT_SCOPE_INVALID", "receipt must be inside build/ts-to-fungi-sandbox");
  }
  const rootPath = realpathSync(resolve(root));
  const path = resolve(rootPath, ...parts);
  if (!contained(rootPath, path)) throw new SandboxRefusal("CLI_INPUT_ESCAPE", "CLI input escapes repository root");
  if (!existsSync(path)) throw new SandboxRefusal("CLI_INPUT_MISSING", "CLI input does not exist");
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path) throw new SandboxRefusal("CLI_INPUT_IDENTITY_INVALID", "CLI input must be a regular non-symlink file");
  return path;
}

export function assertCliOutput(root, value) {
  const parts = canonicalCliPath(value, "CLI output");
  if (parts[0] !== "build" || parts[1] !== "ts-to-fungi-sandbox") {
    throw new SandboxRefusal("OUTPUT_PATH_INVALID", "CLI output must be inside build/ts-to-fungi-sandbox");
  }
  const rootPath = realpathSync(resolve(root));
  const path = resolve(rootPath, ...parts);
  if (!contained(rootPath, path)) throw new SandboxRefusal("OUTPUT_PATH_ESCAPE", "CLI output escapes repository root");
  let current = rootPath;
  for (const part of parts) {
    current = resolve(current, part);
    if (!existsSync(current)) continue;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || realpathSync(current) !== current) throw new SandboxRefusal("OUTPUT_PATH_REDIRECTED", "CLI output has a redirected ancestor");
  }
  return path;
}
