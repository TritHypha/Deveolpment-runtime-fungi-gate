import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { types as utilTypes } from "node:util";

import {
  analyzeMillionReadLoopEnvelope,
  checkEffects,
  checkTypes,
  checkValueStates,
  parseProgram,
  verifyGovernance,
} from "@galerina/core-compiler";

const MAX_MANIFEST_BYTES = 4096;
const MAX_SOURCE_BYTES = 4096;
const MANIFEST_KEYS = [
  "authorityReleased",
  "benchmark",
  "expectedResult",
  "flowName",
  "iterations",
  "referenceOnly",
  "schema",
  "subjects",
];
const SUBJECT_KEYS = ["bytes", "path", "role", "sha256"];
const EXPECTED_SUBJECTS = Object.freeze([
  Object.freeze({
    role: "checked",
    path: "docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi",
    candidate: false,
    k3: -1,
    failureIds: Object.freeze(["VERIFIED_NATIVE_PERMISSION_MISSING"]),
  }),
  Object.freeze({
    role: "verified",
    path: "docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi",
    candidate: true,
    k3: 0,
    failureIds: Object.freeze(["INDEPENDENT_VERIFIER_UNAVAILABLE"]),
  }),
]);

class SourcePairRefusal extends Error {
  constructor(failureId) {
    super(failureId);
    this.failureId = failureId;
  }
}

function refuse(failureId) {
  throw new SourcePairRefusal(failureId);
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function refusal(failureId = "SOURCE_PAIR_VERIFICATION_REFUSED") {
  return deepFreeze({
    schema: "galerina.benchmark.million-iteration-source-pair-receipt.v1",
    verdict: -1,
    status: "REFUSED",
    failureId,
    referenceOnly: true,
    authorityReleased: false,
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, expected) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function hasDuplicateJsonKey(text) {
  const stack = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "{") {
      stack.push({ type: "object", keys: new Set() });
      index += 1;
      continue;
    }
    if (character === "[") {
      stack.push({ type: "array" });
      index += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      stack.pop();
      index += 1;
      continue;
    }
    if (character !== '"') {
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    let escaped = false;
    while (index < text.length) {
      const current = text[index];
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') break;
      index += 1;
    }
    if (index >= text.length) refuse("SOURCE_PAIR_MANIFEST_INVALID");
    const token = text.slice(start, index + 1);
    let next = index + 1;
    while (/\s/u.test(text[next] ?? "")) next += 1;
    if (text[next] === ":") {
      const frame = stack.at(-1);
      if (frame?.type !== "object") refuse("SOURCE_PAIR_MANIFEST_INVALID");
      let key;
      try {
        key = JSON.parse(token);
      } catch {
        refuse("SOURCE_PAIR_MANIFEST_INVALID");
      }
      if (frame.keys.has(key)) return true;
      frame.keys.add(key);
    }
    index += 1;
  }
  return false;
}

async function readSingleLinkFile(path, maxBytes, failureId) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch {
    refuse(failureId);
  }
  if (
    metadata.isSymbolicLink()
    || !metadata.isFile()
    || metadata.nlink !== 1
    || metadata.size < 1
    || metadata.size > maxBytes
  ) {
    refuse(failureId);
  }
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    refuse(failureId);
  }
  if (bytes.length !== metadata.size) refuse(failureId);
  return bytes;
}

function containedPath(repositoryRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || isAbsolute(relativePath)
  ) {
    refuse("SOURCE_PAIR_MANIFEST_INVALID");
  }
  const target = resolve(repositoryRoot, ...relativePath.split("/"));
  const containment = relative(repositoryRoot, target);
  if (containment === "" || containment === ".." || containment.startsWith(`..${sep}`) || isAbsolute(containment)) {
    refuse("SOURCE_PAIR_MANIFEST_INVALID");
  }
  return target;
}

function parseManifest(bytes) {
  const text = bytes.toString("utf8");
  if (Buffer.from(text, "utf8").length !== bytes.length || hasDuplicateJsonKey(text)) {
    refuse("SOURCE_PAIR_MANIFEST_INVALID");
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    refuse("SOURCE_PAIR_MANIFEST_INVALID");
  }
  if (
    !exactKeys(manifest, MANIFEST_KEYS)
    || manifest.schema !== "galerina.benchmark.million-iteration-source-pair.v1"
    || manifest.benchmark !== "verified-native-operation"
    || manifest.flowName !== "readMillionValues"
    || manifest.iterations !== 1_000_000
    || manifest.expectedResult !== 999_999
    || manifest.referenceOnly !== true
    || manifest.authorityReleased !== false
    || !Array.isArray(manifest.subjects)
    || manifest.subjects.length !== 2
  ) {
    refuse("SOURCE_PAIR_MANIFEST_INVALID");
  }
  for (const [index, subject] of manifest.subjects.entries()) {
    const expected = EXPECTED_SUBJECTS[index];
    if (
      expected === undefined
      || !exactKeys(subject, SUBJECT_KEYS)
      || subject.role !== expected.role
      || subject.path !== expected.path
      || !/^[0-9a-f]{64}$/u.test(subject.sha256)
      || !Number.isSafeInteger(subject.bytes)
      || subject.bytes < 1
      || subject.bytes > MAX_SOURCE_BYTES
    ) {
      refuse("SOURCE_PAIR_MANIFEST_INVALID");
    }
  }
  return manifest;
}

function diagnosticErrors(diagnostics) {
  return diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

function assertProductionGates(parsed, sourcePath) {
  if (diagnosticErrors(parsed.diagnostics).length > 0) refuse("SOURCE_GATE_REFUSED");
  if (diagnosticErrors(checkTypes(parsed.ast).diagnostics).length > 0) refuse("SOURCE_GATE_REFUSED");
  if (diagnosticErrors(checkValueStates(parsed.ast, "production").diagnostics).length > 0) {
    refuse("SOURCE_GATE_REFUSED");
  }
  const effects = checkEffects(parsed.flows, parsed.ast);
  if (diagnosticErrors(effects).length > 0) refuse("SOURCE_GATE_REFUSED");
  const governance = verifyGovernance(
    parsed.ast,
    parsed.flows,
    effects,
    "production",
    sourcePath,
  );
  if (diagnosticErrors(governance.diagnostics).length > 0) refuse("SOURCE_GATE_REFUSED");
}

function semanticNode(node) {
  const result = { kind: node.kind };
  if (Object.hasOwn(node, "value")) result.value = node.value;
  if (Object.hasOwn(node, "flags")) result.flags = node.flags;
  if (Array.isArray(node.children)) {
    result.children = node.children.map((child) => semanticNode(child));
  }
  return result;
}

function executableShape(parsed, flowName) {
  const flowNode = parsed.ast.children?.find((node) => node.value === flowName);
  const flowMeta = parsed.flows.find((flow) => flow.name === flowName);
  if (flowNode === undefined || flowMeta === undefined) refuse("SOURCE_SEMANTICS_MISMATCH");
  return {
    flow: {
      name: flowMeta.name,
      qualifier: flowMeta.qualifier,
      params: flowMeta.params,
      returnType: flowMeta.returnType,
      declaredEffects: flowMeta.declaredEffects,
    },
    nodes: flowNode.children
      .filter((child) => child.kind !== "contractDecl")
      .map((child) => semanticNode(child)),
  };
}

function assertRole(proposal, expected) {
  if (
    proposal.candidate !== expected.candidate
    || proposal.verdict !== expected.k3
    || proposal.executionWhenNotAdmitted !== "checked"
    || JSON.stringify(proposal.failureIds) !== JSON.stringify(expected.failureIds)
  ) {
    refuse("SOURCE_ROLE_MISMATCH");
  }
  if (expected.role === "verified") {
    if (
      proposal.bound !== 1_000_000
      || proposal.proof?.exactTripCount !== 1_000_000
      || !Object.values(proposal.facts).every((fact) => fact === true)
    ) {
      refuse("SOURCE_ROLE_MISMATCH");
    }
  }
}

export async function verifyMillionIterationSourcePair(input) {
  try {
    if (
      input === null
      || typeof input !== "object"
      || utilTypes.isProxy(input)
      || Object.getPrototypeOf(input) !== Object.prototype
    ) {
      refuse("SOURCE_PAIR_INPUT_INVALID");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (
      JSON.stringify(Object.keys(descriptors).sort()) !== JSON.stringify(["manifestPath", "repositoryRoot"])
      || Object.values(descriptors).some((descriptor) => !("value" in descriptor))
    ) {
      refuse("SOURCE_PAIR_INPUT_INVALID");
    }
    const { repositoryRoot, manifestPath } = input;
    if (typeof repositoryRoot !== "string" || typeof manifestPath !== "string") {
      refuse("SOURCE_PAIR_INPUT_INVALID");
    }
    const root = resolve(repositoryRoot);
    const manifestBytes = await readSingleLinkFile(
      resolve(manifestPath),
      MAX_MANIFEST_BYTES,
      "SOURCE_PAIR_MANIFEST_INVALID",
    );
    const manifest = parseManifest(manifestBytes);
    const subjects = [];
    const parsedSubjects = [];
    const proposals = [];
    for (const [index, subject] of manifest.subjects.entries()) {
      const expected = EXPECTED_SUBJECTS[index];
      if (expected === undefined) refuse("SOURCE_PAIR_MANIFEST_INVALID");
      const sourcePath = containedPath(root, subject.path);
      const sourceBytes = await readSingleLinkFile(
        sourcePath,
        MAX_SOURCE_BYTES,
        "SOURCE_FILE_INVALID",
      );
      if (sourceBytes.length !== subject.bytes || sha256(sourceBytes) !== subject.sha256) {
        refuse("SOURCE_DIGEST_MISMATCH");
      }
      const source = sourceBytes.toString("utf8");
      if (Buffer.from(source, "utf8").length !== sourceBytes.length) refuse("SOURCE_FILE_INVALID");
      const parsed = parseProgram(source, subject.path, { requireVersionHeader: true });
      assertProductionGates(parsed, subject.path);
      parsedSubjects.push(parsed);
      const proposal = analyzeMillionReadLoopEnvelope(parsed.ast, manifest.flowName);
      proposals.push(proposal);
      subjects.push({
        role: expected.role,
        path: subject.path,
        sha256: subject.sha256,
        bytes: subject.bytes,
        candidate: expected.candidate,
        k3: expected.k3,
        failureIds: [...expected.failureIds],
      });
    }
    if (
      JSON.stringify(executableShape(parsedSubjects[0], manifest.flowName))
      !== JSON.stringify(executableShape(parsedSubjects[1], manifest.flowName))
    ) {
      refuse("SOURCE_SEMANTICS_MISMATCH");
    }
    for (const [index, proposal] of proposals.entries()) {
      const expected = EXPECTED_SUBJECTS[index];
      if (expected === undefined) refuse("SOURCE_PAIR_MANIFEST_INVALID");
      assertRole(proposal, expected);
    }
    return deepFreeze({
      schema: "galerina.benchmark.million-iteration-source-pair-receipt.v1",
      verdict: 1,
      status: "VERIFIED_NON_AUTHORIZING",
      benchmark: manifest.benchmark,
      flowName: manifest.flowName,
      iterations: manifest.iterations,
      expectedResult: manifest.expectedResult,
      subjects,
      referenceOnly: true,
      authorityReleased: false,
    });
  } catch (error) {
    return refusal(
      error instanceof SourcePairRefusal
        ? error.failureId
        : "SOURCE_PAIR_VERIFICATION_REFUSED",
    );
  }
}
