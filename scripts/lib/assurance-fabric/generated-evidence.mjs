import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { types as utilTypes } from "node:util";

import { parseStrictJsonBytes } from "./strict-json.mjs";

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const EVIDENCE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NODE_VERSION = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const DESCRIPTOR_KEYS = Object.freeze([
  "artifactPaths",
  "evidencePath",
  "expectedTool",
  "externalInputPolicy",
  "id",
  "kind",
  "predecessors",
  "provenancePath",
  "toolPath",
  "workingTreeClass",
]);
const BASE_PROVENANCE_KEYS = Object.freeze(["authority", "builtAt", "gitCommit", "node", "tool"]);
const EXTERNAL_PROVENANCE_KEYS = Object.freeze([
  "authority",
  "builtAt",
  "externalDocumentCount",
  "externalInputDigest",
  "gitCommit",
  "node",
  "tool",
]);
const MAX_PROVENANCE_BYTES = 65_536;
const MAX_TOOL_BYTES = 16_777_216;
const MAX_ARTIFACT_BYTES = 33_554_432;
const MAX_ARTIFACT_TOTAL_BYTES = 67_108_864;

function taggedRefusal(code, detail) {
  return Object.freeze({ kind: "refused", code, detail });
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function accepted(value) {
  return Object.freeze({ kind: "accepted", value: deepFreeze(value) });
}

function hasExactDataKeys(value, expectedKeys) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || utilTypes.isProxy(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  if (keys.length !== expectedKeys.length) return false;
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== expectedKeys[index]) return false;
    const descriptor = descriptors[keys[index]];
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) return false;
  }
  return true;
}

function closedArray(value, predicate, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || utilTypes.isProxy(value) || (!allowEmpty && value.length === 0)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Object.keys(descriptors);
  if (ownKeys.length !== value.length + 1 || descriptors.length?.value !== value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) return false;
    if (!predicate(descriptor.value)) return false;
  }
  return true;
}

function canonicalRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return false;
  if (
    isAbsolute(value)
    || value.includes("\\")
    || value !== value.normalize("NFC")
    || /[\u0000-\u001f\u007f:*?"<>|]/u.test(value)
  ) return false;
  const segments = value.split("/");
  return segments.every((segment) => (
    segment.length > 0
    && segment !== "."
    && segment !== ".."
    && !/[ .]$/u.test(segment)
  ));
}

function descriptorIsClosed(value) {
  if (!hasExactDataKeys(value, DESCRIPTOR_KEYS)) return false;
  return EVIDENCE_ID.test(value.id)
    && ["generated", "external"].includes(value.kind)
    && closedArray(value.artifactPaths, canonicalRelativePath, { allowEmpty: false })
    && canonicalRelativePath(value.evidencePath)
    && value.artifactPaths.includes(value.evidencePath)
    && canonicalRelativePath(value.provenancePath)
    && canonicalRelativePath(value.toolPath)
    && typeof value.expectedTool === "string"
    && EVIDENCE_ID.test(value.expectedTool)
    && ["forbidden", "required"].includes(value.externalInputPolicy)
    && ["DECLARED_GENERATED_OUTPUT", "EXTERNAL_INPUT"].includes(value.workingTreeClass)
    && closedArray(value.predecessors, (item) => typeof item === "string" && EVIDENCE_ID.test(item))
    && new Set(value.artifactPaths).size === value.artifactPaths.length
    && new Set(value.predecessors).size === value.predecessors.length
    && ((value.kind === "generated"
        && value.externalInputPolicy === "forbidden"
        && value.workingTreeClass === "DECLARED_GENERATED_OUTPUT")
      || (value.kind === "external"
        && value.externalInputPolicy === "required"
        && value.workingTreeClass === "EXTERNAL_INPUT"));
}

function insideRoot(root, candidate) {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
}

function readBoundedRegularFile(root, relativePath, maxBytes) {
  const candidate = resolve(root, relativePath);
  if (!insideRoot(root, candidate)) throw Object.freeze({ code: "ASSURANCE-EVIDENCE-PATH", detail: `${relativePath} escapes the evidence root` });
  let stat;
  let actual;
  try {
    stat = lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
    actual = realpathSync.native(candidate);
  } catch {
    throw Object.freeze({ code: "ASSURANCE-EVIDENCE-FILE", detail: `${relativePath} is not a closed regular file` });
  }
  if (!insideRoot(root, actual)) throw Object.freeze({ code: "ASSURANCE-EVIDENCE-PATH", detail: `${relativePath} resolves outside the evidence root` });
  if (!Number.isSafeInteger(stat.size) || stat.size < 1 || stat.size > maxBytes) {
    throw Object.freeze({ code: "ASSURANCE-EVIDENCE-BOUNDS", detail: `${relativePath} is outside the closed byte bounds` });
  }
  const bytes = readFileSync(candidate);
  if (bytes.length !== stat.size) throw Object.freeze({ code: "ASSURANCE-EVIDENCE-FILE", detail: `${relativePath} changed while being read` });
  return bytes;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function digestArtifacts(root, paths) {
  const hash = createHash("sha256");
  let total = 0;
  for (const path of paths) {
    const bytes = readBoundedRegularFile(root, path, MAX_ARTIFACT_BYTES);
    total += bytes.length;
    if (!Number.isSafeInteger(total) || total > MAX_ARTIFACT_TOTAL_BYTES) {
      throw Object.freeze({ code: "ASSURANCE-EVIDENCE-BOUNDS", detail: "artifact family exceeds the closed byte bounds" });
    }
    hash.update(String(Buffer.byteLength(path)));
    hash.update(":");
    hash.update(path);
    hash.update(":");
    hash.update(String(bytes.length));
    hash.update(":");
    hash.update(bytes);
  }
  return hash.digest("hex");
}

function validTimestamp(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function classifyProvenance(value, descriptor, repositoryHead) {
  const hasBaseShape = hasExactDataKeys(value, BASE_PROVENANCE_KEYS);
  const hasExternalShape = hasExactDataKeys(value, EXTERNAL_PROVENANCE_KEYS);
  const hasAllowedShape = descriptor.externalInputPolicy === "required"
    ? hasBaseShape || hasExternalShape
    : hasBaseShape;
  if (!hasAllowedShape
      || typeof value.tool !== "string"
      || value.authority !== "NONE"
      || !GIT_COMMIT.test(value.gitCommit)
      || !validTimestamp(value.builtAt)
      || typeof value.node !== "string"
      || !NODE_VERSION.test(value.node)) {
    return { localTrit: -1, reason: "PROVENANCE_INVALID", externalInput: invalidExternalInput(descriptor) };
  }
  if (value.tool !== descriptor.expectedTool) {
    return { localTrit: -1, reason: "TOOL_IDENTITY_MISMATCH", externalInput: invalidExternalInput(descriptor) };
  }
  let externalInput = Object.freeze({ kind: "absent", reason: "descriptor forbids external input" });
  if (descriptor.externalInputPolicy === "required") {
    if (!hasExternalShape
        || !SHA256.test(value.externalInputDigest)
        || !Number.isSafeInteger(value.externalDocumentCount)
        || value.externalDocumentCount < 1) {
      return { localTrit: -1, reason: "EXTERNAL_INPUT_INVALID", externalInput: invalidExternalInput(descriptor) };
    }
    externalInput = Object.freeze({ kind: "present", digest: value.externalInputDigest });
  }
  if (value.gitCommit !== repositoryHead) {
    return { localTrit: 0, reason: "GIT_BUILD_POINT_MISMATCH", externalInput };
  }
  return { localTrit: 0, reason: "PROVENANCE_INFORMATIONAL_ONLY", externalInput };
}

function invalidExternalInput(descriptor) {
  return descriptor.externalInputPolicy === "forbidden"
    ? Object.freeze({ kind: "absent", reason: "descriptor forbids external input" })
    : Object.freeze({ kind: "absent", reason: "required external provenance is invalid" });
}

export function inspectGeneratedEvidence(rootPath, repositoryHead, descriptor) {
  if (!descriptorIsClosed(descriptor)) {
    const pathFields = hasExactDataKeys(descriptor, DESCRIPTOR_KEYS)
      && closedArray(descriptor.artifactPaths, (item) => typeof item === "string", { allowEmpty: false })
      && descriptor.artifactPaths.some((item) => !canonicalRelativePath(item));
    return taggedRefusal(
      pathFields ? "ASSURANCE-EVIDENCE-PATH" : "ASSURANCE-EVIDENCE-SHAPE",
      pathFields ? "descriptor contains a non-canonical evidence path" : "descriptor is not an exact closed evidence shape",
    );
  }
  if (typeof rootPath !== "string" || rootPath.length === 0 || !GIT_COMMIT.test(repositoryHead)) {
    return taggedRefusal("ASSURANCE-EVIDENCE-SHAPE", "root and repository head must be exact closed inputs");
  }
  let root;
  let subjectDigest;
  let toolDigest;
  let provenanceValue;
  try {
    root = realpathSync.native(resolve(rootPath));
    subjectDigest = digestArtifacts(root, descriptor.artifactPaths);
    toolDigest = digest(readBoundedRegularFile(root, descriptor.toolPath, MAX_TOOL_BYTES));
    const provenanceBytes = readBoundedRegularFile(root, descriptor.provenancePath, MAX_PROVENANCE_BYTES);
    try {
      provenanceValue = parseStrictJsonBytes(provenanceBytes, {
        label: descriptor.provenancePath,
        maxBytes: MAX_PROVENANCE_BYTES,
      });
    } catch {
      provenanceValue = undefined;
    }
  } catch (error) {
    return taggedRefusal(
      typeof error?.code === "string" ? error.code : "ASSURANCE-EVIDENCE-FILE",
      typeof error?.detail === "string" ? error.detail : "evidence files could not be inspected safely",
    );
  }
  const classification = classifyProvenance(provenanceValue, descriptor, repositoryHead);
  return accepted({
    node: {
      id: descriptor.id,
      kind: descriptor.kind,
      subjectDigest,
      toolDigest,
      repositoryHead,
      workingTreeClass: descriptor.workingTreeClass,
      externalInput: classification.externalInput,
      evidencePath: descriptor.evidencePath,
      localTrit: classification.localTrit,
    },
    predecessors: [...descriptor.predecessors],
    freshnessReason: classification.reason,
  });
}
