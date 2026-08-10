import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import { evaluateEvidenceDag } from "./evidence-dag.mjs";
import { inspectGeneratedEvidence } from "./generated-evidence.mjs";
import { parseStrictJsonBytes } from "./strict-json.mjs";

const DESCRIPTOR_PATH = "governance/assurance-evidence-dependencies.json";
const EXPECTED_NODE_IDS = Object.freeze([
  "project-graph",
  "kb-graph",
  "dev-tool-index",
  "percent-evidence",
  "ts-retirement",
  "semantic-coverage",
  "status-ledger",
  "slide-reference",
]);
const ROOT_KEYS = Object.freeze(["nodes", "root", "schemaVersion"]);
const AGGREGATE_KEYS = Object.freeze([
  "evidencePath",
  "expectedTool",
  "id",
  "predecessors",
  "toolPath",
]);
const MAX_DESCRIPTOR_BYTES = 262_144;
const MAX_TOOL_BYTES = 16_777_216;

function refusal(code, detail) {
  return Object.freeze({ kind: "refused", code, detail });
}

function exactKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index])
    && actual.every((key) => {
      const descriptor = descriptors[key];
      return descriptor !== undefined && descriptor.enumerable && "value" in descriptor;
    });
}

function exactArray(value, expected) {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== value.length + 1) return false;
  return expected.every((item, index) => {
    const descriptor = descriptors[String(index)];
    return descriptor !== undefined && descriptor.enumerable && "value" in descriptor
      && descriptor.value === item;
  });
}

function canonicalPath(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 512
    && !isAbsolute(value)
    && !value.includes("\\")
    && value === value.normalize("NFC")
    && !/[\u0000-\u001f\u007f:*?"<>|]/u.test(value)
    && value.split("/").every((segment) => (
      segment.length > 0 && segment !== "." && segment !== ".." && !/[ .]$/u.test(segment)
    ));
}

function descriptorIsClosed(value) {
  if (!exactKeys(value, ROOT_KEYS) || value.schemaVersion !== 1) return false;
  if (!Array.isArray(value.nodes) || value.nodes.length !== EXPECTED_NODE_IDS.length) return false;
  const ids = value.nodes.map((node) => node?.id);
  if (!exactArray(ids, EXPECTED_NODE_IDS)) return false;
  if (!value.nodes.every((node) => Array.isArray(node?.predecessors) && node.predecessors.length === 0)) return false;
  if (!exactKeys(value.root, AGGREGATE_KEYS)) return false;
  return value.root.id === "roadmap-subway"
    && value.root.expectedTool === "gen-roadmap-subway"
    && value.root.toolPath === "scripts/gen-roadmap-subway.mjs"
    && value.root.evidencePath === "build/component-health/roadmap-subway.svg"
    && canonicalPath(value.root.toolPath)
    && canonicalPath(value.root.evidencePath)
    && exactArray(value.root.predecessors, EXPECTED_NODE_IDS);
}

function insideRoot(root, path) {
  const delta = relative(root, path);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
}

function boundedRegularFile(root, relativePath, maxBytes) {
  const path = resolve(root, relativePath);
  if (!insideRoot(root, path)) throw new Error("path escapes repository root");
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maxBytes) {
    throw new Error("path is not a bounded regular file");
  }
  const actual = realpathSync.native(path);
  if (!insideRoot(root, actual)) throw new Error("path resolves outside repository root");
  const bytes = readFileSync(path);
  if (bytes.length !== stat.size) throw new Error("file changed during inspection");
  return bytes;
}

function isolatedGitEnvironment() {
  const result = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR"]) {
    if (typeof process.env[key] === "string") result[key] = process.env[key];
  }
  return result;
}

function repositoryHead(root) {
  const value = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: isolatedGitEnvironment(),
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) throw new Error("repository HEAD is not exact");
  return value;
}

function aggregateDigest(nodes) {
  const hash = createHash("sha256");
  hash.update("galerina-roadmap-assurance-root-v1\0");
  for (const node of nodes) {
    hash.update(node.id);
    hash.update("\0");
    hash.update(node.subjectDigest);
    hash.update("\0");
    hash.update(node.toolDigest);
    hash.update("\0");
    hash.update(String(node.localTrit));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function deriveRoadmapEvidence(rootPath) {
  let root;
  let descriptor;
  let head;
  try {
    root = realpathSync.native(resolve(rootPath));
    const descriptorBytes = boundedRegularFile(root, DESCRIPTOR_PATH, MAX_DESCRIPTOR_BYTES);
    descriptor = parseStrictJsonBytes(descriptorBytes, {
      label: DESCRIPTOR_PATH,
      maxBytes: MAX_DESCRIPTOR_BYTES,
    });
    if (!descriptorIsClosed(descriptor)) {
      return refusal("ASSURANCE-ROADMAP-DESCRIPTOR", "roadmap dependency descriptor is not the exact closed node set");
    }
    head = repositoryHead(root);
  } catch {
    return refusal("ASSURANCE-ROADMAP-DESCRIPTOR", "roadmap dependency descriptor or repository identity could not be admitted");
  }

  const candidates = [];
  for (const nodeDescriptor of descriptor.nodes) {
    const inspected = inspectGeneratedEvidence(root, head, nodeDescriptor);
    if (inspected.kind === "refused") return inspected;
    candidates.push(inspected.value.node);
  }

  let aggregateToolDigest;
  try {
    aggregateToolDigest = createHash("sha256")
      .update(boundedRegularFile(root, descriptor.root.toolPath, MAX_TOOL_BYTES))
      .digest("hex");
  } catch {
    return refusal("ASSURANCE-EVIDENCE-FILE", "roadmap generator is not a bounded regular file");
  }
  const aggregate = {
    id: descriptor.root.id,
    kind: "aggregate",
    subjectDigest: aggregateDigest(candidates),
    toolDigest: aggregateToolDigest,
    repositoryHead: head,
    workingTreeClass: "DECLARED_GENERATED_OUTPUT",
    externalInput: { kind: "absent", reason: "aggregate has no direct external input" },
    evidencePath: descriptor.root.evidencePath,
    localTrit: 1,
  };
  return evaluateEvidenceDag({
    schemaVersion: 1,
    repositoryHead: head,
    nodes: [...candidates, aggregate],
    edges: descriptor.root.predecessors.map((id) => ({
      from: descriptor.root.id,
      to: id,
      type: "DERIVED_FROM",
    })),
  });
}
