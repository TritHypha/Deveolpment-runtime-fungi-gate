import { join, resolve } from "node:path";
import { types as utilTypes } from "node:util";
import { fileURLToPath } from "node:url";

import { admitSlideVadeEvidence } from "./slide-vade-adapter.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_EVIDENCE = join(
  HERE,
  "..",
  "evidence",
  "slide-v2g-verified-ahead-of-demand-b5aab13.json",
);
const OBSERVATION_KEYS = Object.freeze([
  "child",
  "evidenceClass",
  "comparative",
  "workEquivalenceCertificate",
  "verdict",
  "status",
  "failureId",
  "benchmark",
  "receiptDigest",
  "slideCommit",
  "authorityReleased",
]);

function auditResult(verdict) {
  return Object.freeze({
    verdict,
    status: verdict === 1 ? "AUDIT_CLEAN" : "REFUSED",
    failureId: verdict === 1 ? "NONE" : "GALERINA-SLIDE-VADE-AUDIT-REFUSED",
    subject: verdict === 1 ? "slide-vade-evidence" : "",
    authorityReleased: false,
  });
}

function plainRecord(value) {
  if (!(value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && !utilTypes.isProxy(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.getOwnPropertySymbols(value).length === 0)) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value))
    .every((descriptor) => "value" in descriptor && descriptor.get === undefined && descriptor.set === undefined);
}

export function classifySlideVadeObservation(observation) {
  try {
    if (!plainRecord(observation)) return auditResult(-1);
    const keys = Object.keys(observation).sort();
    if (
      keys.length !== OBSERVATION_KEYS.length
      || !keys.every((key, index) => key === [...OBSERVATION_KEYS].sort()[index])
      || observation.child !== "slide-vade-evidence"
      || observation.evidenceClass !== "NON_COMPARATIVE_COMPONENT_EVIDENCE"
      || observation.comparative !== false
      || observation.workEquivalenceCertificate !== false
      || observation.verdict !== 1
      || observation.status !== "ADMITTED_NON_AUTHORIZING"
      || observation.failureId !== "NONE"
      || observation.benchmark !== "slide-v2g-verified-ahead-of-demand"
      || !/^[0-9a-f]{64}$/u.test(observation.receiptDigest)
      || !/^[0-9a-f]{40}$/u.test(observation.slideCommit)
      || observation.authorityReleased !== false
    ) return auditResult(-1);
    return auditResult(1);
  } catch {
    return auditResult(-1);
  }
}

export async function auditSlideVadeEvidence(inputPath = DEFAULT_EVIDENCE) {
  const result = await admitSlideVadeEvidence(inputPath);
  return classifySlideVadeObservation({
    child: "slide-vade-evidence",
    evidenceClass: "NON_COMPARATIVE_COMPONENT_EVIDENCE",
    comparative: false,
    workEquivalenceCertificate: false,
    ...result,
  });
}

async function selfTest() {
  const positive = await auditSlideVadeEvidence();
  const observation = {
    child: "slide-vade-evidence",
    evidenceClass: "NON_COMPARATIVE_COMPONENT_EVIDENCE",
    comparative: false,
    workEquivalenceCertificate: false,
    verdict: 1,
    status: "ADMITTED_NON_AUTHORIZING",
    failureId: "NONE",
    benchmark: "slide-v2g-verified-ahead-of-demand",
    receiptDigest: "4f0871eacd0f0e3f5d69c5545802adff317b0231fcf995c5b8c73dbcf8e0b564",
    slideCommit: "b5aab13d59d59195cfd1c4bee25bcc663060bad4",
    authorityReleased: false,
  };
  const plantedComparison = classifySlideVadeObservation({ ...observation, comparative: true });
  const plantedAuthority = classifySlideVadeObservation({ ...observation, authorityReleased: true });
  const passed = positive.verdict === 1
    && plantedComparison.verdict === -1
    && plantedAuthority.verdict === -1;
  process.stdout.write(passed
    ? "slide-vade audit self-test: 3/3 ok\n"
    : "slide-vade audit self-test: REFUSED\n");
  if (!passed) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") {
    await selfTest();
    return;
  }
  const input = args.length === 0
    ? DEFAULT_EVIDENCE
    : args.length === 2 && args[0] === "--input"
      ? args[1]
      : "";
  const result = await auditSlideVadeEvidence(input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.verdict !== 1) process.exitCode = 1;
}

const IS_MAIN = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(auditResult(-1), null, 2)}\n`);
    process.exitCode = 1;
  });
}
