import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

import { provenance } from "../provenance.mjs";
import { slideToolManifestDigest } from "../receipt-bound-slide-build.mjs";
import { parseStrictJsonBytes } from "./strict-json.mjs";

const PIN_PATH = "docs/security/slide-reference-tool-pin.json";
const MANIFEST_PATH = "governance/checked-fungi-package-tool-manifest.json";
const PIN_KEYS = Object.freeze([
  "repositoryCommit",
  "schema",
  "toolFileCount",
  "toolManifestDigest",
]);
const MANIFEST_KEYS = Object.freeze([
  "authorityReleased",
  "entrypoint",
  "files",
  "profileId",
  "referenceOnly",
  "schema",
  "toolId",
]);
const MAX_PIN_BYTES = 65_536;
const MAX_MANIFEST_BYTES = 16_777_216;
const MAX_TOOL_FILE_BYTES = 16_777_216;
const MAX_TOOL_FAMILY_BYTES = 67_108_864;
const FILE_KEYS = Object.freeze(["byteLength", "path", "sha256"]);

function refused(code, detail) {
  return Object.freeze({ kind: "refused", code, detail });
}

function exactRecord(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
    && actual.every((key) => {
      const descriptor = descriptors[key];
      return descriptor !== undefined && descriptor.enumerable && "value" in descriptor;
    });
}

function exactArray(value) {
  if (!Array.isArray(value) || value.length < 1) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== value.length + 1) return false;
  return value.every((_, index) => {
    const descriptor = descriptors[String(index)];
    return descriptor !== undefined && descriptor.enumerable && "value" in descriptor;
  });
}

function boundedFile(root, relativePath, maxBytes) {
  const path = join(root, relativePath);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maxBytes) {
    throw new Error("input is not a bounded regular file");
  }
  const bytes = readFileSync(path);
  if (bytes.length !== stat.size) throw new Error("input changed while being inspected");
  return bytes;
}

function exactDirectory(path) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("repository root is not an exact directory");
  return realpathSync.native(path);
}

function gitEnvironment() {
  const result = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR"]) {
    if (typeof process.env[key] === "string") result[key] = process.env[key];
  }
  return result;
}

function git(slideRoot, args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: slideRoot,
    encoding,
    windowsHide: true,
    env: gitEnvironment(),
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: MAX_MANIFEST_BYTES,
  });
}

function validatePin(value) {
  return exactRecord(value, PIN_KEYS)
    && value.schema === "galerina.slide.reference-tool-pin.v1"
    && typeof value.repositoryCommit === "string"
    && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value.repositoryCommit)
    && typeof value.toolManifestDigest === "string"
    && /^sha256:[0-9a-f]{64}$/u.test(value.toolManifestDigest)
    && Number.isSafeInteger(value.toolFileCount)
    && value.toolFileCount > 0;
}

function validateManifest(value, expectedCount) {
  return exactRecord(value, MANIFEST_KEYS)
    && value.schema === "slide.reference-tool-manifest.v1"
    && typeof value.toolId === "string"
    && value.toolId.length > 0
    && typeof value.profileId === "string"
    && value.profileId.length > 0
    && typeof value.entrypoint === "string"
    && value.entrypoint.length > 0
    && exactArray(value.files)
    && value.files.length === expectedCount
    && value.referenceOnly === true
    && value.authorityReleased === false;
}

function canonicalRepositoryPath(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 512
    && !value.startsWith("/")
    && !value.includes("\\")
    && value === value.normalize("NFC")
    && !/[\u0000-\u001f\u007f:*?"<>|]/u.test(value)
    && value.split("/").every((segment) => (
      segment.length > 0 && segment !== "." && segment !== ".." && !/[ .]$/u.test(segment)
    ));
}

function verifyManifestFiles(slideRoot, commit, manifest) {
  const paths = new Set();
  let totalBytes = 0;
  for (const entry of manifest.files) {
    if (!exactRecord(entry, FILE_KEYS)
        || !canonicalRepositoryPath(entry.path)
        || !Number.isSafeInteger(entry.byteLength)
        || entry.byteLength < 1
        || entry.byteLength > MAX_TOOL_FILE_BYTES
        || typeof entry.sha256 !== "string"
        || !/^sha256:[0-9a-f]{64}$/u.test(entry.sha256)
        || paths.has(entry.path)) return false;
    paths.add(entry.path);
    const treeBytes = git(slideRoot, ["ls-tree", "-z", commit, "--", entry.path], "buffer");
    const treeText = new TextDecoder("utf-8", { fatal: true }).decode(treeBytes);
    const match = /^(100644|100755) blob ([0-9a-f]{40}|[0-9a-f]{64})\t([^\0]+)\0$/u.exec(treeText);
    if (match === null || match[3] !== entry.path) return false;
    const fileBytes = git(slideRoot, ["show", `${commit}:${entry.path}`], "buffer");
    totalBytes += fileBytes.length;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOOL_FAMILY_BYTES) return false;
    if (fileBytes.length !== entry.byteLength) return false;
    const digest = `sha256:${createHash("sha256").update(fileBytes).digest("hex")}`;
    if (digest !== entry.sha256) return false;
  }
  return paths.has(manifest.entrypoint);
}

export function verifySlideReferenceEvidence(galerinaRootPath, slideRootPath) {
  try {
    const galerinaRoot = exactDirectory(resolve(galerinaRootPath));
    const slideRoot = exactDirectory(resolve(slideRootPath));
    const pinBytes = boundedFile(galerinaRoot, PIN_PATH, MAX_PIN_BYTES);
    const pin = parseStrictJsonBytes(pinBytes, { label: PIN_PATH, maxBytes: MAX_PIN_BYTES });
    if (!validatePin(pin)) return refused("SLIDE-REFERENCE-PIN", "SLIDE reference pin is not the exact closed shape");
    git(slideRoot, ["cat-file", "-e", `${pin.repositoryCommit}^{commit}`]);
    const manifestBytes = git(
      slideRoot,
      ["show", `${pin.repositoryCommit}:${MANIFEST_PATH}`],
      "buffer",
    );
    if (manifestBytes.length < 1 || manifestBytes.length > MAX_MANIFEST_BYTES) {
      return refused("SLIDE-REFERENCE-MANIFEST", "pinned SLIDE manifest is outside the closed byte bounds");
    }
    const manifest = parseStrictJsonBytes(manifestBytes, {
      label: MANIFEST_PATH,
      maxBytes: MAX_MANIFEST_BYTES,
    });
    if (!validateManifest(manifest, pin.toolFileCount)) {
      return refused("SLIDE-REFERENCE-MANIFEST", "pinned SLIDE manifest is not the exact reference-only shape");
    }
    const digest = slideToolManifestDigest(manifestBytes);
    if (digest !== pin.toolManifestDigest) {
      return refused("SLIDE-REFERENCE-DIGEST", "pinned SLIDE manifest digest does not match the Galerina pin");
    }
    if (!verifyManifestFiles(slideRoot, pin.repositoryCommit, manifest)) {
      return refused("SLIDE-REFERENCE-FILE", "pinned SLIDE manifest file conservation failed");
    }
    const stamp = provenance("verify-slide-reference-evidence", galerinaRoot);
    if (typeof stamp.gitCommit !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(stamp.gitCommit)) {
      return refused("SLIDE-REFERENCE-GIT", "Galerina repository build point is unavailable");
    }
    const report = Object.freeze({
      schema: "galerina.slide.reference-evidence.v1",
      repositoryCommit: pin.repositoryCommit,
      toolManifestDigest: digest,
      toolFileCount: pin.toolFileCount,
      referenceOnly: true,
      authorityReleased: false,
    });
    const externalDigest = digest.slice("sha256:".length);
    const evidenceProvenance = Object.freeze({
      ...stamp,
      externalInputDigest: externalDigest,
      externalDocumentCount: pin.toolFileCount,
    });
    return Object.freeze({
      kind: "accepted",
      value: Object.freeze({ report, provenance: evidenceProvenance }),
    });
  } catch {
    return refused("SLIDE-REFERENCE-REFUSED", "pinned SLIDE Git evidence could not be verified exactly");
  }
}
