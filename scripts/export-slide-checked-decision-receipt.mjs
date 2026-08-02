#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { types as utilTypes } from "node:util";

import {
  checkEffects,
  checkNamingPolicy,
  checkSourceEscapes,
  checkTypes,
  checkValueStates,
  emitGIR,
  parseProgram,
  resolveSymbols,
  verifyGovernance,
} from "../packages-galerina/galerina-core-compiler/dist/index.js";
import { computeGIRHash } from "../packages-galerina/galerina-core-compiler/dist/gir-emitter.js";

const REQUEST_KEYS = Object.freeze([
  "packageId",
  "profileId",
  "sourceBytes",
  "fileLabel",
  "compilerVersion",
]);
const PACKAGE_ID = /^@galerina\/[a-z0-9][a-z0-9-]{0,63}$/u;
const PROFILE_ID = /^galerina\.package\.[a-z0-9][a-z0-9.-]{0,63}$/u;
const FILE_LABEL = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}\.fungi$/u;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?$/u;
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_RECEIPT_BYTES = 64 * 1024;
const PLAN_MEMORY = Object.freeze(["SAFE_VALUE", "NO_MEMORY"]);
const PLAN_EFFECTS = Object.freeze(["PURE", Object.freeze([])]);
const PLAN_FAILURE = Object.freeze([
  "TERMINAL_K3_RETURNS",
  Object.freeze([-1, 0, 1]),
]);
const PLAN_CAPABILITY = Object.freeze(["NONE", Object.freeze([])]);

function exactRecord(value, keys) {
  try {
    if (
      value === null
      || typeof value !== "object"
      || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).length !== keys.length) return null;
    const output = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function snapshotBytes(value) {
  try {
    if (
      value === null
      || typeof value !== "object"
      || utilTypes.isProxy(value)
      || !ArrayBuffer.isView(value)
      || Object.getPrototypeOf(value) !== Uint8Array.prototype
      || Object.getPrototypeOf(value.buffer) !== ArrayBuffer.prototype
      || value.buffer.resizable === true
      || value.byteLength < 1
      || value.byteLength > MAX_SOURCE_BYTES
    ) return null;
    return Uint8Array.from(value);
  } catch {
    return null;
  }
}

function hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function domainHex(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(value)
    .digest("hex");
}

function refused(failureId = "SLIDE-CDFRONT-001") {
  return Object.freeze({
    verdict: -1,
    status: "REFUSED",
    failureId,
    receiptBytes: null,
    receiptDigest: "",
    graph: null,
    referenceOnly: true,
    authorityReleased: false,
  });
}

function isSpace(byte) {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}

function isAlpha(byte) {
  return (byte >= 0x41 && byte <= 0x5a)
    || (byte >= 0x61 && byte <= 0x7a)
    || byte === 0x5f;
}

function isDigit(byte) {
  return byte >= 0x30 && byte <= 0x39;
}

function tokenize(source) {
  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const byte = source[cursor];
    if (isSpace(byte)) {
      cursor += 1;
      continue;
    }
    if (byte === 0x2f && source[cursor + 1] === 0x2f) {
      cursor += 2;
      while (cursor < source.length && source[cursor] !== 0x0a) cursor += 1;
      continue;
    }
    if (byte === 0x22) {
      const start = cursor;
      cursor += 1;
      let escaped = false;
      while (cursor < source.length) {
        const current = source[cursor];
        if (!escaped && current === 0x22) {
          cursor += 1;
          tokens.push(Object.freeze({ kind: "string", value: "STRING", start, end: cursor }));
          break;
        }
        if (!escaped && (current === 0x0a || current === 0x0d)) return null;
        escaped = !escaped && current === 0x5c;
        if (current !== 0x5c) escaped = false;
        cursor += 1;
      }
      if (tokens.at(-1)?.start !== start) return null;
      continue;
    }
    if (isAlpha(byte)) {
      const start = cursor;
      cursor += 1;
      while (isAlpha(source[cursor]) || isDigit(source[cursor])) cursor += 1;
      tokens.push(Object.freeze({
        kind: "identifier",
        value: Buffer.from(source.subarray(start, cursor)).toString("ascii"),
        start,
        end: cursor,
      }));
      continue;
    }
    if (isDigit(byte)) {
      const start = cursor;
      cursor += 1;
      while (isDigit(source[cursor])) cursor += 1;
      tokens.push(Object.freeze({
        kind: "integer",
        value: Buffer.from(source.subarray(start, cursor)).toString("ascii"),
        start,
        end: cursor,
      }));
      continue;
    }
    const pair = cursor + 1 < source.length
      ? String.fromCharCode(byte, source[cursor + 1])
      : "";
    if (pair === "->" || pair === "==") {
      tokens.push(Object.freeze({ kind: "symbol", value: pair, start: cursor, end: cursor + 2 }));
      cursor += 2;
      continue;
    }
    if ("@(){}:,-".includes(String.fromCharCode(byte))) {
      tokens.push(Object.freeze({
        kind: "symbol",
        value: String.fromCharCode(byte),
        start: cursor,
        end: cursor + 1,
      }));
      cursor += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function parseDecision(tokens) {
  let position = 0;
  const semanticTokens = [];
  const mappings = [];
  const take = (value) => {
    const token = tokens[position];
    if (token?.value !== value) throw new Error("unexpected token");
    position += 1;
    semanticTokens.push(value);
    return token;
  };
  const takeIdentifier = () => {
    const token = tokens[position];
    if (token?.kind !== "identifier") throw new Error("identifier required");
    position += 1;
    semanticTokens.push(token.value);
    return token;
  };
  const takeReturnValue = () => {
    if (tokens[position]?.value === "-") {
      take("-");
      take("1");
      return -1;
    }
    if (
      tokens[position]?.value === "0"
      && tokens[position + 1]?.value === "-"
      && tokens[position + 2]?.value === "1"
    ) {
      take("0");
      take("-");
      take("1");
      return -1;
    }
    const token = tokens[position];
    if (token?.value !== "0" && token?.value !== "1") {
      throw new Error("terminal K3 value required");
    }
    position += 1;
    semanticTokens.push(token.value);
    return Number(token.value);
  };
  const map = (kind, start, end) => {
    mappings.push(Object.freeze({
      instructionId: mappings.length,
      kind,
      startByte: start,
      endByte: end,
    }));
  };

  take("@");
  take("version");
  take("1");
  take("pure");
  take("flow");
  const flowName = takeIdentifier().value;
  take("(");
  const parameters = [];
  const names = new Set();
  while (tokens[position]?.value !== ")") {
    const name = takeIdentifier().value;
    take(":");
    const typeName = takeIdentifier().value;
    if (
      names.has(name)
      || (typeName !== "Bool" && typeName !== "Verdict")
      || (parameters.length > 0 && typeName === "Verdict")
    ) throw new Error("parameter refused");
    names.add(name);
    parameters.push(Object.freeze({ index: parameters.length, name, typeName }));
    if (tokens[position]?.value !== ",") break;
    take(",");
  }
  take(")");
  take("->");
  const returnType = takeIdentifier().value;
  if (returnType !== "Int" || parameters.length < 1 || parameters.length > 64) {
    throw new Error("signature refused");
  }

  if (tokens[position]?.value === "contract") {
    position += 1;
    take("{");
    take("intent");
    take("{");
    if (tokens[position]?.kind !== "string") throw new Error("intent string required");
    position += 1;
    take("}");
    take("}");
  }
  take("{");

  const parameterIndex = new Map(parameters.map((parameter) => [parameter.name, parameter.index]));
  const booleanIndices = parameters
    .filter((parameter) => parameter.typeName === "Bool")
    .map((parameter) => parameter.index);
  const positive = [];
  const negative = [];
  const seen = new Set();
  const parseBooleanGuards = () => {
    while (tokens[position]?.value === "if") {
      const start = take("if").start;
      const name = takeIdentifier().value;
      take("==");
      const expected = takeIdentifier().value;
      take("{");
      take("return");
      const denied = takeReturnValue();
      const end = take("}").end;
      const index = parameterIndex.get(name);
      if (
        index === undefined
        || parameters[index].typeName !== "Bool"
        || seen.has(index)
        || denied !== -1
        || (expected !== "true" && expected !== "false")
      ) throw new Error("Boolean guard refused");
      seen.add(index);
      (expected === "false" ? positive : negative).push(index);
      map("BOOLEAN_GUARD", start, end);
    }
  };

  let graph;
  const k3Sensitive = parameters[0].typeName === "Verdict";
  if (k3Sensitive) {
    const start = take("check").start;
    take("(");
    const checked = takeIdentifier().value;
    take(")");
    take("{");
    if (parameterIndex.get(checked) !== 0) throw new Error("K3 subject refused");
    take("deny"); take(":"); take("{"); take("return");
    if (takeReturnValue() !== -1) throw new Error("deny arm refused");
    map("K3_DENY", start, take("}").end);
    take("ambig"); take(":"); take("{"); take("return");
    const ambigStart = tokens[position - 1].start;
    if (takeReturnValue() !== 0) throw new Error("ambig arm refused");
    map("K3_AMBIG", ambigStart, take("}").end);
    take("if"); take(":"); take("{");
    parseBooleanGuards();
    const allowStart = take("return").start;
    if (takeReturnValue() !== 1) throw new Error("allow arm refused");
    map("K3_ALLOW", allowStart, tokens[position - 1].end);
    take("}");
    take("}");
    graph = ["K3_GUARD_BOOLEAN_ALL", 0, positive, negative, 1, 0, -1];
  } else {
    parseBooleanGuards();
    if (negative.length !== 0) throw new Error("ordinary negative guard refused");
    const allowStart = take("return").start;
    if (takeReturnValue() !== 1) throw new Error("allow return refused");
    map("BOOLEAN_ALLOW", allowStart, tokens[position - 1].end);
    graph = ["BOOLEAN_ALL", positive, 1, -1];
  }
  take("}");
  if (position !== tokens.length) throw new Error("surplus source tokens");
  if (
    seen.size !== booleanIndices.length
    || booleanIndices.some((index) => !seen.has(index))
  ) throw new Error("incomplete Boolean decision");
  return Object.freeze({
    flowName,
    parameters: Object.freeze(parameters),
    returnType,
    k3Sensitive,
    semanticTokens: Object.freeze(semanticTokens),
    mappings: Object.freeze(mappings),
    graph: Object.freeze(graph.map((item) => Array.isArray(item) ? Object.freeze([...item]) : item)),
  });
}

function compilerFacts(sourceText, fileLabel) {
  const compile = () => {
    const parsed = parseProgram(sourceText, fileLabel, { requireVersionHeader: true });
    const symbol = resolveSymbols(parsed.ast);
    const types = checkTypes(parsed.ast);
    const values = checkValueStates(parsed.ast);
    const effects = checkEffects(parsed.flows, parsed.ast);
    const governance = verifyGovernance(parsed.ast, parsed.flows, effects, "dev");
    const escapes = checkSourceEscapes(parsed.ast);
    const naming = checkNamingPolicy(parsed.ast);
    const diagnostics = [
      ...parsed.diagnostics,
      ...symbol.diagnostics,
      ...types.diagnostics,
      ...values.diagnostics,
      ...effects.flatMap((result) => result.diagnostics),
      ...governance.diagnostics,
      ...escapes.diagnostics,
      ...naming.diagnostics,
    ];
    if (
      parsed.flows.length !== 1
      || diagnostics.some((diagnostic) =>
        diagnostic.severity === "error" || diagnostic.severity === "warning")
    ) return null;
    return Object.freeze({
      girDigest: computeGIRHash(emitGIR(parsed.ast, parsed.flows, effects).gir),
      diagnostics: Object.freeze([]),
    });
  };
  const first = compile();
  const second = compile();
  if (first === null || second === null || first.girDigest !== second.girDigest) {
    return null;
  }
  return first;
}

function receiptObject(fields) {
  return {
    schema: "galerina.slide.checked-decision-frontend.v1",
    frontendId: "@galerina/core-compiler",
    frontendVersion: fields.compilerVersion,
    languageEdition: 1,
    packageId: fields.packageId,
    profileId: fields.profileId,
    sourceNormalization: "UTF8_LF_V1",
    sourceByteLength: fields.source.length,
    sourceDigest: fields.sourceDigest,
    flowName: fields.decision.flowName,
    parameters: fields.decision.parameters.map((parameter) => ({
      index: parameter.index,
      name: parameter.name,
      typeName: parameter.typeName,
    })),
    returnType: fields.decision.returnType,
    k3Sensitive: fields.decision.k3Sensitive,
    semanticTokenDigest: fields.semanticTokenDigest,
    mappings: fields.decision.mappings.map((mapping) => ({
      instructionId: mapping.instructionId,
      kind: mapping.kind,
      startByte: mapping.startByte,
      endByte: mapping.endByte,
    })),
    decisionGraphCanonical: fields.graphCanonical,
    decisionGraphDigest: fields.graphDigest,
    instructionCount: fields.decision.mappings.length,
    diagnosticDigest: domainHex(
      "galerina.slide.checked-decision.diagnostics.v1",
      Buffer.from("[]", "utf8"),
    ),
    memoryPlanDigest: domainHex(
      "galerina.slide.checked-decision.memory-plan.v1",
      Buffer.from(JSON.stringify(PLAN_MEMORY), "utf8"),
    ),
    effectPlanDigest: domainHex(
      "galerina.slide.checked-decision.effect-plan.v1",
      Buffer.from(JSON.stringify(PLAN_EFFECTS), "utf8"),
    ),
    failurePlanDigest: domainHex(
      "galerina.slide.checked-decision.failure-plan.v1",
      Buffer.from(JSON.stringify(PLAN_FAILURE), "utf8"),
    ),
    capabilityPlanDigest: domainHex(
      "galerina.slide.checked-decision.capability-plan.v1",
      Buffer.from(JSON.stringify(PLAN_CAPABILITY), "utf8"),
    ),
    producerGIRDigest: fields.compiler.girDigest.slice("sha256:".length),
    deterministic: true,
    referenceOnly: true,
  };
}

export function exportCheckedDecisionReceipt(request) {
  try {
    const fields = exactRecord(request, REQUEST_KEYS);
    if (
      fields === null
      || typeof fields.packageId !== "string"
      || !PACKAGE_ID.test(fields.packageId)
      || typeof fields.profileId !== "string"
      || !PROFILE_ID.test(fields.profileId)
      || typeof fields.fileLabel !== "string"
      || !FILE_LABEL.test(fields.fileLabel)
      || typeof fields.compilerVersion !== "string"
      || !VERSION.test(fields.compilerVersion)
    ) return refused();
    const inputSource = snapshotBytes(fields.sourceBytes);
    if (inputSource === null) return refused();
    const inputText = new TextDecoder("utf-8", { fatal: true }).decode(inputSource);
    const sourceText = inputText.replaceAll("\r\n", "\n");
    if (sourceText.includes("\r")) return refused();
    const source = Uint8Array.from(Buffer.from(sourceText, "utf8"));
    const compiler = compilerFacts(sourceText, fields.fileLabel);
    const tokens = tokenize(source);
    if (compiler === null || tokens === null) return refused();
    const decision = parseDecision(tokens);
    const sourceDigest = hex(source);
    const semanticTokenDigest = domainHex(
      "galerina.slide.checked-decision.semantic-tokens.v1",
      Buffer.from(JSON.stringify(decision.semanticTokens), "utf8"),
    );
    const graphCanonical = JSON.stringify(decision.graph);
    const graphDigest = domainHex(
      "slide.checked-decision.graph.v1",
      Buffer.from(graphCanonical, "utf8"),
    );
    const receipt = receiptObject({
      compilerVersion: fields.compilerVersion,
      packageId: fields.packageId,
      profileId: fields.profileId,
      source,
      sourceDigest,
      decision,
      semanticTokenDigest,
      graphCanonical,
      graphDigest,
      compiler,
    });
    const receiptBytes = Uint8Array.from(Buffer.from(
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    ));
    if (receiptBytes.length > MAX_RECEIPT_BYTES) return refused();
    return Object.freeze({
      verdict: 1,
      status: "CHECKED_DECISION_FRONTEND_CANDIDATE",
      failureId: "NONE",
      receiptBytes,
      receiptDigest: `sha256:${domainHex(
        "slide.checked-decision.frontend-receipt.v1",
        receiptBytes,
      )}`,
      graph: decision.graph,
      referenceOnly: true,
      authorityReleased: false,
    });
  } catch {
    return refused();
  }
}

function cliArguments(argv) {
  const fields = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined || !["--package-id", "--profile-id", "--source", "--out"].includes(flag)) {
      return null;
    }
    if (Object.hasOwn(fields, flag)) return null;
    fields[flag] = value;
  }
  return Object.keys(fields).length === 4 ? fields : null;
}

function runCli() {
  const args = cliArguments(process.argv.slice(2));
  if (args === null) {
    console.error("REFUSED: exact --package-id --profile-id --source --out arguments required.");
    process.exitCode = 2;
    return;
  }
  let source;
  try {
    source = Uint8Array.from(readFileSync(resolve(args["--source"])));
  } catch {
    console.error("REFUSED: source is missing or unreadable.");
    process.exitCode = 1;
    return;
  }
  const result = exportCheckedDecisionReceipt({
    packageId: args["--package-id"],
    profileId: args["--profile-id"],
    sourceBytes: source,
    fileLabel: resolve(args["--source"]).split(/[\\/]/u).at(-1),
    compilerVersion: "1.0.0-beta.2",
  });
  if (result.verdict !== 1) {
    console.error("REFUSED: source did not produce a checked-decision receipt.");
    process.exitCode = 1;
    return;
  }
  let descriptor;
  try {
    descriptor = openSync(resolve(args["--out"]), "wx", 0o600);
    writeFileSync(descriptor, result.receiptBytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
  } catch {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* descriptor already closed */ }
    }
    console.error("REFUSED: exclusive receipt publication failed.");
    process.exitCode = 1;
    return;
  }
  console.log(`CANDIDATE ONLY: ${result.receiptDigest}; authorityReleased=false`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  runCli();
}
