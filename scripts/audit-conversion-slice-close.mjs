#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import {
  basename, dirname, isAbsolute, join, relative, resolve, sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";
import { validateBoundedClosureReceipt } from "./lib/bounded-closure-receipt.mjs";
import { validateProjectEvidenceEnvelope } from "./conversion-queue.mjs";
import { RUNTIME_GIT_SHA256 } from "./run-rd0873-native-fungi-audit.mjs";

const REQUIRED_GATES = ["project-corpus", "differential", "strict-fungi", "physical-slide-vok"];
const REQUIRED_EXCLUSIONS = [
  { name: "full-tooling", authority: "task-5-plan" },
  { name: "graph-all", authority: "task-5-plan" },
  { name: "normal-phase-close", authority: "task-5-plan" },
];
const PLAN_PATH = "docs/superpowers/plans/2026-08-28-rd-0873-native-fungi-bootstrap.md";
const HISTORICAL_CUTOVER_COUNT = 1017;
const HISTORICAL_CUTOVER_DIGEST = "sha256:2ba32db1697561a859775cd40ce178ca38f5e62fa4e1492c7899f31dd8aeb6d6";
const CUTOVER_DOMAIN = "galerina.conversion-slice-historical-cutover.v1\0";
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RAW_DIGEST = /^[0-9a-f]{64}$/u;
const HASH = /^[0-9a-f]{40}$/u;
const SYMBOL = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/u;
const PACKAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const REPORT_NAME = /fungi-conversion-\d{4}-\d{2}-\d{2}\.md$/u;
const AUTHORITY_FIELDS = ["approval", "authorizing", "entries", "schema", "status"];
const APPROVAL_FIELDS = ["criticalFindings", "evidenceDigest", "importantFindings", "task"];
const ENTRY_FIELDS = ["governance", "product", "report", "scope", "target"];

function parseArgs(argv) {
  const values = new Map();
  const fields = new Set([
    "--root", "--project-corpus-receipt", "--authority-manifest",
    "--authority-digest", "--git-executable", "--git-digest",
  ]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!fields.has(key) || values.has(key) || typeof value !== "string") {
      throw new Error(`unknown, duplicate or incomplete argument: ${key}`);
    }
    values.set(key, value);
  }
  const root = resolve(values.get("--root") ?? resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  const authorityDigest = values.get("--authority-digest") ?? null;
  const gitDigest = values.get("--git-digest") ?? null;
  if (authorityDigest !== null && !DIGEST.test(authorityDigest)) throw new Error("authority digest is malformed");
  if (gitDigest !== null && !RAW_DIGEST.test(gitDigest)) throw new Error("Git digest is malformed");
  return {
    root,
    projectCorpusReceipt: values.get("--project-corpus-receipt") ?? null,
    authorityManifest: values.get("--authority-manifest") ?? null,
    authorityDigest,
    gitExecutable: values.get("--git-executable") ?? null,
    gitDigest,
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Digest(bytes) {
  return `sha256:${sha256(bytes)}`;
}

function normalizedTextDigest(bytes) {
  const text = bytes.toString("utf8");
  if (text.startsWith("\ufeff") || /\r(?!\n)/u.test(text)) {
    throw new Error("historical conversion evidence is not canonical UTF-8 text");
  }
  return sha256Digest(Buffer.from(text.replace(/\r\n/gu, "\n"), "utf8"));
}

function exactRecord(value, fields) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join(",") === [...fields].sort().join(",");
}

function canonicalPath(value) {
  return typeof value === "string"
    && value.length > 0
    && value === value.normalize("NFC")
    && !isAbsolute(value)
    && !value.includes("\\")
    && !value.includes("\0")
    && value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function exactRoot(root) {
  const absolute = resolve(root);
  const canonical = realpathSync.native(absolute);
  const state = lstatSync(absolute, { bigint: true });
  if (canonical !== absolute || !state.isDirectory() || state.isSymbolicLink()) {
    throw new Error("repository root identity is indirect");
  }
  return absolute;
}

function exactFile(root, value, prefix) {
  if (!canonicalPath(value) || !value.startsWith(prefix)) {
    throw new Error("authority manifest path is outside its approved subtree");
  }
  const canonicalRoot = exactRoot(root);
  let current = canonicalRoot;
  for (const segment of value.split("/")) {
    const matches = readdirSync(current, { withFileTypes: true })
      .filter((entry) => entry.name.toLowerCase() === segment.toLowerCase());
    if (matches.length !== 1 || matches[0].name !== segment || matches[0].isSymbolicLink()) {
      throw new Error("authority manifest path identity is not exact");
    }
    current = join(current, segment);
    if (realpathSync.native(current) !== current) throw new Error("authority manifest path is indirect");
  }
  const back = relative(canonicalRoot, current);
  const state = lstatSync(current, { bigint: true });
  if (back === ".." || back.startsWith(`..${sep}`) || isAbsolute(back)
      || !state.isFile() || state.isSymbolicLink() || state.nlink !== 1n
      || state.size < 1n || state.size > 1_048_576n) {
    throw new Error("authority manifest is not a bounded direct single-link file");
  }
  return current;
}

function readStableFile(path) {
  const before = lstatSync(path, { bigint: true });
  const bytes = readFileSync(path);
  const after = lstatSync(path, { bigint: true });
  for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"]) {
    if (before[key] !== after[key]) throw new Error("authority manifest changed during observation");
  }
  if (after.nlink !== 1n || BigInt(bytes.length) !== after.size) {
    throw new Error("authority manifest identity changed during observation");
  }
  return bytes;
}

function pinnedGit(path, digest) {
  if (typeof path !== "string" || !isAbsolute(path)
      || typeof digest !== "string" || digest !== RUNTIME_GIT_SHA256) {
    throw new Error("Git authority is missing or not the repository-approved pin");
  }
  const absolute = resolve(path);
  const canonical = realpathSync.native(absolute);
  const state = lstatSync(absolute, { bigint: true });
  if (canonical !== absolute || !state.isFile() || state.isSymbolicLink()
      || state.nlink !== 1n || state.size < 1n || state.size > 67_108_864n
      || sha256(readFileSync(absolute)) !== digest) {
    throw new Error("Git executable identity or digest is not exact");
  }
  return Object.freeze({ path: absolute, digest });
}

function gitResult(authority, root, args, { encoding = "utf8", accepted = [0] } = {}) {
  if (sha256(readFileSync(authority.path)) !== authority.digest) {
    throw new Error("Git executable changed during observation");
  }
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase().startsWith("GIT_")) delete env[key];
  }
  Object.assign(env, {
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "Never",
  });
  const result = spawnSync(authority.path, [
    "--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=__disabled__",
    "-c", `safe.directory=${root}`, ...args,
  ], {
    cwd: root,
    encoding,
    shell: false,
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 16_777_216,
    env,
  });
  if (!accepted.includes(result.status)) throw new Error("exact Git evidence is unavailable");
  if (sha256(readFileSync(authority.path)) !== authority.digest) {
    throw new Error("Git executable changed after observation");
  }
  return result;
}

function gitOutput(authority, root, args, options = {}) {
  return gitResult(authority, root, args, options).stdout;
}

function repositoryIdentity(authority, root) {
  const canonicalRoot = exactRoot(root);
  const top = String(gitOutput(authority, canonicalRoot, ["rev-parse", "--show-toplevel"])).trim();
  if (resolve(top) !== canonicalRoot) throw new Error("repository root is not the exact Git top level");
  const head = String(gitOutput(authority, canonicalRoot, ["rev-parse", "--verify", "HEAD"])).trim();
  if (!HASH.test(head)
      || String(gitOutput(authority, canonicalRoot, ["cat-file", "-t", head])).trim() !== "commit") {
    throw new Error("repository HEAD is not an exact commit");
  }
  const tree = String(gitOutput(authority, canonicalRoot, ["rev-parse", "--verify", `${head}^{tree}`])).trim();
  if (!HASH.test(tree)) throw new Error("repository tree is unavailable");
  return { head, tree };
}

function nulFields(bytes, label) {
  if (bytes.length === 0) throw new Error(`${label} is empty`);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || !text.endsWith("\0")) {
    throw new Error(`${label} framing is invalid`);
  }
  const fields = text.split("\0");
  fields.pop();
  return fields;
}

function repositoryIndexEvidence(authority, root) {
  const flagsBytes = Buffer.from(gitOutput(authority, root, [
    "ls-files", "-v", "-z",
  ], { encoding: "buffer" }));
  const flagPaths = nulFields(flagsBytes, "repository index flags").map((row) => {
    const marker = row[0];
    const path = row.slice(2);
    if (row[1] !== " " || !canonicalPath(path)) {
      throw new Error("repository index flag row is malformed");
    }
    if (marker !== "H") {
      throw new Error("repository index contains assume-unchanged, skip-worktree or unsupported state");
    }
    return path;
  });
  if (new Set(flagPaths).size !== flagPaths.length) {
    throw new Error("repository index flag paths are duplicated");
  }

  const stageBytes = Buffer.from(gitOutput(authority, root, [
    "ls-files", "--stage", "-z",
  ], { encoding: "buffer" }));
  const stagePaths = nulFields(stageBytes, "repository index stages").map((row) => {
    const match = /^([0-7]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])\t(.+)$/u.exec(row);
    if (!match || match[3] !== "0" || !canonicalPath(match[4])) {
      throw new Error("repository index contains a malformed or non-stage-0 entry");
    }
    return match[4];
  });
  if (new Set(stagePaths).size !== stagePaths.length
      || JSON.stringify(flagPaths) !== JSON.stringify(stagePaths)) {
    throw new Error("repository index flag and stage coverage differs");
  }
  return sha256Digest(Buffer.concat([
    Buffer.from("galerina.conversion-slice-index.v1\0", "utf8"),
    flagsBytes,
    Buffer.from("\0", "utf8"),
    stageBytes,
  ]));
}

function cleanRepositoryIdentity(authority, root, expected = null) {
  const before = repositoryIdentity(authority, root);
  if (expected !== null
      && (before.head !== expected.head || before.tree !== expected.tree)) {
    throw new Error("repository identity changed during closure observation");
  }
  const status = Buffer.from(gitOutput(authority, root, [
    "status", "--porcelain=v2", "-z", "--untracked-files=all", "--ignore-submodules=none",
  ], { encoding: "buffer" }));
  if (status.length !== 0) {
    throw new Error("v2 closure requires a clean repository index and worktree");
  }
  const indexDigest = repositoryIndexEvidence(authority, root);
  const after = repositoryIdentity(authority, root);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("repository identity changed during closure observation");
  }
  const snapshot = { ...after, indexDigest };
  if (expected !== null && JSON.stringify(snapshot) !== JSON.stringify(expected)) {
    throw new Error("repository index changed during closure observation");
  }
  return snapshot;
}

function exactCommitTree(authority, root, head) {
  if (!HASH.test(head)
      || String(gitOutput(authority, root, ["cat-file", "-t", head])).trim() !== "commit") {
    throw new Error("source build point is not an exact commit");
  }
  const tree = String(gitOutput(authority, root, ["rev-parse", "--verify", `${head}^{tree}`])).trim();
  if (!HASH.test(tree)) throw new Error("source commit tree is unavailable");
  return tree;
}

function isAncestor(authority, root, ancestor, descendant) {
  return gitResult(authority, root, ["merge-base", "--is-ancestor", ancestor, descendant], {
    accepted: [0, 1],
  }).status === 0;
}

function validateClosureDelta(authority, root, projectHead, closureHead, allowedPaths) {
  if (!(allowedPaths instanceof Set) || allowedPaths.size < 1
      || [...allowedPaths].some((path) => !canonicalPath(path))) {
    throw new Error("closure delta allow-list is malformed");
  }
  const bytes = Buffer.from(gitOutput(authority, root, [
    "diff", "--name-status", "-z", "--find-renames", "--find-copies", "--find-copies-harder",
    projectHead, closureHead, "--",
  ], { encoding: "buffer" }));
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) {
    throw new Error("closure delta contains a non-UTF-8 path");
  }
  const fields = text.split("\0");
  if (fields.pop() !== "") throw new Error("closure delta framing is incomplete");
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (/^[RC][0-9]{1,3}$/u.test(status ?? "")) {
      throw new Error("closure delta rename or copy is not admitted");
    }
    if (!/^[AM]$/u.test(status ?? "")) {
      throw new Error("closure delta status is not admitted");
    }
    const path = fields[index++];
    if (!canonicalPath(path) || !allowedPaths.has(path)) {
      throw new Error("closure delta contains a path outside the exact evidence allow-list");
    }
  }
}

function gitBlob(authority, root, head, relativePath) {
  if (!HASH.test(head) || !canonicalPath(relativePath)) throw new Error("Git blob identity is malformed");
  const rowBytes = Buffer.from(gitOutput(authority, root, [
    "ls-tree", "-z", "--full-tree", head, "--", relativePath,
  ], { encoding: "buffer" }));
  const row = rowBytes.toString("utf8");
  const match = /^(100644) blob ([0-9a-f]{40})\t([^\0]+)\0$/u.exec(row);
  if (!match || match[3] !== relativePath) {
    throw new Error("required tracked blob is missing or has a non-canonical mode or type");
  }
  return Buffer.from(gitOutput(authority, root, ["cat-file", "blob", match[2]], { encoding: "buffer" }));
}

function onlyMatch(text, pattern, label) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`missing or duplicate ${label}`);
  return matches[0];
}

function parseReportReceipt(text, name) {
  const section = text.match(/^## Slice-close receipt\s*$([\s\S]*?)(?=^## |$(?![\s\S]))/mu)?.[1] ?? "";
  const rows = [...section.matchAll(/^Conversion receipt: (\{.+\})$/gmu)];
  const parsed = rows.map((row) => {
    try {
      return parseStrictJsonBytes(Buffer.from(row[1], "utf8"), {
        label: `${name} conversion receipt`, maxBytes: 262_144,
      });
    } catch {
      return null;
    }
  });
  return {
    section,
    rows,
    parsed,
    isV2: rows.length === 1 && parsed[0]?.schema === "galerina.conversion-slice-receipt.v2",
  };
}

function historicalCutoverDigest(baselineBytes, reports) {
  const body = {
    schema: "galerina.conversion-slice-historical-cutover.v1",
    baselineDigest: normalizedTextDigest(baselineBytes),
    reports: reports.map(({ name, bytes }) => ({ name, digest: normalizedTextDigest(bytes) })),
  };
  return sha256Digest(Buffer.concat([
    Buffer.from(CUTOVER_DOMAIN, "utf8"), Buffer.from(JSON.stringify(body), "utf8"),
  ]));
}

function validateAuthorityManifest(bytes, expectedDigest, v2Names) {
  if (sha256Digest(bytes) !== expectedDigest) throw new Error("authority manifest digest does not match its external pin");
  const value = parseStrictJsonBytes(bytes, { label: "conversion scope authority", maxBytes: 1_048_576 });
  if (!exactRecord(value, AUTHORITY_FIELDS)
      || value.schema !== "galerina.conversion-slice-authority.v1"
      || value.authorizing !== false || value.status !== "APPROVED"
      || !exactRecord(value.approval, APPROVAL_FIELDS)
      || value.approval.task !== "RD-0873-TASK-6"
      || value.approval.criticalFindings !== 0 || value.approval.importantFindings !== 0
      || !DIGEST.test(value.approval.evidenceDigest) || !Array.isArray(value.entries)) {
    throw new Error("conversion scope authority is not a closed Task 6 approval");
  }
  const entries = new Map();
  let previous = "";
  for (const entry of value.entries) {
    const locatorParts = entry?.target?.locator?.split("#") ?? [];
    if (!exactRecord(entry, ENTRY_FIELDS)
        || typeof entry.report !== "string" || !REPORT_NAME.test(entry.report)
        || entry.report !== basename(entry.report) || entry.report <= previous
        || entry.product !== "galerina"
        || !exactRecord(entry.scope, ["file", "package", "symbol"])
        || !canonicalPath(entry.scope.file) || !PACKAGE.test(entry.scope.package)
        || !SYMBOL.test(entry.scope.symbol)
        || !entry.scope.file.startsWith(`packages-ts/${entry.scope.package}/`)
        || !exactRecord(entry.target, ["candidateDigest", "locator"])
        || locatorParts.length !== 2 || locatorParts[1] !== entry.scope.symbol
        || !canonicalPath(locatorParts[0]) || !DIGEST.test(entry.target.candidateDigest)
        || !exactRecord(entry.governance, ["planDigest", "rdDigest"])
        || !DIGEST.test(entry.governance.planDigest) || !DIGEST.test(entry.governance.rdDigest)) {
      throw new Error("conversion authority entry is malformed, duplicated or reordered");
    }
    previous = entry.report;
    entries.set(entry.report, entry);
  }
  if (entries.size !== v2Names.length || v2Names.some((name) => !entries.has(name))) {
    throw new Error("conversion authority does not cover the exact v2 report set");
  }
  return entries;
}

function reportExpectations({ authority, root, text, entry, projectEvidence }) {
  const scopeMatch = onlyMatch(text, /^Scope: `([^`#]+)#([^`#]+)`\.$/gmu, "conversion scope");
  const scope = { package: scopeMatch[1]?.split("/")[1], file: scopeMatch[1], symbol: scopeMatch[2] };
  if (!canonicalPath(scope.file) || !scope.file.startsWith(`packages-ts/${scope.package}/`)
      || !PACKAGE.test(scope.package ?? "") || !SYMBOL.test(scope.symbol ?? "")
      || JSON.stringify(scope) !== JSON.stringify(entry.scope)) {
    throw new Error("report scope does not match the independent Task 6 authority");
  }
  const head = onlyMatch(text, /^Evidence: source build point `([0-9a-f]{40})`;$/gmu, "source build point")[1];
  const reportedSourceDigest = onlyMatch(text, /^source SHA-256 `([0-9A-F]{64})`;$/gmu, "source digest")[1];
  const locator = onlyMatch(text, /^Target: `([^`]+)`\.$/gmu, "target locator")[1];
  const reportedTargetDigest = onlyMatch(text, /^target SHA-256 `([0-9A-F]{64})`;$/gmu, "target digest")[1];
  if (locator !== entry.target.locator) throw new Error("report target does not match the independent Task 6 authority");
  const locatorParts = locator.split("#");
  const targetFile = locatorParts[0];
  if (locatorParts.length !== 2 || locatorParts[1] !== scope.symbol
      || !canonicalPath(targetFile) || !targetFile.startsWith("packages/fungi/products/galerina/")
      || !targetFile.endsWith(".fungi")) {
    throw new Error("target locator is not an exact Galerina candidate");
  }
  const sourceTree = exactCommitTree(authority, root, head);
  if (!isAncestor(authority, root, head, projectEvidence.repository.head)) {
    throw new Error("source commit is not an ancestor of the PROJECT build point");
  }
  const sourceDigest = sha256Digest(gitBlob(authority, root, head, scope.file));
  if (sourceDigest.slice(7).toUpperCase() !== reportedSourceDigest) {
    throw new Error("reported source digest does not match the tracked source blob");
  }
  const targetDigest = sha256Digest(gitBlob(authority, root, projectEvidence.repository.head, targetFile));
  if (targetDigest !== entry.target.candidateDigest
      || targetDigest.slice(7).toUpperCase() !== reportedTargetDigest) {
    throw new Error("target digest does not match independent authority and tracked PROJECT bytes");
  }
  const covered = projectEvidence.files.filter((file) => file.path === targetFile && file.digest === targetDigest);
  if (covered.length !== 1) throw new Error("target is absent from exact PROJECT corpus coverage");
  const planDigest = sha256Digest(gitBlob(authority, root, projectEvidence.repository.head, PLAN_PATH));
  if (entry.governance.planDigest !== planDigest) throw new Error("authority plan digest is stale");
  return {
    expectedProduct: entry.product,
    expectedScope: scope,
    expectedSource: { head, tree: sourceTree, contentDigest: sourceDigest },
    expectedTarget: entry.target,
    expectedGovernance: entry.governance,
  };
}

function validateReportMetadata(name, text, section, violations) {
  const skill = [...section.matchAll(/^Skill disposition: (.+)$/gmu)].map((match) => match[1]);
  const threadability = [...section.matchAll(/^Threadability: (.+)$/gmu)].map((match) => match[1]);
  const classification = [...section.matchAll(/^Source classification: (.+)$/gmu)].map((match) => match[1]);
  const closure = [...section.matchAll(/^Bounded closure: (.+)$/gmu)].map((match) => match[1]);
  const sliceNumber = Number(/^slice-(\d+)-/u.exec(name)?.[1] ?? 0);
  if (skill.length !== 1 || !/^(?:SKILL_UPDATE [0-9a-f]{40}|NO_SKILL_UPDATE: .+)$/u.test(skill[0] ?? "")) {
    violations.push(`${name}: invalid skill disposition`);
  }
  if (threadability.length !== 1
      || !/^(?:PARALLEL_PURE|ASYNC_HAPPY_PATH|ISOLATED_SERVICE|SERIAL_HARD_PATH|UNKNOWN|N\/A)$/u.test(threadability[0] ?? "")) {
    violations.push(`${name}: invalid threadability`);
  }
  if (classification.length !== 1
      || !/^(?:CANDIDATE|BLOCKED|NO_RUNTIME_BEHAVIOR|SUPERSEDED_BY_EXISTING_FUNGI|BOOTSTRAP_FLOOR)$/u.test(classification[0] ?? "")) {
    violations.push(`${name}: invalid source classification`);
  }
  if (closure.length !== 1 || closure[0] !== "COMPLETE") violations.push(`${name}: bounded closure is not complete`);
  if (sliceNumber >= 323) {
    const authoring = [...section.matchAll(/^Authoring skill disposition: (.+)$/gmu)].map((match) => match[1]);
    const scopes = [...text.matchAll(/^Scope: `packages-ts\/[a-z0-9-]+\/((?:src|scripts|tests|bench)\/[a-z0-9./-]+)#[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*`\.$/gmu)];
    const buildPoints = [...text.matchAll(/^Evidence: source build point `[0-9a-f]{40}`;$/gmu)];
    const sourceDigests = [...text.matchAll(/^source SHA-256 `[0-9A-F]{64}`;/gmu)];
    if (authoring.length !== 1
        || !/^(?:SKILL_UPDATE [0-9a-f]{40}|NO_SKILL_UPDATE: .+)$/u.test(authoring[0] ?? "")) {
      violations.push(`${name}: invalid authoring skill disposition`);
    }
    if (scopes.length !== 1
        || scopes[0][1].split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
      violations.push(`${name}: missing exact conversion scope`);
    }
    if (buildPoints.length !== 1) violations.push(`${name}: missing exact source build point`);
    if (sourceDigests.length !== 1) violations.push(`${name}: missing exact source digest`);
  }
}

export function runAudit(argv = process.argv.slice(2), observation = {}) {
  if (!exactRecord(observation, [])
      && (!exactRecord(observation, ["afterInitialRepositoryObservation"])
        || typeof observation.afterInitialRepositoryObservation !== "function")) {
    throw new Error("closure observation seam is malformed");
  }
  const options = parseArgs(argv);
  const reportsPath = join(options.root, "docs", "reports");
  const baselinePath = join(options.root, "governance", "conversion-slice-close-baseline.json");
  const baselineBytes = readFileSync(baselinePath);
  const baseline = parseStrictJsonBytes(baselineBytes, { label: "conversion slice-close baseline", maxBytes: 262_144 });
  if (!exactRecord(baseline, ["legacyReports", "schemaVersion"])
      || baseline.schemaVersion !== 1 || !Array.isArray(baseline.legacyReports)) {
    throw new Error("invalid conversion slice-close baseline");
  }
  const legacyReports = baseline.legacyReports;
  if (legacyReports.some((name) => typeof name !== "string" || name !== basename(name) || !REPORT_NAME.test(name))
      || new Set(legacyReports).size !== legacyReports.length
      || [...legacyReports].sort().some((name, index) => name !== legacyReports[index])) {
    throw new Error("conversion slice-close baseline must be unique, sorted canonical report names");
  }
  const names = readdirSync(reportsPath).filter((name) => REPORT_NAME.test(name)).sort();
  const records = names.map((name) => {
    const bytes = readFileSync(join(reportsPath, name));
    const text = bytes.toString("utf8");
    return { name, bytes, text, receipt: parseReportReceipt(text, name) };
  });
  const v2Records = records.filter((record) => record.receipt.isV2);
  const historicalRecords = records.filter((record) => !record.receipt.isV2);
  if (historicalRecords.length > 0
      && (historicalRecords.length !== HISTORICAL_CUTOVER_COUNT
        || historicalCutoverDigest(baselineBytes, historicalRecords) !== HISTORICAL_CUTOVER_DIGEST)) {
    throw new Error("historical conversion report cutover changed; scope-less history remains frozen non-green");
  }
  const explicit = [
    options.projectCorpusReceipt, options.authorityManifest, options.authorityDigest,
    options.gitExecutable, options.gitDigest,
  ];
  if (v2Records.length === 0 && explicit.some((value) => value !== null)) {
    throw new Error("v2 authority inputs are not admitted without a v2 report");
  }
  if (v2Records.length > 0 && explicit.some((value) => value === null)) {
    throw new Error("v2 reports require exact PROJECT, Task 6 authority and pinned Git inputs");
  }
  const violations = [];
  for (const name of legacyReports) {
    if (!names.includes(name)) violations.push(`${name}: legacy baseline entry is missing`);
    if (v2Records.some((record) => record.name === name)) violations.push(`${name}: v2 report cannot replace frozen history`);
  }

  let governed = null;
  if (v2Records.length > 0) {
    const authority = pinnedGit(options.gitExecutable, options.gitDigest);
    const currentRepository = cleanRepositoryIdentity(authority, options.root);
    observation.afterInitialRepositoryObservation?.();
    const projectEvidence = validateProjectEvidenceEnvelope(options.root, options.projectCorpusReceipt);
    if (exactCommitTree(authority, options.root, projectEvidence.repository.head) !== projectEvidence.repository.tree
        || !isAncestor(authority, options.root, projectEvidence.repository.head, currentRepository.head)) {
      throw new Error("PROJECT build point is not an exact ancestor of the closure repository");
    }
    validateClosureDelta(
      authority,
      options.root,
      projectEvidence.repository.head,
      currentRepository.head,
      new Set([
        options.authorityManifest,
        ...v2Records.map((record) => `docs/reports/${record.name}`),
      ]),
    );
    const manifestPath = exactFile(options.root, options.authorityManifest, "governance/");
    const manifestBytes = readStableFile(manifestPath);
    if (!gitBlob(authority, options.root, currentRepository.head, options.authorityManifest).equals(manifestBytes)) {
      throw new Error("authority manifest differs from its tracked bytes");
    }
    const entries = validateAuthorityManifest(
      manifestBytes, options.authorityDigest, v2Records.map((record) => record.name),
    );
    governed = { authority, currentRepository, projectEvidence, entries };
  }

  for (const record of records) {
    if (legacyReports.includes(record.name)) continue;
    if (!record.receipt.isV2) continue;
    validateReportMetadata(record.name, record.text, record.receipt.section, violations);
    try {
      if (record.receipt.parsed[0] === null || governed === null) throw new Error("missing exact conversion receipt v2");
      if (!gitBlob(
        governed.authority, options.root, governed.currentRepository.head, `docs/reports/${record.name}`,
      ).equals(record.bytes)) {
        throw new Error("conversion report differs from its tracked bytes");
      }
      const expectations = reportExpectations({
        authority: governed.authority,
        root: options.root,
        text: record.text,
        entry: governed.entries.get(record.name),
        projectEvidence: governed.projectEvidence,
      });
      const result = validateBoundedClosureReceipt(record.receipt.parsed[0], {
        requiredGates: REQUIRED_GATES,
        requiredExclusions: REQUIRED_EXCLUSIONS,
        ...expectations,
        expectedProjectCorpusReceiptDigest: governed.projectEvidence.digest,
      });
      if (result.kind !== "accepted") violations.push(`${record.name}: ${result.code}`);
    } catch (error) {
      violations.push(`${record.name}: ${error instanceof Error ? error.message : "invalid conversion receipt"}`);
    }
  }
  if (governed !== null) {
    cleanRepositoryIdentity(governed.authority, options.root, governed.currentRepository);
  }
  if (violations.length > 0) {
    for (const violation of violations) console.error(`REFUSED: ${violation}`);
    return 1;
  }
  console.log(`conversion-slice-close: ${v2Records.length} v2 governed receipts valid; ${historicalRecords.length} frozen historical non-green reports`);
  return 0;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === modulePath) {
  try {
    process.exitCode = runAudit();
  } catch (error) {
    console.error(`REFUSED: ${error instanceof Error ? error.message : "conversion audit failed"}`);
    process.exitCode = 1;
  }
}
