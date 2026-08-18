import { createHash } from "node:crypto";
import { execFile as execFileCallback, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

import { collectConstellationPreflight } from "../constellation-preflight/index.mjs";
import { resolveSourceIdentity } from "../ts-to-fungi-sandbox/identity.mjs";
import { runBatch, verifyReceipt } from "../ts-to-fungi-sandbox/controller.mjs";
import { ConversionGateError, GATE_ROSTER } from "./contracts.mjs";
import { buildRunCard, validateGateManifest } from "./core.mjs";
import { assertGateOutputPath, chainFromSandboxReceipt, inspectSourceRequest } from "./adapters.mjs";
import { canonicalJson } from "./publication.mjs";

const execFile = promisify(execFileCallback);
const ZERO_COMMIT = "0".repeat(40);
const REPORT = /^docs\/reports\/(?:slice-\d+-[a-z0-9-]+-fungi-conversion-\d{4}-\d{2}-\d{2}|fungi-conversion-[a-z0-9-]+)\.md$/u;
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function gateError(code, message) {
  throw new ConversionGateError(code, message);
}

async function git(root, args, encoding = "utf8") {
  try {
    const result = await execFile("git", args, { cwd: root, encoding, windowsHide: true, maxBuffer: 128 * 1024 * 1024 });
    return result.stdout;
  } catch (error) {
    gateError("GIT_CHECK_FAILED", error?.stderr?.trim() || "git evidence check failed");
  }
}

function pathsFromNul(bytes) {
  return bytes.toString("utf8").split("\0").filter((item) => item.length > 0);
}

async function changedPaths(root) {
  const changed = pathsFromNul(await git(root, ["diff", "--name-only", "-z", "HEAD"], null));
  const untracked = pathsFromNul(await git(root, ["ls-files", "--others", "--exclude-standard", "-z"], null));
  return [...new Set([...changed, ...untracked])].sort();
}

async function addedFungiPaths(root) {
  const added = pathsFromNul(await git(root, ["diff", "--name-only", "--diff-filter=A", "-z", "HEAD"], null));
  const untracked = pathsFromNul(await git(root, ["ls-files", "--others", "--exclude-standard", "-z"], null));
  return [...new Set([...added, ...untracked].filter((item) => item.endsWith(".fungi")))].sort();
}

async function historyTail(root, currentHasReport) {
  if (!currentHasReport) return Object.freeze({ reportOnlyStreak: 0, precedingQualifyingBatch: false });
  const revisions = (await git(root, ["rev-list", "--max-count=256", "HEAD"]))
    .trim().split(/\r?\n/u).filter((item) => item.length > 0);
  let reportOnlyStreak = 1;
  for (const revision of revisions) {
    const added = pathsFromNul(await git(root, ["diff-tree", "--root", "--no-commit-id", "--name-only", "--diff-filter=A", "-r", "-z", revision], null));
    if (added.filter((item) => item.endsWith(".fungi")).length >= 40) {
      return Object.freeze({ reportOnlyStreak, precedingQualifyingBatch: true });
    }
    const changed = pathsFromNul(await git(root, ["diff-tree", "--root", "--no-commit-id", "--name-only", "--diff-filter=ACMR", "-r", "-z", revision], null));
    if (changed.some((item) => REPORT.test(item))) reportOnlyStreak += 1;
  }
  return Object.freeze({ reportOnlyStreak, precedingQualifyingBatch: false });
}

export async function inspectConversionCommitPolicy(root, { finalTailException = false } = {}) {
  const changed = await changedPaths(root);
  const fungi = await addedFungiPaths(root);
  const reports = changed.filter((item) => REPORT.test(item)).length;
  const audit = spawnSync(process.execPath, ["scripts/audit-conversion-report-commit.mjs", "--worktree", "--uniqueness-only"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  const auditText = `${audit.stdout ?? ""}\n${audit.stderr ?? ""}`;
  const tail = await historyTail(root, reports > 0);
  return Object.freeze({
    addedFungi: fungi.length,
    reports,
    reportOnlyStreak: tail.reportOnlyStreak,
    finalTailException: finalTailException === true,
    precedingQualifyingBatch: tail.precedingQualifyingBatch,
    corpusComplete: audit.status === 0,
    exactDuplicates: /exact duplicate/u.test(auditText) ? 1 : 0,
    normalizedShadows: /template shadow/u.test(auditText) ? 1 : 0,
  });
}

async function runLythProofWork(lythRoot) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  let result;
  try {
    result = await execFile(executable, ["run", "--silent", "verify:detached-scalar"], {
      cwd: lythRoot,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    return Object.freeze({ status: "REFUSED", code: "LYTH_COMMAND_FAILED", digest: sha256(Buffer.from(error?.stdout ?? "", "utf8")) });
  }
  try {
    const value = JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1));
    const valid = value?.schema === "lyth.detached-scalar-verification.v1"
      && value?.status === "EVIDENCE_READY"
      && value?.authorityReleased === false;
    return Object.freeze({ status: valid ? "ALLOW" : "REFUSED", code: valid ? "EVIDENCE_READY" : "LYTH_ENVELOPE_REFUSED", digest: sha256(Buffer.from(canonicalJson(value), "utf8")) });
  } catch {
    return Object.freeze({ status: "ERROR", code: "LYTH_ENVELOPE_INVALID", digest: sha256(Buffer.from(result.stdout, "utf8")) });
  }
}

function ownerEnvelope(item) {
  const identity = item.identity;
  return Object.freeze({
    ownerKey: item.ownerKey,
    status: item.status,
    code: item.code,
    buildPoint: identity?.requiredHead ?? ZERO_COMMIT,
    locator: `graph:${identity?.project ?? item.ownerKey}`,
  });
}

function gateCheck(id, status, code, locator, digest) {
  return Object.freeze({ id, status, code, locator, ...(digest === undefined ? {} : { digest }) });
}

function allVerified(requests, stage) {
  return requests.length > 0 && requests.every((item) => item.outcome === "CONVERTED" && item.chain[stage]?.verified === true);
}

function policyStatus(policy) {
  if (!policy.corpusComplete || policy.exactDuplicates !== 0 || policy.normalizedShadows !== 0 || policy.reports > 1 || policy.reportOnlyStreak >= 2) return "REFUSED";
  if (policy.reports === 0 || policy.addedFungi >= 40) return "ALLOW";
  return policy.finalTailException && policy.precedingQualifyingBatch && policy.reportOnlyStreak === 1 ? "ALLOW" : "REFUSED";
}

function preflightHoldResults(manifest, inspections, code) {
  return manifest.requests.map((request, index) => ({
    scope: `${request.file}#${request.symbol}`,
    outcome: "MANUAL_REVIEW",
    reasonCode: code,
    sourceRetained: inspections[index]?.sourceRetained === true,
    receiptLocator: `preflight:request:${index}`,
    chain: { source: { digest: request.sourceSha256, verified: inspections[index]?.sourceSha256 === request.sourceSha256 } },
  }));
}

export async function collectConversionGateRun({
  root,
  slideRoot,
  lythRoot,
  manifest: rawManifest,
  outputRoot,
  skillRoot = resolve(homedir(), ".agents", "skills"),
  projects = {},
  finalTailException = false,
  dependencies = {},
}) {
  const manifest = validateGateManifest(rawManifest);
  const collectPreflight = dependencies.collectPreflight ?? collectConstellationPreflight;
  const resolveIdentity = dependencies.resolveIdentity ?? resolveSourceIdentity;
  const runSandbox = dependencies.runSandbox ?? runBatch;
  const verifySandboxReceipt = dependencies.verifySandboxReceipt ?? verifyReceipt;
  const lythProof = dependencies.runLythProofWork ?? runLythProofWork;
  const inspectPolicy = dependencies.inspectCommitPolicy ?? inspectConversionCommitPolicy;

  const sandboxOut = await assertGateOutputPath(root, manifest.sandboxOutput);
  const preflight = await collectPreflight({
    galerinaRoot: root,
    slideRoot,
    lythRoot,
    skillRoot,
    outputRoot,
    projects: { galerina: manifest.graphProject, slide: projects.slide, vok: projects.vok, lyth: projects.lyth },
  });
  const inspections = [];
  let sourceFailure;
  for (const request of manifest.requests) {
    try {
      inspections.push(await inspectSourceRequest({ root, request, graphProject: manifest.graphProject, resolveIdentity }));
    } catch (error) {
      inspections.push(null);
      sourceFailure ??= error instanceof ConversionGateError ? error.code : "SOURCE_INSPECTION_ERROR";
    }
  }

  let requestResults;
  let lyth = Object.freeze({ status: "HOLD", code: "NOT_REACHED" });
  const receiptDigests = [];
  if (preflight.status === "ALLOW" && sourceFailure === undefined) {
    const sandboxManifest = { schema: "galerina.ts-to-fungi-sandbox.batch.v1", requests: manifest.requests.map(({ file, symbol }) => ({ file, symbol })) };
    const summary = await runSandbox({ root, project: manifest.graphProject, manifest: sandboxManifest, out: sandboxOut, auditOnly: true });
    requestResults = [];
    for (let index = 0; index < summary.records.length; index += 1) {
      const record = summary.records[index];
      const request = manifest.requests[index];
      const receiptPath = resolve(sandboxOut, ...record.receiptPath.split("/"));
      const verified = await verifySandboxReceipt({ root, receipt: receiptPath });
      const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
      receiptDigests.push(receipt.receiptSha256);
      const chain = chainFromSandboxReceipt(receipt, { expectedSourceSha256: request.sourceSha256, receiptValid: verified.valid === true });
      const converted = record.outcome === "CONVERTED";
      requestResults.push({
        scope: `${request.file}#${request.symbol}`,
        outcome: record.outcome,
        reasonCode: converted ? "CONVERSION_PROVED" : receipt.reasonCode ?? receipt.blockers?.[0] ?? "CONVERSION_NOT_PROVED",
        sourceRetained: inspections[index].sourceRetained,
        receiptLocator: `sandbox:${manifest.sandboxOutput}/${record.receiptPath}`,
        chain: converted ? chain : { source: chain.source },
      });
    }
    if (requestResults.every((item) => item.outcome === "CONVERTED")) lyth = await lythProof(lythRoot);
  } else {
    requestResults = preflightHoldResults(manifest, inspections, sourceFailure ?? `CONSTELLATION_${preflight.status}`);
  }

  const policy = await inspectPolicy(root, { finalTailException });
  const allConverted = requestResults.every((item) => item.outcome === "CONVERTED");
  const receiptsDigest = receiptDigests.length === 0 ? undefined : sha256(Buffer.from(canonicalJson(receiptDigests), "utf8"));
  const downstream = allConverted ? "ALLOW" : "HOLD";
  const checks = [
    gateCheck("constellation-preflight", preflight.status, `PREFLIGHT_${preflight.status}`, "preflight:detached-scalar"),
    gateCheck("source-graph-identity", sourceFailure === undefined ? "ALLOW" : "REFUSED", sourceFailure ?? "SOURCE_IDENTITIES_EXACT", "source:manifest"),
    gateCheck("semantic-classifier", preflight.status === "ALLOW" && sourceFailure === undefined ? "ALLOW" : "HOLD", "CLASSIFICATION_ACCOUNTED", "sandbox:classifier", receiptsDigest),
    gateCheck("candidate-compiler", downstream, allConverted ? "CANDIDATES_PROVED" : "CANDIDATES_INCOMPLETE", "sandbox:compiler", receiptsDigest),
    gateCheck("duplicate-shadow", downstream, allConverted ? "NO_CANDIDATE_SHADOWS" : "NOT_REACHED", "sandbox:duplicate-shadow", receiptsDigest),
    gateCheck("real-source-output-path", "ALLOW", "PROJECT_OUTPUT_BOUNDED", `sandbox:${manifest.sandboxOutput}`),
    gateCheck("typescript-retained", sourceFailure === undefined ? "ALLOW" : "REFUSED", sourceFailure ?? "TYPESCRIPT_RETAINED", "source:manifest"),
    gateCheck("checked-snapshot-gir", allVerified(requestResults, "gir") && allVerified(requestResults, "checkedSnapshot") ? "ALLOW" : "HOLD", allConverted ? "GIR_PROVED" : "NOT_REACHED", "sandbox:gir", receiptsDigest),
    gateCheck("slide-physical-package", allVerified(requestResults, "physicalPackage") && allVerified(requestResults, "profile") ? "ALLOW" : "HOLD", allConverted ? "PHYSICAL_PACKAGE_PROVED" : "NOT_REACHED", "slide:physical-package", receiptsDigest),
    gateCheck("vok-readmission", allVerified(requestResults, "vokReceipt") ? "ALLOW" : "HOLD", allConverted ? "VOK_RECEIPTS_PROVED" : "NOT_REACHED", "vok:receipt", receiptsDigest),
    gateCheck("lyth-proof-work", lyth.status, lyth.code, "lyth:verify-detached-scalar", lyth.digest),
    gateCheck("commit-policy", policyStatus(policy), policyStatus(policy) === "ALLOW" ? "COMMIT_POLICY_READY" : "COMMIT_POLICY_REFUSED", "git:worktree"),
  ];
  if (checks.length !== GATE_ROSTER.length) gateError("CHECK_SET_INTERNAL", "collector emitted an incomplete gate roster");
  return buildRunCard({ manifest, owners: preflight.owners.map(ownerEnvelope), checks, requests: requestResults, commitPolicy: policy });
}
