#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { validGeneratedProvenance } from "./lib/provenance.mjs";

const MAX_GRAPH_BYTES = 64 * 1024 * 1024;
const MAX_REGISTRY_BYTES = 1024 * 1024;
const MAX_NODES = 200_000;
const MAX_EDGES = 500_000;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const RECEIPT_FIELDS = Object.freeze([
  "edgeCount",
  "gitHead",
  "packageCount",
  "registryDigest",
  "schema",
  "skippedFiles",
  "truncated",
]);
const GRAPH_FIELDS = Object.freeze(["edges", "generatedAt", "nodes", "version"]);
const NODE_FIELDS = new Set(["id", "kind", "label", "sourcePath", "summary", "tags"]);
const EDGE_FIELDS = new Set(["confidence", "evidencePath", "from", "kind", "rationale", "to"]);
const SPECIAL_PRODUCTS = new Set(["gate-lab", "research", "shared"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ordinaryRecord(value) {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, fields) {
  if (!ordinaryRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length
    && actual.every((field, index) => field === expected[index]);
}

function allowedFields(value, fields) {
  return ordinaryRecord(value) && Object.keys(value).every((field) => fields.has(field));
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function currentProjectGraphSnapshot(root, graphBytes, provenanceBytes, provenance) {
  if (
    !validGeneratedProvenance(provenance)
    || provenance.tool !== "project-graph-generator"
  ) {
    return false;
  }
  const check = spawnSync(
    process.execPath,
    [join(root, "scripts", "project-graph-generator.mjs"), "--root", root, "--check"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (check.error || check.signal || check.status !== 0) return false;
  try {
    const checkedGraphBytes = readBounded(
      join(root, "build", "graph", "galerina-devtools-project-graph.json"),
      MAX_GRAPH_BYTES,
      "PRODUCT_GRAPH_MISSING",
    );
    const checkedProvenanceBytes = readBounded(
      join(root, "build", "graph", "provenance.json"),
      64 * 1024,
      "PRODUCT_GRAPH_RECEIPT_MISSING",
    );
    return graphBytes.equals(checkedGraphBytes)
      && provenanceBytes.equals(checkedProvenanceBytes);
  } catch {
    return false;
  }
}

function boundedReceipt(status, expectedHead, graphReceipt, codes, findings = []) {
  return Object.freeze({
    schema: "product-package-boundary-receipt.v1",
    status,
    authorizing: false,
    buildPoint: COMMIT.test(graphReceipt?.gitHead ?? "") ? graphReceipt.gitHead : expectedHead,
    registryDigest: SHA256.test(graphReceipt?.registryDigest ?? "")
      ? graphReceipt.registryDigest
      : null,
    checkedPackageCount: Number.isSafeInteger(graphReceipt?.packageCount)
      ? graphReceipt.packageCount
      : 0,
    checkedEdgeCount: Number.isSafeInteger(graphReceipt?.edgeCount)
      ? graphReceipt.edgeCount
      : 0,
    findingCodes: Object.freeze([...new Set(codes)].sort()),
    findings: Object.freeze(findings.map((finding) => Object.freeze({ ...finding }))),
  });
}

function refused(code, expectedHead, graphReceipt) {
  return boundedReceipt("REFUSED", expectedHead, graphReceipt, [code]);
}

function productTag(node) {
  const tags = node.tags.filter((tag) => tag.startsWith("product:"));
  if (tags.length > 1) return { refused: "PRODUCT_IDENTITY_AMBIGUOUS" };
  return { value: tags.length === 1 ? tags[0].slice("product:".length) : null };
}

function packageName(node) {
  return node.id.slice("package:".length);
}

function classifyProduct(node, products) {
  const explicit = productTag(node);
  if (explicit.refused) return explicit;
  if (explicit.value !== null) {
    if (SPECIAL_PRODUCTS.has(explicit.value) || products.has(explicit.value)) return explicit;
    return { refused: "PRODUCT_UNKNOWN" };
  }

  const name = packageName(node);
  const matches = [];
  for (const product of products.values()) {
    const declared = product.packageNamespaces.some((namespace) => name.startsWith(namespace));
    const conventional = name.startsWith(`@${product.productId}/`)
      || name.startsWith(`${product.productId}-`);
    if (declared || conventional) matches.push(product.productId);
  }
  if (matches.length > 1) return { refused: "PRODUCT_IDENTITY_AMBIGUOUS" };
  if (matches.length === 1) return { value: matches[0] };
  if (node.tags.includes("semantics:trit")) return { value: "shared" };
  return { refused: "PRODUCT_UNKNOWN" };
}

function authority(node) {
  const name = packageName(node).toLowerCase();
  if (node.tags.includes("authority:vok-lease") || name.includes("vok-lease")) return "vok-lease";
  if (
    node.tags.includes("authority:governance")
    || name.includes("governance-verifier")
    || name === "@galerina/core-compiler"
    || name === "galerina-core-compiler"
  ) return "governance";
  return null;
}

function artifactProduct(node, products) {
  const tags = node.tags.filter((tag) => tag.startsWith("artifact:"));
  if (tags.length > 1) return { refused: "PRODUCT_ARTIFACT_IDENTITY_AMBIGUOUS" };
  if (tags.length === 0) return { value: null };
  const namespace = tags[0].slice("artifact:".length);
  const matches = [...products.values()].filter((product) => product.artifactNamespace === namespace);
  if (matches.length !== 1) return { refused: "PRODUCT_ARTIFACT_UNKNOWN" };
  return { value: matches[0] };
}

function validateRegistry(registry) {
  if (!ordinaryRecord(registry)
    || registry.schema !== "product-profiles.v1"
    || registry.schemaVersion !== 1
    || !Array.isArray(registry.products)
    || registry.products.length === 0
    || registry.products.length > 128) return { refused: "PRODUCT_REGISTRY_INVALID" };
  const products = new Map();
  for (const product of registry.products) {
    if (!ordinaryRecord(product)
      || typeof product.productId !== "string"
      || !/^[a-z][a-z0-9-]{0,63}$/.test(product.productId)
      || products.has(product.productId)
      || !Array.isArray(product.packageNamespaces)
      || product.packageNamespaces.some((value) => typeof value !== "string" || value.length === 0)
      || typeof product.artifactNamespace !== "string"
      || product.artifactNamespace.length === 0
      || typeof product.compatibilityState !== "string"
      || !SHA256.test(product.policyDigest)) return { refused: "PRODUCT_REGISTRY_INVALID" };
    products.set(product.productId, product);
  }
  return { products };
}

function validateGraph(graph) {
  if (!exactFields(graph, GRAPH_FIELDS)
    || typeof graph.version !== "string"
    || graph.version.length === 0
    || typeof graph.generatedAt !== "string"
    || !Number.isFinite(Date.parse(graph.generatedAt))
    || !Array.isArray(graph.nodes)
    || !Array.isArray(graph.edges)
    || graph.nodes.length > MAX_NODES
    || graph.edges.length > MAX_EDGES) return { refused: "PRODUCT_GRAPH_INVALID" };

  const byId = new Map();
  for (const node of graph.nodes) {
    if (!allowedFields(node, NODE_FIELDS)
      || typeof node.id !== "string"
      || node.id.length === 0
      || byId.has(node.id)
      || typeof node.kind !== "string"
      || typeof node.label !== "string"
      || !Array.isArray(node.tags)
      || node.tags.some((tag) => typeof tag !== "string" || tag.length === 0)
      || (node.sourcePath !== undefined && typeof node.sourcePath !== "string")
      || (node.summary !== undefined && typeof node.summary !== "string")) {
      return { refused: "PRODUCT_GRAPH_INVALID" };
    }
    byId.set(node.id, node);
  }
  for (const edge of graph.edges) {
    if (!allowedFields(edge, EDGE_FIELDS)
      || typeof edge.from !== "string"
      || typeof edge.to !== "string"
      || !byId.has(edge.from)
      || !byId.has(edge.to)
      || typeof edge.kind !== "string"
      || typeof edge.confidence !== "string") return { refused: "PRODUCT_GRAPH_INVALID" };
  }
  return { byId };
}

export function evaluateProductPackageBoundaries({
  graph,
  graphReceipt,
  registryBytes,
  expectedHead,
}) {
  if (!COMMIT.test(expectedHead ?? "")) return refused("PRODUCT_EXPECTED_HEAD_INVALID", expectedHead, graphReceipt);
  if (!exactFields(graphReceipt, RECEIPT_FIELDS)
    || graphReceipt.schema !== "product-package-graph-input.v1") {
    return refused("PRODUCT_GRAPH_RECEIPT_INVALID", expectedHead, graphReceipt);
  }
  if (!COMMIT.test(graphReceipt.gitHead) || graphReceipt.gitHead !== expectedHead) {
    return refused("PRODUCT_GRAPH_STALE", expectedHead, graphReceipt);
  }
  if (!SHA256.test(graphReceipt.registryDigest ?? "")) {
    return refused("PRODUCT_REGISTRY_DIGEST_MISSING", expectedHead, graphReceipt);
  }
  if (graphReceipt.skippedFiles !== 0) {
    return refused("PRODUCT_GRAPH_SKIPPED_FILES", expectedHead, graphReceipt);
  }
  if (graphReceipt.truncated !== false) {
    return refused("PRODUCT_GRAPH_TRUNCATED", expectedHead, graphReceipt);
  }
  if (typeof registryBytes !== "string" && !(registryBytes instanceof Uint8Array)) {
    return refused("PRODUCT_REGISTRY_INVALID", expectedHead, graphReceipt);
  }
  const bytes = typeof registryBytes === "string" ? registryBytes : Buffer.from(registryBytes);
  if (Buffer.byteLength(bytes) > MAX_REGISTRY_BYTES || digest(bytes) !== graphReceipt.registryDigest) {
    return refused("PRODUCT_REGISTRY_DIGEST_MISMATCH", expectedHead, graphReceipt);
  }

  let registry;
  try {
    registry = JSON.parse(bytes.toString());
  } catch {
    return refused("PRODUCT_REGISTRY_INVALID", expectedHead, graphReceipt);
  }
  const registryResult = validateRegistry(registry);
  if (registryResult.refused) return refused(registryResult.refused, expectedHead, graphReceipt);

  const graphResult = validateGraph(graph);
  if (graphResult.refused) return refused(graphResult.refused, expectedHead, graphReceipt);
  const packages = graph.nodes.filter((node) => node.kind === "Package" && node.tags.includes("package"));
  if (packages.length === 0) return refused("PRODUCT_GRAPH_EMPTY", expectedHead, graphReceipt);
  if (!Number.isSafeInteger(graphReceipt.packageCount)
    || !Number.isSafeInteger(graphReceipt.edgeCount)
    || graphReceipt.packageCount !== packages.length
    || graphReceipt.edgeCount !== graph.edges.length) {
    return refused("PRODUCT_GRAPH_COUNT_MISMATCH", expectedHead, graphReceipt);
  }

  const classifications = new Map();
  for (const node of packages) {
    if (!node.id.startsWith("package:")) return refused("PRODUCT_GRAPH_INVALID", expectedHead, graphReceipt);
    const classification = classifyProduct(node, registryResult.products);
    if (classification.refused) return refused(classification.refused, expectedHead, graphReceipt);
    const artifact = artifactProduct(node, registryResult.products);
    if (artifact.refused) return refused(artifact.refused, expectedHead, graphReceipt);
    classifications.set(node.id, { product: classification.value, artifact: artifact.value });
  }

  const findings = [];
  for (const edge of graph.edges) {
    if (edge.kind !== "depends_on") continue;
    const from = graphResult.byId.get(edge.from);
    const to = graphResult.byId.get(edge.to);
    if (!classifications.has(from.id) || !classifications.has(to.id)) continue;
    const sourceProduct = classifications.get(from.id).product;
    const target = classifications.get(to.id);
    const targetAuthority = authority(to);
    let code = null;
    if (sourceProduct === "trametes" && targetAuthority === "governance") code = "PRODUCT_BOUNDARY_001";
    if (sourceProduct === "gate-lab" && targetAuthority === "vok-lease") code = "PRODUCT_BOUNDARY_002";
    if (
      sourceProduct === "research"
      && target.artifact?.productClass === "production"
      && target.artifact.compatibilityState === "admitted"
    ) code = "PRODUCT_BOUNDARY_003";
    if (code === null) continue;
    const inferred = edge.confidence === "INFERRED";
    findings.push({
      code: inferred ? "PRODUCT_BOUNDARY_REVIEW_001" : code,
      from: from.id,
      to: to.id,
      evidencePath: typeof edge.evidencePath === "string" ? edge.evidencePath : null,
    });
  }

  const codes = findings.map((finding) => finding.code);
  return boundedReceipt(codes.length === 0 ? "PASS" : "HOLD", expectedHead, graphReceipt, codes, findings);
}

function readBounded(path, maximum, missingCode) {
  let size;
  try {
    size = statSync(path).size;
  } catch {
    throw new Error(missingCode);
  }
  if (size <= 0 || size > maximum) throw new Error(`PRODUCT_INPUT_SIZE_REFUSED: ${path}`);
  return readFileSync(path);
}

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let check = false;
  let rootSeen = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--check" && !check) {
      check = true;
      continue;
    }
    if (arg === "--root" && !rootSeen && index + 1 < argv.length && !argv[index + 1].startsWith("--")) {
      root = resolve(argv[++index]);
      rootSeen = true;
      continue;
    }
    throw new Error(`PRODUCT_ARGUMENT_REFUSED: ${arg}`);
  }
  if (!check) throw new Error("PRODUCT_CHECK_REQUIRED");
  return { root };
}

function runCli(argv) {
  let options;
  try {
    options = parseArgs(argv);
    const graphBytes = readBounded(
      join(options.root, "build", "graph", "galerina-devtools-project-graph.json"),
      MAX_GRAPH_BYTES,
      "PRODUCT_GRAPH_MISSING",
    );
    const provenanceBytes = readBounded(
      join(options.root, "build", "graph", "provenance.json"),
      64 * 1024,
      "PRODUCT_GRAPH_RECEIPT_MISSING",
    );
    const registryBytes = readBounded(
      join(options.root, "product-registry", "product-profiles.v1.json"),
      MAX_REGISTRY_BYTES,
      "PRODUCT_REGISTRY_MISSING",
    );
    const graph = JSON.parse(graphBytes.toString("utf8"));
    const provenance = JSON.parse(provenanceBytes.toString("utf8"));
    const headResult = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: options.root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10_000,
    });
    if (headResult.status !== 0 || !COMMIT.test(headResult.stdout.trim())) throw new Error("PRODUCT_GIT_HEAD_REFUSED");
    const expectedHead = headResult.stdout.trim();
    const graphIsCurrent = currentProjectGraphSnapshot(
      options.root,
      graphBytes,
      provenanceBytes,
      provenance,
    );
    const packages = Array.isArray(graph.nodes)
      ? graph.nodes.filter((node) => node?.kind === "Package" && node?.tags?.includes("package"))
      : [];
    const result = evaluateProductPackageBoundaries({
      graph,
      graphReceipt: {
        schema: "product-package-graph-input.v1",
        gitHead: graphIsCurrent ? expectedHead : null,
        registryDigest: digest(registryBytes),
        packageCount: packages.length,
        edgeCount: Array.isArray(graph.edges) ? graph.edges.length : -1,
        skippedFiles: 0,
        truncated: false,
      },
      registryBytes,
      expectedHead,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "PASS" ? 0 : result.status === "HOLD" ? 1 : 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({
      schema: "product-package-boundary-receipt.v1",
      status: "REFUSED",
      authorizing: false,
      buildPoint: null,
      registryDigest: null,
      checkedPackageCount: 0,
      checkedEdgeCount: 0,
      findingCodes: [message.split(":", 1)[0]],
      findings: [],
    })}\n`);
    process.exitCode = 2;
  }
}

const INVOKED_DIRECTLY = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (INVOKED_DIRECTLY) runCli(process.argv.slice(2));
